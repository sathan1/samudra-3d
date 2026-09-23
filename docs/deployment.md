# SAMUDRA-3D Deployment Guide

## 1. Deployment Architecture

SAMUDRA-3D supports containerized production deployments via Docker Compose, as well as decoupled cloud hosting (e.g. Render for the FastAPI backend and Vercel for the React frontend).

```
                            [ Public Internet ]
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       [ Frontend: React / Nginx ]      [ Backend: FastAPI / Uvicorn ]
       • Static SPA on Port 80 / 443    • REST API on Port 8000
       • Three.js WebGL Engine          • Python 3.11 + NetCDF4 / NumPy
       • Vercel Edge / Docker Nginx     • Render Web Service / Docker
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                       [ Database & Storage Tier ]
       • Primary: PostgreSQL 16 + PostGIS 3.4 (Production persistence)
       • Compatibility: SQLite (Local testing & CI workflows)
       • Volumes: SAMUDRA_DATA_ROOT (NetCDF storage outside Git)
```

---

## 2. Docker Compose (Recommended Deployment)

Prerequisites: Docker Engine 24+ and Docker Compose v2.

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/sathan1/samudra-3d.git
cd samudra-3d

# Copy sample configuration
cp .env.example .env
```

### Step 2: Launch Stack
```bash
docker compose up -d --build
```

The stack provisions:
1. `samudra-backend`: FastAPI backend running on Python 3.11 with libnetcdf and libhdf5 system libraries. Exposed on `http://localhost:8000`.
2. `samudra-frontend`: Multi-stage built React SPA served via Nginx. Exposed on `http://localhost:80` (or `http://localhost:3000`).
3. `samudra-db` (Optional Production Profile): PostgreSQL 16 + PostGIS image with persistent data volume.

Verify running containers:
```bash
docker compose ps
curl -I http://localhost:8000/api/health
```

---

## 3. Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Deployment mode: `development`, `test`, or `production`. |
| `SAMUDRA_DATA_ROOT` | `/app/SAMUDRA_DATA` | Absolute path to NetCDF raw files, manifests, and cache. |
| `DATABASE_URL` | `postgresql+psycopg://user:pass@host:5432/samudra` | Connection URI. If set to `sqlite:///...`, runs SQLite compatibility mode. |
| `JWT_SECRET` | *(Generated string)* | Secret key for HS256 JWT authorization tokens. |
| `CORS_ORIGINS` | `http://localhost,http://localhost:3000,http://localhost:5173` | Allowed CORS origins for browser client. |
| `DEFAULT_DATASET_ID` | `cmems_mod_glo_phy_my_0.083deg_P1D-m` | Active dataset loaded on application startup. |

---

## 4. Cloud Deployment (Render & Vercel)

### Backend on Render
1. Create a new **Web Service** on Render connected to `sathan1/samudra-3d`.
2. Set Environment to **Python 3**.
3. Build Command:
   ```bash
   pip install -r backend/requirements.txt && pip install sqlalchemy alembic "psycopg[binary]" pydantic
   ```
4. Start Command:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add Environment Variables:
   - `ENVIRONMENT=production`
   - `DATABASE_URL=sqlite:///backend/data/samudra.db` (or external Managed PostgreSQL URI).

### Frontend on Vercel
1. Import repository on Vercel.
2. Root Directory: `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Environment Variable:
   - `VITE_API_BASE=https://your-render-backend.onrender.com/api`
