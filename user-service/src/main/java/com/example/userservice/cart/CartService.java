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

    public CartService(StringRedisTemplate redisTemplate, StorageClient storageClient, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.hashOps = redisTemplate.opsForHash();
        this.objectMapper = objectMapper;
        this.storageClient = storageClient;
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

        log.info("Added cart item: user={}, cartItemId={}, reservationId={}", userId, item.getId(), reservationId);
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
