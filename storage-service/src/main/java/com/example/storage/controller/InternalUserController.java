package com.example.storage.controller;

import com.example.storage.model.User;
import com.example.storage.repository.UserRepository;
import jakarta.validation.Valid;
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

    @PostMapping
    // Create a user in storage-service
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        if (user.getEmail() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(409).build();
        }
        User saved = userRepository.save(user);
        return ResponseEntity.created(URI.create("/internal/users/" + saved.getId())).body(saved);
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
