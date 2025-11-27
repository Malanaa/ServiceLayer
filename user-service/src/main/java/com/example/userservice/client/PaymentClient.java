package com.example.userservice.client;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class PaymentClient {

    private final RestTemplate restTemplate;
    private final String paymentBaseUrl;

    public PaymentClient() {
        this.restTemplate = new RestTemplate();
        this.paymentBaseUrl = System.getenv().getOrDefault("PAYMENT_SERVICE_URL", "http://localhost:9102");
    }

    public ResponseEntity<Map> processPayment(Map<String, Object> payload) {
        String url = paymentBaseUrl + "/api/payment/process";
        return restTemplate.postForEntity(url, payload, Map.class);
    }

    public ResponseEntity<String> reset() {
        String url = paymentBaseUrl + "/api/payment/reset";
        return restTemplate.postForEntity(url, null, String.class);
    }
}
