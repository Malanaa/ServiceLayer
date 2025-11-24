package com.example.userservice.client;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Component
public class StorageClient {

    private final RestTemplate restTemplate;
    private final String storageBaseUrl;

    public StorageClient() {
        this.restTemplate = new RestTemplate();
        this.storageBaseUrl = System.getenv().getOrDefault("STORAGE_SERVICE_URL", "http://localhost:9001");
    }

    public ResponseEntity<Map> createUser(Map<String, Object> userPayload) {
        String url = storageBaseUrl + "/internal/users";
        return restTemplate.postForEntity(url, userPayload, Map.class);
    }

    public ResponseEntity<Map> getUserById(Long id) {
        String url = storageBaseUrl + "/internal/users/" + id;
        return restTemplate.getForEntity(url, Map.class);
    }

    public String baseUrl() { return storageBaseUrl; }

    public ResponseEntity<Map> authenticate(String email, String password) {
        String url = storageBaseUrl + "/internal/users/auth";
        Map<String, String> body = Map.of("email", email, "password", password);
        return restTemplate.postForEntity(url, body, Map.class);
    }

    // Inventory
    public ResponseEntity<Map> createInventory(Map<String, Object> payload) {
        String url = storageBaseUrl + "/internal/inventory/insertItem";
        return restTemplate.postForEntity(url, payload, Map.class);
    }

    public ResponseEntity<Map> getInventoryById(Long id) {
        String url = storageBaseUrl + "/internal/inventory/getItem/" + id;
        return restTemplate.getForEntity(url, Map.class);
    }

    public ResponseEntity<List> listInventory() {
        String url = storageBaseUrl + "/internal/inventory/getItems";
        return restTemplate.getForEntity(url, List.class);
    }

    public ResponseEntity<Map> listInventory(int page, int size, String sort) {
        UriComponentsBuilder ub = UriComponentsBuilder.fromHttpUrl(storageBaseUrl + "/internal/inventory")
                .queryParam("page", page)
                .queryParam("size", size);
        if (sort != null && !sort.isEmpty()) ub.queryParam("sort", sort);
        String uri = ub.toUriString();
        return restTemplate.getForEntity(uri, Map.class);
    }

    public void deleteInventory(Long id) {
        String url = storageBaseUrl + "/internal/inventory/deleteItem/" + id;
        restTemplate.delete(url);
    }

    // Sales
    public ResponseEntity<Map> createSale(Map<String, Object> payload) {
        String url = storageBaseUrl + "/internal/sales";
        return restTemplate.postForEntity(url, payload, Map.class);
    }

    public ResponseEntity<Map> getSaleById(Long id) {
        String url = storageBaseUrl + "/internal/sales/" + id;
        return restTemplate.getForEntity(url, Map.class);
    }

    public ResponseEntity<List> listSales() {
        String url = storageBaseUrl + "/internal/sales";
        return restTemplate.getForEntity(url, List.class);
    }

    public ResponseEntity<Map> listSales(int page, int size, String sort) {
        UriComponentsBuilder ub = UriComponentsBuilder.fromHttpUrl(storageBaseUrl + "/internal/sales")
                .queryParam("page", page)
                .queryParam("size", size);
        if (sort != null && !sort.isEmpty()) ub.queryParam("sort", sort);
        String uri = ub.toUriString();
        return restTemplate.getForEntity(uri, Map.class);
    }

    public void deleteSale(Long id) {
        String url = storageBaseUrl + "/internal/sales/" + id;
        restTemplate.delete(url);
    }
}
