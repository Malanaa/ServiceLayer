package com.example.userservice.auth;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RefreshTokenStore {
    // token -> userId
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();
    private final Map<String, Instant> expires = new ConcurrentHashMap<>();

    public String createForUser(Long userId, long ttlSeconds) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, userId);
        expires.put(token, Instant.now().plusSeconds(ttlSeconds));
        return token;
    }

    public Optional<Long> validate(String token) {
        if (token == null) return Optional.empty();
        Instant exp = expires.get(token);
        if (exp == null || Instant.now().isAfter(exp)) {
            // remove expired
            tokens.remove(token);
            expires.remove(token);
            return Optional.empty();
        }
        return Optional.ofNullable(tokens.get(token));
    }

    public void revoke(String token) {
        if (token == null) return;
        tokens.remove(token);
        expires.remove(token);
    }
}
