package com.example.userservice.controller;

import com.example.userservice.client.StorageClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class UserInventoryController {

    private final StorageClient storageClient;

    public UserInventoryController(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.createInventory(body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        ResponseEntity<Map> resp = storageClient.getInventoryById(id);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @GetMapping
    public ResponseEntity<?> list() {
        ResponseEntity<List> resp = storageClient.listInventory();
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        storageClient.deleteInventory(id);
        return ResponseEntity.ok().build();
    }
}
