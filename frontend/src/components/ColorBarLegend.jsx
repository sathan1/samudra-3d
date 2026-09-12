import { getColormapCssGradient, VARIABLE_CONFIGS } from '../utils/colormaps.js';

/**
 * ColorBarLegend - Scientific Oceanographic Colorbar & Legend
 * Authority: Master Handbook physical pp. 3, 9-11 (SIH26067)
 * 
 * Displays cmocean thermal (temperature) and haline (salinity) sequential colorbars,
 * variable units, numerical bounds, and range policy disclosure.
 */
export default function ColorBarLegend({ activeField = null, rangeMode = 'dynamic', onToggleRangeMode = null }) {
  if (!activeField) {
    return (
      <div className="legend-placeholder">
        <span>COLOR LEGEND</span>
        <p>Available when a scalar field is loaded</p>
      </div>
    );
  }

  const variable = activeField.variable || 'temperature';
  const config = VARIABLE_CONFIGS[variable] || VARIABLE_CONFIGS.temperature;
  const palette = config.palette;
  const gradientCss = getColormapCssGradient(palette);

  // Compute displayed range bounds based on rangeMode
  const minVal = rangeMode === 'fixed'
    ? config.fixedRange[0]
    : (activeField.min_val ?? config.fixedRange[0]);

  const maxVal = rangeMode === 'fixed'
    ? config.fixedRange[1]
    : (activeField.max_val ?? config.fixedRange[1]);

  const midVal = (minVal + maxVal) / 2;
  const rawUnit = activeField.units || config.units;
  const unitStr = (rawUnit === 'degC' || rawUnit === 'celsius') ? '°C' : rawUnit;

  return (
    <div
      className="legend-active flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-t border-[var(--border)] text-xs bg-[var(--panel)] overflow-hidden max-w-full"
      data-testid="color-bar-legend"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-[var(--accent)] tracking-wider text-[11px] uppercase">
          {config.name}
        </span>
        <span className="text-[var(--muted)] text-[11px] font-mono">
          ({unitStr})
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] font-mono">
          cmocean {palette}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 max-w-full">
        <span className="font-mono text-[10px] sm:text-[11px] text-[var(--text)]">
          {minVal.toFixed(1)} {unitStr}
        </span>

        <div className="flex flex-col items-center gap-0.5">
          <div
            className="h-2.5 w-24 sm:w-44 max-w-full rounded-sm border border-[var(--border)] shadow-sm cursor-pointer"
            style={{ background: gradientCss }}
            title={`cmocean ${palette} palette: ${minVal.toFixed(1)} to ${maxVal.toFixed(1)} ${unitStr}`}
          />
          <span className="font-mono text-[9px] text-[var(--muted)]">
            {midVal.toFixed(1)}
          </span>
        </div>

        <span className="font-mono text-[10px] sm:text-[11px] text-[var(--text)]">
          {maxVal.toFixed(1)} {unitStr}
        </span>

        {onToggleRangeMode && (
          <button
            type="button"
            onClick={onToggleRangeMode}
            className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--text)] px-1.5 py-0.5 rounded border border-[var(--border)] transition"
            title="Toggle between slice-dynamic and fixed scientific range"
          >
            Scale: {rangeMode === 'dynamic' ? 'Dynamic' : 'Fixed'}
          </button>
        )}
      </div>
    </div>
  );
}
