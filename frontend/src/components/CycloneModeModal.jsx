import React from 'react';
import { isFiniteNumber } from '../utils/scientificPresentation.js';

export default function CycloneModeModal({ isOpen, onClose, probeData, onFocusCycloneTrack: _onFocusCycloneTrack }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <span className="text-xl">🌀</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Tropical Cyclone & Ocean Heat Engine (TCHP)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">Model Column Metrics</span>
              </h2>
              <p className="text-xs text-slate-400">Upper-ocean heat content, D26 isotherm depth, and subsurface ocean thermal fuel metrics.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Mandatory IMD Attribution Banner */}
        <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-200 text-xs flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div className="leading-relaxed">
            <strong className="font-semibold text-white">Strict Source Separation Mandate:</strong> Official cyclone trajectory, landfall predictions, and intensity classifications are issued solely by the <span className="underline font-bold text-white">India Meteorological Department (IMD)</span>. SAMUDRA-3D does NOT generate cyclone forecasts or track correlation; it models the subsurface ocean thermal fuel (TCHP & D26) that sustains storm intensification.
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Active Probed TCHP */}
          {probeData && (() => {
            const hasTchp = isFiniteNumber(probeData.tchp);
            const hasD26 = isFiniteNumber(probeData.d26);
            const hasSst = isFiniteNumber(probeData.sst);

            return (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Ocean Heat Content at Probe Point ({probeData.lat}°N, {probeData.lon}°E)</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                    !hasTchp || !probeData.tchp_category ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                    probeData.tchp_category.toLowerCase() === 'severe' || probeData.tchp_category.toLowerCase() === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    probeData.tchp_category.toLowerCase() === 'moderate' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`} data-testid="cyclone-tchp-category-badge">
                    TCHP Category: {hasTchp && probeData.tchp_category ? probeData.tchp_category : 'Unavailable'}
                  </span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">TCHP Energy</div>
                    <div className="text-xl font-bold text-rose-400 mt-0.5" data-testid="cyclone-tchp-energy">
                      {hasTchp ? `${probeData.tchp.toFixed(1)} kJ/cm²` : 'Unavailable'}
                    </div>
                    <div className="text-[9px] text-slate-400">Heat fuel potential</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">26°C Isotherm (D26)</div>
                    <div className="text-xl font-bold text-amber-400 mt-0.5" data-testid="cyclone-d26-isotherm">
                      {hasD26 ? `${probeData.d26.toFixed(1)} m` : 'Unavailable'}
                    </div>
                    <div className="text-[9px] text-slate-400">Depth of 26°C water</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Sea Surface Temp</div>
                    <div className="text-xl font-bold text-sky-400 mt-0.5" data-testid="cyclone-sst">
                      {hasSst ? `${probeData.sst.toFixed(1)}°C` : 'Unavailable'}
                    </div>
                    <div className="text-[9px] text-slate-400">Surface layer</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800" data-testid="cyclone-heat-heuristic-box">
                    <div className="text-[10px] text-slate-400">Thermal Potential Heuristic</div>
                    <div className={`text-base font-bold mt-1 ${
                      !hasTchp ? 'text-slate-400' :
                      probeData.tchp >= 80 ? 'text-rose-400' : 'text-emerald-400'
                    }`} data-testid="cyclone-heat-heuristic-value">
                      {!hasTchp ? 'Unavailable' : probeData.tchp >= 80 ? 'Elevated Heat Content (≥80 kJ/cm²)' : 'Limited Heat Content (<80 kJ/cm²)'}
                    </div>
                    <div className="text-[9px] text-slate-400">Column heat heuristic (not a forecast)</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TCHP Scale Reference Table */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3" data-testid="cyclone-reference-table">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Oceanographic Classification Scale of Tropical Cyclone Heat Potential (TCHP)
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-rose-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Severe (&gt; 110 kJ/cm²)
                </span>
                <span className="text-slate-300">Deep ocean thermal reservoir; represents very high subsurface heat content available to upper water column.</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-orange-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  High (80 - 110 kJ/cm²)
                </span>
                <span className="text-slate-300">Substantial subsurface ocean heat reservoir above 26°C isotherm; elevated upper-ocean thermal potential.</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-yellow-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Moderate (50 - 80 kJ/cm²)
                </span>
                <span className="text-slate-300">Moderate subsurface thermal energy layer; intermediate heat fuel potential.</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Low (&lt; 50 kJ/cm²)
                </span>
                <span className="text-slate-300">Shallow 26°C warm layer; limited upper-ocean heat reservoir with cold water near surface.</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Note: TCHP represents vertical column ocean thermal energy above 26°C. It does not predict atmospheric track, intensity change timing, or landfall trajectory.
            </p>
          </div>

          {/* Mathematical Formulation */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-slate-400 text-[11px]">
            <div className="font-bold text-white">Mathematical Definition of TCHP in SAMUDRA-3D:</div>
            <div className="font-mono text-sky-300 bg-slate-900 p-2 rounded border border-slate-800">
              TCHP = ρ ⋅ C_p ⋅ ∫ [T(z) - 26] dz, ∀ z ∈ [0, D26]
            </div>
            <p className="pt-1">
              Where ρ = 1025 kg/m³ is sea water density, C_p = 3985 J/(kg·°C) is specific heat capacity, and D26 is the depth where temperature reaches 26°C.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span>Official Forecast Authority: India Meteorological Department (mausam.imd.gov.in)</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
