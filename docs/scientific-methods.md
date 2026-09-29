# SAMUDRA-3D Scientific Methods & Physical Oceanography Formulas

## 1. Coordinate Systems & Conventions

### Spatial Reference Frame
- **Horizontal Datum**: World Geodetic System 1984 (WGS-84).
- **Longitude Range**: Standard $-180.0^\circ\text{E}$ to $+180.0^\circ\text{E}$, or $0.0^\circ\text{E}$ to $360.0^\circ\text{E}$ dynamically normalized across the Greenwich and antimeridian boundaries.
- **Latitude Range**: $-90.0^\circ\text{N}$ to $+90.0^\circ\text{N}$.

### Vertical Depth Convention
- **Orientation**: Positive-down ($z \ge 0$). Depth $z = 0.0\text{ m}$ represents the mean sea surface.
- **Pressure-to-Depth Conversion**: In-situ pressure values ($P$ in decibars) from Argo floats and gliders are converted to depth ($z$ in metres) using the standard Saunders & Fofonoff / UNESCO UNESCO-83 relation:
  $$z \approx \frac{P}{g \cdot \bar{\rho}} \approx 0.992 \cdot P$$

---

## 2. Variables & Standard Physical Units

| Ocean Variable | CF Standard Name | Units | Valid Range | Colormap |
| :--- | :--- | :--- | :--- | :--- |
| **Sea Water Potential Temperature** | `sea_water_potential_temperature` | Degrees Celsius ($^\circ\text{C}$) | $-2.0\text{ to }+35.0^\circ\text{C}$ | `cmocean thermal` |
| **Sea Water Practical Salinity** | `sea_water_practical_salinity` | Dimensionless (PSU / $10^{-3}$) | $0.0\text{ to }+42.0\text{ PSU}$ | `cmocean haline` |
| **Eastward Current Velocity ($u$)** | `eastward_sea_water_velocity` | Metres per second ($\text{m/s}$) | $-3.0\text{ to }+3.0\text{ m/s}$ | Diverging balance |
| **Northward Current Velocity ($v$)** | `northward_sea_water_velocity` | Metres per second ($\text{m/s}$) | $-3.0\text{ to }+3.0\text{ m/s}$ | Diverging balance |
| **Current Velocity Speed** | `sea_water_speed` | Metres per second ($\text{m/s}$) | $0.0\text{ to }+3.5\text{ m/s}$ | `cmocean speed` |

---

## 3. Spatio-Temporal Collocation & Model-Observation Residuals

### Collocation Window
An in-situ observation profile (Argo or glider) at coordinate $(t_{\text{obs}}, \text{lat}_{\text{obs}}, \text{lon}_{\text{obs}}, z_{\text{obs}})$ is collocated with the numerical model grid within:
- **Spatial Radius**: $R \le 200.0\text{ km}$ (Haversine great-circle distance).
- **Temporal Window**: $|\Delta t| \le 24.0\text{ hours}$.

### Trilinear Interpolation
Model fields are interpolated to the exact observation coordinate using `scipy.interpolate.RegularGridInterpolator`:
$$\hat{V}_{\text{model}} = \mathcal{I}_{\text{trilinear}}(z_{\text{obs}}, \text{lat}_{\text{obs}}, \text{lon}_{\text{obs}})$$

### Residual Convention
Rigorously following physical oceanography standards, the residual discrepancy $\Delta$ is defined as:
$$\Delta = \text{MODEL} - \text{OBSERVED} = \hat{V}_{\text{model}} - V_{\text{obs}}$$

- **$\Delta > 0$ (Warm / Salty Bias)**: Model over-predicts the observed value. Rendered in red on the diverging anomaly globe.
- **$\Delta < 0$ (Cold / Fresh Bias)**: Model under-predicts the observed value. Rendered in blue on the diverging anomaly globe.

### Statistical Validation Metrics
Across $N$ valid collocated vertical depth points:
- **Mean Bias Error (MBE)**:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^N \Delta_i$$
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |\Delta_i|$$
- **Root Mean Square Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N \Delta_i^2}$$

---

## 4. Quality Control (QC) Filtering

In-situ data integrity is governed by international WMO/IOC Argo Quality Control standards:
- **Flag 1**: Good data. (Included in collocation).
- **Flag 2**: Probably good data. (Included in collocation).
- **Flag 3**: Bad data that are potentially correctable. (**Strictly excluded** from residual metrics).
- **Flag 4**: Bad data. (**Strictly excluded** from residual metrics).
- **Missing / Fill Values**: Values matching $-999.0$, $10^{36}$, `NaN`, or infinite values are converted to JSON `null` and skipped during interpolation.

---

## 5. Derived Oceanographic Metrics

### A. Mixed Layer Depth (MLD)
Computed using the standard temperature threshold criterion (de Boyer Montégut et al., 2004):
$$\text{MLD} = z \quad \text{where} \quad T(z) \le T(z_{\text{ref}}) - \Delta T$$
where $z_{\text{ref}} = 10.0\text{ m}$ (or near-surface $0.49\text{ m}$) and $\Delta T = 0.5^\circ\text{C}$ (or $0.2^\circ\text{C}$ depending on stratification).

### B. Thermocline Depth ($D_{20}$)
The vertical depth where sea water temperature equals $20.0^\circ\text{C}$, obtained via linear interpolation between bounding vertical levels:
$$D_{20} = z_k + (z_{k+1} - z_k) \cdot \frac{20.0 - T_k}{T_{k+1} - T_k}$$

### C. Tropical Cyclone Heat Potential (TCHP)
Integrated upper-ocean thermal energy available to support tropical cyclogenesis, measured from the sea surface down to the $26.0^\circ\text{C}$ isotherm ($D_{26}$):
$$\text{TCHP} = \rho \cdot c_p \int_0^{D_{26}} [T(z) - 26.0] \, dz$$
where:
- $\rho = 1025.0\text{ kg/m}^3$ (reference seawater density)
- $c_p = 3985.0\text{ J}/(\text{kg}\cdot\text{K})$ (specific heat capacity of seawater)
- Units: Kilojoules per square centimetre ($\text{kJ/cm}^2$)
- Threshold: $\text{TCHP} > 110\text{ kJ/cm}^2$ indicates high rapid cyclone intensification potential.
