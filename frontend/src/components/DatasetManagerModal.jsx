import React, { useState, useEffect } from 'react';
import {
  fetchDatasets,
  selectActiveDataset,
  estimateDatasetDownloadSize,
  registerCustomDataset,
  generateSubsetCommand,
  fetchDatasetManifests,
  startDatasetDownload,
  fetchDownloadStatus,
  cancelDatasetDownload
} from '../services/api';

export default function DatasetManagerModal({ isOpen, onClose, onDatasetSwitched, currentActiveDatasetId }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'downloader' | 'manifests' | 'estimator' | 'custom'
  const [datasets, setDatasets] = useState([]);
  const [activeId, setActiveId] = useState(currentActiveDatasetId || '');
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Command Generator & Safe Download state
  const [subsetParams, setSubsetParams] = useState({
    dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
    lat_min: 0.0,
    lat_max: 25.0,
    lon_min: 50.0,
    lon_max: 100.0,
    depth_min: 0.49,
    depth_max: 100.0,
    start_date: '2025-01-01',
    end_date: '2025-01-07',
    variables: ['thetao', 'so', 'uo', 'vo'],
    output_filename: ''
  });
  const [cmdResponse, setCmdResponse] = useState(null);
  const [generatingCmd, setGeneratingCmd] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);
  const [activeDownloadJob, setActiveDownloadJob] = useState(null);

  // Manifests state
  const [manifests, setManifests] = useState([]);
  const [loadingManifests, setLoadingManifests] = useState(false);

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
      loadManifests();
      handleGenerateCommand();
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

  const loadManifests = async () => {
    setLoadingManifests(true);
    try {
      const data = await fetchDatasetManifests();
      setManifests(data || []);
    } catch (err) {
      console.error('Failed to load manifests:', err);
    } finally {
      setLoadingManifests(false);
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

  const handleGenerateCommand = async (e) => {
    if (e) e.preventDefault();
    setGeneratingCmd(true);
    setError(null);
    try {
      const res = await generateSubsetCommand(subsetParams);
      setCmdResponse(res);
    } catch (err) {
      setError(err.message || 'Failed to generate subset command');
    } finally {
      setGeneratingCmd(false);
    }
  };

  const copyToClipboard = (text, type = 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    } else {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2500);
    }
  };

  const handleStartDownload = async (forceOverride = false) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const job = await startDatasetDownload(subsetParams, forceOverride);
      setActiveDownloadJob(job);
      setSuccessMsg(`Download job '${job.job_id}' started!`);
    } catch (err) {
      setError(err.message || 'Failed to start download job');
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

  const applyPresetDownloader = (preset) => {
    if (preset === 'arabian_sea') {
      setSubsetParams(p => ({ ...p, lat_min: 8.0, lat_max: 25.0, lon_min: 55.0, lon_max: 77.0, depth_min: 0.49, depth_max: 100.0 }));
    } else if (preset === 'bay_of_bengal') {
      setSubsetParams(p => ({ ...p, lat_min: 5.0, lat_max: 22.0, lon_min: 80.0, lon_max: 95.0, depth_min: 0.49, depth_max: 100.0 }));
    } else if (preset === 'wadge_bank') {
      setSubsetParams(p => ({ ...p, lat_min: 6.0, lat_max: 10.0, lon_min: 76.0, lon_max: 82.0, depth_min: 0.49, depth_max: 50.0 }));
    } else if (preset === 'equatorial') {
      setSubsetParams(p => ({ ...p, lat_min: -10.0, lat_max: 10.0, lon_min: 60.0, lon_max: 95.0, depth_min: 0.49, depth_max: 100.0 }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16M9 11h6m-6 4h4"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Dataset Management & Provenance Architecture
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300">MoES • INCOIS • Copernicus</span>
              </h2>
              <p className="text-xs text-slate-400">Manage real ocean reanalysis subsets, atomic chunked downloads, SHA-256 manifests, and in-situ feeds.</p>
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
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📁 Active Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">{datasets.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('downloader')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'downloader'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>⚡ Safe CLI Subsetter & Download</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-950 text-sky-400 font-mono border border-sky-800">Capped</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('manifests'); loadManifests(); }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'manifests'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📜 Manifests & Hashes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">{manifests.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('estimator'); if (!estimateResult) handleRunEstimate(); }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'estimator'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📊 Volume Estimator</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">CF-1.4</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'custom'
                ? 'border-sky-500 text-sky-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>➕ Link Local/Remote NetCDF</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-2">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Tab 1: Catalog */}
        {activeTab === 'catalog' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Select active numerical model or reanalysis product powering all 3D visualizations and CTD profiles.</p>
              <button
                type="button"
                onClick={loadDatasets}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition flex items-center gap-1.5"
              >
                <span>↻ Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                Loading registered ocean datasets...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {datasets.map((ds) => {
                  const isActive = ds.dataset_id === activeId;
                  const isSwitching = ds.dataset_id === switchingId;
                  const isReal = ds.source_mode === 'REAL_LOCAL';

                  return (
                    <div
                      key={ds.dataset_id}
                      className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-sky-950/30 border-sky-500/70 shadow-lg shadow-sky-950/50'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{ds.name}</h3>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isReal
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-700'
                          }`}>
                            {isReal ? '[REAL • COPERNICUS]' : '[SYNTHETIC • ROMS]'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ds.spatial_resolution}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500 text-slate-950">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300">
                          <span className="text-slate-400">Provider:</span> {ds.provider} • <span className="text-slate-400">Format:</span> {ds.format} • <span className="text-slate-400">Temporal:</span> {ds.temporal_resolution}
                        </p>

                        <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          {ds.size_bytes > 0 && (
                            <span>Size on Disk: <strong className="text-slate-200">{(ds.size_bytes / (1024 * 1024)).toFixed(1)} MB</strong></span>
                          )}
                          <span>Coverage: <strong className="text-slate-200">{ds.coverage_bounds.lat_min}°N to {ds.coverage_bounds.lat_max}°N, {ds.coverage_bounds.lon_min}°E to {ds.coverage_bounds.lon_max}°E</strong></span>
                          {ds.depth_range && (
                            <span>Depths: <strong className="text-slate-200">{ds.depth_range[0]}m to {ds.depth_range[1]}m</strong></span>
                          )}
                        </div>

                        {ds.local_path && (
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-xl">
                            Local File: {ds.local_path}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <div className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                            Active Model
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectDataset(ds.dataset_id)}
                            disabled={isSwitching || ds.status === 'FILE_NOT_FOUND'}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                              ds.status === 'FILE_NOT_FOUND'
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/30'
                            }`}
                          >
                            {isSwitching ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Switching...
                              </>
                            ) : ds.status === 'FILE_NOT_FOUND' ? (
                              'File Not Mounted'
                            ) : (
                              'Activate Dataset'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Safe CLI Subsetter & Controlled Download */}
        {activeTab === 'downloader' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⚡ Safe Copernicus Subsetter Generator</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                      Prevents 14.48 TB Global Download
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generates exact <code className="text-sky-300 font-mono">copernicusmarine subset</code> commands with spatial/temporal bounding, enforcing safety caps.
                  </p>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-slate-400 self-center">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPresetDownloader('bay_of_bengal')}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  🌊 Bay of Bengal (5-22°N, 80-95°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDownloader('arabian_sea')}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  🌊 Arabian Sea (8-25°N, 55-77°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDownloader('wadge_bank')}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  🐟 Wadge Bank PFZ (6-10°N, 76-82°E)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDownloader('equatorial')}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  🧭 Equatorial Currents (-10-10°N, 60-95°E)
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lat Min (°N)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.lat_min}
                    onChange={e => setSubsetParams(p => ({ ...p, lat_min: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lat Max (°N)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.lat_max}
                    onChange={e => setSubsetParams(p => ({ ...p, lat_max: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lon Min (°E)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.lon_min}
                    onChange={e => setSubsetParams(p => ({ ...p, lon_min: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lon Max (°E)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.lon_max}
                    onChange={e => setSubsetParams(p => ({ ...p, lon_max: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Depth Min (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.depth_min}
                    onChange={e => setSubsetParams(p => ({ ...p, depth_min: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Depth Max (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={subsetParams.depth_max}
                    onChange={e => setSubsetParams(p => ({ ...p, depth_max: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={subsetParams.start_date}
                    onChange={e => setSubsetParams(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={subsetParams.end_date}
                    onChange={e => setSubsetParams(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateCommand}
                  disabled={generatingCmd}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-2 shadow"
                >
                  {generatingCmd ? 'Calculating Safety...' : '🔍 Generate & Verify Safe Command'}
                </button>
              </div>
            </div>

            {/* Generated Command & Safety Card */}
            {cmdResponse && (
              <div className="space-y-4">
                {/* Safety Status Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  cmdResponse.safety_level === 'SAFE'
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                    : cmdResponse.safety_level === 'CONFIRMATION_REQUIRED'
                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                    : cmdResponse.safety_level === 'BLOCKED'
                    ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                    : 'bg-orange-950/40 border-orange-700/60 text-orange-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-black/40 border font-mono">
                        SAFETY LEVEL: {cmdResponse.safety_level}
                      </span>
                      <span className="text-xs">
                        Estimated Download: <strong>{(cmdResponse.estimate.estimated_transfer_mb / 1024).toFixed(2)} GB</strong>
                      </span>
                      <span className="text-xs text-slate-400">
                        (Disk Free: {cmdResponse.estimate.available_disk_gb.toFixed(1)} GB)
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{cmdResponse.warning_message}</p>
                  </div>

                  {cmdResponse.can_execute_automatically ? (
                    <button
                      type="button"
                      onClick={() => handleStartDownload(false)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow"
                    >
                      🚀 Run Safe Download
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartDownload(true)}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 shadow"
                    >
                      ⚠️ Explicit Confirm & Run
                    </button>
                  )}
                </div>

                {/* Command Output Block */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Generated Copernicus Marine CLI Command:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cmdResponse.command, 'cmd')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                        copiedCmd
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {copiedCmd ? '✓ Copied to Clipboard!' : '📋 Copy Command'}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono p-3 bg-black/60 rounded-lg text-sky-300 overflow-x-auto whitespace-pre-wrap break-all border border-slate-800/80">
                    {cmdResponse.command}
                  </pre>
                  <p className="text-[10px] text-slate-500">
                    Target Output: {cmdResponse.recommended_output_dir}/{cmdResponse.recommended_output_filename}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Manifests & Hashes */}
        {activeTab === 'manifests' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📜 Download Manifests & Provenance Ledger</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    SHA-256 Verified
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Cryptographically verifiable manifests logged for every real ocean NetCDF dataset stored locally.</p>
              </div>
              <button
                type="button"
                onClick={loadManifests}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition flex items-center gap-1.5"
              >
                <span>↻ Refresh Manifests</span>
              </button>
            </div>

            {loadingManifests ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading verified manifests...</div>
            ) : manifests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm bg-slate-800/20 rounded-xl border border-slate-800">
                No manifests logged yet. Download an ocean subset to generate cryptographic records.
              </div>
            ) : (
              <div className="space-y-3">
                {manifests.map((m) => (
                  <div key={m.manifest_id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{m.file_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                          {m.provenance_badge}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          {m.file_size_mb} MB
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Variables: <strong>{m.variables.join(', ')}</strong></span>
                      <span>Bounds: <strong>{m.bounds.lat_min}°N - {m.bounds.lat_max}°N, {m.bounds.lon_min}°E - {m.bounds.lon_max}°E</strong></span>
                      <span>Time: <strong>{m.time_range.start} to {m.time_range.end}</strong></span>
                    </div>

                    {/* SHA-256 block */}
                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-slate-800 text-[11px] font-mono">
                      <div className="truncate text-slate-400 mr-2">
                        <span className="text-emerald-400 mr-2">SHA-256:</span>
                        <span className="text-slate-200">{m.sha256}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.sha256, 'hash')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] shrink-0"
                      >
                        {copiedHash === m.sha256 ? '✓ Copied' : 'Copy Hash'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Estimator */}
        {activeTab === 'estimator' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <h3 className="text-sm font-bold text-white">Calibrated Download Volume Estimator</h3>
              <p className="text-xs text-slate-400">Estimates physical uncompressed 4D floating-point RAM tensors and compressed NetCDF4 transfer sizes based on CF-1.4 zlib deflation benchmarks.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lat Min (°N)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={estimateParams.lat_min}
                    onChange={e => setEstimateParams(p => ({ ...p, lat_min: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lat Max (°N)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={estimateParams.lat_max}
                    onChange={e => setEstimateParams(p => ({ ...p, lat_max: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lon Min (°E)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={estimateParams.lon_min}
                    onChange={e => setEstimateParams(p => ({ ...p, lon_min: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lon Max (°E)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={estimateParams.lon_max}
                    onChange={e => setEstimateParams(p => ({ ...p, lon_max: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleRunEstimate}
                  disabled={estimating}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  {estimating ? 'Calculating...' : 'Recalculate Volume'}
                </button>
              </div>
            </div>

            {estimateResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">Estimation Results</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Total Grid Points</div>
                    <div className="text-base font-bold text-white font-mono">{estimateResult.total_data_points.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Uncompressed RAM</div>
                    <div className="text-base font-bold text-amber-400 font-mono">{estimateResult.raw_size_mb} MB</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Est. Transfer Size</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">{estimateResult.estimated_transfer_mb} MB</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Local Free Disk</div>
                    <div className="text-base font-bold text-sky-400 font-mono">{estimateResult.available_disk_gb} GB</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">{estimateResult.recommendation}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Custom Registration */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomRegister} className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Link Regional NetCDF File or Remote Sensor Feed</h3>
              <p className="text-xs text-slate-400">Integrate regional INCOIS model outputs or research cruises directly into the SAMUDRA-3D twin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dataset Identifier (Slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. incois_las_bay_of_bengal_highres"
                  value={customForm.dataset_id}
                  onChange={e => setCustomForm(p => ({ ...p, dataset_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Human-Readable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INCOIS LAS Regional Bay of Bengal 2026"
                  value={customForm.name}
                  onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Provider / Institution *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INCOIS / MoES"
                  value={customForm.provider}
                  onChange={e => setCustomForm(p => ({ ...p, provider: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Local NetCDF File Path</label>
                <input
                  type="text"
                  placeholder="D:\Studies\SIH\SAMUDRA_DATA\raw\custom_run.nc"
                  value={customForm.local_path}
                  onChange={e => setCustomForm(p => ({ ...p, local_path: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={customRegistering}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition"
              >
                {customRegistering ? 'Registering...' : 'Register Dataset'}
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            Active Provenance: <strong className="text-slate-200">{activeId}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
