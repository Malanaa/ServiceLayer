package com.example.storage.controller;

import com.example.storage.model.Image;
import com.example.storage.repository.ImageRepository;
import com.example.storage.service.S3StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final S3StorageService s3;
    private final ImageRepository imageRepository;

    public ImageController(S3StorageService s3, ImageRepository imageRepository) {
        this.s3 = s3;
        this.imageRepository = imageRepository;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, @RequestParam(value = "inventoryId", required = false) Long inventoryId) throws Exception {
        String key = s3.upload(file.getInputStream(), file.getSize(), file.getContentType());
        Image img = new Image();
        img.setObjectKey(key);
        img.setContentType(file.getContentType());
        img.setSize(file.getSize());
        img.setInventoryId(inventoryId);
        imageRepository.save(img);
        String getUrl = s3.presignGetUrl(key, Duration.ofMinutes(60));
        return ResponseEntity.ok(Map.of("key", key, "url", getUrl));
    }

    @GetMapping("/{key}")
    public ResponseEntity<?> get(@PathVariable String key) {
        return imageRepository.findByObjectKey(key)
                .map(img -> ResponseEntity.status(302).header("Location", s3.presignGetUrl(key, Duration.ofMinutes(10))).build())
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
