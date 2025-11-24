package com.example.storage.controller;

import com.example.storage.model.Inventory;
import com.example.storage.repository.InventoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/internal/inventory")
public class InternalInventoryController {

    private final InventoryRepository inventoryRepository;

    public InternalInventoryController(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @PostMapping
    public ResponseEntity<Inventory> create(@RequestBody Inventory inv) {
        if (inv.getSku() == null) return ResponseEntity.badRequest().build();
        if (inventoryRepository.findBySku(inv.getSku()).isPresent()) return ResponseEntity.status(409).build();
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.created(URI.create("/internal/inventory/" + saved.getId())).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inventory> get(@PathVariable Long id) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        return o.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<Inventory>> list() {
        return ResponseEntity.ok(inventoryRepository.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!inventoryRepository.existsById(id)) return ResponseEntity.notFound().build();
        inventoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
