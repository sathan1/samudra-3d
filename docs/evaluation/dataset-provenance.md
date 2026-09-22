# SAMUDRA-3D Dataset Provenance

## 1. Real datasets

| Dataset | ID | Provider | Format | Grid | Variables | License / citation |
|---|---|---|---|---|---|---|
| GLORYS12V1 reanalysis subset | `cmems_mod_glo_phy_my_0.083deg_P1D-m` | Copernicus Marine / Mercator Ocean | NetCDF-4 (CF-1.4) | 301 lat x 601 lon, 22 depths, 7 daily steps, ~8.3 km | thetao, so, uo, vo -> temperature / salinity / u_current / v_current / currents | E.U. Copernicus Marine Service Information; product `GLOBAL_MULTIYEAR_PHY_001_030` |
| Synthetic fixture (test-only) | `incois_roms_synthetic` | MoES/INCOIS (internal) | NetCDF-4 (CF-1.8) | 50 lat x 60 lon, 9 depths, 8 steps | temperature / salinity / u_current / v_current / currents | Internal research model, labelled TEST_FIXTURE |
| Argo / Glider / OceanSITES | see in-situ service | GDAC / IMOS / OceanSITES | JSON / ERDDAP | profiles + QC flags | temperature / salinity + QC | WMO / DAC citations via in-situ service |

## 2. Local files & manifests

- Real NetCDF: `SAMUDRA_DATA/raw/cmems_mod_glo_phy_my_0.083deg_P1D-m_thetao-so-uo-vo_50.00E-100.00E_0.00N-25.00N_0.49-92.33m_2025-01-01-2025-01-07.nc`
- Manifest store: `SAMUDRA_DATA/manifests/` (SHA-256, source, dataset ID, size, status).
- Orphaned `.nc.<hash>` partial download artifacts under
  `SAMUDRA_DATA/raw/copernicus/...` were removed after verifying they are
  incomplete fragments not referenced by any manifest (see cleanup note).

## 3. Provenance in every response

- Model responses carry `dataset_id`, `source`, `timestamp`, units, and the
  interpolation method — the UI can always show where a number came from.
- Collocation responses carry per-level `rejection_reason` + `qc_flag`, and
  the summary carries `interpolation_method`, `time_strategy`, temporal offset
  and spatial offset — the reviewer can audit every match.
