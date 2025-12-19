#!/bin/bash

# Test Registration with Address and Payment Info
# This script tests if the registration process saves user profile data

API_BASE="http://localhost:3000/api"
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser${TIMESTAMP}@example.com"

echo "================================================"
echo "Testing User Registration with Profile Data"
echo "================================================"
echo ""
echo "Test Email: $TEST_EMAIL"
echo ""

# Step 1: Register a new user with address and payment info
echo "Step 1: Registering user with address and payment info..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/auth/register" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "password": "TestPassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-1234",
    "address": {
      "street": "123 Main Street",
      "city": "New York",
      "province": "NY",
      "zip": "10001"
    },
    "payment": {
      "cardNumber": "4111111111111111",
      "cardHolderName": "John Doe",
      "expiry": "12/25",
      "cvc": "123"
    }
  }')

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" -ne 201 ] && [ "$HTTP_CODE" -ne 200 ]; then
    echo "❌ Registration failed with status $HTTP_CODE"
    rm -f cookies.txt
    exit 1
fi

echo "✅ Registration successful!"
echo ""

# Step 2: Send profile update request (simulating what the frontend does)
echo "Step 2: Updating user profile with address and payment..."
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "address": {
      "street": "123 Main Street",
      "city": "New York",
      "province": "NY",
      "zip": "10001"
    },
    "payment": {
      "cardNumber": "4111111111111111",
      "cardHolderName": "John Doe",
      "expiry": "12/25",
      "cvc": "123"
    }
  }')

PROFILE_HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | sed '$d')

echo "Response Code: $PROFILE_HTTP_CODE"
echo "Response Body: $PROFILE_BODY"
echo ""

if [ "$PROFILE_HTTP_CODE" -eq 200 ] || [ "$PROFILE_HTTP_CODE" -eq 201 ]; then
    echo "✅ Profile update successful!"
else
    echo "⚠️  Profile update returned status $PROFILE_HTTP_CODE"
fi
echo ""

# Step 3: Verify by fetching user profile
echo "Step 3: Fetching user profile to verify saved data..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/auth/me" \
  -b cookies.txt)

ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')

echo "Response Code: $ME_HTTP_CODE"
echo "Response Body: $ME_BODY"
echo ""

if [ "$ME_HTTP_CODE" -eq 200 ]; then
    echo "✅ Successfully retrieved user profile!"
    
    # Check if address and payment info are present
    if echo "$ME_BODY" | grep -q "123 Main Street"; then
        echo "✅ Address data is present in profile!"
    else
        echo "⚠️  Address data not found in profile"
    fi
    
    if echo "$ME_BODY" | grep -q "creditCardMask"; then
      echo "✅ Payment data is present in profile!"
    else
        echo "⚠️  Payment data not found in profile"
    fi
else
    echo "❌ Failed to retrieve user profile"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "================================================"
echo "Test Complete"
echo "================================================"
