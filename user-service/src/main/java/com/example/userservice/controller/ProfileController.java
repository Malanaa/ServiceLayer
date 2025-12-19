package com.example.userservice.controller;

import com.example.userservice.client.StorageClient;
import com.example.userservice.auth.RefreshTokenStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final StorageClient storageClient;
    private final RefreshTokenStore refreshTokenStore;

    public ProfileController(StorageClient storageClient, RefreshTokenStore refreshTokenStore) {
        this.storageClient = storageClient;
        this.refreshTokenStore = refreshTokenStore;
    }

    // Helper to build shipping address
    private String buildShippingAddress(Map<String, Object> address) {
        if (address == null) return null;
        StringBuilder sb = new StringBuilder();
        if (address.get("street") != null) sb.append(address.get("street"));
        if (address.get("city") != null && sb.length() > 0) sb.append(", ").append(address.get("city"));
        if (address.get("state") != null && sb.length() > 0) sb.append(", ").append(address.get("state"));
        if (address.get("zip") != null && sb.length() > 0) sb.append(", ").append(address.get("zip"));
        return sb.length() > 0 ? sb.toString() : null;
    }

    private String maskCard(Map<String, Object> payment) {
        if (payment == null || payment.get("cardNumber") == null) return null;
        String digits = payment.get("cardNumber").toString().replaceAll("\\D", "");
        if (digits.length() == 0) return null;
        String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : digits;
        return "****-****-****-" + last4;
    }

    @RequestMapping(method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateProfile(@CookieValue(name = "refresh_token", required = false) String refreshToken,
                                           @RequestBody Map<String, Object> body) {
        var maybe = refreshTokenStore.validate(refreshToken);
        if (maybe.isEmpty()) return ResponseEntity.status(401).body(Map.of("authenticated", false));
        Long userId = maybe.get();

        Map<String, Object> payload = new HashMap<>();
        if (body.containsKey("address")) {
            Object addrObj = body.get("address");
            if (addrObj instanceof Map) {
                Map<String, Object> a = (Map<String, Object>) addrObj;
                String addr = buildShippingAddress(a);
                if (addr != null) payload.put("shippingAddress", addr);
                if (a.get("street") != null) payload.put("street", a.get("street"));
                if (a.get("city") != null) payload.put("city", a.get("city"));
                if (a.get("province") != null) payload.put("province", a.get("province"));
                if (a.get("zip") != null) payload.put("zip", a.get("zip"));
            }
        }
        if (body.containsKey("payment")) {
            Object payObj = body.get("payment");
            if (payObj instanceof Map) {
                Map<String, Object> p = (Map<String, Object>) payObj;
                String mask = maskCard(p);
                if (mask != null) payload.put("creditCardMask", mask);
                if (p.get("cardHolderName") != null) payload.put("cardHolderName", p.get("cardHolderName"));
                if (p.get("expiry") != null) payload.put("cardExpiry", p.get("expiry"));
                // never store cvc
            }
        }
        if (body.containsKey("phone")) {
            String phone = body.get("phone").toString().replaceAll("[\\s\\-]", "");
            payload.put("phoneNumber", phone);
        }

        if (payload.isEmpty()) return ResponseEntity.ok(Map.of("updated", false));

        var resp = storageClient.updateUser(userId, payload);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }
}
