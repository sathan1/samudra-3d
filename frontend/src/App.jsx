import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import SidebarControls from './components/SidebarControls.jsx';
import OceanCanvas from './components/OceanCanvas.jsx';
import ComparisonPanel from './components/ComparisonPanel.jsx';
import AIAssistantModal from './components/AIAssistantModal.jsx';
import LoginModal from './components/LoginModal.jsx';
import DataSourcesModal from './components/DataSourcesModal.jsx';
import AdminUsersModal from './components/AdminUsersModal.jsx';
import SensorRegistrationModal from './components/SensorRegistrationModal.jsx';
import LoginPage from './components/LoginPage.jsx';
import AdminPortal from './components/AdminPortal.jsx';
import {
  fetchAnomalyField,
  fetchArgoFloats,
  fetchArgoFloatById,
  fetchGliderTransects,
  fetchGliderById,
  fetchCurrentUser,
  logoutUser,
  fetchCustomSensors
} from './services/api.js';
import {
  computeNextStep,
  computePrevStep,
  isFinalStep,
  getIntervalForSpeed,
  TOTAL_FORECAST_STEPS,
  FORECAST_TIMESTAMPS
} from './utils/timeAnimation.js';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedVariable, setSelectedVariable] = useState('temperature');
  const [requestedDepth, setRequestedDepth] = useState(0);
  const [resolvedDepth, setResolvedDepth] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTimeTimestamp, setCurrentTimeTimestamp] = useState(FORECAST_TIMESTAMPS[0]);
  const [showCurrents, setShowCurrents] = useState(false);
  const [showArgo, setShowArgo] = useState(false);
  const [argoFloats, setArgoFloats] = useState([]);
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [showGliders, setShowGliders] = useState(false);
  const [gliderTransects, setGliderTransects] = useState([]);
  const [selectedGlider, setSelectedGlider] = useState(null);

  // Phase 14: 3D Difference Field & Anomaly Heatmap state
  const [showAnomalyField, setShowAnomalyField] = useState(false);
  const [anomalyVariable, setAnomalyVariable] = useState('temperature');
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.5);
  const [anomalyData, setAnomalyData] = useState(null);

  // Phase 15: AI Ocean Assistant Modal state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  // MoES/INCOIS Admin & Sensor Management state
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState(false);
  const [isSensorRegisterOpen, setIsSensorRegisterOpen] = useState(false);
  const [customSensors, setCustomSensors] = useState([]);
  // MoES/INCOIS Operational Authentication & Session state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem('samudra_auth_token') : null;
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
    if (!authToken) return;
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

  const handleLoginSuccess = useCallback((user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('samudra_auth_token', token);
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

  const handleToggleArgo = useCallback((checked) => {
    setShowArgo(checked);
    if (!checked && selectedFloat?.platform_type === 'argo') {
      setSelectedFloat(null);
    }
  }, [selectedFloat]);

  const handleToggleGliders = useCallback((checked) => {
    setShowGliders(checked);
    if (!checked) {
      setSelectedGlider(null);
      if (selectedFloat?.platform_type === 'glider') {
        setSelectedFloat(null);
      }
    }
  }, [selectedFloat]);

  // Phase 14: Load Anomaly Field when layer is enabled or filters change
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
      fetchGliderById(point.platform_id)
        .then((data) => {
          if (data) {
            setSelectedGlider(data);
            setSelectedFloat(data);
          }
        })
        .catch(console.warn);
    } else {
      fetchArgoFloatById(point.platform_id)
        .then((data) => {
          if (data) {
            setSelectedFloat(data);
          }
        })
        .catch(console.warn);
    }
  }, []);

  const handleSensorRegistered = useCallback((newSensor) => {
    if (!newSensor) return;
    setCustomSensors((prev) => [...prev, newSensor]);
    if (newSensor.platform_type === 'argo') {
      setArgoFloats((prev) => {
        if (prev.some((f) => f.id === newSensor.id)) return prev;
        return [...prev, newSensor];
      });
      setShowArgo(true);
    }
    setSelectedFloat(newSensor);
  }, []);

  // Load Argo floats and registered custom sensors when layer is enabled
  useEffect(() => {
    if (!showArgo) return;

    let ignore = false;
    Promise.all([
      fetchArgoFloats(),
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
  }, [showArgo]);

  // Load Glider transects when layer is enabled
  useEffect(() => {
    if (!showGliders) return;

    let ignore = false;
    fetchGliderTransects()
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
  }, [showGliders]);

  const handleSelectFloat = useCallback(
    (floatOrSummary) => {
      if (!floatOrSummary) {
        setSelectedFloat(null);
        return;
      }
      if (floatOrSummary.depths && floatOrSummary.temperature && floatOrSummary.temperature.length > 0) {
        setSelectedFloat(floatOrSummary);
        return;
      }
      fetchArgoFloatById(floatOrSummary.id)
        .then((detail) => {
          setSelectedFloat(detail);
        })
        .catch((err) => {
          console.warn('Could not fetch detailed float profile:', err);
          setSelectedFloat(floatOrSummary);
        });
    },
    []
  );

  const handleSelectFloatId = useCallback(
    (id) => {
      if (!id) {
        setSelectedFloat(null);
        return;
      }
      const found = argoFloats.find((f) => f.id === id);
      handleSelectFloat(found || { id });
    },
    [argoFloats, handleSelectFloat]
  );

  const handleSelectGlider = useCallback((gliderOrSummary) => {
    if (!gliderOrSummary) {
      setSelectedGlider(null);
      setSelectedFloat(null);
      return;
    }
    if (gliderOrSummary.waypoints && gliderOrSummary.waypoints.length > 0) {
      setSelectedGlider(gliderOrSummary);
      setSelectedFloat(gliderOrSummary);
      return;
    }
    fetchGliderById(gliderOrSummary.id)
      .then((detail) => {
        setSelectedGlider(detail);
        setSelectedFloat(detail);
      })
      .catch((err) => {
        console.warn('Could not fetch detailed glider transect:', err);
        setSelectedGlider(gliderOrSummary);
        setSelectedFloat(gliderOrSummary);
      });
  }, []);

  const handleSelectGliderId = useCallback(
    (id) => {
      if (!id) {
        setSelectedGlider(null);
        setSelectedFloat(null);
        return;
      }
      const found = gliderTransects.find((g) => g.id === id);
      handleSelectGlider(found || { id });
    },
    [gliderTransects, handleSelectGlider]
  );

  // Single managed playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = getIntervalForSpeed(playbackSpeed);
    const intervalId = window.setInterval(() => {
      // Pause advancing if currently buffering slower than playback speed
      if (isBufferingRef.current) return;

      setTimeIndex((prevIdx) => {
        if (!isLooping && isFinalStep(prevIdx, TOTAL_FORECAST_STEPS)) {
          setIsPlaying(false);
          return prevIdx;
        }
        return computeNextStep(prevIdx, TOTAL_FORECAST_STEPS, isLooping);
      });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, isLooping]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const willPlay = !prev;
      if (willPlay && !isLooping && isFinalStep(timeIndex, TOTAL_FORECAST_STEPS)) {
        setTimeIndex(0);
      }
      return willPlay;
    });
  }, [isLooping, timeIndex]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setTimeIndex((prev) => computePrevStep(prev, TOTAL_FORECAST_STEPS, isLooping));
  }, [isLooping]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setTimeIndex((prev) => computeNextStep(prev, TOTAL_FORECAST_STEPS, isLooping));
  }, [isLooping]);

  const handleSelectTime = useCallback((newIdx) => {
    setIsPlaying(false);
    setTimeIndex(newIdx);
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

  return (
    <div className="app min-h-screen" data-theme={theme}>
      <a className="skip-link" href="#workspace">Skip to ocean workspace</a>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenLogin={() => handleNavigate('/login')}
        onOpenRegisterSensor={() => setIsSensorRegisterOpen(true)}
        onOpenAdminUsers={() => handleNavigate('/admin')}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
      <main id="workspace" tabIndex={-1} className="workspace">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ocean">OCEAN EXPLORATION</p>
            <h1>Indian Ocean workspace</h1>
            <p className="muted">Explore numerical model forecasts, in-situ robot sensors, and real-time anomaly detection.</p>
          </div>
          <span className="phase-label">OPERATIONAL PLATFORM // MOES-INCOIS</span>
        </div>
        <div className="notice" role="status">
          <span className="status-dot" aria-hidden="true" />
          <p>
            <strong>3D Earth Globe active.</strong> Start with a variable, depth and time, then switch on Argo floats or gliders to inspect in-situ observation profiles.
          </p>
        </div>
        <div className="dashboard">
          <SidebarControls
            selectedVariable={selectedVariable}
            onSelectVariable={setSelectedVariable}
            requestedDepth={requestedDepth}
            onSelectDepth={setRequestedDepth}
            resolvedDepth={resolvedDepth}
            timeIndex={timeIndex}
            onSelectTime={handleSelectTime}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStepBack={handleStepBack}
            onStepForward={handleStepForward}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            isLooping={isLooping}
            onToggleLoop={setIsLooping}
            totalTimeSteps={TOTAL_FORECAST_STEPS}
            currentTimeTimestamp={currentTimeTimestamp}
            isBuffering={isBuffering}
            showCurrents={showCurrents}
            onToggleCurrents={setShowCurrents}
            showArgo={showArgo}
            onToggleArgo={handleToggleArgo}
            argoFloats={argoFloats}
            selectedFloatId={selectedFloat?.id || null}
            onSelectFloatId={handleSelectFloatId}
            showGliders={showGliders}
            onToggleGliders={handleToggleGliders}
            gliderTransects={gliderTransects}
            selectedGliderId={selectedGlider?.id || null}
            onSelectGliderId={handleSelectGliderId}
          />
          <OceanCanvas
            selectedVariable={selectedVariable}
            onSelectVariable={setSelectedVariable}
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
          />
          <ComparisonPanel
            selectedFloat={selectedFloat}
            onSelectFloat={handleSelectFloat}
            showAnomalyField={showAnomalyField}
            onToggleAnomalyField={setShowAnomalyField}
            anomalyVariable={anomalyVariable}
            onChangeAnomalyVariable={(v) => {
              setAnomalyVariable(v);
              setAnomalyThreshold(v === 'temperature' ? 0.5 : 0.1);
            }}
            anomalyThreshold={anomalyThreshold}
            onChangeAnomalyThreshold={setAnomalyThreshold}
            anomalyData={anomalyData}
            onSelectAnomalyPoint={handleSelectAnomalyPoint}
          />
        </div>
        <footer className="workspace-footer flex flex-wrap justify-between gap-3">
          <span>Ministry of Earth Sciences (MoES) <span aria-hidden="true">·</span> INCOIS Ocean Information Services</span>
          <button type="button" className="footer-source-link" onClick={() => setIsSourcesOpen(true)}>
            Demo ROMS-style field · Data Sources & Specifications
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
      </main>
    </div>
  );
}
