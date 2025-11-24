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

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.createSale(body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        ResponseEntity<Map> resp = storageClient.getSaleById(id);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @GetMapping
    public ResponseEntity<?> list() {
        ResponseEntity<List> resp = storageClient.listSales();
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        storageClient.deleteSale(id);
        return ResponseEntity.ok().build();
    }
}
