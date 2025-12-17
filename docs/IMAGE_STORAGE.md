# Image storage (MinIO) — Local dev guide

This document explains the free, local image-storage setup used in this project (MinIO), how the `storage-service` integrates with it, and quick test commands.

## Summary
- We run MinIO (S3-compatible) in Docker Compose for local development.
- `storage-service` uploads images to MinIO and stores metadata in the `images` table.
- The service exposes an upload endpoint: `POST /api/images` (multipart `file`), and a redirecting `GET /api/images/{key}` that returns a short presigned GET URL.

## docker-compose changes
The repository's `docker-compose.yml` now includes a `minio` service and a named volume `minio-data`.

Important ports:
- `9000` — S3 API (MinIO) — accessible from host at `http://127.0.0.1:9000`
- `9005` — MinIO Console (host `127.0.0.1:9005` forwarded to container `9001`) — convenient admin UI

Default credentials (development only):
- Username: `minioadmin`
- Password: `minioadmin123`

If you want the console hidden, remove the `127.0.0.1:9005:9001` mapping in `docker-compose.yml`.

## Application configuration
`storage-service` contains S3 configuration in `src/main/resources/application.yml` under `app.s3`:

```
app:
  s3:
    endpoint: http://minio:9000
    access-key: minioadmin
    secret-key: minioadmin123
    region: us-east-1
    bucket: images
```

These values are used by the service at runtime. When deploying to real S3, change the endpoint/credentials accordingly.

## How the code works (high level)
- `ImageController` exposes `POST /api/images` and `GET /api/images/{key}`.
- `S3StorageService` (implemented with the MinIO Java client) creates the configured bucket on startup (if missing), uploads objects, and generates presigned GET URLs.
- `Image` JPA entity and `ImageRepository` persist metadata (object key, content type, size, optional inventoryId).

## Quick start — run and test locally

1. Start MinIO only (recommended first):

```bash
docker compose up -d minio
```

2. Build and run the `storage-service` (ensures JAR is included in the Docker image):

```bash
./gradlew :storage-service:bootJar -x test
docker compose build storage-service
docker compose up -d storage-service
```

3. Upload a small test file (example):

```bash
echo 'hello-minio' > /tmp/test-image.jpg
curl -v -F "file=@/tmp/test-image.jpg" http://localhost:9001/api/images
```

Response example (JSON):

```json
{
  "key": "37140277-ec82-48f1-9295-44a17fffbeca",
  "url": "http://minio:9000/images/<key>?X-Amz-..."
}
```

4. Visit the MinIO Console in your browser:

```
http://127.0.0.1:9005
```

5. Use the returned `url` (or the `GET /api/images/{key}` redirect) to retrieve the object.

## Notes & recommendations
- This setup is for local development. For production use a managed S3-compatible object store (AWS S3, Google Cloud Storage, or a self-hosted MinIO cluster) and store only metadata in your DB.
- Use presigned GET URLs for direct, scalable downloads. Use CDN in front of object storage in production for cache and performance.
- Rotate credentials and never use the default `minioadmin` password in shared environments.

## Next steps
- Add README updates describing where uploaded image metadata is stored and how the UI should reference `GET /api/images/{key}`.
