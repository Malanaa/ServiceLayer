# BFF API Reference

This folder documents the BFF endpoints exposed to the frontend and gives example requests (axios + fetch) showing how the client should call the BFF.

Notes:
- All requests that rely on authentication must include credentials (cookies). Use `withCredentials: true` (axios) or `credentials: 'include'` (fetch).
- The BFF enforces CORS and only accepts origins configured by `FRONTEND_ORIGIN` in `bff-node/app.js`.

Files:
- `auth.md` — authentication endpoints (register, login)
- `cart.md` — shopping cart endpoints
- `orders.md` — order endpoints (checkout, list, get)
- `payment.md` — payment endpoints
