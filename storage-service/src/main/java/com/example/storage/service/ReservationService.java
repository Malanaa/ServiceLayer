package com.example.storage.service;

import com.example.storage.model.ReservationGroup;
import com.example.storage.model.Reservation;
import com.example.storage.model.Inventory;
import com.example.storage.repository.ReservationGroupRepository;
import com.example.storage.repository.ReservationRepository;
import com.example.storage.repository.InventoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReservationService {
    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationGroupRepository reservationGroupRepository;
    private final InventoryRepository inventoryRepository;

    public ReservationService(ReservationRepository reservationRepository, ReservationGroupRepository reservationGroupRepository, InventoryRepository inventoryRepository) {
        this.reservationRepository = reservationRepository;
        this.reservationGroupRepository = reservationGroupRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Transactional
    public void releaseReservationGroup(String reservationGroupId) {
        List<Reservation> reservations = reservationRepository.findByReservationGroupId(reservationGroupId);
        if (reservations.isEmpty()) {
            log.debug("No reservations found for group {}", reservationGroupId);
            return;
        }

        for (Reservation r : reservations) {
            if (!"RESERVED".equals(r.getStatus())) continue;
            // try to restore reserved qty
            try {
                if (r.getInventoryId() != null) {
                    inventoryRepository.findById(r.getInventoryId()).ifPresent(inv -> {
                        int reserved = inv.getReserved() == null ? 0 : inv.getReserved();
                        inv.setReserved(Math.max(0, reserved - r.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                } else {
                    inventoryRepository.findBySku(r.getSku()).ifPresent(inv -> {
                        int reserved = inv.getReserved() == null ? 0 : inv.getReserved();
                        inv.setReserved(Math.max(0, reserved - r.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                }
            } catch (Exception e) {
                log.warn("Failed to restore reserved quantity for reservation {}: {}", r.getId(), e.toString());
            }
            r.setStatus("RELEASED");
            reservationRepository.save(r);
        }

        reservationGroupRepository.findById(reservationGroupId).ifPresent(g -> {
            g.setStatus("RELEASED");
            reservationGroupRepository.save(g);
        });
    }

    @Scheduled(fixedDelayString = "60000")
    public void cleanupExpiredReservations() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Reservation> expired = reservationRepository.findByStatusAndExpiresAtBefore("RESERVED", now);
        if (expired.isEmpty()) return;
        log.info("Found {} expired reservations, releasing groups", expired.size());
        // release per group
        expired.stream().map(Reservation::getReservationGroupId).distinct().forEach(this::releaseReservationGroup);
    }

    @Transactional
    public void finalizeReservationGroup(String reservationGroupId, String orderId) {
        List<Reservation> reservations = reservationRepository.findByReservationGroupId(reservationGroupId);
        if (reservations.isEmpty()) return;

        for (Reservation r : reservations) {
            if (!"RESERVED".equals(r.getStatus())) continue;
            // decrement inventory total and reserved
            try {
                if (r.getInventoryId() != null) {
                    inventoryRepository.findById(r.getInventoryId()).ifPresent(inv -> {
                        int reserved = inv.getReserved() == null ? 0 : inv.getReserved();
                        inv.setReserved(Math.max(0, reserved - r.getQuantity()));
                        int qty = inv.getQuantity() == null ? 0 : inv.getQuantity();
                        inv.setQuantity(Math.max(0, qty - r.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                } else {
                    inventoryRepository.findBySku(r.getSku()).ifPresent(inv -> {
                        int reserved = inv.getReserved() == null ? 0 : inv.getReserved();
                        inv.setReserved(Math.max(0, reserved - r.getQuantity()));
                        int qty = inv.getQuantity() == null ? 0 : inv.getQuantity();
                        inv.setQuantity(Math.max(0, qty - r.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                }
            } catch (Exception e) {
                log.warn("Failed to finalize inventory for reservation {}: {}", r.getId(), e.toString());
                throw e;
            }
            r.setStatus("FINALIZED");
            r.setOrderId(orderId);
            reservationRepository.save(r);
        }

        reservationGroupRepository.findById(reservationGroupId).ifPresent(g -> {
            g.setStatus("FINALIZED");
            reservationGroupRepository.save(g);
        });
    }
}
