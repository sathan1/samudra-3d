"""
SAMUDRA-3D In-Depth Ocean Physical & Acoustic Analysis Engine
Authority: UNESCO EOS-80, Mackenzie (1981) Sound Velocity, Hobday et al. (2016) Marine Heatwave.
Computes:
1. Sound Velocity Profile (SVP) and SOFAR Acoustic Channel Axis Depth
2. Potential Density anomaly (sigma_theta) and Pycnocline Maximum Gradient
3. Brunt-Väisälä Buoyancy Frequency (N²) for dynamic stability and internal waves
4. Water Mass Fingerprinting (ASW, BBW, PGW, RSW, ICW, AAIW, IDW)
5. Marine Heatwave (MHW) Subsurface Depth Penetration
"""
import math
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

# Standard UNESCO 1983 / EOS-80 Reference Density
RHO_0 = 1025.0  # kg/m³
GRAVITY = 9.80665  # m/s²


def calculate_sound_velocity(temp_c: float, sal_psu: float, depth_m: float) -> float:
    """
    Mackenzie (1981) formula for speed of sound in seawater.
    Valid for T: 2 to 30°C, S: 25 to 40 PSU, Depth: 0 to 8000m.
    c = 1448.96 + 4.591*T - 5.304e-2*T² + 2.374e-4*T³ + 1.340*(S-35) + 1.630e-2*D + 1.675e-7*D² - 1.025e-2*T*(S-35) - 7.139e-13*T*D³
    """
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


def calculate_potential_density(temp_c: float, sal_psu: float) -> float:
    """
    UNESCO EOS-80 standard formula for sea surface potential density anomaly sigma_theta (kg/m³).
    sigma_theta = rho(S, T, 0) - 1000 kg/m³.
    """
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


def calculate_buoyancy_frequency(depths: List[float], sigmas: List[float]) -> List[Dict[str, Any]]:
    """
    Brunt-Väisälä buoyancy frequency squared N² = (g / rho0) * (d_rho / d_z).
    Positive N² indicates stable stratification; peak N² marks pycnocline barrier.
    """
    n2_profile = []
    if len(depths) < 2 or len(sigmas) < 2:
        return []

    for i in range(len(depths) - 1):
        dz = depths[i + 1] - depths[i]
        d_sigma = sigmas[i + 1] - sigmas[i]
        mid_depth = (depths[i] + depths[i + 1]) / 2.0

        if dz > 0:
            n2 = (GRAVITY / RHO_0) * (d_sigma / dz)
            # Brunt-Väisälä period in minutes: T_bv = 2*pi / N
            period_min = round((2.0 * math.pi / math.sqrt(max(1e-8, n2))) / 60.0, 1) if n2 > 0 else None
            n2_profile.append({
                "mid_depth": round(mid_depth, 1),
                "n2_rad2_s2": round(float(n2), 6),
                "stability": "STABLE" if n2 > 1e-5 else ("WEAKLY_STABLE" if n2 > 0 else "CONVECTIVE_OVERTURNING"),
                "buoyancy_period_minutes": period_min
            })

    return n2_profile


def classify_water_mass(temp_c: float, sal_psu: float, depth_m: float, lat: float, lon: float) -> Dict[str, Any]:
    """
    Classifies Indian Ocean water masses based on established physical oceanography criteria:
    - BBW: Bay of Bengal Low Salinity Surface Water (S < 33.0, T > 27°C, 0-40m)
    - ASW: Arabian Sea High Salinity Water (S > 35.6, T > 24°C, 0-100m)
    - PGW: Persian Gulf Water (S > 36.5, T: 18-22°C, 200-400m, NW Arabian Sea)
    - RSW: Red Sea Water (S: 35.5-36.2, T: 12-16°C, 500-900m)
    - ICW: Indian Central Water (S: 34.5-35.3, T: 8-16°C, 200-800m)
    - AAIW: Antarctic Intermediate Water (S: 34.2-34.6 min, T: 4-8°C, 800-1500m)
    - IDW: Indian Deep Water (S: 34.70-34.78, T: 1.5-3.0°C, >1500m)
    """
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
    """
    n_levels = min(len(depths), len(temperatures), len(salinities))
    if n_levels == 0:
        raise ValueError("Cannot analyze empty ocean column")

    sound_speeds = []
    densities = []
    water_masses = []

    for i in range(n_levels):
        d = float(depths[i])
        t = float(temperatures[i]) if temperatures[i] is not None else 20.0
        s = float(salinities[i]) if salinities[i] is not None else 35.0

        c = calculate_sound_velocity(t, s, d)
        sigma = calculate_potential_density(t, s)
        wm = classify_water_mass(t, s, d, lat, lon)

        sound_speeds.append(c)
        densities.append(sigma)
        water_masses.append({
            "depth": d,
            "temperature": round(t, 2),
            "salinity": round(s, 2),
            "sound_speed": c,
            "density_sigma": sigma,
            "water_mass": wm
        })

    # SOFAR channel axis is the depth where sound velocity is MINIMUM
    # (acts as an acoustic waveguide where sound waves refract back towards the axis)
    min_c = min(sound_speeds)
    min_c_idx = sound_speeds.index(min_c)
    sofar_depth = depths[min_c_idx]

    # Pycnocline depth: depth of MAXIMUM vertical density gradient d(sigma)/dz
    pycnocline_depth = depths[0]
    max_d_sigma = -1.0
    for i in range(len(densities) - 1):
        dz = depths[i + 1] - depths[i]
        if dz > 0:
            grad = (densities[i + 1] - densities[i]) / dz
            if grad > max_d_sigma:
                max_d_sigma = grad
                pycnocline_depth = (depths[i] + depths[i + 1]) / 2.0

    # Brunt-Väisälä frequency
    bv_profile = calculate_buoyancy_frequency(depths[:n_levels], densities)

    # Marine Heatwave (MHW) depth penetration evaluation (Hobday et al. 2016)
    # Baseline expected SST in Indian Ocean ~ 28.0°C; threshold anomaly ~ 1.0°C
    sst = temperatures[0] if temperatures[0] is not None else 28.0
    mhw_anomaly = max(0.0, sst - 28.0)
    mhw_category = "NO_HEATWAVE"
    if mhw_anomaly >= 3.0:
        mhw_category = "CATEGORY_IV_EXTREME"
    elif mhw_anomaly >= 2.0:
        mhw_category = "CATEGORY_III_SEVERE"
    elif mhw_anomaly >= 1.0:
        mhw_category = "CATEGORY_II_STRONG"
    elif mhw_anomaly >= 0.5:
        mhw_category = "CATEGORY_I_MODERATE"

    # MHW penetration depth: depth where temperature drops below 26°C or below mixed layer
    mhw_penetration_depth = 0.0
    for i in range(n_levels):
        if temperatures[i] is not None and temperatures[i] >= 26.0:
            mhw_penetration_depth = depths[i]

    # Dominant Water Mass
    unique_wm = {}
    for item in water_masses:
        code = item["water_mass"]["code"]
        unique_wm[code] = unique_wm.get(code, 0) + 1
    dominant_wm_code = max(unique_wm, key=unique_wm.get) if unique_wm else "STW"
    dominant_wm = next(item["water_mass"] for item in water_masses if item["water_mass"]["code"] == dominant_wm_code)

    return {
        "lat": round(lat, 4),
        "lon": round(lon, 4),
        "max_depth_analyzed": max(depths),
        "num_depth_levels": n_levels,
        "acoustics": {
            "surface_sound_speed_mps": sound_speeds[0],
            "sofar_channel_axis_depth_m": round(sofar_depth, 1),
            "sofar_minimum_sound_speed_mps": min_c,
            "sound_speed_gradient_mps_per_100m": round(((sound_speeds[-1] - sound_speeds[0]) / max(1.0, depths[-1])) * 100.0, 2),
            "acoustic_duct_type": "SOFAR Deep Sound Channel" if sofar_depth > 200 else "Surface Acoustic Duct"
        },
        "stratification": {
            "surface_density_sigma": densities[0],
            "bottom_density_sigma": densities[-1],
            "pycnocline_depth_m": round(pycnocline_depth, 1),
            "maximum_density_gradient_kg_m4": round(max_d_sigma, 4),
            "stability_status": "STABLE_STRATIFIED" if max_d_sigma > 0 else "CONVECTIVELY_UNSTABLE",
            "brunt_vaisala_profile": bv_profile
        },
        "marine_heatwave": {
            "status": mhw_category,
            "surface_anomaly_celsius": round(mhw_anomaly, 2),
            "subsurface_penetration_depth_m": round(mhw_penetration_depth, 1),
            "ecological_stress_level": "CRITICAL (Coral Bleaching & Pelagic Displacement)" if mhw_anomaly >= 1.5 else "NORMAL_SEASONAL"
        },
        "water_masses": {
            "dominant_water_mass": dominant_wm,
            "vertical_profile": water_masses
        }
    }
