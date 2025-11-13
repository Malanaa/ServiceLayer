package com.example.userservice.controller;

import com.example.userservice.client.StorageClient;
import com.example.userservice.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StorageClient storageClient;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(StorageClient storageClient) {
        this.storageClient = storageClient;
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
            return ResponseEntity.status(201).body(resp.getBody());
        } else if (resp.getStatusCode().value() == 409) {
            return ResponseEntity.status(409).body(Map.of("error", "email_exists"));
        }
        return ResponseEntity.status(500).body(Map.of("error", "storage_failure"));
    }
}
