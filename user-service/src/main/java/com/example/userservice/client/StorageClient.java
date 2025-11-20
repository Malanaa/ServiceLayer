package com.example.userservice.client;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

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
}
