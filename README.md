# Pterodactyl Discord Bot Panel

Sistem manajemen server game berbasis Discord yang terintegrasi dengan Pterodactyl Panel. Bot ini memungkinkan user untuk deploy, manage, dan monitor server game langsung dari Discord.

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Stack Teknologi](#stack-teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Instalasi & Setup](#instalasi--setup)
- [Konfigurasi .env](#konfigurasi-env)
- [Discord Bot Commands](#discord-bot-commands)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Queue System](#queue-system)
- [Monitoring & Alerting](#monitoring--alerting)
- [Security](#security)
- [Deployment di Pterodactyl](#deployment-di-pterodactyl)
- [Troubleshooting](#troubleshooting)

---

## Arsitektur

```
┌────────────────��────────────────────────────────────────────┐
│                        Discord User                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ Slash Commands
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Discord Bot  (discord.js v14)                  │
│  /start  /stop  /restart  /status  /stats  /deploy  /link  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (X-API-Key)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express.js API  :3000                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  /api/servers│  │  /api/users  │  │  /api/deploy    │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                   │             │
│         └─────────────────┴──────────┐        │             │
│                                      ▼        ▼             │
│                          ┌───────────────────────────┐      │
│                          │   Service Layer            │      │
│                          │  pterodactylService.js     │      │
│                          │  userService.js            │      │
│                          │  monitoringService.js      │      │
│                          └───────────┬───────────────┘      │
└──────────────────────────────────────│──────────────────────┘
              ┌───────────────┬────────┘
              ▼               ▼
┌─────────────────┐  ┌──────────────────────────────────────┐
│     MySQL       │  │         Pterodactyl Panel             │
│  - users        │  │  Application API (ptla_...)           │
│  - servers      │  │  - POST /api/application/servers      │
│  - deploy_queue │  │  - POST /api/application/users        │
│  - audit_logs   │  │                                       │
└─────────────────┘  │  Client API (ptlc_...)                │
                     │  - POST /servers/:id/power            │
┌─────────────────┐  │  - GET  /servers/:id/resources        │
│     Redis       │  └──────────────────────────────────────┘
│  - BullMQ jobs  │
│  - Rate limits  │  ┌──────────────────────────────────────┐
└────────┬────────┘  │         Queue Worker                 │
         │           │  - processDeploy()                   │
         └──────────►│  - pollAllServers() (monitoring)     │
                     └──────────────────────────────────────┘
```

---

## Stack Teknologi

| Komponen       | Teknologi                          |
|----------------|------------------------------------|
| Discord Bot    | Node.js 20 + discord.js v14        |
| API Server     | Express.js 4                       |
| Database       | MySQL 8.2                          |
| Queue          | Redis 7 + BullMQ                   |
| Dashboard      | React 18 + Tailwind CSS + Vite     |
| Containerisasi | Docker + Docker Compose            |
| Panel          | Pterodactyl (hosting target)       |

---

## Struktur Proyek

```
bot-panel/
├── .env.example                    # Template environment variables
├── docker-compose.yml              # Orchestrasi semua service
│
├── bot/                            # Discord Bot
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                # Entry point, loader commands & events
│       ├── deploy-commands.js      # Script registrasi slash commands ke Discord
│       ├── commands/
│       │   ├── server/
│       │   │   ├── start.js        # /start
│       │   │   ├── stop.js         # /stop
│       │   │   ├── restart.js      # /restart
│       │   │   ├── status.js       # /status
│       │   │   └── stats.js        # /stats
│       │   ├── deploy/
│       │   │   └── minecraft.js    # /deploy minecraft|rust|terraria
│       │   └── user/
│       │       ├── link.js         # /link
│       │       └── info.js         # /info
│       ├── events/
│       │   ├── ready.js
│       │   └── interactionCreate.js
│       └── utils/
│           ├── apiClient.js        # Axios wrapper ke Express API
│           ├── rateLimiter.js      # Redis-backed rate limiting
│           ├── embed.js            # Discord embed builders
│           └── logger.js           # Winston logger
│
├── api/                            # Express.js API
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                # Express app, middleware, routes
│       ├── controllers/
│       │   ├── serverController.js
│       │   ├── userController.js
│       │   └── deployController.js
│       ├── services/
│       │   ├── pterodactylService.js  # Semua call ke Pterodactyl API
│       │   ├── userService.js
│       │   └── monitoringService.js   # Polling status + alert
│       ├── middleware/
│       │   ├── auth.js             # Validasi X-API-Key
│       │   └── logger.js           # Request logging
│       ├── models/
│       │   └── AuditLog.js
│       ├── routes/
│       │   ├── servers.js
│       │   ├── users.js
│       │   └── deploy.js
│       ├── queue/
│       │   ├── worker.js           # BullMQ worker entry point
│       │   └── jobs/
│       │       └── deployJob.js    # Logic deploy server ke Pterodactyl
│       ├── utils/
│       │   └── logger.js
│       └── database/
│           ├── connection.js       # MySQL pool
│           ├── migrate.js          # Jalankan schema.sql
│           └── migrations/
│               └── schema.sql      # DDL lengkap
│
└── dashboard/                      # React Web Dashboard
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/client.js           # Axios wrapper
        ├── components/
        │   ├── ServerCard.jsx
        │   └── Sidebar.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Servers.jsx
            └── Deploy.jsx
```

---

## Instalasi & Setup

### Prasyarat

- Docker & Docker Compose v2
- Node.js 20+ (untuk development lokal)
- Akses ke Pterodactyl Panel (dengan admin privileges)
- Discord Application dengan bot token

### Langkah 1 — Clone & Konfigurasi

```bash
cd bot-panel
cp .env.example .env
nano .env   # Isi semua variabel (lihat bagian Konfigurasi .env)
```

### Langkah 2 — Setup Discord Bot

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat aplikasi baru → **Bot** → Copy token → isi `DISCORD_TOKEN`
3. Copy **Application ID** → isi `DISCORD_CLIENT_ID`
4. Di **OAuth2 → URL Generator**: centang `bot` + `applications.commands`
5. Bot permissions yang dibutuhkan:
   - Send Messages, Embed Links, Use Slash Commands
6. Invite bot ke server kamu

### Langkah 3 — Setup Pterodactyl API Keys

**Application API Key** (untuk create server/user):
```
Panel → Admin Area → Application API → Create new token
Permissions: Read + Write untuk: Servers, Users, Nodes, Allocations
Salin → isi PTERODACTYL_APP_API_KEY
```

**Client API Key** (untuk power signals & resources):
```
Panel → Account Settings → API Credentials → Create
Salin → isi PTERODACTYL_CLIENT_API_KEY
```

**Cari resource IDs yang dibutuhkan:**
```bash
# Node ID
curl -s -H "Authorization: Bearer ptla_KAMU" \
  https://panel.domain.com/api/application/nodes | jq '.data[].attributes | {id, name}'

# Nest & Egg ID
curl -s -H "Authorization: Bearer ptla_KAMU" \
  https://panel.domain.com/api/application/nests | jq '.data[].attributes | {id, name}'

curl -s -H "Authorization: Bearer ptla_KAMU" \
  https://panel.domain.com/api/application/nests/1/eggs | jq '.data[].attributes | {id, name}'
```

### Langkah 4 — Jalankan dengan Docker

```bash
# Build dan jalankan semua service
docker compose up -d

# Cek status
docker compose ps

# Lihat log
docker compose logs -f api
docker compose logs -f bot
docker compose logs -f worker
```

### Langkah 5 — Register Slash Commands

```bash
# Development (langsung aktif, guild-scoped)
docker compose exec bot node src/deploy-commands.js

# Production (global, propagasi ~1 jam)
# Hapus DISCORD_GUILD_ID dari .env terlebih dahulu
docker compose restart bot
docker compose exec bot node src/deploy-commands.js
```

### Langkah 6 — Akses Dashboard

Buka browser: `http://localhost:8080`

---

## Konfigurasi .env

```env
# ── Discord ──────────────────────────────────────────────────
DISCORD_TOKEN=          # Token dari Discord Developer Portal
DISCORD_CLIENT_ID=      # Application ID
DISCORD_GUILD_ID=       # ID server Discord kamu (untuk dev, hapus untuk prod)
ADMIN_ROLE_ID=          # Role ID yang bypass rate limit
VIP_ROLE_ID=            # Role ID VIP
ALERT_DISCORD_CHANNEL_ID= # Channel untuk notifikasi server offline

# ── API ──────────────────────────────────────────────────────
PORT=3000
API_SECRET_KEY=         # Secret panjang random (min 32 karakter)

# ── MySQL ─────────────────────────────────────────────────────
DB_HOST=mysql           # "mysql" jika Docker, "127.0.0.1" jika lokal
DB_PORT=3306
DB_NAME=pterodactyl_bot
DB_USER=botuser
DB_PASSWORD=            # Password database user
DB_ROOT_PASSWORD=       # Password root MySQL

# ── Redis ─────────────────────────────────────────────────────
REDIS_HOST=redis        # "redis" jika Docker
REDIS_PORT=6379
REDIS_PASSWORD=         # Password Redis

# ── Pterodactyl ───────────────────────────────────────────────
PTERODACTYL_URL=https://panel.domain.com
PTERODACTYL_APP_API_KEY=ptla_...
PTERODACTYL_CLIENT_API_KEY=ptlc_...

PTERO_DEFAULT_NODE_ID=1     # ID node tempat server di-deploy
PTERO_DEFAULT_NEST_ID=1     # ID nest (grup egg)
PTERO_MINECRAFT_EGG_ID=1    # ID egg Minecraft
PTERO_RUST_EGG_ID=2
PTERO_TERRARIA_EGG_ID=3

# ── Resource Limits per Server ─────────────────────────────────
MINECRAFT_MEMORY=2048   # MB
MINECRAFT_DISK=10240    # MB
MINECRAFT_CPU=100       # % (100 = 1 core)

RUST_MEMORY=4096
RUST_DISK=20480
RUST_CPU=200

TERRARIA_MEMORY=1024
TERRARIA_DISK=5120
TERRARIA_CPU=100

# ── Monitoring ────────────────────────────────────────────────
MONITOR_POLL_INTERVAL_MS=30000  # Interval polling status (ms)
LOG_LEVEL=info                  # debug | info | warn | error
```

---

## Discord Bot Commands

### Server Management

| Command | Parameter | Deskripsi |
|---------|-----------|-----------|
| `/start` | `server_id` | Menyalakan server |
| `/stop` | `server_id` | Mematikan server |
| `/restart` | `server_id` | Restart server |
| `/status` | `server_id` | Lihat status + CPU/RAM/Disk |
| `/stats` | — | Lihat semua server milik kamu |

> `server_id` adalah **identifier** 8 karakter dari Pterodactyl (contoh: `a1b2c3d4`)

### Deploy

| Command | Parameter | Deskripsi |
|---------|-----------|-----------|
| `/deploy minecraft` | `name`, `version` | Deploy server Minecraft |
| `/deploy rust` | `name` | Deploy server Rust |
| `/deploy terraria` | `name` | Deploy server Terraria |

**Alur deploy:**
1. Bot mengirim request ke API
2. API memvalidasi quota user
3. Job masuk ke BullMQ queue
4. Worker memproses: cari allocation → create server di Pterodactyl → simpan ke DB
5. Notifikasi dikirim ke Discord via button "Check Status"

### User System

| Command | Deskripsi |
|---------|-----------|
| `/link <email> <api_key>` | Hubungkan Discord ID ke akun Pterodactyl |
| `/info` | Lihat info akun dan quota server |

### Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| `/status` | 10x | 1 menit |
| `/start`, `/stop`, `/restart` | 3x | 2 menit |
| `/deploy` | 1x | 5 menit |
| Default | 5x | 1 menit |

Admin role membypass semua rate limit.

---

## API Reference

### Base URL
```
http://localhost:3000
```

### Authentication
Semua endpoint `/api/*` membutuhkan header:
```
X-API-Key: <API_SECRET_KEY dari .env>
```

---

### Health Check

#### `GET /health`
Cek status API (tidak perlu auth).

**Response `200`:**
```json
{
  "status": "ok",
  "uptime": 3600.52
}
```

---

### Servers

#### `POST /api/servers/:identifier/start`
Menyalakan server.

**Path Params:**
| Param | Tipe | Deskripsi |
|-------|------|-----------|
| `identifier` | string | Identifier 8 karakter Pterodactyl |

**Request Body:**
```json
{
  "discord_id": "123456789012345678"
}
```

**Response `200`:**
```json
{
  "message": "Server is starting."
}
```

**Response `403`:**
```json
{
  "message": "You do not own this server."
}
```

---

#### `POST /api/servers/:identifier/stop`
Mematikan server.

**Request Body:**
```json
{
  "discord_id": "123456789012345678"
}
```

**Response `200`:**
```json
{
  "message": "Server is stopping."
}
```

---

#### `POST /api/servers/:identifier/restart`
Restart server.

**Request Body:**
```json
{
  "discord_id": "123456789012345678"
}
```

**Response `200`:**
```json
{
  "message": "Server is restarting."
}
```

---

#### `GET /api/servers/:identifier/status?discord_id=`
Ambil status dan resource usage server.

**Query Params:**
| Param | Tipe | Deskripsi |
|-------|------|-----------|
| `discord_id` | string | Discord ID pemilik |

**Response `200`:**
```json
{
  "server": {
    "id": 1,
    "pterodactyl_server_id": 10,
    "pterodactyl_identifier": "a1b2c3d4",
    "owner_discord_id": "123456789012345678",
    "name": "My Minecraft Server",
    "type": "minecraft",
    "status": "running",
    "node_id": 1,
    "cpu": "45.2",
    "memory_bytes": 1073741824,
    "disk_bytes": 2147483648,
    "created_at": "2026-05-02T10:00:00.000Z"
  }
}
```

---

### Users

#### `GET /api/users/:discord_id`
Ambil informasi user. Jika belum ada, otomatis dibuat.

**Response `200`:**
```json
{
  "user": {
    "id": 1,
    "discord_id": "123456789012345678",
    "pterodactyl_user_id": 5,
    "pterodactyl_username": "johndoe",
    "pterodactyl_email": "john@example.com",
    "role": "user",
    "server_limit": 1,
    "server_count": 0,
    "created_at": "2026-05-02T10:00:00.000Z"
  }
}
```

---

#### `POST /api/users/link`
Hubungkan Discord ID dengan akun Pterodactyl.

**Request Body:**
```json
{
  "discord_id": "123456789012345678",
  "email": "john@example.com",
  "api_key": "ptlc_userClientApiKey"
}
```

**Response `200`:**
```json
{
  "user": {
    "discord_id": "123456789012345678",
    "pterodactyl_user_id": 5,
    "pterodactyl_username": "johndoe",
    "role": "user",
    "server_limit": 1
  }
}
```

**Response `404`:**
```json
{
  "message": "Pterodactyl account not found for that email."
}
```

---

#### `GET /api/users/:discord_id/servers`
Ambil semua server milik user beserta resource usage.

**Response `200`:**
```json
{
  "servers": [
    {
      "id": 1,
      "pterodactyl_identifier": "a1b2c3d4",
      "name": "My Minecraft Server",
      "type": "minecraft",
      "status": "running",
      "cpu": "12.5",
      "memory_bytes": 1073741824,
      "disk_bytes": 2147483648
    }
  ]
}
```

---

### Deploy

#### `POST /api/deploy`
Queue deployment server baru.

**Request Body:**
```json
{
  "discord_id": "123456789012345678",
  "type": "minecraft",
  "name": "my-server",
  "version": "latest"
}
```

| Field | Tipe | Wajib | Nilai |
|-------|------|-------|-------|
| `discord_id` | string | Ya | Discord user ID |
| `type` | string | Ya | `minecraft` / `rust` / `terraria` |
| `name` | string | Ya | Alphanumeric, `_`, `-`, max 32 char |
| `version` | string | Tidak | `latest`, `1.20.4`, dll (Minecraft only) |

**Response `202`:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "estimated_seconds": 45
}
```

**Response `403`:**
```json
{
  "message": "Server limit reached (1/1)."
}
```

---

#### `GET /api/deploy/status/:job_id`
Cek status deploy job.

**Response `200` — Pending/Processing:**
```json
{
  "job": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "discord_id": "123456789012345678",
    "server_type": "minecraft",
    "server_name": "my-server",
    "status": "processing",
    "error_message": null,
    "result": null,
    "created_at": "2026-05-02T10:00:00.000Z"
  }
}
```

**Response `200` — Completed:**
```json
{
  "job": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result": {
      "name": "my-server",
      "identifier": "a1b2c3d4",
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "panel_url": "https://panel.domain.com/server/a1b2c3d4",
      "ip": "192.168.1.10",
      "port": 25565,
      "username": "johndoe",
      "password": "(use Pterodactyl panel password)"
    }
  }
}
```

**Response `200` — Failed:**
```json
{
  "job": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "failed",
    "error_message": "No available allocations. Contact an administrator."
  }
}
```

---

## Database Schema

### Tabel `users`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | INT PK | Auto increment |
| `discord_id` | VARCHAR(20) UNIQUE | Discord User ID |
| `pterodactyl_user_id` | INT | ID user di Pterodactyl |
| `pterodactyl_username` | VARCHAR(255) | Username Pterodactyl |
| `pterodactyl_email` | VARCHAR(320) | Email akun Pterodactyl |
| `role` | ENUM | `user` / `vip` / `admin` |
| `server_limit` | TINYINT | Maksimal server per user |
| `created_at`, `updated_at` | TIMESTAMP | — |

### Tabel `servers`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | INT PK | — |
| `pterodactyl_server_id` | INT UNIQUE | ID server di Pterodactyl |
| `pterodactyl_server_uuid` | VARCHAR(36) UNIQUE | UUID server |
| `pterodactyl_identifier` | VARCHAR(8) UNIQUE | Short ID (a1b2c3d4) |
| `owner_discord_id` | VARCHAR(20) FK | Referensi ke `users` |
| `name` | VARCHAR(255) | Nama server |
| `type` | ENUM | `minecraft`/`rust`/`csgo`/`terraria`/`custom` |
| `status` | ENUM | `starting`/`running`/`stopping`/`offline`/`error` |
| `node_id` | INT | Node Pterodactyl |
| `last_seen_online` | TIMESTAMP | Terakhir online |
| `alert_sent` | BOOLEAN | Apakah alert offline sudah dikirim |

### Tabel `deploy_queue`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `job_id` | VARCHAR(64) UNIQUE | UUID dari BullMQ |
| `discord_id` | VARCHAR(20) | Siapa yang deploy |
| `server_type` | VARCHAR(50) | Tipe server |
| `server_name` | VARCHAR(255) | Nama server |
| `version` | VARCHAR(32) | Versi (Minecraft) |
| `status` | ENUM | `pending`/`processing`/`completed`/`failed` |
| `error_message` | TEXT | Pesan error jika gagal |
| `result` | JSON | Hasil deploy jika berhasil |

### Tabel `audit_logs`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | BIGINT PK | — |
| `discord_id` | VARCHAR(20) | Siapa yang melakukan |
| `action` | VARCHAR(100) | `server.start`, `deploy.queued`, dll |
| `target_type` | ENUM | `server`/`user`/`system` |
| `target_id` | VARCHAR(255) | ID target aksi |
| `details` | JSON | Data tambahan |
| `ip_address` | VARCHAR(45) | IP address |
| `success` | BOOLEAN | Berhasil atau tidak |
| `created_at` | TIMESTAMP | — |

---

## Queue System

Menggunakan **BullMQ** dengan Redis sebagai backend.

### Queue: `deploy`

```
Bot → POST /api/deploy
         │
         ▼
  deployController.js
  - Validasi input & quota
  - Insert ke deploy_queue DB
  - Enqueue ke BullMQ
         │
         ▼
  worker.js (process concurrency: 3)
  - deployJob.js::processDeploy()
    1. Re-check quota (race condition guard)
    2. Cari available allocation di node
    3. POST ke Pterodactyl Application API
    4. Simpan server ke DB
    5. Update deploy_queue → completed
         │
         ▼
  Bot polling via /api/deploy/status/:job_id
```

**Retry policy:** 3 attempts, exponential backoff (5s → 10s → 20s)

### Monitoring Scheduler

Worker juga menjalankan polling loop setiap `MONITOR_POLL_INTERVAL_MS`:

```
pollAllServers()
  - Query semua server yang status-nya aktif/baru offline
  - GET /servers/:id/resources dari Pterodactyl Client API
  - Update status di DB
  - Jika server offline tiba-tiba → kirim alert ke Discord channel
```

---

## Monitoring & Alerting

Sistem monitoring menggunakan **polling** ke Pterodactyl Client API.

**Trigger alert** dikirim ke `ALERT_DISCORD_CHANNEL_ID` ketika:
- Server statusnya `running` di DB
- Tapi status terbaru dari Pterodactyl adalah `offline`
- `alert_sent` belum `TRUE`

Alert otomatis di-reset (allow re-alert) ketika server kembali online.

**Format alert:**
```
🔴 Server Offline Alert
Server my-minecraft (a1b2c3d4) went offline unexpectedly.
Owner: @User
Type: MINECRAFT
```

---

## Security

| Layer | Implementasi |
|-------|--------------|
| Bot → API | `X-API-Key` header (shared secret) |
| API hardening | `helmet` (security headers), CORS restricted |
| Rate limiting | Redis per-user per-action (bot layer) |
| HTTP rate limit | `express-rate-limit` 200 req/min (DDoS protection) |
| Input validation | Regex nama server, validasi tipe, length check |
| Audit trail | Semua aksi dicatat di `audit_logs` dengan IP |
| Secrets | Semua keys di `.env`, tidak pernah di-log |
| Docker | Non-root user di semua container |
| Bot ↔ Pterodactyl | **Bot TIDAK pernah call Pterodactyl langsung** |

---

## Deployment di Pterodactyl

Untuk deploy bot panel ini di dalam Pterodactyl (hosting the system on Pterodactyl itself):

### Buat Custom Egg

**Startup Command:**
```bash
node src/index.js
```

**Docker Image:**
```
ghcr.io/pterodactyl/yolks:nodejs_20
```

**Environment Variables di Egg:**
```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
API_BASE_URL=
API_SECRET_KEY=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

### Struktur Deploy

Deploy 3 server terpisah di Pterodactyl:
1. **pterobot-api** — `node src/index.js` (port 3000)
2. **pterobot-worker** — `node src/queue/worker.js`
3. **pterobot-bot** — `node src/index.js`

MySQL dan Redis bisa di-host di server yang sama atau menggunakan shared database.

### Upload File

```bash
# Zip source code
zip -r bot-panel.zip bot-panel/ --exclude "*/node_modules/*" --exclude "*/.git/*"

# Upload via SFTP ke setiap server Pterodactyl
# Lalu di console Pterodactyl:
npm install
```

---

## Troubleshooting

### Bot tidak merespons command

```bash
# Cek apakah commands sudah terdaftar
docker compose exec bot node src/deploy-commands.js

# Cek log bot
docker compose logs bot --tail=50
```

### Deploy gagal "No available allocations"

- Tambah allocation di Pterodactyl: Node → Allocations → Create
- Atau ubah `PTERO_DEFAULT_NODE_ID` ke node yang masih punya slot

### Deploy gagal "Account not linked"

User harus jalankan `/link <email> <api_key>` dulu di Discord.

### API mengembalikan 401

Pastikan `API_SECRET_KEY` di `.env` bot dan api sama persis.

### Database connection refused

```bash
# Cek MySQL running
docker compose ps mysql

# Jalankan ulang dengan health check
docker compose up -d mysql
docker compose up -d api  # Restart api setelah MySQL ready
```

### Redis connection error

```bash
docker compose logs redis
docker compose restart redis
```

### Cek semua log sekaligus

```bash
docker compose logs -f --tail=100
```
