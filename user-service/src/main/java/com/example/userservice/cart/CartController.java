package com.example.userservice.cart;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    // Add an item to the user's cart (cart entries are persisted in Redis)
    @PostMapping("/items")
    public ResponseEntity<?> addItem(@RequestHeader("X-User-Id") String userId, @RequestBody Map<String,Object> body) throws JsonProcessingException {
        String sku = (String) body.get("sku");
        int qty = (int) body.getOrDefault("quantity", 1);
        CartItem item = cartService.addItem(userId, sku, qty);
        if (item == null) return ResponseEntity.status(409).body(Map.of("error","insufficient_stock"));
        return ResponseEntity.status(201).body(item);
    }

    // Return all items currently in the user's cart
    @GetMapping
    public ResponseEntity<?> getCart(@RequestHeader("X-User-Id") String userId) {
        Map<String,String> entries = cartService.getCart(userId);
        return ResponseEntity.ok(entries);
    }

    // Remove a specific item from the user's cart
    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> removeItem(@RequestHeader("X-User-Id") String userId, @PathVariable("id") String cartItemId) {
        boolean ok = cartService.removeItem(userId, cartItemId);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
