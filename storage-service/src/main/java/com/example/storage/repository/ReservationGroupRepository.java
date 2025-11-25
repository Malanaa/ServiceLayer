package com.example.storage.repository;

import com.example.storage.model.ReservationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface ReservationGroupRepository extends JpaRepository<ReservationGroup, String> {
    List<ReservationGroup> findByStatusAndExpiresAtBefore(String status, OffsetDateTime time);
}
