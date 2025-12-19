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
    // Register a new user and return created user and refresh cookie
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        // Hash password here 
        String hash = passwordEncoder.encode(req.getPassword());
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", req.getName());
        payload.put("lastName", req.getLastName());
        payload.put("email", req.getEmail());
        payload.put("passwordHash", hash);
    
        if (req.getUserType() != null && req.getUserType().equalsIgnoreCase("ADMIN")) {
            payload.put("userType", "ADMIN");
            if (req.getAdminToken() != null) payload.put("adminToken", req.getAdminToken());
        }
        // normalize and store contact/shipping info
        if (req.getShippingAddress() != null) {
            String addr = req.getShippingAddress().trim().replaceAll("\n", ", ");
            payload.put("shippingAddress", addr);
        }
        if (req.getPhoneNumber() != null) {
            // normalize phone: remove spaces and dashes
            String phone = req.getPhoneNumber().replaceAll("[\\s\\-]", "");
            payload.put("phoneNumber", phone);
        }
        // mask credit card before storing: keep only last 4
        String cc = req.getCreditCardNumber();
        if (cc != null) {
            String digits = cc.replaceAll("\\D", "");
            String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : digits;
            String mask = "****-****-****-" + last4;
            payload.put("creditCardMask", mask);
        }

        ResponseEntity<Map> resp;
        if (req.getUserType() != null && req.getUserType().equalsIgnoreCase("ADMIN")) {
            resp = storageClient.registerAdmin(payload);
        } else {
            resp = storageClient.createUser(payload);
        }
        if (resp.getStatusCode().is2xxSuccessful()) {
            // create refresh token and send as HttpOnly cookie
            Map body = resp.getBody();
            Long userId = null;
            if (body != null && body.get("id") instanceof Number) {
                userId = ((Number) body.get("id")).longValue();
            }

            // Persist profile fields into storage to avoid extra frontend calls
            try {
                Map<String, Object> update = new HashMap<>();
                if (req.getShippingAddress() != null) update.put("shippingAddress", req.getShippingAddress());
                if (req.getPhoneNumber() != null) update.put("phoneNumber", req.getPhoneNumber());
                if (req.getCreditCardNumber() != null) {
                    String digits = req.getCreditCardNumber().replaceAll("\\D", "");
                    String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : digits;
                    update.put("creditCardMask", "****-****-****-" + last4);
                }
                // if frontend provided structured address or payment fields, persist components too
                if (req.getShippingAddress() == null) {
                    // nothing to do here; ProfileController will accept structured address
                }
                // In DTO, if we had extra payment fields (cardHolderName, expiry), capture them
                // but note req DTO doesn't currently expose them directly; we rely on ProfileController for structured writes
                
                if (userId != null && !update.isEmpty()) {
                    storageClient.updateUser(userId, update);
                }
            } catch (Exception e) {
                System.err.println("Failed to update profile after registration: " + e.getMessage());
            }

            if (userId != null) {
                String token = refreshTokenStore.createForUser(userId, REFRESH_TTL_SECONDS);
                org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", token)
                        .httpOnly(true)
                        .secure(false) // set true when in cloud
                    .path("/api")
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

    @PostMapping("/login")
    // Authenticate user credentials and return auth info with refresh cookie
    public ResponseEntity<?> login(@Valid @RequestBody com.example.userservice.dto.LoginRequest req) {
        var resp = storageClient.authenticate(req.getEmail(), req.getPassword());
        if (resp.getStatusCode().is2xxSuccessful()) {
            Map body = resp.getBody();
            Long userId = null;
            if (body != null && body.get("id") instanceof Number) {
                userId = ((Number) body.get("id")).longValue();
            }
            if (userId != null) {
                String token = refreshTokenStore.createForUser(userId, REFRESH_TTL_SECONDS);
                org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", token)
                        .httpOnly(true)
                        .secure(false)
                    .path("/api")
                        .maxAge(REFRESH_TTL_SECONDS)
                        .sameSite("Strict")
                        .build();
                return ResponseEntity.ok().header("Set-Cookie", cookie.toString()).body(Map.of("authenticated", true, "user", body));
            }
            return ResponseEntity.status(500).body(Map.of("error", "storage_failure"));
        } else if (resp.getStatusCode().value() == 401) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }
        return ResponseEntity.status(500).body(Map.of("error", "storage_failure"));
    }

    @GetMapping("/me")
    // Return current authenticated user based on refresh token cookie
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
    // Logout user by revoking refresh token and clearing cookies
    public ResponseEntity<?> logout(@org.springframework.web.bind.annotation.CookieValue(name = "refresh_token", required = false) String refreshToken) {
        if (refreshToken != null) refreshTokenStore.revoke(refreshToken);
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(false)
            .path("/api")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        return ResponseEntity.ok().header("Set-Cookie", cookie.toString()).body(Map.of("logged_out", true));
    }
}
