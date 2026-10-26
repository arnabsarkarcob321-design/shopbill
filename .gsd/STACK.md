# Technology Stack — ShopBill

> Documented for ShopBill offline-first GST billing, inventory & reporting ecosystem.

## 1. Runtime Environments

| Runtime / Tool | Version | Purpose |
|----------------|---------|---------|
| **Node.js** | v24.22.1+ | JavaScript runtime for client, build tools, and monorepo packages |
| **pnpm** | 12.15.0+ | Fast, disk-efficient monorepo package manager |
| **Python** | 3.14+ | Backend API, migrations, and report worker runtime |
| **uv** | 0.12.23+ | Fast Python package and virtualenv manager |
| **PostgreSQL** | 16+ | Cloud system of record, tenant RLS, reference data |
| **IndexedDB (Dexie)** | 4.x | Offline client system of record on device |
| **MinIO / S3** | S3-compatible | Encrypted backups, generated reports, document storage |

## 2. Frontend / Client Architecture (`apps/web`)

| Technology | Purpose |
|------------|---------|
| **React 18** | High-performance reactive UI |
| **TypeScript** | Strict type safety (`strict: true`) across client code |
| **Vite** | Modern, fast build tool and dev server |
| **Tailwind CSS** | Design system token implementation and semantic styling |
| **Lucide React** | Clean, lightweight icon suite |
| **Zustand** | POS cart state, active draft tabs, and ephemeral UI state |
| **Dexie.js** | Reactive IndexedDB repository layer (`dexie-react-hooks`) |
| **Workbox** | Service worker, app shell precaching, font caching, offline fallbacks |
| **Web Workers** | Search indexing (MiniSearch), Excel export (ExcelJS), CSV parsing |
| **Web Locks API** | Concurrency control for per-device invoice sequence allocation |
| **BarcodeDetector / ZXing** | Phone camera barcode scanner with WebAssembly fallback |

## 3. Backend Architecture (`apps/api` & `apps/worker`)

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Asynchronous, high-performance REST API with OpenAPI 3.1 generation |
| **SQLAlchemy 2** | Modern async ORM and query builder |
| **Alembic** | Numbered, auditable relational database migrations |
| **Pydantic v2** | High-speed request validation and serialization |
| **Asyncpg** | High-throughput asynchronous PostgreSQL driver |
| **PyJWT / Cryptography** | EdDSA (Ed25519) token signing and verification |
| **Passlib / Argon2-cffi** | Argon2id secure password hashing |
| **APScheduler** | Scheduled worker jobs (nightly reports, retention, reminders) |

## 4. Pure Monorepo Packages

| Package | Technology | Purpose |
|---------|------------|---------|
| `packages/gst-engine` | Pure TypeScript, BigInt | Deterministic GST calculations, rounding, validators |
| `packages/print-model` | Pure TypeScript | Canonical invoice print model and HTML/PDF/ESC-POS renderers |
| `packages/reports-core` | Pure TypeScript | 7-tab CA/GST pack builders and reconciliation logic |
| `packages/api-client` | Generated TypeScript | Type-safe API client generated from backend OpenAPI 3.1 |
| `packages/i18n` | Pure TypeScript | Translations (EN, HI, BN), Indian currency formatting |

---
