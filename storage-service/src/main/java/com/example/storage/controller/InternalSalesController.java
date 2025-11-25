package com.example.storage.controller;

import com.example.storage.model.Sale;
import com.example.storage.repository.SaleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Optional;

@RestController
@RequestMapping("/internal/sales")
public class InternalSalesController {

    private final SaleRepository saleRepository;

    public InternalSalesController(SaleRepository saleRepository) {
        this.saleRepository = saleRepository;
    }

    @PostMapping
    // Create a sale record
    @PostMapping
    public ResponseEntity<Sale> create(@RequestBody Sale sale) {
        Sale saved = saleRepository.save(sale);
        return ResponseEntity.created(URI.create("/internal/sales/" + saved.getId())).body(saved);
    }

    // Get a sale by id
    @GetMapping("/{id}")
    public ResponseEntity<Sale> get(@PathVariable Long id) {
        Optional<Sale> o = saleRepository.findById(id);
        return o.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // List sales with pagination
    @GetMapping
    public ResponseEntity<Page<Sale>> list(Pageable pageable) {
        Page<Sale> page = saleRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    // Delete a sale by id
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!saleRepository.existsById(id)) return ResponseEntity.notFound().build();
        saleRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Update a sale record
    @PutMapping("/updateSale/{id}")
    public ResponseEntity<Sale> update(@PathVariable Long id, @RequestBody Sale sale) {
        Optional<Sale> o = saleRepository.findById(id);
        if (o.isEmpty()) return ResponseEntity.notFound().build();
        Sale existing = o.get();
        existing.setCustomer(sale.getCustomer());
        existing.setProduct(sale.getProduct());
        existing.setPrice(sale.getPrice());
        existing.setQuantity(sale.getQuantity());
        existing.setPurchasedAt(sale.getPurchasedAt());
        Sale saved = saleRepository.save(existing);
        return ResponseEntity.ok(saved);
    }
}
