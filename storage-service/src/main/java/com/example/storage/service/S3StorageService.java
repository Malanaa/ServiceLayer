package com.example.storage.service;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Service
public class S3StorageService {

    private final MinioClient client;
    private final String bucket;

    public S3StorageService(
            @Value("${app.s3.endpoint}") String endpoint,
            @Value("${app.s3.access-key}") String accessKey,
            @Value("${app.s3.secret-key}") String secretKey,
            @Value("${app.s3.bucket}") String bucket
    ) {
        this.client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        this.bucket = bucket;
    }

    @PostConstruct
    public void ensureBucket() {
        try {
            boolean exists = client.bucketExists(io.minio.BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(io.minio.MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception ignored) {
        }
    }

    public String upload(InputStream in, long length, String contentType) throws Exception {
        String key = UUID.randomUUID().toString();
        client.putObject(PutObjectArgs.builder()
                .bucket(bucket)
                .object(key)
                .stream(in, length, -1)
                .contentType(contentType)
                .build());
        return key;
    }

    public String presignGetUrl(String key, Duration ttl) {
        try {
            return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(key)
                    .expiry((int) Math.max(1, ttl.toSeconds()))
                    .build());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
