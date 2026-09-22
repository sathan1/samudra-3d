# SAMUDRA-3D Architecture — Coordinate-on-Demand

## 1. The principle

The 3D Earth is a **spatial index** (coordinate / data-navigation layer), not a
giant container for the ocean dataset.  Three.js renders a lightweight globe;
scientific data is retrieved **on demand** from small spatial/temporal subsets.

## 2. What the Earth loads at startup

```text
Earth geometry (textured sphere)
Coastlines / land appearance
Geographic grid (graticule)
Camera + controls
Observation availability/index markers (lightweight platform references)
```

## 3. What the Earth NEVER loads at startup

```text
Entire temperature / salinity / current fields
All depths and all timestamps
All NetCDF values or the full 3D ocean volume
```

## 4. Data-flow sequence

```text
USER -> THREE.JS EARTH -> raycast XYZ to LAT/LON -> DATA AVAILABILITY QUERY
-> user picks variable/time/depth -> BACKEND QUERY (xarray/NetCDF/Argo/Glider)
-> SMALL SUBSET -> FRONTEND -> THREE.JS LOCAL VISUALIZATION
```

## 5. Hard guarantees

- `GET /api/ocean-data` rejects requests without a spatial bounding box
  (HTTP 400 / 422) — the full 301x601 global grid can never be returned by accident.
- The backend auto-decimates (LOD) large requests to stay within the
  `MAX_GRID_CELLS = 100_000` safety limit, and discloses the effective
  resolution in the response (`resolution` field).
- Synthetic fixtures are isolated under `backend/sample_data/` and are only
  activated when the process detects a test environment; production uses the
  real Copernicus GLORYS dataset when present.
- If a real request fails, the UI surfaces **DATA UNAVAILABLE + retry** and
  never fabricates scientific values.
