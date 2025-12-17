# Payment Service — Architecture

Purpose
- Minimal payment gateway stub used in local development and smoke tests.
- Simulates approval/failure and exposes simple endpoints for processing and resetting state.

Core responsibilities
- Accept a payment request DTO and return an approval/decline response with a `transactionId`.
- Provide a `/reset` endpoint for tests to clear internal counters/state.
- Expose actuator endpoints for health and info.

Key components
- `PaymentService` — lightweight component that simulates payments (can be extended to call real gateways).
- `PaymentController` — endpoints: `POST /api/payment/process` and `POST /api/payment/reset`.
- DTOs: `PaymentRequest` (validated) and `PaymentResult` (approved/message/transactionId).

Important endpoints
- `POST /api/payment/process` — process payment request, returns `PaymentResult`.
- `POST /api/payment/reset` — reset internal counters/state for deterministic tests.

Operational notes
- Port: `9102` in Compose mapping.
- Dependencies include `spring-boot-starter-validation` and `spring-boot-starter-actuator` for health.
- Build: `./gradlew -p payment-service bootJar` when building the image outside of a multi-project root.

Extension points / TODOs
- Replace stubbed logic with a real gateway integration if needed (Stripe/Adyen/etc.).
- Add idempotency key support to avoid double charges on retries.
- Add more realistic failure modes and latency simulation for resilience testing.

---

Created by assistant — developer reference for local test gateway.

## Rationale of design choices
- Keep the payment service intentionally lightweight for local testing — a deterministic stub reduces friction for integration testing and reproducibility.
- Provide a clear contract (`PaymentRequest`/`PaymentResult`) so a real gateway implementation can be swapped in later.

## Design details
- Stateless processing: the payment endpoint returns a deterministic `transactionId` and approval/decline to simulate external gateway behavior.
- Expose `/reset` to allow deterministic test runs (useful in CI to avoid flaky outcomes).

## Class diagram (simplified)
PaymentService
	- PaymentController
	- PaymentService (simulation logic)
	- DTOs: PaymentRequest, PaymentResult

## Database design
- None: this service is intentionally stateless for the stub. If integrating with a real provider you may want to persist payment attempts, statuses, and transaction ids.

## Operational notes
- To replace with real gateway: implement a client that calls the provider's HTTP API and map responses into `PaymentResult`.
- Add idempotency support to avoid duplicate charges when retries occur.

---