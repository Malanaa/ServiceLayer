package com.example.storage.repository;

import com.example.storage.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, String> {
	List<Reservation> findByReservationGroupId(String reservationGroupId);
	List<Reservation> findByStatusAndExpiresAtBefore(String status, OffsetDateTime time);
}
