package com.example.storage.controller;

import com.example.storage.model.User;
import com.example.storage.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/internal/admin")
public class InternalAdminController {

    private final UserRepository userRepository;

    public InternalAdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Value("${app.admin.registration.token:}")
    private String adminRegistrationToken;

    // Requires Admin Token
    @PostMapping("/register")
    public ResponseEntity<User> registerAdmin(@Valid @RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        if (email == null) return ResponseEntity.badRequest().build();
        if (userRepository.findByEmail(email).isPresent()) return ResponseEntity.status(409).build();

        String adminToken = (String) payload.getOrDefault("adminToken", "");
        if (adminRegistrationToken == null || adminRegistrationToken.isBlank() || !adminRegistrationToken.equals(adminToken)) {
            return ResponseEntity.status(403).build();
        }

        User user = new User();
        user.setName((String) payload.getOrDefault("name", ""));
        user.setLastName((String) payload.getOrDefault("lastName", ""));
        user.setEmail(email);
        String pwHash = (String) payload.getOrDefault("passwordHash", null);
        user.setPasswordHash(pwHash);
        user.setCreditCardMask((String) payload.getOrDefault("creditCardMask", null));
        user.setShippingAddress((String) payload.getOrDefault("shippingAddress", null));
        user.setPhoneNumber((String) payload.getOrDefault("phoneNumber", null));
        user.setUserType("ADMIN");

        User saved = userRepository.save(user);
        return ResponseEntity.created(URI.create("/internal/admin/register/" + saved.getId())).body(saved);
    }
}
