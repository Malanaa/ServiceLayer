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

    // Insert a new inventory item via storage-service
    @PostMapping("/insertItem")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.createInventory(body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // Get an inventory item by id (proxied to storage-service)
    @GetMapping("/getItem/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        ResponseEntity<Map> resp = storageClient.getInventoryById(id);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // List inventory items with pagination (proxied)
    @GetMapping("/getItems")
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        ResponseEntity<Map> resp = storageClient.listInventory(page, size, sort);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }

    // Delete an inventory item by id (proxied)
    @DeleteMapping("/deleteItem/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        storageClient.deleteInventory(id);
        return ResponseEntity.ok().build();
    }

    // Update an inventory item by id (proxied)
    @PutMapping("/updateItem/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ResponseEntity<Map> resp = storageClient.updateInventory(id, body);
        return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
    }
}
