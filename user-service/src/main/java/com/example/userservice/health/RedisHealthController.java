package com.example.userservice.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/redisHealthCheck")
public class RedisHealthController {

    private static final Logger log = LoggerFactory.getLogger(RedisHealthController.class);
    private final StringRedisTemplate redisTemplate;

    public RedisHealthController(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/redis")
    public ResponseEntity<Map<String, Object>> redis() {
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            log.debug("Redis ping returned: {}", pong);
            return ResponseEntity.ok(Map.of("status", "UP", "ping", pong));
        } catch (Exception e) {
            log.warn("Redis health check failed", e);
            return ResponseEntity.status(503).body(Map.of("status", "DOWN", "error", e.getMessage()));
        }
    }
}
