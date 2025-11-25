package com.example.userservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import java.net.URI;

@Configuration
public class RedisConfig {

    private final Logger log = LoggerFactory.getLogger(RedisConfig.class);

    @Value("${spring.redis.url:}")
    private String redisUrl;

    @Value("${spring.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.redis.port:6379}")
    private int redisPort;

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        try {
            if (redisUrl != null && !redisUrl.isBlank()) {
                URI uri = URI.create(redisUrl);
                String host = uri.getHost() == null ? redisHost : uri.getHost();
                int port = uri.getPort() == -1 ? redisPort : uri.getPort();
                log.info("Configuring redis from spring.redis.url={} -> {}:{}", redisUrl, host, port);
                return new LettuceConnectionFactory(new RedisStandaloneConfiguration(host, port));
            } else {
                log.info("Configuring redis from spring.redis.host={} spring.redis.port={}", redisHost, redisPort);
                return new LettuceConnectionFactory(new RedisStandaloneConfiguration(redisHost, redisPort));
            }
        } catch (Exception e) {
            return new LettuceConnectionFactory(new RedisStandaloneConfiguration(redisHost, redisPort));
        }
    }
}
