package com.example.payment.dto;

public class PaymentResult {
    private String transactionId;
    private boolean approved;
    private String message;

    public PaymentResult() {}

    public PaymentResult (boolean approved, String message, String transactionId) {
        this.message = message;
        this.approved = approved;
        this.transactionId = transactionId;
    }

    public boolean isApproved() {
        return approved;
    }

    public void setApproved(boolean approved) {
        this.approved = approved;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
}
