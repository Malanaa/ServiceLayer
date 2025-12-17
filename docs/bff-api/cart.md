**Cart (BFF)**

Base path: `/api/cart`

Endpoints:

- `GET /api/cart`
  - Description: Returns the current user's cart (proxied to cart/user-service). Requires auth cookie.
  - Example (axios):
    ```js
    const resp = await axios.get(`${API_BASE}/api/cart`, { withCredentials: true });
    console.log(resp.data);
    ```
- `POST /api/cart/items`
  - Description: Add an item to the user's cart. The BFF forwards `X-User-Id` header and `Cookie` to upstream.
  - Request body (JSON):
    - `sku` (string) — product SKU to add
    - `quantity` (integer, optional, default 1)
  - Example (axios):
    ```js
    // NOTE: include X-User-Id header with the authenticated user's id
    await axios.post(`${API_BASE}/api/cart/items`, { sku: 'sku-123', quantity: 2 }, {
      headers: { 'X-User-Id': userId },
      withCredentials: true
    });
    ```
- `DELETE /api/cart/items/:id`
  - Description: Remove an item from the cart by item id.
  - Example (axios):
    ```js
    await axios.delete(`${API_BASE}/api/cart/items/${itemId}`, { headers: { 'X-User-Id': userId }, withCredentials: true });
    ```
- `POST /api/cart/checkout`
  - Description: Initiates checkout flow (proxied to cart service). Requires auth cookie and a request body with checkout info if needed.
  - Example (fetch):
    ```js
    // Checkout requires payment information that matches the service's PaymentRequest DTO
    await fetch(`${API_BASE}/api/cart/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        cardNumber: '4111111111111111',
        cardHolderName: 'Bff Success',
        dateOfExpiry: '12/30',
        cvv: '123',
        amount: 1000.0
      })
    });
    ```

Notes:
- All endpoints forward the `Cookie` header to upstream. Ensure the client includes credentials.

Notes:
- The cart service requires an `X-User-Id` request header containing the authenticated user's id. The current BFF implementation forwards this header — the frontend should add it when calling cart/order/payment endpoints (or the BFF can be enhanced to extract the id from session/cookie).
- Add item request uses `sku` (not `productId`).
- Checkout expects a `PaymentRequest` object with card details and `amount` (see `orders.md` for DTO).
