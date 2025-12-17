# ServiceLayer System Architecture

This document summarizes the overall architecture, focusing on the more innovative and challenging parts of the design: Redis-based cart semantics, database schema for inventory/reservations/sales, Docker-based local orchestration, and the authentication/session model.

## High-level overview
- Services: `user-service` (BFF + auth + cart orchestration), `storage-service` (inventory, reservations, sales), `payment-service` (stub gateway), `gateway-service` (optional routing layer).
- Communication: internal HTTP calls between services (`StorageClient`, `PaymentClient`).
- Deployment: Docker Compose for local development; each service produces a `bootJar` and is packaged into its Docker image.

## Redis cart design (innovative / challenging parts)
- Key pattern: `cart:{userId}` as a Redis hash where field=cartItemId and value=JSON(CartItem).
  - Rationale: O(1) add/remove operations, minimal serialization overhead, no need to construct a complex DB schema for ephemeral cart data.
  - Expiry: individual cart items are stored without TTL (so entire cart persists), reservation TTL is applied when reserving at checkout; Redis-based cart gives low-latency reads for UI.
- Concurrency: writes are atomic at the Redis command level. CartService only reads the cart and submits a `reserveBatch` to `storage-service` which uses DB transactions for cross-item atomicity.

## Database tables and relationships
- `inventory` — authoritative stock with `quantity` and `reserved` counters.
- `reservations` & `reservation_groups` — allow grouping of reservations produced at checkout and TTL-based expiring of holds.
- `sales` — created during finalize to act as the permanent purchase ledger.

ER Diagram (textual):

  [users] 1 --- * [reservation_groups] 1 --- * [reservations] * --- 1 [inventory]
                                           |
                                           +--> [sales]

Design considerations:
- All finalization logic runs in `storage-service` to keep inventory correctness in one place.
- `reserved` column is necessary to check available quantity under concurrent reservations without prematurely decrementing `quantity`.

## Docker & local orchestration
- Each service has a Dockerfile that expects a built jar (`build/libs/*.jar`) — ensure `./gradlew -p <service> bootJar` prior to `docker compose build`.
- `docker-compose.yml` provisions Postgres, Redis, and the services. Local compose simplifies reproducing end-to-end flows.
  - Tip: when iterating on a single service, rebuild just that service and `docker compose up -d <service>` to speed cycles.

## Authentication and session model
- `user-service` issues `refresh_token` as an `HttpOnly` cookie on `/api/auth/login` and `/api/auth/register`.
  - `RefreshTokenStore` maps tokens → userId and enforces TTL.
  - `me` endpoint validates the cookie and proxies to `storage-service` for the user record.
- For internal integration tests we use `X-User-Id` header to emulate an authenticated context. Production: use JWTs or a central identity provider.

## Idempotency and failure modes (recommendations)
- Payments: implement idempotency keys in the checkout flow to avoid duplicate charges on retries. Store idempotency mapping in DB or Redis.
- Finalize: should be idempotent — repeated finalize on the same reservation group should be a no-op.
- Retry behavior: orchestration should handle transient failures by releasing reservations to avoid stale locks.

## Observability
- Add tracing (OpenTelemetry) to follow a checkout call across `user-service` -> `storage-service` -> `payment-service`.
- Add metrics for reservation TTL expirations, finalize failures, and payment decline rates.

## Next improvements (roadmap)
- Add migrations (Flyway) and versioned DB schema to handle production upgrades (e.g., adding `transactionId` to `sales`).
- Add integration tests that run the full compose stack and exercise concurrent checkout attempts.
- Harden auth: move to JWTs or integrate with an IdP; add RBAC for admin/internal endpoints.

---

This summary is a companion to the per-service `ARCHITECTURE.md` files which hold more targeted implementation and API details.

## Diagrams
- PlantUML source: `diagrams/system.puml` (can be rendered with PlantUML to PNG/SVG).
- Mermaid quick view: `diagrams/system.md` (contains a Mermaid flowchart embeddable in GitHub/GitLab).

Rendering tips:
- To render the PlantUML file (requires PlantUML + Graphviz):
  ```bash
  plantuml diagrams/system.puml
  ```
- Or view the Mermaid diagram directly on GitHub by opening `diagrams/system.md`.
