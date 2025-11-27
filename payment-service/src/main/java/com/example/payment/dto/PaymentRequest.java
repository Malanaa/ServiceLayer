package com.example.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class PaymentRequest {


    @NotBlank
    @Size(min = 13, max = 19)
    private String cardNumber;

    @NotBlank
    private String cardHolderName;

    @NotBlank
    private String dateOfExpiry;

    @NotBlank
    @Size(min = 3, max = 4)
    private String cvv;

    @NotNull
    @Positive
    private Double  amount;

    private Long orderId;




    public  PaymentRequest()  {

    }


    public  PaymentRequest(String  cardNumber, String cardHolderName,  String dateOfExpiry, String cvv,  Double  amount,  Long orderId)  {

        this.cardHolderName =   cardHolderName;

        this.cardNumber  = cardNumber;

        this.dateOfExpiry  = dateOfExpiry;

        this.cvv =  cvv;

        this.amount = amount;

        this.orderId  = orderId;

    }



    public String getCardNumber() {
        return cardNumber;
    }
    

    public void setCardNumber(String cardNumber) {
        this.cardNumber = cardNumber;
    }


    
    public String getCardHolderName() {
        return cardHolderName;
    }
    
    public void setCardHolderName(String cardHolderName) {
        this.cardHolderName = cardHolderName;
    }
    
    public String getDateOfExpiry() {
        return dateOfExpiry;
    }
    
    public void setDateOfExpiry(String dateOfExpiry) {
        this.dateOfExpiry = dateOfExpiry;
    }
    
    public String getCvv() {
        return cvv;
    }
    


    public void setCvv(String cvv) {
        this.cvv = cvv;
    }
    


    public Double getAmount() {
        return amount;
    }


    
    public void setAmount(Double amount) {
        this.amount = amount;
    }


    
    public Long getOrderId() {
        return orderId;
    }
    


    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }


    private String maskCardNumber(String  numberOfCard)  {

        if (numberOfCard  ==  null   ||  numberOfCard.length()  <  4)  {

            return "****";
        }

        String x = "****"  +  numberOfCard.substring(numberOfCard.length()  -  4);

        return x;
    }

    @Override
    public  String  toString ()  {

        return "PaymentRequest{"  +   "cardNumber'"  +  maskCardNumber(cardNumber)  +   '\'' +  ", cardNumber='"  + cardHolderName  + '\'' +  ", dateOfExpiry='"  +  dateOfExpiry + '\'' +  ", amount='"  +  amount + ", orderId="  +  orderId + '}';
    }
}
