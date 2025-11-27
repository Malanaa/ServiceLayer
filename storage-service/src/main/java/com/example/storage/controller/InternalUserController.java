package com.example.storage.controller;

import com.example.storage.model.User;
import com.example.storage.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Optional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    private final UserRepository userRepository;

    public InternalUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${app.admin.registration.token:}")
    private String adminRegistrationToken;

    @PostMapping
    // Create a user in storage-service
    public ResponseEntity<User> createUser(@Valid @RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        if (email == null) return ResponseEntity.badRequest().build();
        if (userRepository.findByEmail(email).isPresent()) return ResponseEntity.status(409).build();

        User user = new User();
        user.setName((String) payload.getOrDefault("name", ""));
        user.setLastName((String) payload.getOrDefault("lastName", ""));
        user.setEmail(email);
        String pwHash = (String) payload.getOrDefault("passwordHash", null);
        user.setPasswordHash(pwHash);
        user.setCreditCardMask((String) payload.getOrDefault("creditCardMask", null));
        user.setShippingAddress((String) payload.getOrDefault("shippingAddress", null));
        user.setPhoneNumber((String) payload.getOrDefault("phoneNumber", null));
        String userType = (String) payload.getOrDefault("userType", "USER");
        // Admins must be created via the dedicated admin registration endpoint
        if ("ADMIN".equalsIgnoreCase(userType)) {
            return ResponseEntity.status(403).build();
        }
        user.setUserType(userType);

        User saved = userRepository.save(user);
        return ResponseEntity.created(URI.create("/internal/users/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<User> ou = userRepository.findById(id);
        if (ou.isEmpty()) return ResponseEntity.notFound().build();
        User existing = ou.get();
        if (payload.containsKey("name")) existing.setName((String) payload.get("name"));
        if (payload.containsKey("lastName")) existing.setLastName((String) payload.get("lastName"));
        if (payload.containsKey("creditCardMask")) existing.setCreditCardMask((String) payload.get("creditCardMask"));
        if (payload.containsKey("shippingAddress")) existing.setShippingAddress((String) payload.get("shippingAddress"));
        if (payload.containsKey("phoneNumber")) existing.setPhoneNumber((String) payload.get("phoneNumber"));
        if (payload.containsKey("userType")) {
            String ut = (String) payload.get("userType");
            existing.setUserType(ut);
        }
        userRepository.save(existing);
        return ResponseEntity.ok(existing);
    }

    // Retrieve a user by id
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        Optional<User> u = userRepository.findById(id);
        return u.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Find a user by email
    @GetMapping
    public ResponseEntity<User> findByEmail(@RequestParam(required = false) String email) {
        if (email == null) return ResponseEntity.badRequest().build();
        return userRepository.findByEmail(email).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Authenticate user credentials
    @PostMapping("/auth")
    public ResponseEntity<User> authenticate(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) return ResponseEntity.badRequest().build();
        Optional<User> u = userRepository.findByEmail(email);
        if (u.isEmpty()) return ResponseEntity.status(401).build();
        User user = u.get();
        String storedHash = user.getPasswordHash();
        if (storedHash == null) return ResponseEntity.status(401).build();
        if (!passwordEncoder.matches(password, storedHash)) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(user);
    }
}
