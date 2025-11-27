package com.example.payment.service;

import com.example.payment.dto.PaymentResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PaymentService {

    private final AtomicInteger reqCounter = new AtomicInteger(0);

    public PaymentResult processPayment(String cardNumber,  String  cardHolderName,  String dateOfExpiry, String cvv, Double amount)  {

        int count = reqCounter.incrementAndGet();

        if (cardNumber  ==   null || cardNumber.length()   <  13 )  {
            return new PaymentResult(false,  "Wrong card number", null);
        }

        if (cvv  ==   null || cvv.length()  !=  3)  {
            return new PaymentResult(false, "Wrong CVV", null);
        }

        if (amount == null || amount <=0) {
            return new PaymentResult(false,  "Wrong amount",  null);
        }

        if (count %  3 == 0)  {
            return new PaymentResult(false,  "Credit Card Authorization Failed",  null);
        }

        String theTransactionId = "PAY-" +  System.currentTimeMillis();

        return new PaymentResult(true, "The payment was approved", theTransactionId);
    }

    public void resetCounter() {
        reqCounter.set(0);
    }
}
