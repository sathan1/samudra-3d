# SAMUDRA-3D — Scientific Validation & Physical Formulation

## 1. Mathematical Formulations

### 1.1 Trilinear 4D Spatio-Temporal Collocation
For an in-situ observation point $P(x_o, y_o, z_o, t_o)$, the model prediction is collocated using continuous 4D interpolation across the bounding grid cell:

$$\hat{M}(x_o, y_o, z_o, t_o) = \sum_{i=0}^1 \sum_{j=0}^1 \sum_{k=0}^1 (1-u_i)(1-v_j)(1-w_k) \cdot M_{i,j,k}$$

where:
$$u = \frac{x_o - x_0}{x_1 - x_0}, \quad v = \frac{y_o - y_0}{y_1 - y_0}, \quad w = \frac{z_o - z_0}{z_1 - z_0}$$

In automated verification tests (`test_collocation.py`), exactness against an analytical affine field $f(x, y, z) = 2.0x + 3.0y - 0.5z + 10.0$ yielded a maximum absolute numerical error of $2.0 \times 10^{-5}$, validating trilinear precision.

---

### 1.2 Scientific Residual Sign Convention & Error Metrics
Residuals are calculated using the standard oceanographic convention:

$$\Delta_i = M_i - O_i$$

where $M_i$ is the model estimate and $O_i$ is the in-situ observation.
- $\Delta_i > 0$: Numerical model **over-predicts** observed seawater temperature/salinity.
- $\Delta_i < 0$: Numerical model **under-predicts** observed seawater temperature/salinity.

#### Summary Statistical Metrics:
$$\text{Bias} = \frac{1}{N} \sum_{i=1}^N (M_i - O_i)$$

$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |M_i - O_i|$$

$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (M_i - O_i)^2}$$

$$\text{Pearson } R = \frac{\sum_{i=1}^N (M_i - \bar{M})(O_i - \bar{O})}{\sqrt{\sum_{i=1}^N (M_i - \bar{M})^2} \sqrt{\sum_{i=1}^N (O_i - \bar{O})^2}}$$

---

### 1.3 Mixed Layer Depth (MLD) & Thermocline ($D_{20}$)
- **Mixed Layer Depth (MLD)**: Computed using the de Boyer Montégut (2004) temperature threshold criterion:
  $$\text{MLD} = z \quad \text{where} \quad T(z) = T(z_\text{ref}) - 0.5^\circ\text{C}, \quad z_\text{ref} = 0.494\text{ m}$$
- **Thermocline Depth ($D_{20}$)**: Depth of the $20.0^\circ\text{C}$ isotherm, linearly interpolated across the vertical sounding:
  $$D_{20} = z_{k} + (z_{k+1} - z_k) \frac{20.0 - T(z_k)}{T(z_{k+1}) - T(z_k)}$$

---

### 1.4 Tropical Cyclone Heat Potential (TCHP)
Tropical Cyclone Heat Potential quantifies the ocean upper-layer heat content available to intensify tropical cyclones:

$$\text{TCHP} = \rho c_p \int_0^{D_{26}} \max(0, T(z) - 26.0)\,dz$$

where:
- $\rho = 1025 \text{ kg/m}^3$ (seawater reference density)
- $c_p = 3993 \text{ J}/(\text{kg}\cdot^\circ\text{C})$ (specific heat capacity of seawater)
- $D_{26}$ is the depth of the $26^\circ\text{C}$ isotherm (depth of cyclogenesis thermal threshold).
- Units: $\text{kJ/cm}^2$. Values exceeding $50\text{ kJ/cm}^2$ represent high cyclogenesis intensification potential.

---

### 1.5 Underwater Sound Velocity & SOFAR Channel (Mackenzie 1981)
Underwater acoustic velocity $c(T, S, z)$ is computed using the Mackenzie (1981) nine-term empirical formula:

$$\begin{aligned}
c(T, S, z) = & 1448.96 + 4.591 T - 5.304 \times 10^{-2} T^2 + 2.374 \times 10^{-4} T^3 \\
& + 1.340 (S - 35) + 1.630 \times 10^{-2} z + 1.675 \times 10^{-7} z^2 \\
& - 1.025 \times 10^{-2} T (S - 35) - 7.139 \times 10^{-13} T z^3
\end{aligned}$$

- **SOFAR Channel Axis**: Minimum sound velocity depth:
  $$z_\text{SOFAR} = \arg\min_z c(T(z), S(z), z)$$
- **Sonic Layer Depth (SLD)**: Near-surface maximum of the sound speed profile before it decreases with depth.

---

### 1.6 Seawater Potential Density (UNESCO EOS-80) & Buoyancy Frequency
Seawater density anomaly $\sigma_\theta = \rho(S, T, 0) - 1000 \text{ kg/m}^3$ is evaluated using the UNESCO 1980 International Equation of State.

Vertical stability and stratification are evaluated via the **Brunt-Väisälä buoyancy frequency** $N^2$:

$$N^2 = -\frac{g}{\rho_0} \frac{\partial \rho}{\partial z}$$

- $N^2 > 0$: Stably stratified water column.
- $N^2 = 0$: Neutral stability (deep mixing).
- $N^2 < 0$: Statically unstable (convective overturning).
