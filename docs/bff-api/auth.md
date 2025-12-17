**Authentication (BFF)**

Base path: `/api/auth`

Endpoints:

- `POST /api/auth/register`
  - Description: Proxy to the user-service register endpoint. Accepts JSON body with user fields.
  - Request shape (required fields):
    - `username` (string) — unique username
    - `email` (string) — valid email address
    - `password` (string) — plain-text password (will be hashed by the service)
    - `name` (string) — first name (non-blank)
    - `lastName` (string) — last name (non-blank)
    - `phoneNumber` (string) — phone in E.164 format (example: `+15551234567`)
    - `shippingAddress` (string) — 10–200 characters; allowed chars: letters, numbers, spaces, `/,#.-` (example: `123 Main Street, Apt 4B`)
    - `creditCardNumber` (string) — raw card number (the service will mask/store appropriately)

  - Request example (axios):
    ```js
    await axios.post(`${API_BASE}/api/auth/register`, {
      username: 'bff-success-1',
      email: 'bff-success@example.com',
      password: 'P@ssw0rd123',
      name: 'Bff',
      lastName: 'Success',
      phoneNumber: '+15551234567',
      shippingAddress: '123 Main Street, Apt 4B',
      creditCardNumber: '4111111111111111'
    }, { withCredentials: true });
    ```

  - Request example (fetch):
    ```js
    await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'bff-success-1',
        email: 'bff-success@example.com',
        password: 'P@ssw0rd123',
        name: 'Bff',
        lastName: 'Success',
        phoneNumber: '+15551234567',
        shippingAddress: '123 Main Street, Apt 4B',
        creditCardNumber: '4111111111111111'
      })
    });
    ```

  - Notes: BFF forwards status and JSON body from `user-service`. If you receive a `400` error, check the response body for validation messages (missing/invalid fields). Ensure `Content-Type: application/json` and `credentials: 'include'` (or `axios.withCredentials`) are used to receive any cookies set by the upstream service.

- `POST /api/auth/login`
  - Description: Proxy to user-service login. BFF forwards any `Set-Cookie` header from upstream to the browser.
  - Request example (axios):
    ```js
    const resp = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'alice',
      password: 'secret'
    }, { withCredentials: true });
    // After this request the browser will receive and store cookies from Set-Cookie
    ```
  - Request example (fetch):
    ```js
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'alice', password: 'secret' })
    });
    ```
  - Important: the frontend must use `credentials` to receive `Set-Cookie`. BFF will set `Set-Cookie` on the proxied response when upstream included it.

General notes:
- `API_BASE` in the examples should be replaced with the frontend environment variable (e.g., `process.env.REACT_APP_API_BASE` or `http://localhost:5002`).
- If you see missing `Set-Cookie` in the browser, verify BFF CORS (`Access-Control-Allow-Credentials: true`) and that the cookie attributes (`SameSite`, `Secure`) are appropriate for your environment.
