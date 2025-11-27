package com.example.payment.controller;

import com.example.payment.dto.PaymentResult;
import com.example.payment.dto.PaymentRequest;
import com.example.payment.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService service;

    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> paymentProcess(@jakarta.validation.Valid @RequestBody PaymentRequest request)  {

        PaymentResult res = service.processPayment( request.getCardNumber(),  request.getCardHolderName(), request.getDateOfExpiry(), request.getCvv(),  request.getAmount());

        PaymentResponse resp = new PaymentResponse(res.isApproved(), res.getMessage(),  res.getTransactionId(), request.getOrderId());

        if (!res.isApproved())  {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(resp);
        }  else  {
            return  ResponseEntity.ok(resp);
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<String>   resetCounter()  {
        service.resetCounter();
        return  ResponseEntity.ok("The reset was successful!");
    }
}

class  PaymentResponse  {

    private String message;
    private Long orderId;
    private boolean approved;
    private String transactionId;

    public PaymentResponse(boolean approved,  String message,  String transactionId,  Long  orderId){
        this.message = message;
        this.approved  = approved;
        this.transactionId =  transactionId;
        this.orderId = orderId;
    }

    public String getMessage () { return message; }
    public Long getOrderId()  { return orderId; }
    public boolean isApproved ()  { return approved; }
    public String getTransactionId()   { return transactionId; }
}
