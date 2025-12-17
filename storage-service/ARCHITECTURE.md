# Storage Service — Architecture

Purpose
- Authoritative persistence for inventory, reservations, and sales.
- Owns inventory quantities, reservation lifecycle (reserve/release/finalize) and sales records.

Core responsibilities
- Inventory CRUD and queries (SKU-centric API).
- Reservation lifecycle: single and batch reserve/release/finalize operations.
- ReservationGroup entity to group line-item reservations for a checkout.
- Scheduled TTL cleanup for expired reservations.
- Create `Sale` records when reservations are finalized.

Key entities (JPA)
- `Inventory` — id, sku, name, description, quantity, reserved, price, createdAt.
- `Reservation` — id (UUID), sku, inventoryId, quantity, status (RESERVED/RELEASED/FINALIZED), expiresAt, reservationGroupId, orderId.
- `ReservationGroup` — id, checkoutId, userId, status, expiresAt.
- `Sale` — id, customer, product (sku), price, quantity, purchasedAt, fulfillment.

Important endpoints
- `POST /internal/inventory/insertItem` — create inventory item.
- `GET /internal/inventory/getItem/{id}` — read item.
- `GET /internal/inventory/getItems` — list with pagination.
- `POST /internal/inventory/reserveBatch` — atomically reserve a batch of items as a `ReservationGroup` (used by checkout).
- `POST /internal/inventory/releaseBatch` — release a reservation group and restore inventory.
- `POST /internal/inventory/finalizeBatch` — finalize a reservation group, decrement inventory permanently, create `Sale` records.
- Single-item `reserve`, `release`, `finalize` variants also available for internal uses.

Concurrency & correctness
- Uses DB transactional boundaries and PESSIMISTIC locks (where applicable) to avoid oversell.
- Tracks `Inventory.reserved` separately to allow optimistic checks and to atomically transfer reserved -> sold in finalize.
- `cleanupExpiredReservations` scheduled task runs periodically to release expired reservation groups.

Data store
- JPA/Hibernate (dev: H2; compose example uses Postgres).
- Sales and reservations are stored in the same DB owned by this service.

Operational notes
- Port: configured at `9001` in `application.yml` (local dev Compose mapping).
- Dockerfile and `bootJar` usage: make sure `bootJar` has been run so Dockerfile `COPY build/libs/*.jar app.jar` succeeds.

Extension points / TODOs
- Add `transactionId`/`orderId` on `Sale` to link payments to sales (recommended).
- Add idempotency keys for finalize operations to avoid duplicate charges/records.
- Add integration tests for reservation edge-cases (concurrent checkout attempts).


---

Created by assistant — concise reference for devs and operators.

## Rationale of design choices
- Single responsibility: storage-service is the authoritative owner of inventory, reservations and sales so it avoids split-brain inventory state.
- Reservation groups provide an atomic unit for checkout so multi-item carts can be reserved/released/finalized together.
- Keeping `reserved` as a separate column avoids rapid write contention on total quantity and simplifies checks for available stock.

## Design details
- ReservationGroup: groups reservations produced at checkout. TTL-based expiry prevents indefinite holds.
- Pessimistic locking + transactional operations around reserve/finalize prevent oversells under concurrent checkouts.
- Finalize operation moves reserved quantities into permanent sale (decrementing `quantity` and `reserved`). This keeps business logic centralized.

## Class diagram (simplified)
StorageService
	- InternalInventoryController
	- ReservationService
	- ReservationRepository
	- ReservationGroupRepository
	- InventoryRepository
	- SaleRepository

Entities:
	Inventory       1 <---- * Reservation
	ReservationGroup 1 <---- * Reservation
	Sale            (created on finalize)

## Database design (tables)
- `inventory`
	- id: bigint PK
	- sku: varchar UNIQUE
	- name, description: varchar
	- quantity: integer (available stock)
	- reserved: integer (currently reserved but not finalized)
	- price: double
	- created_at: timestamp

- `reservations`
	- id: varchar PK (UUID)
	- sku: varchar
	- inventory_id: bigint FK -> inventory.id (nullable)
	- quantity: integer
	- status: varchar (RESERVED, RELEASED, FINALIZED)
	- expires_at: timestamp
	- reservation_group_id: varchar FK -> reservation_groups.id
	- order_id: varchar (set when finalized)

- `reservation_groups`
	- id: varchar PK (UUID)
	- checkout_id: varchar
	- user_id: varchar
	- status: varchar (RESERVED, RELEASED, FINALIZED)
	- expires_at: timestamp

- `sales`
	- id: bigint PK
	- customer: varchar (user id)
	- product: varchar (sku)
	- price: double
	- quantity: integer
	- purchased_at: timestamp
	- fulfillment: varchar

## Operational notes and trade-offs
- Trade-off: using DB for reservations simplifies correctness guarantees but increases DB load for high-throughput scenarios. If scale requires it, move reservation-time checks to a fast path (cache+compare) with periodic reconciliation.
- Trade-off: `reserved` column guarantees easier availability checks, but requires careful updates (done transactionally here).

## Quick run/build notes
- Build: `./gradlew -p storage-service bootJar` then `docker compose build storage-service`.
- DB migrations: add Flyway scripts for production schema (recommended).

---