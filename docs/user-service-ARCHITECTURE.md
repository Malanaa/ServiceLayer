```markdown
# User Service — Architecture

Purpose
- Backend-for-frontend (BFF) for user interactions: auth, cart, and checkout orchestration.
- Keeps user session/refresh tokens and stores ephemeral cart state in Redis.

Core responsibilities
- Authentication endpoints: register, login, logout, and `me` (cookie-based refresh token store).
- Cart management persisted in Redis per-user (`cart:{userId}` hash) with cart items serialized as JSON.
- Checkout orchestration:
  - Read cart from Redis, call `storage-service` `reserveBatch`.
  - Compute totals by fetching inventory prices from `storage-service` (per-item) and call `payment-service`.
  - On successful payment call `storage-service.finalizeBatch`, on failure call `storage-service.releaseBatch`.

Key components
- `CartService` — add/remove/get/checkout logic, uses `StringRedisTemplate` and `HashOperations`.
- `AuthController` — register/login/me/logout using `RefreshTokenStore` and `StorageClient` for user persistence.
- `PaymentClient` and `StorageClient` — lightweight RestTemplate clients for calling payment and storage services.

Important endpoints
- `POST /api/auth/register` — create a user (for admin registration uses admin token forwarded to `storage-service`).
- `POST /api/auth/login` — authenticate and set refresh cookie.
- `GET /api/auth/me` — return authenticated user via refresh cookie.
- `POST /api/cart/items` — add item to cart (writes JSON into Redis hash).
- `GET /api/cart` — read user's cart from Redis.
- `DELETE /api/cart/items/{id}` — remove item from cart (and release any associated reservation).
- `POST /api/cart/checkout` — validated payment DTO, orchestrates reserve -> payment -> finalize/release.

Data stores & state
- Redis: used for transient cart state; keys `cart:{userId}`.
- Storage-service is authoritative for user records and inventory/sales.

Security
- Refresh token stored as `HttpOnly` cookie at `/api/auth`; internal `RefreshTokenStore` manages token lifecycle.
- Current SecurityConfig permits all requests (development) — production needs stricter rules mapping `userType` to authorities.

Observability & validation
- DTOs are annotated with `jakarta.validation` annotations and controllers accept `@Valid` payloads.
- Logs show reserve/finalize/release flows and payment client interactions.

Operational notes
- Port: `8080` in Compose mapping.
- Ensure `SPRING_REDIS_URL` is set (compose sets to `redis://redis:6379`) so Lettuce uses the right host.
- Build: `./gradlew -p user-service bootJar` then rebuild Docker image.

Extension points / TODOs
- Add idempotency and retry handling for checkout and finalize.
- Consider returning pricing in `reserveBatch` to avoid extra inventory lookups at checkout.
- Harden authentication/authorization for admin/internal endpoints.
- Add integration tests for the orchestration flow.

---
```