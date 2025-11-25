package com.example.userservice.controller;

import com.example.userservice.client.StorageClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
public class UserSalesController {

    private final StorageClient storageClient;

    public UserSalesController(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    // Create a sale by proxying request to storage-service
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.createSale(body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // Get a sale by id from storage-service
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        ResponseEntity<Map> resp = storageClient.getSaleById(id);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // List sales with pagination (proxied to storage-service)
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        ResponseEntity<Map> resp = storageClient.listSales(page, size, sort);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // Delete a sale by id (proxied)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        storageClient.deleteSale(id);
        return ResponseEntity.ok().build();
    }

    // Update a sale by id (proxied to storage-service)
    @PutMapping("/updateSale/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.updateSale(id, body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }
}
