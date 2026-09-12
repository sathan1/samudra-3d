/**
 * SAMUDRA-3D Scientific Colormaps Module
 * Implements cmocean-standard oceanographic sequential palettes:
 * - 'thermal': for Potential Temperature (°C)
 * - 'haline': for Practical Salinity (PSU)
 * 
 * Authority: Master Handbook physical pp. 3, 9-11 (SIH26067)
 */

export const COLORMAP_PALETTES = {
  thermal: [
    [0.00, [0.05, 0.20, 0.55]], // Deep ocean abyss blue (~2°C)
    [0.25, [0.05, 0.55, 0.70]], // Subsurface cyan (~12°C)
    [0.50, [0.15, 0.72, 0.45]], // Thermocline transitional green-teal (~18°C)
    [0.75, [0.92, 0.72, 0.15]], // Warm yellow (~24°C)
    [1.00, [0.92, 0.18, 0.15]]  // Tropical surface coral red (~30°C)
  ],
  haline: [
    [0.00, [0.22, 0.12, 0.55]], // Low salinity / river discharge (~32 PSU, deep indigo)
    [0.25, [0.10, 0.40, 0.70]], // Moderate salinity (~33.5 PSU, blue)
    [0.50, [0.10, 0.65, 0.55]], // Mean ocean salinity (~35 PSU, cyan-teal)
    [0.75, [0.45, 0.80, 0.35]], // Elevated salinity (~36.5 PSU, lime-green)
    [1.00, [0.95, 0.90, 0.35]]  // High evaporation Arabian Sea (~38 PSU, light yellow)
  ]
};

export const VARIABLE_CONFIGS = {
  temperature: {
    id: 'temperature',
    name: 'Potential Temperature',
    units: '°C',
    palette: 'thermal',
    fixedRange: [2.0, 32.0],
    description: 'Ocean potential temperature profile (°C)'
  },
  salinity: {
    id: 'salinity',
    name: 'Practical Salinity',
    units: 'PSU',
    palette: 'haline',
    fixedRange: [32.0, 38.0],
    description: 'Practical Salinity Scale 1978 (PSU)'
  }
};

/**
 * Samples an RGB color from the selected sequential colormap for a normalized value t in [0, 1].
 * Guaranteed safe against NaN, Infinity, and out-of-range values.
 * 
 * @param {string} paletteName - 'thermal' | 'haline'
 * @param {number} t - Normalized value in [0, 1]
 * @returns {[number, number, number]} RGB array with components in [0, 1]
 */
export function sampleColormap(paletteName, t) {
  const stops = COLORMAP_PALETTES[paletteName] || COLORMAP_PALETTES.thermal;
  const safeT = isNaN(t) ? 0.0 : t;
  const clamped = Math.max(0.0, Math.min(1.0, safeT));

  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (clamped >= s0 && clamped <= s1) {
      const f = (clamped - s0) / (s1 - s0);
      return [
        c0[0] + f * (c1[0] - c0[0]),
        c0[1] + f * (c1[1] - c0[1]),
        c0[2] + f * (c1[2] - c0[2])
      ];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Generates a CSS linear-gradient string matching the exact stops of the colormap.
 * Used by ColorBarLegend to render the interactive gradient bar.
 * 
 * @param {string} paletteName - 'thermal' | 'haline'
 * @returns {string} CSS gradient string
 */
export function getColormapCssGradient(paletteName) {
  const stops = COLORMAP_PALETTES[paletteName] || COLORMAP_PALETTES.thermal;
  const stopStrings = stops.map(([s, [r, g, b]]) => {
    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);
    const pct = Math.round(s * 100);
    return `rgb(${rInt}, ${gInt}, ${bInt}) ${pct}%`;
  });
  return `linear-gradient(to right, ${stopStrings.join(', ')})`;
}
