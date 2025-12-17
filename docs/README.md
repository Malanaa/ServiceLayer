````markdown
# ServiceLayer

Backend scaffold for an e-commerce store (Spring Boot, Gradle).

This repository contains a microservices backend for the ServiceLayer project with:

- **storage-service** (port 9001): DAO microservice for database operations (User entity).
- **user-service** (port 9002): Business logic for user registration, calls storage-service.
- **gateway-service** (port 8080): API Gateway routing external requests to user-service.

## Quick Start

Requires Java 17 and Docker.

1. Build all services:
   ```bash
   ./gradlew :storage-service:build :user-service:build :gateway-service:build
   ```

2. Start with Docker Compose:
   ```bash
   docker compose up --build
   ```

3. Test registration via Gateway:
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'
   ```
   - Success: Returns user JSON with id, createdAt.
   - Duplicate email: Returns 409 with {"error": "email_exists"}.
   - Invalid input: Returns 400.

## Architecture

- **Gateway**: Routes `/api/auth/**` to user-service.
- **User Service**: Validates input, hashes password, calls storage-service to persist.
- **Storage Service**: JPA repository for User, exposes internal REST endpoints.

Next steps: Add more services (product, cart), secure inter-service calls, add JWT auth.

````
