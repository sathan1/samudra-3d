"""
SAMUDRA-3D In-Depth Ocean Physical & Acoustic Analysis Engine
Authority: UNESCO EOS-80, Mackenzie (1981) Sound Velocity, Hobday et al. (2016) Marine Heatwave.
Computes:
1. Sound Velocity Profile (SVP) and SOFAR Acoustic Channel Axis Depth
2. Potential Density anomaly (sigma_theta) and Pycnocline Maximum Gradient
3. Brunt-Väisälä Buoyancy Frequency (N²) for dynamic stability and internal waves
4. Water Mass Fingerprinting (ASW, BBW, PGW, RSW, ICW, AAIW, IDW)
5. Marine Heatwave (MHW) Subsurface Depth Penetration

Physics Contract (Phase 04):
- Explicit invalid/unavailable outputs when inputs are missing (no invented 20°C or 35 PSU fallbacks).
- Preserves genuine zero and finite measurements.
- Validates nonfinite values and inconsistent array lengths.
- Stratification/gradient summaries do not bridge invalid gaps.
- Derived axes, pycnocline, and heatwave summaries explain insufficient valid coverage.
"""
import math
from typing import Dict, List, Optional, Any
import numpy as np

# Standard UNESCO 1983 / EOS-80 Reference Density
RHO_0 = 1025.0  # kg/m³
GRAVITY = 9.80665  # m/s²


def is_finite_num(v: Any) -> bool:
    """Returns True if v is a finite numeric value (not None, NaN, inf, or string)."""
    if v is None:
        return False
    try:
        f = float(v)
        return math.isfinite(f)
    except (ValueError, TypeError):
        return False


def calculate_sound_velocity(temp_c: float, sal_psu: float, depth_m: float) -> Optional[float]:
    """
    Mackenzie (1981) formula for speed of sound in seawater.
    Valid for T: 2 to 30°C, S: 25 to 40 PSU, Depth: 0 to 8000m.
    c = 1448.96 + 4.591*T - 5.304e-2*T² + 2.374e-4*T³ + 1.340*(S-35) + 1.630e-2*D + 1.675e-7*D² - 1.025e-2*T*(S-35) - 7.139e-13*T*D³
    Returns None if any input is missing or nonfinite.
    """
    if not (is_finite_num(temp_c) and is_finite_num(sal_psu) and is_finite_num(depth_m)):
        return None

    t = float(temp_c)
    s = float(sal_psu)
    d = float(depth_m)

    c = (
        1448.96
        + 4.591 * t
        - 5.304e-2 * (t ** 2)
        + 2.374e-4 * (t ** 3)
        + 1.340 * (s - 35.0)
        + 1.630e-2 * d
        + 1.675e-7 * (d ** 2)
        - 1.025e-2 * t * (s - 35.0)
        - 7.139e-13 * t * (d ** 3)
    )
    return round(float(c), 2)


def calculate_potential_density(temp_c: float, sal_psu: float) -> Optional[float]:
    """
    UNESCO EOS-80 standard formula for sea surface potential density anomaly sigma_theta (kg/m³).
    sigma_theta = rho(S, T, 0) - 1000 kg/m³.
    Returns None if any input is missing or nonfinite.
    """
    if not (is_finite_num(temp_c) and is_finite_num(sal_psu)):
        return None

    t = float(temp_c)
    s = float(sal_psu)

    # Pure water density at atmospheric pressure (SMOW)
    rho_water = (
        999.842594
        + 6.793952e-2 * t
        - 9.095290e-3 * (t ** 2)
        + 1.001685e-4 * (t ** 3)
        - 1.120083e-6 * (t ** 4)
        + 6.536332e-9 * (t ** 5)
    )

    # Salinity contraction polynomial
    a = (
        8.24493e-1
        - 4.0899e-3 * t
        + 7.6438e-5 * (t ** 2)
        - 8.2467e-7 * (t ** 3)
        + 5.3875e-9 * (t ** 4)
    )
    b = (
        -5.72466e-3
        + 1.0227e-4 * t
        - 1.6546e-6 * (t ** 2)
    )
    c = 4.8314e-4

    rho = rho_water + a * s + b * (s ** 1.5) + c * (s ** 2)
    sigma_theta = rho - 1000.0
    return round(float(sigma_theta), 3)


def calculate_buoyancy_frequency(depths: List[float], sigmas: List[Optional[float]]) -> List[Dict[str, Any]]:
    """
    Brunt-Väisälä buoyancy frequency squared N² = (g / rho0) * (d_rho / d_z).
    Positive N² indicates stable stratification; peak N² marks pycnocline barrier.
    Stratification is only evaluated across adjacent valid levels without bridging invalid gaps.
    """
    n2_profile = []
    if len(depths) < 2 or len(sigmas) < 2:
        return []

    for i in range(min(len(depths), len(sigmas)) - 1):
        d0, d1 = depths[i], depths[i + 1]
        s0, s1 = sigmas[i], sigmas[i + 1]
        if not (is_finite_num(d0) and is_finite_num(d1) and is_finite_num(s0) and is_finite_num(s1)):
            continue
        dz = float(d1) - float(d0)
        d_sigma = float(s1) - float(s0)
        mid_depth = (float(d0) + float(d1)) / 2.0

        if dz > 0:
            n2 = (GRAVITY / RHO_0) * (d_sigma / dz)
            # Brunt-Väisälä period in minutes: T_bv = 2*pi / N
            period_min = round((2.0 * math.pi / math.sqrt(max(1e-8, n2))) / 60.0, 1) if n2 > 0 else None
            n2_profile.append({
                "mid_depth": round(mid_depth, 1),
                "n2_rad2_s2": round(float(n2), 6),
                "stability": "STABLE" if n2 > 1e-5 else ("WEAKLY_STABLE" if n2 > 0 else "CONVECTIVELY_OVERTURNING"),
                "buoyancy_period_minutes": period_min
            })

    return n2_profile


def classify_water_mass(temp_c: float, sal_psu: float, depth_m: float, lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Classifies Indian Ocean water masses based on established physical oceanography criteria:
    - BBW: Bay of Bengal Low Salinity Surface Water (S < 33.0, T > 27°C, 0-40m)
    - ASW: Arabian Sea High Salinity Water (S > 35.6, T > 24°C, 0-100m)
    - PGW: Persian Gulf Water (S > 36.5, T: 18-22°C, 200-400m, NW Arabian Sea)
    - RSW: Red Sea Water (S: 35.5-36.2, T: 12-16°C, 500-900m)
    - ICW: Indian Central Water (S: 34.5-35.3, T: 8-16°C, 200-800m)
    - AAIW: Antarctic Intermediate Water (S: 34.2-34.6 min, T: 4-8°C, 800-1500m)
    - IDW: Indian Deep Water (S: 34.70-34.78, T: 1.5-3.0°C, >1500m)
    Returns None if any input is missing or nonfinite.
    """
    if not (is_finite_num(temp_c) and is_finite_num(sal_psu) and is_finite_num(depth_m) and is_finite_num(lat) and is_finite_num(lon)):
        return None

    t = float(temp_c)
    s = float(sal_psu)
    d = float(depth_m)

    if d <= 40.0 and s < 33.2 and lon >= 80.0:
        return {
            "code": "BBW",
            "name": "Bay of Bengal Low-Salinity Surface Plume",
            "description": "Monsoon river discharge (Ganges-Brahmaputra) creating high near-surface stratification.",
            "origin": "Terrestrial runoff & precipitation",
            "color": "#38bdf8"
        }
    elif d <= 120.0 and s >= 35.6 and lon < 78.0:
        return {
            "code": "ASW",
            "name": "Arabian Sea High-Salinity Water",
            "description": "High net evaporation excess forming dense saline surface water mass.",
            "origin": "Arabian Sea evaporative basin",
            "color": "#f59e0b"
        }
    elif 150.0 <= d <= 450.0 and s >= 36.2 and lon <= 70.0 and lat >= 15.0:
        return {
            "code": "PGW",
            "name": "Persian Gulf Outflow Water",
            "description": "Extremely saline marginal sea density plume sinking to intermediate levels.",
            "origin": "Strait of Hormuz outflow",
            "color": "#ef4444"
        }
    elif 450.0 <= d <= 900.0 and 35.4 <= s <= 36.2 and 10.0 <= t <= 16.0:
        return {
            "code": "RSW",
            "name": "Red Sea Water Mass",
            "description": "Intermediate salinity maximum water mass originating from Bab-el-Mandeb.",
            "origin": "Red Sea outflow",
            "color": "#ec4899"
        }
    elif 150.0 <= d <= 800.0 and 34.5 <= s <= 35.4 and 8.0 <= t <= 17.0:
        return {
            "code": "ICW",
            "name": "Indian Central Water (Thermocline Mass)",
            "description": "Subtropical subduction water mass maintaining regional thermocline.",
            "origin": "Subtropical Southern Indian Ocean",
            "color": "#10b981"
        }
    elif 700.0 <= d <= 1500.0 and 34.3 <= s <= 34.7 and 3.5 <= t <= 8.0:
        return {
            "code": "AAIW",
            "name": "Antarctic Intermediate Water",
            "description": "Salinity minimum tongue advected northward into the Indian Ocean basin.",
            "origin": "Southern Ocean circumpolar subduction",
            "color": "#6366f1"
        }
    elif d > 1200.0 or t < 3.5:
        return {
            "code": "IDW",
            "name": "Indian Deep Water / Common Water",
            "description": "Cold, unventilated abyssal ocean water mass filling deeper basins.",
            "origin": "Antarctic Bottom Water modification",
            "color": "#1e293b"
        }
    else:
        return {
            "code": "STW",
            "name": "Subtropical Transition Water",
            "description": "Intermediate stratified layer exhibiting seasonal mixing.",
            "origin": "Regional Indian Ocean thermocline",
            "color": "#94a3b8"
        }


def analyze_in_depth_column(
    lat: float,
    lon: float,
    depths: List[float],
    temperatures: List[float],
    salinities: List[float]
) -> Dict[str, Any]:
    """
    Performs full multi-parameter ocean column analysis:
    - Sound speed at every depth level + SOFAR channel axis detection
    - Sigma-theta density + pycnocline depth
    - Brunt-Väisälä buoyancy frequency (N²)
    - Water mass classification at every depth
    - Marine heatwave (MHW) depth penetration

    Validates nonfinite values and inconsistent array lengths.
    Replaces invented inputs with explicit invalid/unavailable outputs.
    Preserves genuine zero and finite measurements.
    Does not bridge invalid gaps for column-wide gradients or derived extrema.
    """
    if not (is_finite_num(lat) and is_finite_num(lon)):
        raise ValueError("Latitude and longitude must be finite numeric values")

    if not isinstance(depths, (list, tuple, np.ndarray)) or \
       not isinstance(temperatures, (list, tuple, np.ndarray)) or \
       not isinstance(salinities, (list, tuple, np.ndarray)):
        raise ValueError("Depths, temperatures, and salinities must be list-like collections")

    n_d = len(depths)
    n_t = len(temperatures)
    n_s = len(salinities)

    if n_d != n_t or n_d != n_s:
        raise ValueError(f"Inconsistent array lengths: depths({n_d}), temperatures({n_t}), salinities({n_s}) must have equal length")

    if n_d < 2:
        raise ValueError("Insufficient depth levels: at least 2 depth levels required for ocean column analysis")

    for idx, d in enumerate(depths):
        if not is_finite_num(d) or float(d) < 0:
            raise ValueError(f"Invalid depth at index {idx}: depths must be finite non-negative numbers")
        if idx > 0 and float(d) <= float(depths[idx - 1]):
            raise ValueError(
                f"Depths must be strictly increasing and distinct: depth[{idx}] ({d}) <= depth[{idx - 1}] ({depths[idx - 1]})"
            )

    n_levels = n_d
    sound_speeds: List[Optional[float]] = []
    densities: List[Optional[float]] = []
    water_masses: List[Dict[str, Any]] = []

    for i in range(n_levels):
        d = float(depths[i])
        t_raw = temperatures[i]
        s_raw = salinities[i]

        t_val = round(float(t_raw), 2) if is_finite_num(t_raw) else None
        s_val = round(float(s_raw), 2) if is_finite_num(s_raw) else None

        if t_val is not None and s_val is not None:
            c = calculate_sound_velocity(float(t_raw), float(s_raw), d)
            sigma = calculate_potential_density(float(t_raw), float(s_raw))
            wm = classify_water_mass(float(t_raw), float(s_raw), d, float(lat), float(lon))
        else:
            c = None
            sigma = None
            wm = None

        sound_speeds.append(c)
        densities.append(sigma)
        water_masses.append({
            "depth": d,
            "temperature": t_val,
            "salinity": s_val,
            "sound_speed": c,
            "density_sigma": sigma,
            "water_mass": wm
        })

    # Acoustics analysis
    has_invalid_c = any(c is None for c in sound_speeds)
    surface_sound_speed = sound_speeds[0] if is_finite_num(sound_speeds[0]) else None

    if has_invalid_c:
        sofar_depth = None
        min_c = None
        sound_speed_grad = None
        acoustic_duct_type = "UNAVAILABLE"
        acoustics_explanation = "Cannot determine SOFAR axis or sound speed gradient: profile contains missing or invalid levels"
    else:
        min_c = min(sound_speeds)
        min_c_idx = sound_speeds.index(min_c)
        sofar_depth = round(float(depths[min_c_idx]), 1)
        min_c = round(float(min_c), 2)
        depth_span = float(depths[-1]) - float(depths[0])
        if depth_span <= 0:
            sound_speed_grad = None
        else:
            sound_speed_grad = round(((float(sound_speeds[-1]) - float(sound_speeds[0])) / depth_span) * 100.0, 2)
        acoustic_duct_type = "SOFAR Deep Sound Channel" if sofar_depth > 200 else "Surface Acoustic Duct"
        acoustics_explanation = None

    # Stratification analysis
    has_invalid_sigma = any(s is None for s in densities)
    surface_density = densities[0] if is_finite_num(densities[0]) else None
    bottom_density = densities[-1] if is_finite_num(densities[-1]) else None

    if has_invalid_sigma:
        pycnocline_depth = None
        max_d_sigma = None
        stability_status = "UNAVAILABLE"
        strat_explanation = "Cannot determine pycnocline: density profile contains missing or invalid levels"
    else:
        pycnocline_depth = None
        max_d_sigma = None
        for i in range(len(densities) - 1):
            dz = float(depths[i + 1]) - float(depths[i])
            if dz > 0:
                grad = (float(densities[i + 1]) - float(densities[i])) / dz
                if max_d_sigma is None or grad > max_d_sigma:
                    max_d_sigma = grad
                    pycnocline_depth = (float(depths[i]) + float(depths[i + 1])) / 2.0
        if max_d_sigma is not None and pycnocline_depth is not None:
            pycnocline_depth = round(pycnocline_depth, 1)
            max_d_sigma = round(float(max_d_sigma), 4)
            stability_status = "STABLE_STRATIFIED" if max_d_sigma > 0 else "CONVECTIVELY_UNSTABLE"
            strat_explanation = None
        else:
            pycnocline_depth = None
            max_d_sigma = None
            stability_status = "UNAVAILABLE"
            strat_explanation = "Cannot determine pycnocline: no valid depth interval found"

    bv_profile = calculate_buoyancy_frequency(depths, densities)

    # Marine Heatwave (MHW) analysis
    t0 = temperatures[0]
    if not is_finite_num(t0):
        mhw_category = "UNAVAILABLE"
        mhw_anomaly = None
        mhw_penetration_depth = None
        ecological_stress_level = "UNAVAILABLE"
        mhw_explanation = "Surface temperature measurement is unavailable"
    else:
        sst = float(t0)
        mhw_anomaly = round(max(0.0, sst - 28.0), 2)
        if mhw_anomaly >= 3.0:
            mhw_category = "CATEGORY_IV_EXTREME"
        elif mhw_anomaly >= 2.0:
            mhw_category = "CATEGORY_III_SEVERE"
        elif mhw_anomaly >= 1.0:
            mhw_category = "CATEGORY_II_STRONG"
        elif mhw_anomaly >= 0.5:
            mhw_category = "CATEGORY_I_MODERATE"
        else:
            mhw_category = "NO_HEATWAVE"

        if mhw_category == "NO_HEATWAVE":
            mhw_penetration_depth = 0.0
            ecological_stress_level = "NORMAL_SEASONAL"
            mhw_explanation = None
        else:
            # Active MHW: trace depth where temperature drops below 26.0°C continuously
            penetration = 0.0
            gap_encountered = False
            for i in range(n_levels):
                t_curr = temperatures[i]
                if not is_finite_num(t_curr):
                    gap_encountered = True
                    break
                if float(t_curr) >= 26.0:
                    penetration = float(depths[i])
                else:
                    break

            if gap_encountered:
                mhw_penetration_depth = None
                mhw_explanation = "Cannot determine subsurface penetration depth: subsurface temperature data contains invalid or missing levels"
            else:
                mhw_penetration_depth = round(penetration, 1)
                mhw_explanation = None

            ecological_stress_level = "CRITICAL (Coral Bleaching & Pelagic Displacement)" if mhw_anomaly >= 1.5 else "NORMAL_SEASONAL"

    # Water Mass classification
    unique_wm: Dict[str, int] = {}
    for item in water_masses:
        wm = item["water_mass"]
        if wm and isinstance(wm, dict) and "code" in wm:
            code = wm["code"]
            unique_wm[code] = unique_wm.get(code, 0) + 1

    if unique_wm:
        dominant_wm_code = max(unique_wm, key=unique_wm.get)
        dominant_wm = next(item["water_mass"] for item in water_masses if item["water_mass"] and item["water_mass"]["code"] == dominant_wm_code)
        wm_explanation = None
    else:
        dominant_wm = None
        wm_explanation = "No water mass classification available: missing valid temperature and salinity measurements"

    return {
        "lat": round(float(lat), 4),
        "lon": round(float(lon), 4),
        "max_depth_analyzed": max(float(d) for d in depths),
        "num_depth_levels": n_levels,
        "acoustics": {
            "surface_sound_speed_mps": surface_sound_speed,
            "sofar_channel_axis_depth_m": sofar_depth,
            "sofar_minimum_sound_speed_mps": min_c,
            "sound_speed_gradient_mps_per_100m": sound_speed_grad,
            "acoustic_duct_type": acoustic_duct_type,
            "explanation": acoustics_explanation
        },
        "stratification": {
            "surface_density_sigma": surface_density,
            "bottom_density_sigma": bottom_density,
            "pycnocline_depth_m": pycnocline_depth,
            "maximum_density_gradient_kg_m4": max_d_sigma,
            "stability_status": stability_status,
            "brunt_vaisala_profile": bv_profile,
            "explanation": strat_explanation
        },
        "marine_heatwave": {
            "status": mhw_category,
            "surface_anomaly_celsius": mhw_anomaly,
            "subsurface_penetration_depth_m": mhw_penetration_depth,
            "ecological_stress_level": ecological_stress_level,
            "explanation": mhw_explanation
        },
        "water_masses": {
            "dominant_water_mass": dominant_wm,
            "vertical_profile": water_masses,
            "explanation": wm_explanation
        }
    }
