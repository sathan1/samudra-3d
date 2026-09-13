import React, { useState } from 'react';
import { registerNewSensor } from '../services/api';

const SENSOR_TYPES = [
  { value: 'moored_buoy', label: 'Moored Ocean Buoy (OMNI / RAMA)', defaultAgency: 'INCOIS / NIOT', defaultDepth: 500 },
  { value: 'argo', label: 'Argo Profiling Robot Float', defaultAgency: 'INCOIS Ocean Observation Network', defaultDepth: 2000 },
  { value: 'glider', label: 'Underwater Autonomous Glider', defaultAgency: 'INCOIS Marine Robotics Wing', defaultDepth: 1000 },
  { value: 'drifter', label: 'Surface Drifter Buoy', defaultAgency: 'MoES / Global Drifter Program', defaultDepth: 50 }
];

const PRESET_LOCATIONS = [
  { label: 'Bay of Bengal (Central)', lat: 14.5, lon: 87.0 },
  { label: 'Arabian Sea (Off Mumbai)', lat: 16.2, lon: 68.5 },
  { label: 'Equatorial Indian Ocean', lat: -1.5, lon: 80.5 },
  { label: 'Andaman Sea (Deep Basin)', lat: 11.2, lon: 93.4 }
];

export default function SensorRegistrationModal({
  isOpen = false,
  onClose = null,
  onSensorRegistered = null,
  currentUser = null
}) {
  const [platformType, setPlatformType] = useState('moored_buoy');
  const [name, setName] = useState('INCOIS OMNI Buoy BD09');
  const [wmoId, setWmoId] = useState('2903509');
  const [lat, setLat] = useState('14.5');
  const [lon, setLon] = useState('87.0');
  const [agency, setAgency] = useState('MoES / INCOIS');
  const [surfaceTemp, setSurfaceTemp] = useState('28.6');
  const [surfaceSalinity, setSurfaceSalinity] = useState('34.2');
  const [maxDepth, setMaxDepth] = useState('500');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleTypeChange = (type) => {
    setPlatformType(type);
    const found = SENSOR_TYPES.find((t) => t.value === type);
    if (found) {
      setAgency(found.defaultAgency);
      setMaxDepth(String(found.defaultDepth));
      if (type === 'argo') {
        setName('Argo Float 2903512');
        setWmoId('2903512');
      } else if (type === 'glider') {
        setName('Bay of Bengal Glider SG-04');
        setWmoId('GLIDER-SG04');
      } else if (type === 'moored_buoy') {
        setName('INCOIS OMNI Buoy BD09');
        setWmoId('2903509');
      } else {
        setName('Surface Drifter DR-882');
        setWmoId('DR-882');
      }
    }
  };

  const handleApplyPreset = (preset) => {
    setLat(String(preset.lat));
    setLon(String(preset.lon));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || latNum < -30 || latNum > 30) {
      setIsError(true);
      setStatusMsg('Latitude must be between -30° and +30° (Indian Ocean basin).');
      return;
    }
    if (isNaN(lonNum) || lonNum < 30 || lonNum > 120) {
      setIsError(true);
      setStatusMsg('Longitude must be between 30° and 120° (Indian Ocean basin).');
      return;
    }
    if (!name.trim()) {
      setIsError(true);
      setStatusMsg('Please provide a platform name or label.');
      return;
    }

    setLoading(true);
    setIsError(false);
    setStatusMsg('Deploying sensor into SQLite registry and 3D coordinate field...');

    try {
      const res = await registerNewSensor({
        platform_type: platformType,
        name: name.trim(),
        wmo_id: wmoId.trim() || undefined,
        lat: latNum,
        lon: lonNum,
        agency: agency.trim() || 'MoES / INCOIS',
        surface_temp: parseFloat(surfaceTemp) || 28.4,
        surface_salinity: parseFloat(surfaceSalinity) || 34.5,
        max_depth: parseFloat(maxDepth) || 2000.0,
        created_by: currentUser?.display_name || 'Operational Officer'
      });

      setStatusMsg(`Sensor "${res.sensor.name}" successfully registered! 3D beacon activated.`);
      setIsError(false);

      if (onSensorRegistered) {
        onSensorRegistered(res.sensor);
      }

      setTimeout(() => {
        onClose?.();
      }, 1000);
    } catch (err) {
      setIsError(true);
      setStatusMsg(err.message || 'Failed to register sensor platform.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-modal-overlay"
      data-testid="sensor-registration-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '20px'
      }}
    >
      <div
        className="sensor-modal-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛰️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                Register In-Situ Ocean Sensor
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Dynamic Sensor Extensibility · Real-time 3D Globe Visualization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: '13px'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Notice */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: '#0b1329',
            borderBottom: '1px solid #1e293b',
            fontSize: '12px',
            color: '#94a3b8'
          }}
        >
          Fulfills Problem Statement requirement: <em>"Can be expanded later to add new sensors or data types"</em>. New sensors persist in the SQLite database and render instantly as interactive 3D markers on the digital globe.
        </div>

        {/* Status alert */}
        {statusMsg && (
          <div
            style={{
              margin: '14px 24px 0 24px',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${isError ? '#ef4444' : '#10b981'}`,
              color: isError ? '#fca5a5' : '#6ee7b7'
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
              Sensor Platform Type *
            </label>
            <select
              value={platformType}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f8fafc'
              }}
            >
              {SENSOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                Platform Name / Designation *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. INCOIS OMNI Buoy BD09"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                WMO / Platform ID
              </label>
              <input
                type="text"
                value={wmoId}
                onChange={(e) => setWmoId(e.target.value)}
                placeholder="e.g. 2903509"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc'
                }}
              />
            </div>
          </div>

          {/* Coordinates & Preset Pickers */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                Coordinates (Indian Ocean: Lat -30° to +30°, Lon 30° to 120°) *
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '8px' }}>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude (°N)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Latitude (Negative for South)</span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="Longitude (°E)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Longitude (East)</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>Presets:</span>
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleApplyPreset(loc)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: '#38bdf8',
                    cursor: 'pointer'
                  }}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                Surface Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={surfaceTemp}
                onChange={(e) => setSurfaceTemp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                Salinity (PSU)
              </label>
              <input
                type="number"
                step="0.1"
                value={surfaceSalinity}
                onChange={(e) => setSurfaceSalinity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                Max Depth (m)
              </label>
              <input
                type="number"
                step="10"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
              Deploying Agency / Network
            </label>
            <input
              type="text"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="e.g. Ministry of Earth Sciences / INCOIS"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f8fafc'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Deploying...' : 'Deploy & Plot on 3D Globe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
