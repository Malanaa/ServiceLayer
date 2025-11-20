package com.example.userservice.controller;

import com.example.userservice.client.StorageClient;
import com.example.userservice.auth.RefreshTokenStore;
import com.example.userservice.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StorageClient storageClient;
    private final RefreshTokenStore refreshTokenStore;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // refresh token TTL (seconds)
    private static final long REFRESH_TTL_SECONDS = 60L * 60L * 24L * 7L; // 7 days

    public AuthController(StorageClient storageClient, RefreshTokenStore refreshTokenStore) {
        this.storageClient = storageClient;
        this.refreshTokenStore = refreshTokenStore;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        // Hash password here (business logic)
        String hash = passwordEncoder.encode(req.getPassword());
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", req.getName());
        payload.put("email", req.getEmail());
        payload.put("passwordHash", hash);
        payload.put("roles", "ROLE_USER");

        ResponseEntity<Map> resp = storageClient.createUser(payload);
        if (resp.getStatusCode().is2xxSuccessful()) {
            // create refresh token and send as HttpOnly cookie
            Map body = resp.getBody();
            Long userId = null;
            if (body != null && body.get("id") instanceof Number) {
                userId = ((Number) body.get("id")).longValue();
            }
            if (userId != null) {
                String token = refreshTokenStore.createForUser(userId, REFRESH_TTL_SECONDS);
                org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", token)
                        .httpOnly(true)
                        .secure(false) // in local dev, set false; in prod set true
                        .path("/api/auth")
                        .maxAge(REFRESH_TTL_SECONDS)
                        .sameSite("Strict")
                        .build();
                return ResponseEntity.status(201).header("Set-Cookie", cookie.toString()).body(body);
            }
            return ResponseEntity.status(201).body(body);
        } else if (resp.getStatusCode().value() == 409) {
            return ResponseEntity.status(409).body(Map.of("error", "email_exists"));
        }
        return ResponseEntity.status(500).body(Map.of("error", "storage_failure"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@org.springframework.web.bind.annotation.CookieValue(name = "refresh_token", required = false) String refreshToken) {
        var maybe = refreshTokenStore.validate(refreshToken);
        if (maybe.isEmpty()) return ResponseEntity.status(401).body(Map.of("authenticated", false));
        Long userId = maybe.get();
        // fetch user from storage-service via client helper
        var resp = storageClient.getUserById(userId);
        if (resp.getStatusCode().is2xxSuccessful()) return ResponseEntity.ok(Map.of("authenticated", true, "user", resp.getBody()));
        return ResponseEntity.status(500).body(Map.of("error", "storage_failure"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@org.springframework.web.bind.annotation.CookieValue(name = "refresh_token", required = false) String refreshToken) {
        if (refreshToken != null) refreshTokenStore.revoke(refreshToken);
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/api/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        return ResponseEntity.ok().header("Set-Cookie", cookie.toString()).body(Map.of("logged_out", true));
    }
}
