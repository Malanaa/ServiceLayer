# ServiceLayer

Backend scaffold for an e-commerce store (Spring Boot, Gradle).

This repository contains a starter Spring Boot backend for the ServiceLayer project. It provides a minimal runnable skeleton that includes:

- Gradle build (`build.gradle.kts`)
- Main Spring Boot application class (`ServiceLayerApplication`)
- Simple health endpoint at `GET /api/health`
- H2 configuration for development (`application.yml`)
- Dockerfile and `docker-compose.yml` for local Postgres + app

Next steps:

- Implement domain model (User, Product, Cart, Order, etc.)
- Implement repositories (DAO layer), services, controllers
- Add authentication (JWT) and role-based authorization
- Add payment adapter and checkout flow
- Add tests, OpenAPI docs, and CI configuration

Quick start (requires Java 17 and Docker):

1. Build with Gradle wrapper (generate wrapper if needed):

```bash
./gradlew clean build
```

2. Run with Docker Compose (starts Postgres + app):

```bash
docker compose up --build
```

3. Health check:

```bash
curl http://localhost:8080/api/health
```

If you prefer local development without Docker, the default `application.yml` is configured to use an in-memory H2 DB.

If you'd like, I can now:
- scaffold the domain entities and Flyway migrations, or
- implement authentication (register/login + JWT), or
- add core product/cart services and controllers.

Tell me which of these you'd like me to implement next.
