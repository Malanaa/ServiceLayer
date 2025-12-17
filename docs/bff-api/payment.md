**Payment (BFF)**

Base path: `/api/payment`

Endpoints:

- `POST /api/payment/process`
  - Description: Forward payment processing request to the payment-service. The request body depends on your payment provider (amount, currency, paymentMethodId, etc.).
  - Example (axios):
    ```js
    // Example payment processing request. The payment-service stub accepts a simple request
    const resp = await axios.post(`${API_BASE}/api/payment/process`, {
      amount: 1999,
      currency: 'USD',
      paymentMethodId: 'pm_abc123'
    }, { headers: { 'X-User-Id': userId }, withCredentials: true });
    ```

- `POST /api/payment/reset`
  - Description: Reset payment state (test/dev flow). No body required.
  - Example (fetch):
    ```js
    await fetch(`${API_BASE}/api/payment/reset`, { method: 'POST', headers: { 'X-User-Id': userId }, credentials: 'include' });
    ```

Notes:
- Ensure payment endpoints are protected as needed; BFF forwards cookies to the payment service which may require session/auth.

Notes:
- The BFF forwards `X-User-Id` and `Cookie` headers to the payment service. Include `X-User-Id` in client calls or update the BFF to extract auth from session.
- `POST /api/payment/process` will return 200 on success; the reset endpoint returns 200 and a confirmation message in the current stub.
