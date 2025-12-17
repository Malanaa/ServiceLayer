package com.example.storage.repository;

import com.example.storage.model.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<Image, Long> {
    Optional<Image> findByObjectKey(String objectKey);
}
