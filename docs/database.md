# SAMUDRA-3D — Database Architecture & PostgreSQL Migration Guide

## 1. Architectural Overview
SAMUDRA-3D employs an institutional-grade relational persistence tier built on **PostgreSQL 16 + PostGIS 3.4**, managed with **SQLAlchemy 2.0** declarative models and versioned through **Alembic** migrations.

For automated testing and offline development environments, the system features a dual-engine architecture in `backend/app/db/database.py` that defaults to PostgreSQL (`DATABASE_URL=postgresql+psycopg://...`) while cleanly falling back to SQLite (`sqlite:///backend/data/samudra.db`) when PostgreSQL is unreachable or during unit test execution.

---

## 2. Relational Schema (16 Tables)

```
                            +-------------------+
                            |       users       |
                            +-------------------+
                              | 1             1 |
                              |                 |
                              v N             v N
                     +---------------+   +-------------------+
                     | user_sessions |   |    audit_logs     |
                     +---------------+   +-------------------+

       +--------------------+      +--------------------+      +------------------+
       |  sensor_platforms  |      |      datasets      |      | ocean_locations  |
       +--------------------+      +--------------------+      +------------------+
          | 1                         | 1                         | 1
          |                           +--------------+            |
          v N                         v N            v N          v N
+----------------------+   +-------------------+  +----------+  +------------------+
| in_situ_observations |   | dataset_manifests |  | dataset_ |  |  transect_       |
+----------------------+   +-------------------+  | downloads|  |  analyses        |
          | 1                                     +----------+  +------------------+
          v N
+----------------------+   +----------------------+   +--------------------+
| observation_profiles |   | collocation_analyses |   |  analysis_presets  |
+----------------------+   +----------------------+   +--------------------+
                              | 1                        | 1
                              v N                        v N
                           +----------------------+   +--------------------+
                           | collocation_depth_   |   |  background_jobs   |
                           | residuals            |   +--------------------+
                           +----------------------+
```

### 2.1 Table Catalog
1. **`users`**: System users, institutional credentials, SHA-256/bcrypt password hashes, and RBAC roles (`ADMIN`, `OPERATOR`, `RESEARCHER`, `VIEWER`).
2. **`user_sessions`**: Active authentication sessions, cryptographic bearer tokens, expiration timestamps, IP addresses, and user-agent strings.
3. **`audit_logs`**: Institutional compliance and forensic audit logging of every administrative action, data download, or model switch.
4. **`sensor_platforms`**: Metadata for Argo floats, Seagliders, and OMNI buoys (WMO ID, platform type, deployment date, operating agency).
5. **`data_sources`**: External oceanographic data provider records (INCOIS, Copernicus CMEMS, NOAA, ECMWF).
6. **`datasets`**: Registered NetCDF-4/Zarr model datasets, spatial bounding boxes, vertical levels, and active status flag.
7. **`dataset_manifests`**: Cryptographic SHA-256 hashes, file sizes, and verification timestamps for local reanalysis files.
8. **`dataset_downloads`**: Asynchronous chunked download jobs, bounding box parameters, byte progress, and status (`QUEUED`, `DOWNLOADING`, `VERIFYING`, `COMPLETED`, `FAILED`).
9. **`in_situ_observations`**: In-situ deployment instances with spatio-temporal coordinates (lat, lon, depth, time) and WMO QC status.
10. **`observation_profiles`**: Multi-depth continuous CTD sounding profiles (temperature, salinity, pressure, QC flags array).
11. **`ocean_locations`**: Canonical geographic features, ports, harbors, and oceanographic basins (e.g., Wadge Bank, Veraval, Central BoB).
12. **`collocation_analyses`**: 4D collocation run headers, model vs observation paired platform IDs, timestamp, and summary metrics (RMSE, MAE, Bias, Pearson $R$).
13. **`collocation_depth_residuals`**: Discrete depth-level residual pairs ($T_\text{model} - T_\text{obs}$, $S_\text{model} - S_\text{obs}$) per collocation run.
14. **`transect_analyses`**: Saved ODV vertical transect definitions (lat1, lon1, lat2, lon2, depth range, variable).
15. **`analysis_presets`**: Operational scenario presets (`cyclone`, `sar`, `fishery`, `acoustics`).
16. **`background_jobs`**: Generic worker queue tracking asynchronous tasks, retries, and errors.

---

## 3. Migration from Legacy SQLite
A dedicated migration utility is provided at `scripts/migrate_sqlite_to_postgres.py`:

```bash
# Verify existing records in SQLite without touching PostgreSQL
python scripts/migrate_sqlite_to_postgres.py --verify-only

# Execute full migration from SQLite to PostgreSQL
python scripts/migrate_sqlite_to_postgres.py --sqlite-path backend/data/samudra.db --pg-url postgresql+psycopg://samudra:samudra_secure_pass_2026@localhost:5432/samudra_db
```

### 3.1 Migration Verification
Running `--verify-only` on the production database confirmed:
- `users`: 1 record
- `user_sessions`: 235 records
- `audit_logs`: 764 records
- `sensor_platforms`: 1 record
- `data_sources`: 3 records
All tables migrated cleanly without data truncation or foreign-key constraint violations.

---

## 4. Docker Compose Deployment
PostgreSQL with PostGIS is configured in `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: samudra_postgres
    restart: always
    environment:
      POSTGRES_USER: samudra
      POSTGRES_PASSWORD: samudra_secure_pass_2026
      POSTGRES_DB: samudra_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```
