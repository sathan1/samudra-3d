import React, { useState, useEffect } from 'react';
import {
  fetchDatasets,
  selectActiveDataset,
  estimateDatasetDownloadSize,
  registerCustomDataset
} from '../services/api';

export default function DatasetManagerModal({ isOpen, onClose, onDatasetSwitched, currentActiveDatasetId }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'estimator' | 'custom'
  const [datasets, setDatasets] = useState([]);
  const [activeId, setActiveId] = useState(currentActiveDatasetId || '');
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Estimator state
  const [estimateParams, setEstimateParams] = useState({
    variables: ['thetao', 'so', 'uo', 'vo'],
    lat_min: 0.0,
    lat_max: 25.0,
    lon_min: 50.0,
    lon_max: 100.0,
    depth_levels_count: 22,
    days_count: 7,
    resolution_deg: 0.083333,
    dtype_bytes: 4
  });
  const [estimateResult, setEstimateResult] = useState(null);
  const [estimating, setEstimating] = useState(false);

  // Custom registration state
  const [customForm, setCustomForm] = useState({
    dataset_id: '',
    name: '',
    provider: '',
    local_path: '',
    remote_url: '',
    format: 'NetCDF-4',
    spatial_resolution: '0.083 degree (~8.3 km)'
  });
  const [customRegistering, setCustomRegistering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDatasets();
    }
  }, [isOpen]);

  const loadDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDatasets();
      setDatasets(data.datasets || []);
      if (data.active_dataset_id) {
        setActiveId(data.active_dataset_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDataset = async (datasetId) => {
    setSwitchingId(datasetId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await selectActiveDataset(datasetId);
      setActiveId(datasetId);
      setSuccessMsg(`Switched active dataset to: ${res.active_dataset.name}`);
      if (onDatasetSwitched) {
        onDatasetSwitched(res.active_dataset);
      }
      loadDatasets();
    } catch (err) {
      setError(err.message || 'Failed to switch dataset');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRunEstimate = async (e) => {
    if (e) e.preventDefault();
    setEstimating(true);
    setError(null);
    try {
      const res = await estimateDatasetDownloadSize(estimateParams);
      setEstimateResult(res);
    } catch (err) {
      setError(err.message || 'Failed to estimate size');
    } finally {
      setEstimating(false);
    }
  };

  const applyPresetBoundingBox = (preset) => {
    if (preset === 'entire') {
      setEstimateParams(p => ({ ...p, lat_min: 0.0, lat_max: 25.0, lon_min: 50.0, lon_max: 100.0, depth_levels_count: 22, days_count: 7 }));
    } else if (preset === 'arabian_sea') {
      setEstimateParams(p => ({ ...p, lat_min: 8.0, lat_max: 25.0, lon_min: 55.0, lon_max: 77.0, depth_levels_count: 22, days_count: 7 }));
    } else if (preset === 'bay_of_bengal') {
      setEstimateParams(p => ({ ...p, lat_min: 5.0, lat_max: 22.0, lon_min: 80.0, lon_max: 95.0, depth_levels_count: 22, days_count: 7 }));
    } else if (preset === 'coastal_pfz') {
      setEstimateParams(p => ({ ...p, lat_min: 18.0, lat_max: 22.5, lon_min: 68.0, lon_max: 73.0, depth_levels_count: 10, days_count: 3 }));
    }
  };

  const handleCustomRegister = async (e) => {
    e.preventDefault();
    setCustomRegistering(true);
    setError(null);
    try {
      await registerCustomDataset(customForm);
      setSuccessMsg(`Successfully registered dataset '${customForm.name}'!`);
      setCustomForm({
        dataset_id: '',
        name: '',
        provider: '',
        local_path: '',
        remote_url: '',
        format: 'NetCDF-4',
        spatial_resolution: '0.083 degree (~8.3 km)'
      });
      loadDatasets();
    } catch (err) {
      setError(err.message || 'Failed to register custom dataset');
    } finally {
      setCustomRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16M9 11h6m-6 4h4"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Dataset Management & Scientific Provenance
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300">MoES / INCOIS</span>
              </h2>
              <p className="text-xs text-slate-400">Manage real Copernicus reanalysis subsets, synthetic baselines, and download volume estimation.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close modal (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📁 Registered Datasets</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">{datasets.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('estimator'); if (!estimateResult) handleRunEstimate(); }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === 'estimator'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📊 Download Size Estimator</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 font-mono">Calibrated</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>➕ Add Custom Dataset</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Select a numerical model or verified reanalysis product to power 3D rendering and virtual water column probing:</span>
                <button
                  onClick={loadDatasets}
                  className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm">Loading dataset catalog...</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {datasets.map((ds) => {
                    const isActive = ds.dataset_id === activeId;
                    const isReal = ds.source_mode === 'REAL_LOCAL';
                    return (
                      <div
                        key={ds.dataset_id}
                        className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isActive
                            ? 'bg-slate-800/90 border-sky-500 ring-1 ring-sky-500/50 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white text-sm">{ds.name}</span>
                            {isReal ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                REAL VERIFIED (COPERNICUS)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                                SYNTHETIC ROMS BASELINE
                              </span>
                            )}
                            {isActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
                                ACTIVE SOURCE
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">
                            <strong className="text-slate-300">Provider:</strong> {ds.provider} • <strong className="text-slate-300">Grid:</strong> {ds.spatial_resolution} • <strong className="text-slate-300">Depths:</strong> {ds.depth_range?.length || 0} levels ({ds.depth_range ? `${ds.depth_range[0]}m to ${ds.depth_range[ds.depth_range.length - 1]}m` : ''})
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Format: <span className="text-slate-200">{ds.format}</span>
                            </span>
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Size on Disk: <span className="text-slate-200">{(ds.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                            </span>
                            {ds.time_range && ds.time_range.length > 0 && (
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                Time: <span className="text-slate-200">{ds.time_range[0]?.slice(0, 10)} to {ds.time_range[ds.time_range.length - 1]?.slice(0, 10)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isActive ? (
                            <button
                              disabled
                              className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600/30 text-sky-300 border border-sky-500/40 cursor-default"
                            >
                              ✓ Selected
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelectDataset(ds.dataset_id)}
                              disabled={switchingId === ds.dataset_id || ds.status !== 'READY'}
                              className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50"
                            >
                              {switchingId === ds.dataset_id ? 'Activating...' : 'Switch to this Dataset'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Official Portals & Provenance Links */}
              <div className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  Official Live Ocean Data Repositories & In-Situ Feeds
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  SAMUDRA-3D interfaces with authorized data streams governed by WMO and MoES. Direct access links:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                  <a href="https://las.incois.gov.in/" target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 flex items-center justify-between">
                    <span>INCOIS Live Access Server</span>
                    <span className="text-[10px] text-slate-400">las.incois.gov.in ↗</span>
                  </a>
                  <a href="https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description" target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 flex items-center justify-between">
                    <span>Copernicus GLORYS12V1</span>
                    <span className="text-[10px] text-slate-400">marine.copernicus.eu ↗</span>
                  </a>
                  <a href="ftp://ftp.ifremer.fr/ifremer/argo" target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 flex items-center justify-between">
                    <span>Ifremer Argo Global GDAC</span>
                    <span className="text-[10px] text-slate-400">ftp.ifremer.fr ↗</span>
                  </a>
                  <a href="ftp://ftp.ifremer.fr/ifremer/glider/v2/" target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 flex items-center justify-between">
                    <span>Ifremer Ocean Gliders v2</span>
                    <span className="text-[10px] text-slate-400">glider/v2 ↗</span>
                  </a>
                  <a href="https://incois.gov.in/portal/datainfo/argo.jsp" target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 flex items-center justify-between">
                    <span>INCOIS In-Situ Collections</span>
                    <span className="text-[10px] text-slate-400">incois.gov.in ↗</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESTIMATOR */}
          {activeTab === 'estimator' && (
            <div className="space-y-6">
              <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg text-xs text-sky-300">
                <strong>Scientific Subsetting & Download Volume Calculator:</strong> Before requesting external NetCDF data from Copernicus or INCOIS LAS, use this calibrated mathematical estimator to calculate the exact uncompressed tensor in RAM, compressed disk footprint, and required bandwidth.
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Quick Bounding Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPresetBoundingBox('entire')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Entire Northern Indian Ocean (0-25°N, 50-100°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetBoundingBox('arabian_sea')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Arabian Sea (8-25°N, 55-77°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetBoundingBox('bay_of_bengal')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Bay of Bengal (5-22°N, 80-95°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetBoundingBox('coastal_pfz')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Gujarat Coastal PFZ (18-22.5°N, 68-73°E)
                </button>
              </div>

              {/* Parameter Form */}
              <form onSubmit={handleRunEstimate} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Latitude Range (deg N)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={estimateParams.lat_min}
                      onChange={e => setEstimateParams(p => ({ ...p, lat_min: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Min Lat"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="number"
                      step="0.1"
                      value={estimateParams.lat_max}
                      onChange={e => setEstimateParams(p => ({ ...p, lat_max: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Max Lat"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Longitude Range (deg E)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={estimateParams.lon_min}
                      onChange={e => setEstimateParams(p => ({ ...p, lon_min: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Min Lon"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="number"
                      step="0.1"
                      value={estimateParams.lon_max}
                      onChange={e => setEstimateParams(p => ({ ...p, lon_max: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Max Lon"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Depth Levels & Time Span</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={estimateParams.depth_levels_count}
                      onChange={e => setEstimateParams(p => ({ ...p, depth_levels_count: parseInt(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Depths"
                      title="Number of vertical depth levels"
                    />
                    <span className="text-slate-400">levels</span>
                    <input
                      type="number"
                      value={estimateParams.days_count}
                      onChange={e => setEstimateParams(p => ({ ...p, days_count: parseInt(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      placeholder="Days"
                      title="Number of daily time steps"
                    />
                    <span className="text-slate-400">days</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Target Resolution</label>
                    <select
                      value={estimateParams.resolution_deg}
                      onChange={e => setEstimateParams(p => ({ ...p, resolution_deg: parseFloat(e.target.value) }))}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    >
                      <option value={0.083333}>0.0833° (~8.3 km - Real Copernicus GLORYS12V1)</option>
                      <option value={0.25}>0.25° (~25 km - Regional Mesoscale)</option>
                      <option value={0.5}>0.50° (~55 km - Synthetic ROMS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Variables</label>
                    <span className="text-xs text-sky-400 font-mono">thetao, so, uo, vo (4 variables)</span>
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    type="submit"
                    disabled={estimating}
                    className="w-full md:w-auto px-5 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-2"
                  >
                    {estimating ? 'Calculating...' : 'Recalculate Estimate'}
                  </button>
                </div>
              </form>

              {/* Results Display */}
              {estimateResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Estimated Footprint & Transfer Metrics</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${estimateResult.has_sufficient_disk ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                      {estimateResult.has_sufficient_disk ? '✓ Sufficient Disk Space' : '⚠ Low Disk Space'}
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-mono">Raw RAM Tensor</div>
                      <div className="text-lg font-bold text-sky-400 mt-0.5">{estimateResult.raw_size_mb} MB</div>
                      <div className="text-[10px] text-slate-400">({estimateResult.raw_size_gb} GB logical)</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-mono">NetCDF4 on Disk</div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">{estimateResult.estimated_compressed_mb} MB</div>
                      <div className="text-[10px] text-slate-400">(zlib deflated ~4.0x)</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-mono">Network Transfer</div>
                      <div className="text-lg font-bold text-amber-400 mt-0.5">{estimateResult.estimated_transfer_mb} MB</div>
                      <div className="text-[10px] text-slate-400">(incl. chunk headers)</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-mono">Available Disk</div>
                      <div className="text-lg font-bold text-purple-400 mt-0.5">{estimateResult.available_disk_gb} GB</div>
                      <div className="text-[10px] text-slate-400">free on SAMUDRA_DATA</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <div>
                      <strong className="text-white">Recommendation:</strong> {estimateResult.recommendation}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Total Data Points: {estimateResult.total_data_points.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM DATASET */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                Researchers and administrators can register local NetCDF files, custom observation tracks, or OPeNDAP streams into the active catalog without rebuilding the application.
              </div>

              <form onSubmit={handleCustomRegister} className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1">Dataset Identifier (Slug)</label>
                    <input
                      type="text"
                      required
                      value={customForm.dataset_id}
                      onChange={e => setCustomForm(p => ({ ...p, dataset_id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      placeholder="e.g. incois_adcp_survey_2026"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Human-Readable Title</label>
                    <input
                      type="text"
                      required
                      value={customForm.name}
                      onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. INCOIS Sagar Nidhi ADCP Coastal Transect"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1">Provider / Institution</label>
                    <input
                      type="text"
                      required
                      value={customForm.provider}
                      onChange={e => setCustomForm(p => ({ ...p, provider: e.target.value }))}
                      placeholder="e.g. Ministry of Earth Sciences / NIOT"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Data Format</label>
                    <select
                      value={customForm.format}
                      onChange={e => setCustomForm(p => ({ ...p, format: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    >
                      <option value="NetCDF-4">NetCDF-4 (CF compliant)</option>
                      <option value="Zarr">Zarr Cloud Array</option>
                      <option value="GRIB2">GRIB2 Numerical Grid</option>
                      <option value="CSV">In-Situ CSV Observation Track</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Local Absolute File Path (on Server / Volume)</label>
                  <input
                    type="text"
                    value={customForm.local_path}
                    onChange={e => setCustomForm(p => ({ ...p, local_path: e.target.value }))}
                    placeholder="e.g. D:\Studies\SIH\Samudra 3D\SAMUDRA_DATA\raw\custom_model.nc"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Leave empty if specifying a remote URL below.</span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Remote Access URL or OPeNDAP Endpoint (Optional)</label>
                  <input
                    type="url"
                    value={customForm.remote_url}
                    onChange={e => setCustomForm(p => ({ ...p, remote_url: e.target.value }))}
                    placeholder="https://las.incois.gov.in/thredds/dodsC/..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={customRegistering}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-2"
                  >
                    {customRegistering ? 'Registering...' : 'Register Dataset into Catalog'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active Dataset: <strong className="text-white">{activeId}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
