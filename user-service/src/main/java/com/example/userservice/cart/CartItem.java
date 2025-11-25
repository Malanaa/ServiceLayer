package com.example.userservice.cart;

import java.time.Instant;

public class CartItem {
    private String id;
    private String sku;
    private int quantity;
    private String reservationId;
    private Instant reservedAt;
    private Instant expiresAt;
    private double priceAtAdd;

    public CartItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getReservationId() { return reservationId; }
    public void setReservationId(String reservationId) { this.reservationId = reservationId; }
    public Instant getReservedAt() { return reservedAt; }
    public void setReservedAt(Instant reservedAt) { this.reservedAt = reservedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public double getPriceAtAdd() { return priceAtAdd; }
    public void setPriceAtAdd(double priceAtAdd) { this.priceAtAdd = priceAtAdd; }
}
