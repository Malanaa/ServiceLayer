**Orders (BFF)**

Base path: `/api/orders`

Endpoints:

- `POST /api/orders/checkout`
  - Description: Orchestrates checkout by forwarding to the implementation (by default the BFF forwards to `user-service` checkout endpoint `/api/cart/checkout`). Use this to perform the final checkout flow.
  - Example (axios):
    ```js
    // Example — this endpoint forwards to /api/cart/checkout and expects the PaymentRequest DTO
    const resp = await axios.post(`${API_BASE}/api/orders/checkout`, {
      cardNumber: '4111111111111111',
      cardHolderName: 'Bff Success',
      dateOfExpiry: '12/30',
      cvv: '123',
      amount: 1000.0
    }, { headers: { 'X-User-Id': userId }, withCredentials: true });
    ```
  - Note: some deployments use a dedicated order service; configure `URL_ORDER_SERVICE` if the orchestration moves.

- `GET /api/orders`
  - Description: List orders for the authenticated user.
  - Example (fetch):
    ```js
    const resp = await fetch(`${API_BASE}/api/orders`, { headers: { 'X-User-Id': userId }, credentials: 'include' });
    const orders = await resp.json();
    ```

- `GET /api/orders/:orderId`
  - Description: Get details for a specific order.
  - Example (axios):
    ```js
    const resp = await axios.get(`${API_BASE}/api/orders/${orderId}`, { withCredentials: true });
    ```

Notes:
- The BFF forwards cookies and preserves status codes and response bodies from upstream services. Ensure `API_BASE` points to the BFF and credentials are included.

Notes:
- All order endpoints require `X-User-Id` header. The BFF will forward it to the underlying service.
- For checkout use the `PaymentRequest` DTO fields as shown above.
