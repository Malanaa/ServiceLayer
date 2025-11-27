package com.example.userservice.cart;

import com.example.userservice.client.StorageClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CartService {

    private static final Logger log = LoggerFactory.getLogger(CartService.class);

    private final StringRedisTemplate redisTemplate;
    private final HashOperations<String, String, String> hashOps;
    private final ObjectMapper objectMapper;
    private final StorageClient storageClient;
    private final com.example.userservice.client.PaymentClient paymentClient;

    public CartService(StringRedisTemplate redisTemplate, StorageClient storageClient, com.fasterxml.jackson.databind.ObjectMapper objectMapper, com.example.userservice.client.PaymentClient paymentClient) {
        this.redisTemplate = redisTemplate;
        this.hashOps = redisTemplate.opsForHash();
        this.objectMapper = objectMapper;
        this.storageClient = storageClient;
        this.paymentClient = paymentClient;
    }

    public Map<String, Object> checkout(String userId, com.example.userservice.dto.PaymentRequest paymentReq) {
        String key = "cart:" + userId;
        Map<String, String> entries = getCart(userId);
        if (entries == null || entries.isEmpty()) return Map.of("error", "empty_cart");

        java.util.List<Map<String, Object>> items = new java.util.ArrayList<>();
        try {
            for (String json : entries.values()) {
                CartItem it = objectMapper.readValue(json, CartItem.class);
                items.add(Map.of("sku", it.getSku(), "quantity", it.getQuantity()));
            }
        } catch (Exception e) {
            log.error("Failed to parse cart items for checkout user={}", userId, e);
            return Map.of("error", "bad_cart_data");
        }

        Map<String, Object> reserveReq = Map.of("userId", userId, "items", items, "expiresInSeconds", 600);
        ResponseEntity<Map> reserveResp;
        try {
            reserveResp = storageClient.reserveBatch(reserveReq);
        } catch (Exception e) {
            log.error("Error calling storage-service reserveBatch: {}", e.toString());
            return Map.of("error", "reserve_failed");
        }

        if (!reserveResp.getStatusCode().is2xxSuccessful()) {
            return Map.of("error", "insufficient_stock", "status", reserveResp.getStatusCodeValue(), "body", reserveResp.getBody());
        }

        Map body = reserveResp.getBody();
        if (body == null || !body.containsKey("reservationGroupId")) {
            return Map.of("error", "reserve_malformed_response");
        }

        String reservationGroupId = (String) body.get("reservationGroupId");

        // compute total amount by fetching inventory prices using inventoryId from reservations
        double total = 0.0;
        java.util.List<Map<String,Object>> reservations = (java.util.List<Map<String,Object>>) body.getOrDefault("reservations", java.util.List.of());
        for (Map<String,Object> r : reservations) {
            Object iid = r.get("inventoryId");
            Integer qty = (Integer) r.getOrDefault("quantity", 0);
            Long inventoryId = null;
            if (iid instanceof Number) inventoryId = ((Number) iid).longValue();
            if (inventoryId != null) {
                try {
                    ResponseEntity<Map> invResp = storageClient.getInventoryById(inventoryId);
                    if (invResp.getStatusCode().is2xxSuccessful() && invResp.getBody() != null) {
                        Object priceObj = invResp.getBody().get("price");
                        double price = 0.0;
                        if (priceObj instanceof Number) price = ((Number) priceObj).doubleValue();
                        total += price * qty;
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch inventory {} for pricing: {}", inventoryId, e.toString());
                }
            }
        }

        // call payment-service
        Map<String, Object> payReq = new java.util.HashMap<>();
        payReq.put("cardNumber", paymentReq.getCardNumber());
        payReq.put("cardHolderName", paymentReq.getCardHolderName());
        payReq.put("dateOfExpiry", paymentReq.getDateOfExpiry());
        payReq.put("cvv", paymentReq.getCvv());
        payReq.put("orderId", paymentReq.getOrderId());
        payReq.put("amount", total);
        try {
            ResponseEntity<Map> payResp = paymentClient.processPayment(payReq);
            if (payResp.getStatusCode().is2xxSuccessful()) {
                // finalize
                Map<String,Object> fin = Map.of("reservationGroupId", reservationGroupId, "orderId", payResp.getBody() != null ? payResp.getBody().get("transactionId") : java.util.UUID.randomUUID().toString());
                try { storageClient.finalizeBatch(fin); } catch (Exception e) { log.warn("finalizeBatch failed: {}", e.toString()); }
                // clear cart
                try { redisTemplate.delete(key); } catch (Exception e) { log.warn("failed to clear cart after finalize: {}", e.toString()); }
                return Map.of("status","OK","reservationGroupId", reservationGroupId, "payment", payResp.getBody());
            } else {
                // payment failed -> release
                try { storageClient.releaseBatch(Map.of("reservationGroupId", reservationGroupId)); } catch (Exception e) { log.warn("releaseBatch failed: {}", e.toString()); }
                return Map.of("error","payment_failed","reservationGroupId", reservationGroupId, "paymentResponse", payResp.getBody());
            }
        } catch (Exception e) {
            log.error("Error calling payment-service: {}", e.toString());
            try { storageClient.releaseBatch(Map.of("reservationGroupId", reservationGroupId)); } catch (Exception ex) { log.warn("releaseBatch failed after payment error: {}", ex.toString()); }
            return Map.of("error","payment_error");
        }
    }

    public CartItem addItem(String userId, String sku, int quantity) throws JsonProcessingException {
        CartItem item = new CartItem();
        item.setId(UUID.randomUUID().toString());
        item.setSku(sku);
        item.setQuantity(quantity);
        item.setReservationId(null);
        item.setReservedAt(null);
        item.setExpiresAt(null);

        String key = "cart:" + userId;
        String json = objectMapper.writeValueAsString(item);

        try {
            log.debug("Writing cart item to Redis: key={}, field={}, jsonSize={}", key, item.getId(), json.length());
            hashOps.put(key, item.getId(), json);
        } catch (DataAccessResourceFailureException e) {
            log.error("Redis unavailable while adding cart item for user={}", userId, e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error when writing to Redis for user={}", userId, e);
            throw e;
        }

        log.info("Added cart item: user={}, cartItemId={}, reservationId={}", userId, item.getId(), item.getReservationId());
        return item;
    }

    public Map<String, String> getCart(String userId) {
        String key = "cart:" + userId;
        try {
            return hashOps.entries(key);
        } catch (Exception e) {
            log.error("Redis unavailable when reading cart for user={}", userId, e);
            throw e;
        }
    }

    public boolean removeItem(String userId, String cartItemId) {
        String key = "cart:" + userId;
        String json = null;
        try {
            json = hashOps.get(key, cartItemId);
        } catch (Exception e) {
            log.error("Redis unavailable when removing cart item user={} cartItemId={}", userId, cartItemId, e);
            throw e;
        }

        if (json == null) return false;
        try {
            CartItem item = objectMapper.readValue(json, CartItem.class);
            String reservationId = item.getReservationId();
            if (reservationId != null) {
                try {
                    ResponseEntity<Map> resp = storageClient.releaseReservation(reservationId);
                    log.info("Release reservation response for {}: status={}, body={}", reservationId, resp.getStatusCodeValue(), resp.getBody());
                } catch (Exception e) {
                    log.warn("Error calling storage-service release for {}: {}", reservationId, e.toString());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse cart item JSON for deletion user={} cartItemId={}: {}", userId, cartItemId, e.toString());
        }

        try {
            hashOps.delete(key, cartItemId);
        } catch (Exception e) {
            log.error("Redis unavailable when deleting cart item user={} cartItemId={}", userId, cartItemId, e);
            throw e;
        }

        log.info("Removed cart item: user={}, cartItemId={}", userId, cartItemId);
        return true;
    }
}
