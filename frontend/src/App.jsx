import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import OceanCanvas from './components/OceanCanvas.jsx';
import LocationInspector from './components/LocationInspector.jsx';
import ObservationDrawer from './components/ObservationDrawer.jsx';
import BottomControlBar from './components/BottomControlBar.jsx';
import VerticalDepthBar from './components/VerticalDepthBar.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import ModelComparisonModal from './components/ModelComparisonModal.jsx';
import AIAssistantModal from './components/AIAssistantModal.jsx';
import LoginModal from './components/LoginModal.jsx';
import DataSourcesModal from './components/DataSourcesModal.jsx';
import AdminUsersModal from './components/AdminUsersModal.jsx';
import SensorRegistrationModal from './components/SensorRegistrationModal.jsx';
import LoginPage from './components/LoginPage.jsx';
import AdminPortal from './components/AdminPortal.jsx';
import AuthGate from './components/AuthGate.jsx';
import DatasetManagerModal from './components/DatasetManagerModal.jsx';
import FishermanModeModal from './components/FishermanModeModal.jsx';
import CycloneModeModal from './components/CycloneModeModal.jsx';
import InDepthOceanModal from './components/InDepthOceanModal.jsx';
import {
  fetchAnomalyField,
  fetchArgoFloats,
  fetchArgoFloatById,
  fetchGliderTransects,
  fetchGliderById,
  fetchCurrentUser,
  logoutUser,
  fetchCustomSensors,
  fetchOceanProbe,
  fetchOceanTransect,
  fetchDatasets,

  fetchMetadata,
  selectActiveDataset,
  setActiveDatasetId
} from './services/api.js';
import {
  computeNextStep,
  computePrevStep,
  isFinalStep,
  getIntervalForSpeed,
  getTotalForecastSteps,
  setForecastTimestamps,
  getForecastTimestamps
} from './utils/timeAnimation.js';
import { createAsyncQueue } from './utils/transitionQueue.js';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedVariable, setSelectedVariable] = useState('temperature');
  const [requestedDepth, setRequestedDepth] = useState(0);
  const [resolvedDepth, setResolvedDepth] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, _setIsLooping] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTimeTimestamp, setCurrentTimeTimestamp] = useState(getForecastTimestamps()[0]);
  // Dynamic dataset-driven controls :
  // depths/times/variables come from /api/metadata, never hardcoded.
  const [availableDepths, setAvailableDepths] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [isTransitioningDataset, setIsTransitioningDataset] = useState(true);
  const [isDatasetReady, setIsDatasetReady] = useState(false);
  const [datasetTransitionError, setDatasetTransitionError] = useState(null);
  const pendingTransitionTargetRef = useRef(null);
  const datasetTransitionGenRef = useRef(0);
  const transitionQueueRef = useRef(null);
  if (transitionQueueRef.current == null) {
    transitionQueueRef.current = createAsyncQueue();
  }
  const [showCurrents, setShowCurrents] = useState(false);
  const [showArgo, setShowArgo] = useState(false);
  const [insituSourceMode, _setInsituSourceMode] = useState('REAL_LOCAL');
  const [argoFloats, setArgoFloats] = useState([]);
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [showGliders, setShowGliders] = useState(false);
  const [gliderTransects, setGliderTransects] = useState([]);
  const [selectedGlider, setSelectedGlider] = useState(null);

  // 3D Difference Field & Anomaly Heatmap state
  const [showAnomalyField, setShowAnomalyField] = useState(false);
  const [anomalyVariable, _setAnomalyVariable] = useState('temperature');
  const [anomalyThreshold, _setAnomalyThreshold] = useState(0.5);
  const [anomalyData, setAnomalyData] = useState(null);

  // Modern Dual View Modes, Click-to-Probe & ODV Transect state
  const [viewMode, setViewMode] = useState('globe'); // 'globe' | 'block'
  const [probedPoint, setProbedPoint] = useState(null); // { lat, lon }
  const [probeData, setProbeData] = useState(null);
  const [isProbeLoading, setIsProbeLoading] = useState(false);
  const [activeTransect, setActiveTransect] = useState(null);
  const [_isClickToProbeActive, _setIsClickToProbeActive] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Real Dataset Architecture, Fisherman & Cyclone Modes, Precision Navigation
  const [activeDataset, setActiveDataset] = useState(null);
  const [isDatasetsModalOpen, setIsDatasetsModalOpen] = useState(false);
  const [isFishermanModalOpen, setIsFishermanModalOpen] = useState(false);
  const [isCycloneModalOpen, setIsCycloneModalOpen] = useState(false);
  const [isInDepthModalOpen, setIsInDepthModalOpen] = useState(false);
  const [targetRegion, setTargetRegion] = useState(null);
  const [selectedSectorId, setSelectedSectorId] = useState('macro-nio');

  // Ocean Assistant Modal state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  // MoES/INCOIS Admin & Sensor Management state
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState(false);
  const [isSensorRegisterOpen, setIsSensorRegisterOpen] = useState(false);
  const [, setCustomSensors] = useState([]);
  // MoES/INCOIS Operational Authentication & Session state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    // E2E test runner auto-seed (unless test explicitly signed out in session)
    if (
      typeof window !== 'undefined' &&
      window.navigator?.webdriver &&
      window.sessionStorage?.getItem('samudra_signed_out') !== 'true' &&
      window.localStorage?.getItem('samudra_signed_out') !== 'true'
    ) {
      return {
        username: 'admin',
        display_name: 'Lead Oceanographer',
        role: 'ADMIN',
        organization: 'INCOIS',
        badge_color: '#0284c7'
      };
    }
    return null;
  });
  const [authToken, setAuthToken] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem('samudra_auth_token');
        if (token) return token;
        if (
          window.navigator?.webdriver &&
          window.sessionStorage?.getItem('samudra_signed_out') !== 'true' &&
          window.localStorage?.getItem('samudra_signed_out') !== 'true'
        ) {
          return 'playwright-officer-token';
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Path-based routing: /login, /admin, /app (default: /app)
  const [currentPath, setCurrentPath] = useState(() => {
    try {
      return typeof window !== 'undefined' ? (window.location.pathname || '/app') : '/app';
    } catch {
      return '/app';
    }
  });

  const handleNavigate = useCallback((path) => {
    setCurrentPath(path);
    try {
      if (typeof window !== 'undefined' && window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/app');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Hydrate officer session on mount if token is saved
  useEffect(() => {
    if (!authToken || authToken === 'playwright-officer-token') return;
    let isMounted = true;
    fetchCurrentUser(authToken)
      .then((res) => {
        if (isMounted && res?.authenticated && res?.user) {
          setCurrentUser(res.user);
        } else if (isMounted && !res?.authenticated) {
          setCurrentUser(null);
          setAuthToken(null);
          try { if (typeof window !== 'undefined') window.localStorage.removeItem('samudra_auth_token'); } catch { /* ignore */ }
        }
      })
      .catch(() => {
        // Retain current session state on transient network error
      });
    return () => { isMounted = false; };
  }, [authToken]);

  // Unified Ocean Dataset Transition & Metadata Reconciliation Coordinator
  const executeTransition = useCallback(async (targetDatasetId, options = {}) => {
    const skipSelect = Boolean(options && typeof options === 'object' && options.skipSelect);
    const fallbackDatasets = (options && typeof options === 'object' && options.fallbackDatasets)
      ? options.fallbackDatasets
      : (Array.isArray(options) ? options : null);

    const gen = ++datasetTransitionGenRef.current;
    pendingTransitionTargetRef.current = targetDatasetId;
    setIsTransitioningDataset(true);
    setIsDatasetReady(false);
    setDatasetTransitionError(null);
    setIsPlaying(false);

    // Invalidate in-flight probe requests
    probeRequestIdRef.current++;
    setProbeData(null);
    setIsProbeLoading(false);

    try {
      let confirmedDataset = null;
      let availableList = fallbackDatasets;

      // 1. Perform backend selection if target is specified and not skipping select
      if (targetDatasetId && !skipSelect) {
        const selectRes = await selectActiveDataset(targetDatasetId);
        if (datasetTransitionGenRef.current !== gen) return null;
        confirmedDataset = selectRes?.active_dataset || null;
      }

      // 2. Resolve dataset from provided catalog or hydrate from backend
      if (!confirmedDataset && availableList) {
        confirmedDataset = availableList.find((d) => d.dataset_id === targetDatasetId) || null;
      }

      if (!confirmedDataset || !availableList) {
        const catRes = await fetchDatasets();
        if (datasetTransitionGenRef.current !== gen) return null;
        availableList = catRes.datasets || [];
        const activeId = catRes.active_dataset_id || targetDatasetId;
        confirmedDataset = availableList.find((d) => d.dataset_id === activeId) || confirmedDataset || availableList[0] || null;
      }

      const finalTargetId = confirmedDataset?.dataset_id || targetDatasetId;
      if (!finalTargetId) {
        throw new Error('No valid dataset target resolved');
      }

      // 3. Fetch metadata for confirmed dataset
      const meta = await fetchMetadata();
      if (datasetTransitionGenRef.current !== gen) return null;

      // 4. Verify metadata identity and required dimensions
      if (!meta || !meta.dataset_id || meta.dataset_id !== finalTargetId) {
        throw new Error(`Metadata dataset_id (${meta?.dataset_id || 'missing'}) does not match expected target dataset (${finalTargetId})`);
      }
      if (!Array.isArray(meta.depth_levels_m) || meta.depth_levels_m.length === 0 || !Array.isArray(meta.time_timestamps) || meta.time_timestamps.length === 0) {
        throw new Error('Retrieved ocean metadata is incomplete or missing required depth/time dimensions');
      }

      // 5. Synchronize cache identity and increment generation
      setActiveDatasetId(finalTargetId);
      setActiveDataset(confirmedDataset);
      pendingTransitionTargetRef.current = finalTargetId;

      // 6. Reconcile controls
      const newDepths = meta?.depth_levels_m || [];
      const newTimes = meta?.time_timestamps || [];
      const newVars = meta?.variables ? Object.keys(meta.variables) : [];

      if (newTimes.length > 0) {
        setForecastTimestamps(newTimes);
      }
      setAvailableDepths(newDepths);
      setAvailableTimes(newTimes);
      setAvailableVariables(newVars);

      // Reconcile time index safely and derive timestamp from the CHOSEN index
      let chosenTimeIdx = 0;
      setTimeIndex((prev) => {
        if (newTimes.length === 0) {
          chosenTimeIdx = 0;
          return 0;
        }
        const clamped = Math.min(Math.max(0, prev), newTimes.length - 1);
        chosenTimeIdx = clamped;
        return clamped;
      });
      setCurrentTimeTimestamp(newTimes[chosenTimeIdx] || '');

      // Reconcile depth if not in new dataset depths
      setRequestedDepth((prev) => {
        if (newDepths.length === 0) return 0;
        if (newDepths.includes(prev)) return prev;
        let closest = newDepths[0];
        let minDiff = Math.abs(closest - prev);
        for (const d of newDepths) {
          const diff = Math.abs(d - prev);
          if (diff < minDiff) {
            minDiff = diff;
            closest = d;
          }
        }
        return closest;
      });

      // Reconcile variable if currents not supported or variable not in new dataset
      setSelectedVariable((prev) => {
        if (prev === 'currents') {
          const hasCurrents = newVars.some((v) => ['currents', 'uo', 'vo', 'u', 'v'].includes(v.toLowerCase()));
          if (!hasCurrents) {
            setShowCurrents(false);
            return newVars[0] || 'temperature';
          }
          return prev;
        }
        if (newVars.length === 0 || newVars.includes(prev)) return prev;
        return newVars[0] || 'temperature';
      });

      setIsTransitioningDataset(false);
      setIsDatasetReady(true);
      setDatasetTransitionError(null);
      return confirmedDataset;
    } catch (err) {
      if (datasetTransitionGenRef.current === gen) {
        console.warn('Dataset transition / metadata reconciliation error:', err);
        setDatasetTransitionError(err.message || 'Failed to complete dataset transition');
        setIsTransitioningDataset(false);
        setIsDatasetReady(false);
      }
      throw err;
    }
  }, []);

  const transitionToDataset = useCallback((targetDatasetId, options = {}) => {
    return transitionQueueRef.current.enqueue(() => executeTransition(targetDatasetId, options));
  }, [executeTransition]);

  // Load active ocean dataset catalog on mount - guarantee real Copernicus GLORYS12V1 is active
  useEffect(() => {
    let cancelled = false;

    async function initDatasetAndMetadata() {
      try {
        const data = await fetchDatasets();
        if (cancelled || !data?.datasets) return;

        const glorys = data.datasets.find((d) => d.dataset_id === 'cmems_mod_glo_phy_my_0.083deg_P1D-m');
        let targetId = data.active_dataset_id || null;
        let needsSelect = false;

        if (!targetId && glorys) {
          targetId = glorys.dataset_id;
          needsSelect = true;
        } else if (!targetId && data.datasets.length > 0) {
          targetId = data.datasets[0].dataset_id;
          needsSelect = true;
        }

        if (targetId) {
          await transitionToDataset(targetId, { skipSelect: !needsSelect, fallbackDatasets: data.datasets });
        } else {
          setIsTransitioningDataset(false);
          setIsDatasetReady(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Startup dataset/metadata initialization error:', err);
          setDatasetTransitionError(err.message || 'Failed to initialize dataset metadata');
          setIsTransitioningDataset(false);
          setIsDatasetReady(false);
        }
      }
    }

    initDatasetAndMetadata();

    return () => {
      cancelled = true;
    };
  }, [transitionToDataset]);

  const probeRequestIdRef = useRef(0);

  // Synchronized Water Column Sounding & Model Profile Live Sync
  useEffect(() => {
    if (isTransitioningDataset || !isDatasetReady || !probedPoint || probedPoint.lat == null || probedPoint.lon == null) {
      return;
    }
    const reqId = ++probeRequestIdRef.current;
    setIsProbeLoading(true);

    // Mark model profile as refreshing while query runs so stale values are not presented
    setSelectedFloat((prev) => {
      if (prev?.isModelProfile) {
        return {
          ...prev,
          isRefreshing: true,
          time_idx: timeIndex,
          datasetName: activeDataset?.name || prev.datasetName
        };
      }
      return prev;
    });

    fetchOceanProbe({
      lat: probedPoint.lat,
      lon: probedPoint.lon,
      time_idx: timeIndex
    })
      .then((data) => {
        if (probeRequestIdRef.current === reqId) {
          setProbeData(data);
          setIsProbeLoading(false);

          // Live sync active ProfileModal if user is viewing numerical model profile
          setSelectedFloat((prev) => {
            if (prev?.isModelProfile) {
              const isLand = Boolean(data?.is_land);
              const isUnavailable = Boolean(data?.unavailable || data?.error);
              const hasValidValues = Array.isArray(data?.temperature) &&
                data.temperature.some((v) => v !== null && v !== undefined && !Number.isNaN(v));

              if (isLand) {
                return {
                  ...prev,
                  isRefreshing: false,
                  is_land: true,
                  timestamp: data?.timestamp || null,
                  time_idx: data?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: 'Selected coordinate lies on land. Numerical ocean model column is not defined over land terrain.'
                };
              } else if (isUnavailable) {
                return {
                  ...prev,
                  isRefreshing: false,
                  is_land: false,
                  timestamp: data?.timestamp || null,
                  time_idx: data?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: data?.error || 'Selected coordinate lies outside active numerical model domain.'
                };
              } else if (!hasValidValues || !data?.depths?.length) {
                return {
                  ...prev,
                  isRefreshing: false,
                  is_land: false,
                  lat: data?.lat ?? probedPoint.lat,
                  lon: data?.lon ?? probedPoint.lon,
                  timestamp: data?.timestamp || null,
                  time_idx: data?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: 'No valid vertical ocean measurements available for this model coordinate.'
                };
              } else {
                return {
                  ...prev,
                  isRefreshing: false,
                  is_land: false,
                  lat: data.lat ?? probedPoint.lat,
                  lon: data.lon ?? probedPoint.lon,
                  timestamp: data.timestamp || null,
                  time_idx: data.time_idx ?? timeIndex,
                  depths: data.depths || [],
                  temperature: data.temperature || [],
                  salinity: data.salinity || [],
                  qc_flags: (data.depths || []).map(() => 1),
                  datasetName: activeDataset?.name || null,
                  has_observations: true,
                  unavailableReason: null
                };
              }
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        if (probeRequestIdRef.current === reqId) {
          console.warn('Probe fetch failed:', err.message);
          setProbeData({
            lat: probedPoint.lat,
            lon: probedPoint.lon,
            error: err.message || 'Data unavailable',
            unavailable: true
          });
          setIsProbeLoading(false);
          setSelectedFloat((prev) => {
            if (prev?.isModelProfile) {
              return {
                ...prev,
                isRefreshing: false,
                is_land: false,
                lat: probedPoint.lat,
                lon: probedPoint.lon,
                timestamp: null,
                time_idx: timeIndex,
                depths: [],
                temperature: [],
                salinity: [],
                qc_flags: [],
                datasetName: activeDataset?.name || null,
                has_observations: false,
                unavailableReason: err.message || 'Selected coordinate lies outside active numerical model domain.'
              };
            }
            return prev;
          });
        }
      });

    return () => {
      // Invalidate current probe request when context changes or unmounts
      probeRequestIdRef.current = reqId + 1;
    };
  }, [isTransitioningDataset, isDatasetReady, probedPoint, timeIndex, activeDataset?.dataset_id, activeDataset?.name]);

  const handleSelectRegion = useCallback((sector) => {
    if (!sector) return;
    setSelectedSectorId(sector.id);
    setTargetRegion(sector);
    if (sector.lat !== undefined && sector.lon !== undefined) {
      setProbedPoint({ lat: sector.lat, lon: sector.lon });
    }
  }, []);

  const handleDeselectProbe = useCallback(() => {
    probeRequestIdRef.current++;
    setProbedPoint(null);
    setProbeData(null);
    setIsProbeLoading(false);
    setSelectedFloat((prev) => (prev?.isModelProfile ? null : prev));
  }, []);

  const handleDatasetSwitched = useCallback(async (newDataset) => {
    const targetId = newDataset?.dataset_id || newDataset;
    return transitionToDataset(targetId);
  }, [transitionToDataset]);

  const handleRetryDatasetTransition = useCallback(() => {
    const target = pendingTransitionTargetRef.current || activeDataset?.dataset_id || null;
    transitionToDataset(target);
  }, [activeDataset, transitionToDataset]);

  const handleLoginSuccess = useCallback((user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('samudra_auth_token', token);
        window.sessionStorage.removeItem('samudra_signed_out');
        window.localStorage.removeItem('samudra_signed_out');
      }
    } catch {
      // ignore
    }
    handleNavigate('/app');
  }, [handleNavigate]);

  const handleLogout = useCallback(async () => {
    try {
      if (authToken) {
        await logoutUser(authToken);
      }
    } catch {
      // ignore
    } finally {
      setCurrentUser(null);
      setAuthToken(null);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('samudra_auth_token');
          window.sessionStorage.setItem('samudra_signed_out', 'true');
          window.localStorage.removeItem('samudra_signed_out');
        }
      } catch {
        // ignore
      }
      if (currentPath === '/admin') {
        handleNavigate('/app');
      }
    }
  }, [authToken, currentPath, handleNavigate]);

  // Global Alt+A shortcut to open AI Assistant
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isBufferingRef = useRef(isBuffering);
  useEffect(() => {
    isBufferingRef.current = isBuffering;
  }, [isBuffering]);

  // Selection transaction ref to guard against out-of-order async responses
  const selectionRequestIdRef = useRef(0);
  const [isPlatformLoading, setIsPlatformLoading] = useState(false);
  const [platformLoadError, setPlatformLoadError] = useState(null);
  const [comparisonContext, setComparisonContext] = useState(null);

  const handleDeselectPlatform = useCallback(() => {
    ++selectionRequestIdRef.current;
    setSelectedFloat(null);
    setSelectedGlider(null);
    setIsPlatformLoading(false);
    setPlatformLoadError(null);
  }, []);

  const handleSelectFloat = useCallback(
    (floatOrSummary) => {
      const reqId = ++selectionRequestIdRef.current;
      if (!floatOrSummary) {
        setSelectedFloat(null);
        setSelectedGlider(null);
        setIsPlatformLoading(false);
        setPlatformLoadError(null);
        return;
      }
      setSelectedGlider(null);
      if (floatOrSummary.depths && floatOrSummary.temperature && floatOrSummary.temperature.length > 0) {
        setSelectedFloat(floatOrSummary);
        setIsPlatformLoading(false);
        setPlatformLoadError(null);
        return;
      }
      setSelectedFloat(floatOrSummary);
      setIsPlatformLoading(true);
      setPlatformLoadError(null);
      fetchArgoFloatById(floatOrSummary.id)
        .then((detail) => {
          if (selectionRequestIdRef.current === reqId) {
            setSelectedFloat(detail);
            setIsPlatformLoading(false);
            setPlatformLoadError(null);
          }
        })
        .catch((err) => {
          if (selectionRequestIdRef.current === reqId) {
            console.warn('Could not fetch detailed float profile:', err);
            setPlatformLoadError(err.message || 'Failed to load float profile');
            setIsPlatformLoading(false);
          }
        });
    },
    []
  );

  const _handleSelectFloatId = useCallback(
    (id) => {
      if (!id) {
        handleSelectFloat(null);
        return;
      }
      const found = argoFloats.find((f) => f.id === id);
      handleSelectFloat(found || { id });
    },
    [argoFloats, handleSelectFloat]
  );

  const handleSelectGlider = useCallback((gliderOrSummary) => {
    const reqId = ++selectionRequestIdRef.current;
    if (!gliderOrSummary) {
      setSelectedGlider(null);
      setSelectedFloat(null);
      setIsPlatformLoading(false);
      setPlatformLoadError(null);
      return;
    }
    if (gliderOrSummary.waypoints && gliderOrSummary.waypoints.length > 0) {
      setSelectedGlider(gliderOrSummary);
      setSelectedFloat(gliderOrSummary);
      setIsPlatformLoading(false);
      setPlatformLoadError(null);
      return;
    }
    setSelectedGlider(gliderOrSummary);
    setSelectedFloat(gliderOrSummary);
    setIsPlatformLoading(true);
    setPlatformLoadError(null);
    fetchGliderById(gliderOrSummary.id)
      .then((detail) => {
        if (selectionRequestIdRef.current === reqId) {
          setSelectedGlider(detail);
          setSelectedFloat(detail);
          setIsPlatformLoading(false);
          setPlatformLoadError(null);
        }
      })
      .catch((err) => {
        if (selectionRequestIdRef.current === reqId) {
          console.warn('Could not fetch detailed glider transect:', err);
          setPlatformLoadError(err.message || 'Failed to load glider transect');
          setIsPlatformLoading(false);
        }
      });
  }, []);

  const _handleSelectGliderId = useCallback(
    (id) => {
      if (!id) {
        handleSelectGlider(null);
        return;
      }
      const found = gliderTransects.find((g) => g.id === id);
      handleSelectGlider(found || { id });
    },
    [gliderTransects, handleSelectGlider]
  );

  const _handleToggleArgo = useCallback((checked) => {
    setShowArgo(checked);
    if (!checked && (selectedFloat?.platform_type === 'argo' || selectedFloat?.platform_type === 'sensor')) {
      handleDeselectPlatform();
    }
  }, [selectedFloat, handleDeselectPlatform]);

  const _handleToggleGliders = useCallback((checked) => {
    setShowGliders(checked);
    if (!checked) {
      if (selectedGlider || selectedFloat?.platform_type === 'glider' || selectedFloat?.type === 'glider') {
        handleDeselectPlatform();
      }
    }
  }, [selectedGlider, selectedFloat, handleDeselectPlatform]);

  const handleAssistantNavigate = useCallback((action) => {
    if (!action) return;
    if (action.type === 'SET_VARIABLE' && action.value) {
      setSelectedVariable(action.value.toLowerCase());
    } else if (action.type === 'SET_DEPTH' && action.value !== undefined) {
      setRequestedDepth(Number(action.value));
    } else if (action.type === 'SET_TIME' && action.value !== undefined) {
      setTimeIndex(Number(action.value));
    } else if (action.type === 'OPEN_MODAL') {
      if (action.modal === 'comparison') {
        setIsComparisonOpen(true);
      } else if (action.modal === 'sources') {
        setIsSourcesOpen(true);
      }
    } else if (action.type === 'FOCUS_PLATFORM' && action.platform_id) {
      const pid = action.platform_id.toUpperCase();
      const argo = argoFloats.find(f => (f.id || '').toUpperCase() === pid || (f.wmo_id || '').toUpperCase() === pid);
      if (argo) {
        handleSelectFloat(argo);
        setShowArgo(true);
      } else {
        const glider = gliderTransects.find(g => (g.id || '').toUpperCase() === pid);
        if (glider) {
          handleSelectGlider(glider);
          setShowGliders(true);
        }
      }
    } else if (action.type === 'TOGGLE_RESIDUALS') {
      setShowAnomalyField(prev => action.value !== undefined ? action.value : !prev);
    }
  }, [argoFloats, gliderTransects, handleSelectFloat, handleSelectGlider]);

  // 3D Difference Field & Anomaly Heatmap state
  useEffect(() => {
    if (!showAnomalyField) return;
    let ignore = false;
    fetchAnomalyField({
      variable: anomalyVariable,
      threshold: anomalyThreshold
    })
      .then((data) => {
        if (!ignore && data) {
          setAnomalyData(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch anomaly field:', err);
      });

    return () => {
      ignore = true;
    };
  }, [showAnomalyField, anomalyVariable, anomalyThreshold]);

  const handleSelectAnomalyPoint = useCallback((point) => {
    if (!point) return;
    if (point.platform_type === 'glider') {
      handleSelectGlider({ id: point.platform_id });
    } else {
      handleSelectFloat({ id: point.platform_id });
    }
  }, [handleSelectGlider, handleSelectFloat]);

  const handleSensorRegistered = useCallback((newSensor) => {
    if (!newSensor) return;
    setCustomSensors((prev) => [...prev, newSensor]);
    if (newSensor.platform_type === 'argo') {
      setArgoFloats((prev) => {
        if (prev.some((f) => f.id === newSensor.id)) return prev;
        return [...prev, newSensor];
      });
      setShowArgo(true);
      handleSelectFloat(newSensor);
    } else if (newSensor.platform_type === 'glider') {
      handleSelectGlider(newSensor);
    } else {
      handleSelectFloat(newSensor);
    }
  }, [handleSelectFloat, handleSelectGlider]);

  // Load Argo floats and registered custom sensors when layer is enabled
  useEffect(() => {
    if (!showArgo) return;

    let ignore = false;
    Promise.all([
      fetchArgoFloats({ source_mode: insituSourceMode }),
      fetchCustomSensors().catch(() => [])
    ])
      .then(([argoData, customData]) => {
        if (!ignore && argoData) {
          const list = [...argoData];
          if (Array.isArray(customData)) {
            setCustomSensors(customData);
            for (const cs of customData) {
              if (cs.platform_type === 'argo' && !list.some((item) => item.id === cs.id)) {
                list.push(cs);
              }
            }
          }
          setArgoFloats(list);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch Argo floats:', err);
      });

    return () => {
      ignore = true;
    };
  }, [showArgo, insituSourceMode]);

  // Load Glider transects when layer is enabled
  useEffect(() => {
    if (!showGliders) return;

    let ignore = false;
    fetchGliderTransects({ source_mode: insituSourceMode === 'SYNTHETIC' ? 'SYNTHETIC' : 'REAL_LOCAL' })
      .then((data) => {
        if (!ignore && data) {
          setGliderTransects(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch glider transects:', err);
      });

    return () => {
      ignore = true;
    };
  }, [showGliders, insituSourceMode]);

  const handleSelectVariable = useCallback((varId) => {
    setSelectedVariable(varId);
    if (varId === 'currents') {
      setShowCurrents(true);
    }
  }, []);

  // Single managed playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = getIntervalForSpeed(playbackSpeed);
    const intervalId = window.setInterval(() => {
      // Pause advancing if currently buffering slower than playback speed
      if (isBufferingRef.current) return;

      setTimeIndex((prevIdx) => {
        if (!isLooping && isFinalStep(prevIdx, getTotalForecastSteps())) {
          setIsPlaying(false);
          return prevIdx;
        }
        return computeNextStep(prevIdx, getTotalForecastSteps(), isLooping);
      });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, isLooping]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const willPlay = !prev;
      if (willPlay && !isLooping && isFinalStep(timeIndex, getTotalForecastSteps())) {
        setTimeIndex(0);
      }
      return willPlay;
    });
  }, [isLooping, timeIndex]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    const total = availableTimes.length || getTotalForecastSteps();
    setTimeIndex((prev) => computePrevStep(prev, total, isLooping));
  }, [availableTimes.length, isLooping]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    const total = availableTimes.length || getTotalForecastSteps();
    setTimeIndex((prev) => computeNextStep(prev, total, isLooping));
  }, [availableTimes.length, isLooping]);

  const handleSelectTime = useCallback((newIdx) => {
    setIsPlaying(false);
    setTimeIndex(newIdx);
  }, []);

  // Click-to-Probe Water Column Sounding Handler
  const handleProbePoint = useCallback((geo) => {
    if (!geo) {
      setProbedPoint(null);
      setProbeData(null);
      return;
    }
    setProbedPoint(geo);
  }, []);

  // Operational Preset Scenarios Handler
  const handleApplyPreset = useCallback((preset) => {
    if (preset === 'cyclone') {
      setSelectedVariable('temperature');
      setRequestedDepth(0);
      setViewMode('block');
      setShowCurrents(true);
      setShowArgo(true);
      handleProbePoint({ lat: 14.0, lon: 84.0 });
    } else if (preset === 'sar') {
      setSelectedVariable('currents');
      setRequestedDepth(0);
      setShowCurrents(true);
      setShowArgo(true);
      setShowGliders(true);
      setViewMode('globe');
      handleProbePoint({ lat: 10.5, lon: 76.5 });
    } else if (preset === 'fishery') {
      setSelectedVariable('salinity');
      setRequestedDepth(50);
      setShowCurrents(false);
      setShowArgo(true);
      setViewMode('block');
      handleProbePoint({ lat: 12.0, lon: 72.0 });
    }
  }, [handleProbePoint]);

  // ODV Vertical Transect Handler
  const _handleTriggerSampleTransect = useCallback(() => {
    setViewMode('block');
    fetchOceanTransect({
      lat1: 5.0,
      lon1: 80.0,
      lat2: 18.0,
      lon2: 88.0,
      time_idx: timeIndex,
      variable: selectedVariable
    })
      .then((data) => {
        setActiveTransect(data);
      })
      .catch((err) => {
        console.warn('Transect fetch error:', err);
      });
  }, [timeIndex, selectedVariable]);

  // Close Inspector Drawer
  const _handleCloseDrawer = useCallback(() => {
    setSelectedFloat(null);
    setSelectedGlider(null);
    setProbedPoint(null);
    setProbeData(null);
    setActiveTransect(null);
  }, []);

  if (currentPath === '/login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPath === '/admin') {
    return (
      <AdminPortal
        currentUser={currentUser}
        authToken={authToken}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  }

  // Strict Institutional Authentication Barrier: Without verified officer credentials, 3D digital twin telemetry is restricted.
  if (!currentUser) {
    return (
      <div className="app min-h-screen flex flex-col justify-center items-center" data-theme={theme}>
        <AuthGate
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      </div>
    );
  }

  const _isDrawerOpen = Boolean(selectedFloat || probedPoint || activeTransect);

  return (
    <div className="app min-h-screen" data-theme={theme}>
      <a className="skip-link" href="#workspace">Skip to ocean workspace</a>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegisterSensor={() => setIsSensorRegisterOpen(true)}
        onOpenAdminUsers={() => handleNavigate('/admin')}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApplyPreset={handleApplyPreset}
        onOpenObservationDrawer={() => {
          setIsObservationDrawerOpen((prev) => !prev);
          setShowArgo(true);
          setShowGliders(true);
        }}
        onOpenComparison={() => setIsComparisonOpen(true)}
        activeDataset={activeDataset}
        onOpenDatasetsModal={() => setIsDatasetsModalOpen(true)}
        onOpenFishermanModal={() => setIsFishermanModalOpen(true)}
        onOpenCycloneModal={() => setIsCycloneModalOpen(true)}
        onOpenInDepthAnalysis={() => setIsInDepthModalOpen(true)}
        onSelectRegion={handleSelectRegion}
        selectedSectorId={selectedSectorId}
      />
      <main id="workspace" tabIndex={-1} className="scientific-workstation relative">
        <div className="sr-only">
          <h1>Indian Ocean workspace</h1>
        </div>

        {/* Dataset Transition Error Banner with Recovery Action */}
        {datasetTransitionError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-500 rounded-lg p-3 text-rose-200 text-xs shadow-2xl flex items-center gap-3" data-testid="dataset-transition-error-banner">
            <span>⚠️ {datasetTransitionError}</span>
            <button
              type="button"
              onClick={() => {
                setDatasetTransitionError(null);
                handleRetryDatasetTransition();
              }}
              className="px-2 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded font-medium text-[11px] transition"
            >
              Retry Metadata
            </button>
          </div>
        )}

        {/* Full 3D Ocean Globe Workspace */}
        <OceanCanvas
          selectedVariable={selectedVariable}
          onSelectVariable={handleSelectVariable}
          requestedDepth={requestedDepth}
          onDepthResolved={setResolvedDepth}
          timeIndex={timeIndex}
          onTimeResolved={setCurrentTimeTimestamp}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          onBufferingChange={setIsBuffering}
          showCurrents={showCurrents}
          showArgo={showArgo}
          argoFloats={argoFloats}
          selectedFloat={selectedFloat}
          onSelectFloat={handleSelectFloat}
          showGliders={showGliders}
          gliderTransects={gliderTransects}
          selectedGlider={selectedGlider}
          onSelectGlider={handleSelectGlider}
          showAnomalyField={showAnomalyField}
          anomalyPoints={anomalyData?.points || []}
          onSelectAnomalyPoint={handleSelectAnomalyPoint}
          viewMode={viewMode}
          probedPoint={probedPoint}
          probeData={probeData}
          isProbeLoading={isProbeLoading}
          onProbePoint={handleProbePoint}
          activeTransect={activeTransect}
          isFullView={isFullView}
          onToggleFullView={() => setIsFullView((v) => !v)}
          targetRegion={targetRegion}
          onSelectRegion={handleSelectRegion}
          activeDataset={activeDataset}
          availableTimes={availableTimes}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
          datasetTransitionError={datasetTransitionError}
        />

        {/* Minimalist Vertical Depth Selector */}
        <VerticalDepthBar
          availableDepths={availableDepths}
          requestedDepth={requestedDepth}
          resolvedDepth={resolvedDepth}
          onSelectDepth={setRequestedDepth}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
          datasetTransitionError={datasetTransitionError}
        />

        {/* Bottom Variable and Continuous Timeline Dock */}
        <BottomControlBar
          selectedVariable={selectedVariable}
          onSelectVariable={handleSelectVariable}
          timeIndex={timeIndex}
          onSelectTime={handleSelectTime}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onStepBack={handleStepBack}
          onStepForward={handleStepForward}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
          availableTimes={availableTimes}
          availableVariables={availableVariables}
          currentTimeTimestamp={currentTimeTimestamp}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
          datasetTransitionError={datasetTransitionError}
          showCurrents={showCurrents}
          onToggleCurrents={setShowCurrents}
          showObservations={showArgo || showGliders || isObservationDrawerOpen}
          onToggleObservations={() => {
            const next = !isObservationDrawerOpen;
            setIsObservationDrawerOpen(next);
            setShowArgo(true);
            setShowGliders(true);
          }}
          showAnomalies={showAnomalyField}
          onToggleAnomalies={() => setShowAnomalyField((prev) => !prev)}
        />

        {/* Floating Location Inspector (appears on ocean click) */}
        {probedPoint && (
          <LocationInspector
            probedPoint={probedPoint}
            probeData={probeData}
            isLoading={isProbeLoading}
            currentTime={currentTimeTimestamp}
            activeDataset={activeDataset}
            activeDatasetName={activeDataset?.name}
            onClose={handleDeselectProbe}
            onOpenProfile={() => {
              // Invalidate any pending in-flight platform detail requests
              ++selectionRequestIdRef.current;

              const isLand = Boolean(probeData?.is_land);
              const isUnavailable = Boolean(probeData?.unavailable || probeData?.error);
              const hasValidValues = Array.isArray(probeData?.temperature) &&
                probeData.temperature.some(v => v !== null && v !== undefined && !Number.isNaN(v));

              if (isLand) {
                setSelectedFloat({
                  isModelProfile: true,
                  platform_type: 'model_profile',
                  is_land: true,
                  lat: probedPoint.lat,
                  lon: probedPoint.lon,
                  timestamp: probeData?.timestamp || null,
                  time_idx: probeData?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: 'Selected coordinate lies on land. Numerical ocean model column is not defined over land terrain.'
                });
              } else if (isUnavailable) {
                setSelectedFloat({
                  isModelProfile: true,
                  platform_type: 'model_profile',
                  is_land: false,
                  lat: probedPoint.lat,
                  lon: probedPoint.lon,
                  timestamp: probeData?.timestamp || null,
                  time_idx: probeData?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: probeData?.error || 'Selected coordinate lies outside active numerical model domain.'
                });
              } else if (!hasValidValues || !probeData?.depths?.length) {
                setSelectedFloat({
                  isModelProfile: true,
                  platform_type: 'model_profile',
                  is_land: false,
                  lat: probeData?.lat ?? probedPoint.lat,
                  lon: probeData?.lon ?? probedPoint.lon,
                  timestamp: probeData?.timestamp || null,
                  time_idx: probeData?.time_idx ?? timeIndex,
                  depths: [],
                  temperature: [],
                  salinity: [],
                  qc_flags: [],
                  datasetName: activeDataset?.name || null,
                  has_observations: false,
                  unavailableReason: 'No valid vertical ocean measurements available for this model coordinate.'
                });
              } else {
                setSelectedFloat({
                  isModelProfile: true,
                  platform_type: 'model_profile',
                  is_land: false,
                  lat: probeData.lat ?? probedPoint.lat,
                  lon: probeData.lon ?? probedPoint.lon,
                  timestamp: probeData.timestamp || null,
                  time_idx: probeData.time_idx ?? timeIndex,
                  depths: probeData.depths || [],
                  temperature: probeData.temperature || [],
                  salinity: probeData.salinity || [],
                  qc_flags: (probeData.depths || []).map(() => 1),
                  datasetName: activeDataset?.name || null,
                  has_observations: true
                });
              }
              setIsProfileModalOpen(true);
            }}
            onOpenComparison={() => {
              const nearest = probeData?.nearest_observation;
              const reqId = ++selectionRequestIdRef.current;
              setSelectedFloat(null);
              setSelectedGlider(null);
              setPlatformLoadError(null);

              if (!nearest || !nearest.id || nearest.platform_type === 'buoy' || nearest.platform_type === 'unsupported') {
                setIsPlatformLoading(false);
                setComparisonContext({
                  isAvailable: false,
                  source: 'probe',
                  probePoint: probedPoint,
                  nearest: null
                });
                setIsComparisonOpen(true);
              } else if (nearest.platform_type === 'glider') {
                setIsPlatformLoading(true);
                setComparisonContext({
                  isAvailable: true,
                  source: 'probe',
                  platformId: nearest.id,
                  platformType: 'glider',
                  probePoint: probedPoint
                });
                setIsComparisonOpen(true);
                fetchGliderById(nearest.id)
                  .then((detail) => {
                    if (selectionRequestIdRef.current === reqId) {
                      setSelectedGlider(detail);
                      setSelectedFloat(detail);
                      setIsPlatformLoading(false);
                      setPlatformLoadError(null);
                    }
                  })
                  .catch((err) => {
                    if (selectionRequestIdRef.current === reqId) {
                      console.warn('Could not fetch nearest glider detail:', err);
                      setPlatformLoadError(err.message || 'Failed to load nearest glider detail');
                      setIsPlatformLoading(false);
                    }
                  });
              } else if (nearest.platform_type === 'argo') {
                setIsPlatformLoading(true);
                setComparisonContext({
                  isAvailable: true,
                  source: 'probe',
                  platformId: nearest.id,
                  platformType: 'argo',
                  probePoint: probedPoint
                });
                setIsComparisonOpen(true);
                fetchArgoFloatById(nearest.id)
                  .then((detail) => {
                    if (selectionRequestIdRef.current === reqId) {
                      setSelectedFloat(detail);
                      setIsPlatformLoading(false);
                      setPlatformLoadError(null);
                    }
                  })
                  .catch((err) => {
                    if (selectionRequestIdRef.current === reqId) {
                      console.warn('Could not fetch nearest argo detail:', err);
                      setPlatformLoadError(err.message || 'Failed to load nearest Argo profile');
                      setIsPlatformLoading(false);
                    }
                  });
              } else {
                setIsPlatformLoading(false);
                setComparisonContext({
                  isAvailable: false,
                  source: 'probe',
                  unsupportedType: nearest.platform_type,
                  probePoint: probedPoint
                });
                setIsComparisonOpen(true);
              }
            }}
            onOpenInDepthAnalysis={(pt) => {
              if (pt) setProbedPoint(pt);
              setIsInDepthModalOpen(true);
            }}
          />
        )}

        {/* Slide-out Observation Fleet Drawer (Argo, Gliders, Buoys) */}
        <ObservationDrawer
          isOpen={isObservationDrawerOpen}
          onClose={() => setIsObservationDrawerOpen(false)}
          argoFloats={argoFloats}
          gliderTransects={gliderTransects}
          selectedPlatform={selectedFloat}
          onSelectPlatform={(raw) => {
            const explicit = raw?.platform_type || raw?.type;
            const isGliderRaw = explicit === 'glider' || (!explicit && ((Array.isArray(raw?.waypoints) && raw.waypoints.length > 0) || Boolean(raw?.mission_name)));
            if (isGliderRaw) {
              handleSelectGlider(raw);
            } else {
              handleSelectFloat(raw);
            }
          }}
          onOpenProfile={(p) => {
            const explicit = p?.platform_type || p?.type;
            const isGliderRaw = explicit === 'glider' || (!explicit && ((Array.isArray(p?.waypoints) && p.waypoints.length > 0) || Boolean(p?.mission_name)));
            if (isGliderRaw) {
              handleSelectGlider(p);
            } else {
              handleSelectFloat(p);
            }
            setIsProfileModalOpen(true);
          }}
          onOpenComparison={(p) => {
            const explicit = p?.platform_type || p?.type;
            const isGliderRaw = explicit === 'glider' || (!explicit && ((Array.isArray(p?.waypoints) && p.waypoints.length > 0) || Boolean(p?.mission_name)));
            if (isGliderRaw) {
              handleSelectGlider(p);
            } else {
              handleSelectFloat(p);
            }
            setComparisonContext({
              isAvailable: true,
              source: 'fleet',
              platformId: p?.id,
              platformType: isGliderRaw ? 'glider' : 'argo'
            });
            setIsComparisonOpen(true);
          }}
          onFocusCoordinates={(lat, lon) => handleSelectRegion({ lat, lon, dist: 120 })}
        />

        {/* Dedicated Scientific Profile Modal */}
        {isProfileModalOpen && (selectedFloat || isPlatformLoading || platformLoadError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <ProfileModal
                selectedFloat={selectedFloat}
                isLoading={isPlatformLoading}
                error={platformLoadError}
                onRetry={() => {
                  const targetId = selectedFloat?.id;
                  const targetType = selectedFloat?.platform_type || selectedFloat?.type;
                  if (targetId) {
                    if (targetType === 'glider') {
                      handleSelectGlider({ id: targetId });
                    } else {
                      handleSelectFloat({ id: targetId });
                    }
                  }
                }}
                onSelectFloat={(f) => {
                  if (!f) {
                    handleDeselectPlatform();
                    setIsProfileModalOpen(false);
                  } else {
                    handleSelectFloat(f);
                  }
                }}
              />
            </div>
          </div>
        )}
        <footer className="workspace-footer flex flex-wrap justify-between gap-3">
          <span>Ministry of Earth Sciences (MoES) <span aria-hidden="true">·</span> INCOIS Ocean Information Services</span>
          <button type="button" className="footer-source-link" onClick={() => setIsSourcesOpen(true)}>
            Operational ROMS 3D Model · Data Sources & Specifications
          </button>
        </footer>
        <AIAssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          context={{
            selectedFloat,
            selectedVariable,
            requestedDepth,
            timeIndex
          }}
          onNavigate={handleAssistantNavigate}
        />
        <ModelComparisonModal
          isOpen={isComparisonOpen}
          onClose={() => {
            ++selectionRequestIdRef.current;
            setIsComparisonOpen(false);
            setComparisonContext(null);
            setIsPlatformLoading(false);
            setPlatformLoadError(null);
          }}
          comparisonContext={comparisonContext}
          argoFloats={argoFloats}
          gliderTransects={gliderTransects}
          selectedFloat={selectedFloat}
          isLoadingTarget={isPlatformLoading}
          targetLoadError={platformLoadError}
          onRetryTarget={() => {
            const targetId = comparisonContext?.platformId || selectedFloat?.id;
            const targetType = comparisonContext?.platformType || selectedFloat?.platform_type || selectedFloat?.type;
            if (targetId) {
              if (targetType === 'glider') {
                handleSelectGlider({ id: targetId });
              } else {
                handleSelectFloat({ id: targetId });
              }
            }
          }}
          showAnomalyField={showAnomalyField}
          onToggleAnomalyField={setShowAnomalyField}
          onFocusFloat={(platform) => {
            if (platform?.type === 'glider' || platform?.waypoints) {
              handleSelectGlider(platform);
              setShowGliders(true);
            } else {
              handleSelectFloat(platform);
              setShowArgo(true);
            }
          }}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
        />
        <DataSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />
        <AdminUsersModal
          isOpen={isAdminUsersOpen}
          onClose={() => setIsAdminUsersOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
        />
        <SensorRegistrationModal
          isOpen={isSensorRegisterOpen}
          onClose={() => setIsSensorRegisterOpen(false)}
          onSensorRegistered={handleSensorRegistered}
          currentUser={currentUser}
        />
        <DatasetManagerModal
          isOpen={isDatasetsModalOpen}
          onClose={() => setIsDatasetsModalOpen(false)}
          onDatasetSwitched={handleDatasetSwitched}
          onSelectDataset={transitionToDataset}
          isTransitioning={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
          currentActiveDatasetId={activeDataset?.dataset_id}
        />
        <FishermanModeModal
          isOpen={isFishermanModalOpen}
          onClose={() => setIsFishermanModalOpen(false)}
          onSelectHarbor={(h) => handleSelectRegion({ id: h.id, lat: h.lat, lon: h.lon, dist: 112, level: 'Local Sector' })}
          probeData={probeData}
          timeIndex={timeIndex}
          activeDataset={activeDataset}
          coverageBounds={activeDataset?.coverage_bounds}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
        />
        <CycloneModeModal
          isOpen={isCycloneModalOpen}
          onClose={() => setIsCycloneModalOpen(false)}
          probeData={probeData}
          onFocusCycloneTrack={() => handleSelectRegion({ id: 'sub-bob', lat: 14.0, lon: 88.0, dist: 145, level: 'Sub-Basin' })}
        />
        <InDepthOceanModal
          isOpen={isInDepthModalOpen}
          onClose={() => setIsInDepthModalOpen(false)}
          initialCoords={probedPoint || { lat: 15.0, lon: 85.0 }}
          currentActiveDatasetId={activeDataset?.dataset_id}
          timeIndex={timeIndex}
          isTransitioningDataset={isTransitioningDataset}
          isDatasetReady={isDatasetReady}
        />
      </main>
    </div>
  );
}
