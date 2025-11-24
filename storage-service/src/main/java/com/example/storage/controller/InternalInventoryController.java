package com.example.storage.controller;

import com.example.storage.model.Inventory;
import com.example.storage.repository.InventoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Optional;

@RestController
@RequestMapping("/internal/inventory")
public class InternalInventoryController {

    private final InventoryRepository inventoryRepository;

    public InternalInventoryController(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @PostMapping("/insertItem")
    public ResponseEntity<Inventory> create(@RequestBody Inventory inv) {
        if (inv.getSku() == null) return ResponseEntity.badRequest().build();
        if (inventoryRepository.findBySku(inv.getSku()).isPresent()) return ResponseEntity.status(409).build();
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.created(URI.create("/internal/inventory/getItem/" + saved.getId())).body(saved);
    }
    @GetMapping("/getItem/{id}")
    public ResponseEntity<Inventory> get(@PathVariable Long id) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        return o.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/getItems")
    public ResponseEntity<Page<Inventory>> list(Pageable pageable) {
        Page<Inventory> page = inventoryRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    @DeleteMapping("/deleteItem/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!inventoryRepository.existsById(id)) return ResponseEntity.notFound().build();
        inventoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/updateItem/{id}")
    public ResponseEntity<Inventory> update(@PathVariable Long id, @RequestBody Inventory inv) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        if (o.isEmpty()) return ResponseEntity.notFound().build();
        Inventory existing = o.get();
        existing.setSku(inv.getSku());
        existing.setName(inv.getName());
        existing.setDescription(inv.getDescription());
        existing.setQuantity(inv.getQuantity());
        existing.setPrice(inv.getPrice());
        Inventory saved = inventoryRepository.save(existing);
        return ResponseEntity.ok(saved);
    }
}
