# System Diagram (Mermaid)

```mermaid
flowchart LR
  A[User (Browser)] -->|HTTPS| GW[Gateway / API]
  GW --> US[user-service (BFF)]
  US -->|reads/writes| REDIS[(Redis - cart:{userId})]
  US -->|reserveBatch| ST[storage-service]
  ST -->|DB transactions| DB[(Postgres)]
  US -->|payment request| PAY[payment-service (stub)]
  PAY -->|result| US
  US -->|finalizeBatch (on success)| ST
  ST -->|create sales| DB
  ST -->|releaseBatch (on fail)| DB

  subgraph Services
    US
    ST
    PAY
  end

  classDef dbfill fill:#f9f,stroke:#333,stroke-width:1px;
  class DB dbfill
```

Notes:
- `user-service` is the BFF responsible for checkout orchestration: reserve -> payment -> finalize/release.
- Cart data lives in Redis as `cart:{userId}` (hash of cartItemId -> JSON).
- `storage-service` owns inventory and sales and performs DB transactions to ensure correctness.
