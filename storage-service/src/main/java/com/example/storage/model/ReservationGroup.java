package com.example.storage.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "reservation_groups")
public class ReservationGroup {
    @Id
    private String id;
    private String checkoutId;
    private String userId;
    private String status; // RESERVED, FINALIZED, RELEASED, EXPIRED
    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime expiresAt;

    public ReservationGroup() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCheckoutId() { return checkoutId; }
    public void setCheckoutId(String checkoutId) { this.checkoutId = checkoutId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
}
