# Frontend Auth Demo

This is a tiny static demo that calls the BFF auth endpoints.

How to use

- Make sure your BFF is running and exposes the auth routes (`/api/auth/*`). By default the demo uses `http://localhost:5000` as `API_BASE`. If your BFF runs on a different port, edit `auth.js` and change the `API_BASE` constant or set `window.API_BASE` before loading the script.

- Serve the `frontend/auth` folder locally. Example using `npx serve` or Python:

```bash
# using a tiny static server (recommended)
npx serve frontend/auth -l 5500

# or with python 3 built-in server
cd frontend/auth && python3 -m http.server 5500
```

- Open `http://localhost:5500` in your browser and try Register / Login / Me / Logout.

CORS and cookies

- For cookies to be accepted in the browser the BFF must:
  - return `Access-Control-Allow-Origin` set to the frontend origin (e.g. `http://localhost:5500`) — not `*`;
  - return `Access-Control-Allow-Credentials: true`;
  - set cookies with attributes suitable for cross-site use when needed (e.g. `SameSite=None; Secure` in production over HTTPS).

If the BFF is configured for a different origin (for example `http://localhost:3000`), run the static server on that origin or update the BFF CORS origin.

Next steps

- If you want, I can update the BFF entrypoint to mount the `routes/auth.js` router explicitly (without touching legacy `server.js`) and/or add a new small `bff-node/app.js` that uses the modular routers as the canonical entrypoint. Tell me which you prefer and I will implement it.
