import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadEarthTextures, createAtmosphereMaterial } from '../utils/earthTexture.js';
import { geoToCartesian, cartesianToGeo, DEFAULT_GLOBE_RADIUS } from '../utils/coordinates.js';
import { buildScalarFieldGeometry, createScalarFieldMaterial } from '../utils/scalarField.js';
import { fetchOceanData } from '../services/api.js';
import ColorBarLegend from './ColorBarLegend.jsx';
import { formatTimeLabel } from '../utils/timeAnimation.js';
import { ParticleSystem, PARTICLE_COUNT } from '../utils/particleStreamlines.js';
import {
  createArgoMarker,
  raycastArgoMarkers,
  updateMarkerSelectionVisuals,
  updateOccludedMarkersVisibility,
  disposeArgoMarkers
} from '../utils/argoProfiles.js';
import {
  createAnomalyFieldMesh,
  raycastAnomalyField,
  updateAnomalyOcclusion,
  disposeAnomalyField
} from '../utils/anomalyField.js';
import {
  createGliderTransectMesh,
  raycastGliderTransects,
  updateGliderSelectionVisuals,
  updateGliderOcclusion,
  disposeGliderTransects
} from '../utils/gliderTransects.js';
import {
  createOceanVolumeBlock,
  disposeOceanVolumeBlock,
  createProbePinMesh,
  createTransectCurtainMesh,
  blockToGeo
} from '../utils/oceanVolumeBlock.js';

/**
 * Checks if WebGL is available in the current browser runtime.
 */
function checkWebGLAvailability() {
  try {
    if (typeof window === 'undefined' || !window.WebGLRenderingContext) return false;
    const testCanvas = document.createElement('canvas');
    return !!(
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// Initial Indian Ocean camera position: lat ~ 5°N, lon ~ 75°E, distance ~ 220
const INITIAL_CAM_POS = geoToCartesian(5, 75, 0, {
  globeRadius: 220,
  verticalExaggeration: 0
});

/**
 * OceanCanvas - Interactive 3D Earth Globe & 3D Regional Ocean Volume Block
 * Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10 (SIH26067)
 * 
 * Supports Dual View Modes:
 * - View Mode 1: Solid Realistic Earth Globe (no see-through ghost effect)
 * - View Mode 2: Regional 3D Ocean Volume Block (Northern Indian Ocean 0-25°N, 65-95°E)
 *   with 4 vertical boundary depth curtains from 0m down to 4000m and ODV slices.
 */
export default function OceanCanvas({
  selectedVariable = 'temperature',
  requestedDepth = 0,
  onDepthResolved = null,
  timeIndex = 0,
  onTimeResolved = null,
  isPlaying = false,
  isBuffering = false,
  onBufferingChange = null,
  showCurrents = false,
  showArgo = false,
  argoFloats = [],
  selectedFloat = null,
  onSelectFloat = null,
  showGliders = false,
  gliderTransects = [],
  selectedGlider = null,
  onSelectGlider = null,
  showAnomalyField = false,
  anomalyPoints = [],
  onSelectAnomalyPoint = null,
  viewMode = 'globe',
  probedPoint = null,
  probeData = null,
  onProbePoint = null,
  activeTransect = null,
  isFullView = false,
  onToggleFullView = null
}) {
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const scalarMeshRef = useRef(null);
  const globeMaterialRef = useRef(null);
  const earthMeshRef = useRef(null);
  const cloudsMeshRef = useRef(null);
  const atmosphereMeshRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const particleSystemRef = useRef(null);
  const currentsDataRef = useRef(null);
  const requestedDepthRef = useRef(requestedDepth);

  const [hoveredCoord, setHoveredCoord] = useState(null);

  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const onProbePointRef = useRef(onProbePoint);
  useEffect(() => {
    onProbePointRef.current = onProbePoint;
  }, [onProbePoint]);

  const oceanBlockGroupRef = useRef(null);
  const probeGroupRef = useRef(null);
  const transectGroupRef = useRef(null);

  // Earth remains 100% photorealistic and solid - no see-through ghost effect
  useEffect(() => {
    requestedDepthRef.current = requestedDepth;
  }, [requestedDepth]);

  const argoMarkersGroupRef = useRef(null);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const showArgoRef = useRef(showArgo);
  const onSelectFloatRef = useRef(onSelectFloat);
  useEffect(() => {
    showArgoRef.current = showArgo;
  }, [showArgo]);
  useEffect(() => {
    onSelectFloatRef.current = onSelectFloat;
  }, [onSelectFloat]);

  const gliderGroupRef = useRef(null);
  const showGlidersRef = useRef(showGliders);
  const onSelectGliderRef = useRef(onSelectGlider);
  useEffect(() => {
    showGlidersRef.current = showGliders;
  }, [showGliders]);
  useEffect(() => {
    onSelectGliderRef.current = onSelectGlider;
  }, [onSelectGlider]);

  const anomalyGroupRef = useRef(null);
  const showAnomalyFieldRef = useRef(showAnomalyField);
  const onSelectAnomalyPointRef = useRef(onSelectAnomalyPoint);
  useEffect(() => {
    showAnomalyFieldRef.current = showAnomalyField;
  }, [showAnomalyField]);
  useEffect(() => {
    onSelectAnomalyPointRef.current = onSelectAnomalyPoint;
  }, [onSelectAnomalyPoint]);

  const [webglAvailable] = useState(() => checkWebGLAvailability());
  const [rendererStats, setRendererStats] = useState({ fps: 0, drawCalls: 0 });
  const [retryKey, setRetryKey] = useState(0);
  const [rangeMode, setRangeMode] = useState('dynamic');
  const [fieldState, setFieldState] = useState({
    loading: true,
    error: null,
    sliceData: null
  });

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      if (viewMode === 'block') {
        cameraRef.current.position.set(65, 55, 75);
        controlsRef.current.target.set(0, -15, 0);
        controlsRef.current.minDistance = 20;
        controlsRef.current.maxDistance = 350;
      } else {
        cameraRef.current.position.set(INITIAL_CAM_POS.x, INITIAL_CAM_POS.y, INITIAL_CAM_POS.z);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 108;
        controlsRef.current.maxDistance = 420;
      }
      controlsRef.current.update();
    }
  };

  const handleRetry = () => {
    setFieldState((prev) => ({ ...prev, loading: true, error: null }));
    setRetryKey((k) => k + 1);
  };

  // 1. Data Fetching Effect with AbortController, requestId tracking, and Debounce/Buffering
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const currentRequestId = ++latestRequestIdRef.current;

    const delay = isPlaying ? 0 : 100;
    const timer = setTimeout(() => {
      onBufferingChange?.(true);
      setFieldState((prev) => ({ ...prev, loading: true, error: null }));

      fetchOceanData({
        variable: selectedVariable,
        time_idx: timeIndex,
        depth: requestedDepth,
        signal: controller.signal
      })
        .then((data) => {
          if (!ignore && currentRequestId === latestRequestIdRef.current) {
            setFieldState({
              loading: false,
              error: null,
              sliceData: data
            });
            onBufferingChange?.(false);
            onDepthResolved?.(data.selected_depth);
            onTimeResolved?.(data.timestamp);
          }
        })
        .catch((err) => {
          if (!ignore && currentRequestId === latestRequestIdRef.current && err.name !== 'AbortError') {
            setFieldState({
              loading: false,
              error: err.message || `Failed to load ${selectedVariable} field at ${requestedDepth}m (t=${timeIndex})`,
              sliceData: null
            });
            onBufferingChange?.(false);
          }
        });
    }, delay);

    return () => {
      ignore = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedVariable, requestedDepth, timeIndex, isPlaying, retryKey, onDepthResolved, onTimeResolved, onBufferingChange]);

  // 2. Particle Streamlines Lifecycle Effect
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !showCurrents) {
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    if (fieldState.sliceData?.variable === 'currents' && fieldState.sliceData.u_values) {
      currentsDataRef.current = fieldState.sliceData;
      if (!particleSystemRef.current) {
        particleSystemRef.current = new ParticleSystem(PARTICLE_COUNT);
        scene.add(particleSystemRef.current.mesh);
        particleSystemRef.current.init(
          fieldState.sliceData.lats,
          fieldState.sliceData.lons,
          fieldState.sliceData.u_values,
          fieldState.sliceData.v_values
        );
      }
      return;
    }

    fetchOceanData({
      variable: 'currents',
      time_idx: timeIndex,
      depth: requestedDepth,
      signal: controller.signal
    })
      .then((data) => {
        if (!ignore && data.u_values && data.v_values) {
          currentsDataRef.current = data;
          if (!particleSystemRef.current && sceneRef.current) {
            particleSystemRef.current = new ParticleSystem(PARTICLE_COUNT);
            sceneRef.current.add(particleSystemRef.current.mesh);
            particleSystemRef.current.init(
              data.lats,
              data.lons,
              data.u_values,
              data.v_values
            );
          }
        }
      })
      .catch((err) => {
        if (!ignore && err.name !== 'AbortError') {
          console.warn('Failed to load currents vector field:', err);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [showCurrents, timeIndex, requestedDepth, fieldState.sliceData]);

  // 3. Three.js Scalar Mesh Update Effect (Draped onto Globe)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (scalarMeshRef.current) {
      scene.remove(scalarMeshRef.current);
      scalarMeshRef.current.geometry?.dispose();
      scalarMeshRef.current.material?.dispose();
      scalarMeshRef.current = null;
    }

    if (fieldState.sliceData) {
      const isSalinity = fieldState.sliceData.variable === 'salinity';
      const depth = fieldState.sliceData.selected_depth ?? 0.0;
      // Draped directly on surface of globe so subsurface levels are visible without ghost transparency
      const drapeSlice = {
        ...fieldState.sliceData,
        selected_depth: 0.0
      };
      const geometry = buildScalarFieldGeometry(drapeSlice, {
        globeRadius: DEFAULT_GLOBE_RADIUS,
        palette: isSalinity ? 'haline' : 'thermal',
        min_val: rangeMode === 'fixed' ? (isSalinity ? 32.0 : 2.0) : fieldState.sliceData.min_val,
        max_val: rangeMode === 'fixed' ? (isSalinity ? 38.0 : 32.0) : fieldState.sliceData.max_val
      });
      const material = createScalarFieldMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `scalar_field_${fieldState.sliceData.variable}_${depth}`;
      mesh.renderOrder = 3;
      if (viewModeRef.current === 'block') {
        mesh.visible = false;
      }

      scene.add(mesh);
      scalarMeshRef.current = mesh;
    }
  }, [fieldState.sliceData, rangeMode]);

  // 4. Regional 3D Ocean Volume Block Update Effect
  useEffect(() => {
    const group = oceanBlockGroupRef.current;
    if (!group) return;
    disposeOceanVolumeBlock(group);
    if (fieldState.sliceData) {
      const blockMesh = createOceanVolumeBlock(fieldState.sliceData, {
        variable: selectedVariable,
        rangeMode
      });
      if (blockMesh) {
        group.add(blockMesh);
      }
    }
  }, [fieldState.sliceData, selectedVariable, rangeMode]);

  // 5. 3D Probe Pin Beacon Update Effect
  useEffect(() => {
    const group = probeGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const c = group.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
      group.remove(c);
    }
    if (probedPoint && probedPoint.lat != null && probedPoint.lon != null) {
      const isBlock = viewMode === 'block';
      const pin = createProbePinMesh(probedPoint.lat, probedPoint.lon, isBlock);
      if (pin) group.add(pin);
    }
  }, [probedPoint, viewMode]);

  // 6. ODV Vertical Transect Curtain Update Effect
  useEffect(() => {
    const group = transectGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const c = group.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
      group.remove(c);
    }
    if (activeTransect && viewMode === 'block') {
      const curtain = createTransectCurtainMesh(activeTransect, {
        palette: selectedVariable === 'salinity' ? 'haline' : 'thermal'
      });
      if (curtain) group.add(curtain);
    }
  }, [activeTransect, viewMode, selectedVariable]);

  // 7. View Mode Switching Effect (Globe vs Block)
  useEffect(() => {
    const isBlock = viewMode === 'block';
    if (earthMeshRef.current) earthMeshRef.current.visible = !isBlock;
    if (cloudsMeshRef.current) cloudsMeshRef.current.visible = !isBlock;
    if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = !isBlock;
    if (scalarMeshRef.current) scalarMeshRef.current.visible = !isBlock;
    if (oceanBlockGroupRef.current) oceanBlockGroupRef.current.visible = isBlock;
    if (transectGroupRef.current) transectGroupRef.current.visible = isBlock;

    if (cameraRef.current && controlsRef.current) {
      if (isBlock) {
        cameraRef.current.position.set(65, 55, 75);
        controlsRef.current.target.set(0, -15, 0);
        controlsRef.current.minDistance = 20;
        controlsRef.current.maxDistance = 350;
      } else {
        cameraRef.current.position.set(INITIAL_CAM_POS.x, INITIAL_CAM_POS.y, INITIAL_CAM_POS.z);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 108;
        controlsRef.current.maxDistance = 420;
      }
      controlsRef.current.update();
    }
  }, [viewMode]);

  // 8. Main Three.js Scene Setup & Lifecycle Effect
  useEffect(() => {
    if (!webglAvailable) return;

    const container = containerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020712);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(INITIAL_CAM_POS.x, INITIAL_CAM_POS.y, INITIAL_CAM_POS.z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 108;
    controls.maxDistance = 420;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Balanced Photorealistic Illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.15);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(160, 130, 140);
    scene.add(sunLight);

    const backFillLight = new THREE.DirectionalLight(0xdbeafe, 0.95);
    backFillLight.position.set(-160, 60, -140);
    scene.add(backFillLight);

    const polarFill = new THREE.DirectionalLight(0x93c5fd, 0.45);
    polarFill.position.set(0, -120, 120);
    scene.add(polarFill);

    // Deep-Space Starfield Dust
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 400 + Math.random() * 450;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const tint = Math.random();
      if (tint > 0.65) {
        starColors[i * 3] = 0.0;
        starColors[i * 3 + 1] = 0.96;
        starColors[i * 3 + 2] = 0.83;
      } else if (tint > 0.35) {
        starColors[i * 3] = 0.22;
        starColors[i * 3 + 1] = 0.74;
        starColors[i * 3 + 2] = 0.97;
      } else {
        starColors[i * 3] = 0.85;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const starField = new THREE.Points(starGeo, starMat);
    starField.renderOrder = 0;
    scene.add(starField);

    // Photorealistic Solid Earth Globe
    const earthTextures = loadEarthTextures();
    const globeGeometry = new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS, 64, 64);
    const globeMaterial = new THREE.MeshStandardMaterial({
      map: earthTextures.dayTexture,
      normalMap: earthTextures.normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: earthTextures.specularTexture,
      roughness: 0.65,
      metalness: 0.05,
      transparent: false,
      opacity: 1.0,
      depthWrite: true
    });
    const earthMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    earthMesh.renderOrder = 2;
    scene.add(earthMesh);
    globeMaterialRef.current = globeMaterial;
    earthMeshRef.current = earthMesh;

    // Natural Cloud Layer
    const cloudsGeometry = new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS * 1.006, 48, 48);
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: earthTextures.cloudsTexture,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    cloudsMesh.renderOrder = 3;
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Soft Atmospheric Limb Glow
    const atmosphereGeometry = new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS * 1.020, 48, 48);
    const atmosphereMaterial = createAtmosphereMaterial();
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.renderOrder = 4;
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // In-situ Argo float markers group
    const argoGroup = new THREE.Group();
    argoGroup.name = 'argo-markers-group';
    scene.add(argoGroup);
    argoMarkersGroupRef.current = argoGroup;

    const gliderGroup = new THREE.Group();
    gliderGroup.name = 'glider-transects';
    scene.add(gliderGroup);
    gliderGroupRef.current = gliderGroup;

    // Anomaly Residual Spheres Group
    const anomalyGroup = new THREE.Group();
    anomalyGroup.name = 'anomaly-spheres-group';
    scene.add(anomalyGroup);
    anomalyGroupRef.current = anomalyGroup;

    // 3D Regional Ocean Volume Block Group
    const oceanBlockGroup = new THREE.Group();
    oceanBlockGroup.name = 'ocean-volume-block-container';
    oceanBlockGroup.visible = viewModeRef.current === 'block';
    scene.add(oceanBlockGroup);
    oceanBlockGroupRef.current = oceanBlockGroup;

    // 3D Probe Pin Beacon Group
    const probeGroup = new THREE.Group();
    probeGroup.name = 'probe-pin-group';
    scene.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // ODV Vertical Transect Group
    const transectGroup = new THREE.Group();
    transectGroup.name = 'odv-transect-curtain-group';
    transectGroup.visible = viewModeRef.current === 'block';
    scene.add(transectGroup);
    transectGroupRef.current = transectGroup;

    // Pointer events for drag vs click discrimination
    const handlePointerDown = (e) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e) => {
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      if (dx * dx + dy * dy > 16) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // 1. Raycast against Argo markers
      if (showArgoRef.current && argoMarkersGroupRef.current && viewModeRef.current === 'globe') {
        const hitFloat = raycastArgoMarkers(
          raycaster,
          argoMarkersGroupRef.current,
          camera.position,
          DEFAULT_GLOBE_RADIUS
        );
        if (hitFloat) {
          onSelectFloatRef.current?.(hitFloat);
          return;
        }
      }

      // 2. Raycast against Gliders
      if (showGlidersRef.current && gliderGroupRef.current && viewModeRef.current === 'globe') {
        const hitGlider = raycastGliderTransects(
          raycaster,
          gliderGroupRef.current,
          camera.position,
          DEFAULT_GLOBE_RADIUS
        );
        if (hitGlider) {
          onSelectGliderRef.current?.(hitGlider);
          return;
        }
      }

      // 3. Raycast against Anomaly Residuals
      if (showAnomalyFieldRef.current && anomalyGroupRef.current && viewModeRef.current === 'globe') {
        const hitAnomaly = raycastAnomalyField(raycaster, anomalyGroupRef.current);
        if (hitAnomaly) {
          onSelectAnomalyPointRef.current?.(hitAnomaly);
          return;
        }
      }

      // 4. Raycast for Click-to-Probe (Block mode vs Globe mode)
      if (viewModeRef.current === 'block' && oceanBlockGroupRef.current) {
        const hits = raycaster.intersectObjects(oceanBlockGroupRef.current.children, true);
        if (hits.length > 0) {
          const hit = hits[0];
          const geo = blockToGeo(hit.point.x, hit.point.z);
          const lat = Math.round(geo.lat * 100) / 100;
          const lon = Math.round(geo.lon * 100) / 100;
          onProbePointRef.current?.({ lat, lon });
          return;
        }
      } else if (viewModeRef.current === 'globe' && earthMeshRef.current) {
        const targetMeshes = [scalarMeshRef.current, earthMeshRef.current].filter(Boolean);
        const hits = raycaster.intersectObjects(targetMeshes, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const geo = cartesianToGeo(hit.point.x, hit.point.y, hit.point.z);
          const lat = Math.round(geo.lat * 100) / 100;
          const lon = Math.round(geo.lon * 100) / 100;
          onProbePointRef.current?.({ lat, lon });
          return;
        }
      }
    };

    // Hover coordinate tracker for real-time cursor feedback
    const handlePointerMove = (e) => {
      if (!camera || !renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      if (viewModeRef.current === 'block' && oceanBlockGroupRef.current) {
        const hits = raycaster.intersectObjects(oceanBlockGroupRef.current.children, true);
        if (hits.length > 0) {
          const geo = blockToGeo(hits[0].point.x, hits[0].point.z);
          setHoveredCoord({
            lat: Math.round(geo.lat * 100) / 100,
            lon: Math.round(geo.lon * 100) / 100
          });
          return;
        }
      } else if (viewModeRef.current === 'globe' && earthMeshRef.current) {
        const targetMeshes = [scalarMeshRef.current, earthMeshRef.current].filter(Boolean);
        const hits = raycaster.intersectObjects(targetMeshes, false);
        if (hits.length > 0) {
          const geo = cartesianToGeo(hits[0].point.x, hits[0].point.y, hits[0].point.z);
          setHoveredCoord({
            lat: Math.round(geo.lat * 100) / 100,
            lon: Math.round(geo.lon * 100) / 100
          });
          return;
        }
      }
      setHoveredCoord(null);
    };

    const handlePointerLeave = () => {
      setHoveredCoord(null);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    // Animation & Performance Loop
    let animationFrameId;
    let isDisposed = false;
    let frameCount = 0;
    let lastFpsTime = window.performance.now();
    let lastFrameTime = window.performance.now();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = window.requestAnimationFrame(animate);

      const now = window.performance.now();
      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      // Update particle streamlines advection
      if (particleSystemRef.current && currentsDataRef.current && viewModeRef.current === 'globe') {
        const cData = currentsDataRef.current;
        particleSystemRef.current.update(
          dt,
          cData.u_values,
          cData.v_values,
          cData.lats,
          cData.lons,
          requestedDepthRef.current
        );
      }

      // Update Earth occlusion in Globe mode
      if (viewModeRef.current === 'globe') {
        if (argoMarkersGroupRef.current && showArgoRef.current) {
          updateOccludedMarkersVisibility(argoMarkersGroupRef.current, camera.position, DEFAULT_GLOBE_RADIUS);
        }
        if (gliderGroupRef.current && showGlidersRef.current) {
          updateGliderOcclusion(gliderGroupRef.current, camera.position, DEFAULT_GLOBE_RADIUS);
        }
        if (anomalyGroupRef.current && showAnomalyFieldRef.current) {
          updateAnomalyOcclusion(anomalyGroupRef.current, camera, DEFAULT_GLOBE_RADIUS);
        }
        if (cloudsMesh) {
          cloudsMesh.rotation.y += 0.00015;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      frameCount++;
      if (now - lastFpsTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        setRendererStats({
          fps: currentFps,
          drawCalls: renderer.info.render.calls
        });
        frameCount = 0;
        lastFpsTime = now;
      }
    };

    animate();

    // Resize Handling
    const handleResize = () => {
      if (!container || isDisposed) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    let resizeObserver = null;
    if (typeof window.ResizeObserver !== 'undefined') {
      resizeObserver = new window.ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', handleResize);

    // Clean Resource Teardown on Unmount
    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);

      if (argoMarkersGroupRef.current) {
        disposeArgoMarkers(argoMarkersGroupRef.current);
        scene.remove(argoMarkersGroupRef.current);
        argoMarkersGroupRef.current = null;
      }

      if (gliderGroupRef.current) {
        disposeGliderTransects(gliderGroupRef.current);
        scene.remove(gliderGroupRef.current);
        gliderGroupRef.current = null;
      }

      if (anomalyGroupRef.current) {
        disposeAnomalyField(anomalyGroupRef.current);
        scene.remove(anomalyGroupRef.current);
        anomalyGroupRef.current = null;
      }

      if (oceanBlockGroupRef.current) {
        disposeOceanVolumeBlock(oceanBlockGroupRef.current);
        scene.remove(oceanBlockGroupRef.current);
        oceanBlockGroupRef.current = null;
      }

      if (probeGroupRef.current) {
        scene.remove(probeGroupRef.current);
        probeGroupRef.current = null;
      }

      if (transectGroupRef.current) {
        scene.remove(transectGroupRef.current);
        transectGroupRef.current = null;
      }

      controls.dispose();

      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }

      if (scalarMeshRef.current) {
        scene.remove(scalarMeshRef.current);
        scalarMeshRef.current.geometry?.dispose();
        scalarMeshRef.current.material?.dispose();
        scalarMeshRef.current = null;
      }

      scene.remove(earthMesh);
      globeGeometry.dispose();
      globeMaterial.dispose();
      earthTextures.dayTexture?.dispose?.();
      earthTextures.normalTexture?.dispose?.();
      earthTextures.specularTexture?.dispose?.();

      scene.remove(cloudsMesh);
      cloudsGeometry.dispose();
      cloudsMaterial.dispose();
      earthTextures.cloudsTexture?.dispose?.();

      scene.remove(atmosphereMesh);
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();

      scene.remove(starField);
      starGeo.dispose();
      starMat.dispose();

      hemiLight.dispose?.();
      sunLight.dispose?.();
      backFillLight.dispose?.();
      polarFill.dispose?.();

      if (renderer) {
        renderer.dispose();
        if (renderer.forceContextLoss) {
          renderer.forceContextLoss();
        }
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      sceneRef.current = null;
    };
  }, [webglAvailable]);

  // Synchronize Argo float markers
  useEffect(() => {
    const group = argoMarkersGroupRef.current;
    if (!group) return;

    if (!showArgo) {
      group.visible = false;
      disposeArgoMarkers(group);
      return;
    }

    group.visible = true;
    disposeArgoMarkers(group);
    argoFloats.forEach((f) => {
      const isSel = selectedFloat && selectedFloat.id === f.id;
      const marker = createArgoMarker(f, isSel);
      group.add(marker);
    });
  }, [showArgo, argoFloats, selectedFloat]);

  // Update marker selection highlighting
  useEffect(() => {
    if (argoMarkersGroupRef.current) {
      updateMarkerSelectionVisuals(argoMarkersGroupRef.current, selectedFloat?.id || null);
    }
  }, [selectedFloat]);

  // Synchronize Glider transects
  useEffect(() => {
    const group = gliderGroupRef.current;
    if (!group) return;

    if (!showGliders) {
      group.visible = false;
      disposeGliderTransects(group);
      return;
    }

    group.visible = true;
    disposeGliderTransects(group);
    gliderTransects.forEach((g) => {
      const isSel = (selectedGlider && selectedGlider.id === g.id) || (selectedFloat && selectedFloat.id === g.id);
      const mesh = createGliderTransectMesh(g, { isSelected: isSel });
      group.add(mesh);
    });
  }, [showGliders, gliderTransects, selectedGlider, selectedFloat]);

  // Update glider selection visuals
  useEffect(() => {
    if (gliderGroupRef.current) {
      const activeId = selectedGlider?.id || (selectedFloat?.platform_type === 'glider' ? selectedFloat.id : null);
      updateGliderSelectionVisuals(gliderGroupRef.current, activeId);
    }
  }, [selectedGlider, selectedFloat]);

  // Synchronize 3D Anomaly Residual Spheres
  useEffect(() => {
    const group = anomalyGroupRef.current;
    if (!group) return;

    if (!showAnomalyField || !anomalyPoints || anomalyPoints.length === 0) {
      group.visible = false;
      disposeAnomalyField(group);
      return;
    }

    group.visible = true;
    disposeAnomalyField(group);
    const meshGroup = createAnomalyFieldMesh(anomalyPoints, {
      globeRadius: DEFAULT_GLOBE_RADIUS,
      verticalExaggeration: 30
    });
    if (meshGroup) {
      group.add(meshGroup);
    }
  }, [showAnomalyField, anomalyPoints]);

  return (
    <section className={`panel viewport relative flex flex-col ${isFullView ? 'full-view-active' : ''}`} aria-labelledby="viewport-heading">
      <div className="viewport-top flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="eyebrow text-ocean">SPATIAL OBSERVATORY</span>
          <h2 id="viewport-heading" className="m-0">
            {viewMode === 'block' ? 'Regional 3D Ocean Volume Block (0-25°N, 65-95°E)' : '3D Indian Ocean Globe'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="subtle-tag border border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
            WebGL2 Active
          </span>
          {fieldState.loading ? (
            <span className="subtle-tag border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 animate-pulse">
              Loading 3D Field...
            </span>
          ) : fieldState.error ? (
            <span className="subtle-tag border border-amber-500/30 bg-amber-950/20 text-amber-400">
              API Disconnected
            </span>
          ) : (
            <span className="subtle-tag border border-cyan-500/30 bg-cyan-950/20 text-cyan-400">
              {requestedDepth > 0 ? `3D Subsurface Layer Active (${fieldState.sliceData?.selected_depth ?? requestedDepth}m)` : '3D Thermal Layer Active'}
            </span>
          )}
          <span className="subtle-tag font-mono text-[10px] text-slate-400 border border-slate-700/40 bg-slate-900/30" title="Render Performance">
            {rendererStats.fps > 0 ? `${rendererStats.fps} FPS` : 'Rendering'}
          </span>
        </div>
      </div>

      {!webglAvailable ? (
        <div className="viewport-fallback p-6 text-center flex-1 flex flex-col items-center justify-center">
          <div className="empty-symbol text-amber-400">⚠️</div>
          <h3 className="text-lg font-semibold text-amber-200 mt-2">WebGL Acceleration Unavailable</h3>
          <p className="text-sm text-slate-300 max-w-md mt-2">
            Interactive 3D rendering requires WebGL support or hardware acceleration.
            Please verify GPU drivers or browser settings.
          </p>
        </div>
      ) : (
        <div className="viewport-canvas-container relative flex-1 min-h-[520px] w-full overflow-hidden">
          <div
            ref={containerRef}
            className="globe-canvas-wrapper absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
            data-testid="three-canvas-container"
          />
          {showAnomalyField && (
            <div
              className="sr-only"
              data-testid="anomaly-sphere-layer"
              aria-label="3D Anomaly Sphere Layer Active"
            />
          )}

          {/* Viewport Floating HUD */}
          <div className="viewport-hud pointer-events-none absolute top-2 left-2 right-2 flex flex-wrap justify-between items-start gap-1.5 text-xs">
            <div className="flex flex-col gap-1 pointer-events-auto max-w-full">
              {hoveredCoord && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow bg-slate-900/90 border border-cyan-500/60 max-w-full">
                  <span className="text-cyan-400 font-bold">📍 CURSOR:</span>{' '}
                  {hoveredCoord.lat >= 0 ? `${hoveredCoord.lat.toFixed(2)}°N` : `${Math.abs(hoveredCoord.lat).toFixed(2)}°S`},{' '}
                  {hoveredCoord.lon >= 0 ? `${hoveredCoord.lon.toFixed(2)}°E` : `${Math.abs(hoveredCoord.lon).toFixed(2)}°W`}{' '}
                  · <span className="text-slate-300">Click to probe data</span>
                </div>
              )}
              {viewMode === 'block' && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow bg-slate-900/90 border border-cyan-700 max-w-full">
                  <span className="text-cyan-400 font-semibold">VIEW:</span> Regional 3D Ocean Volume Block (0-25°N, 65-95°E)
                </div>
              )}
              {probedPoint && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-emerald-300 shadow bg-slate-900/90 border border-emerald-600 max-w-full">
                  <span className="text-emerald-400 font-semibold">PROBED CTD:</span> {probedPoint.lat}°N, {probedPoint.lon}°E
                </div>
              )}
              {activeTransect && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-amber-300 shadow bg-slate-900/90 border border-amber-600 max-w-full">
                  <span className="text-amber-400 font-semibold">ODV TRANSECT:</span> {activeTransect.total_distance_km} km ({activeTransect.lat1}°N, {activeTransect.lon1}°E → {activeTransect.lat2}°N, {activeTransect.lon2}°E)
                </div>
              )}
              {fieldState.sliceData && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-slate-300 shadow bg-slate-900/90 border border-slate-700 max-w-full">
                  <span className="text-emerald-400 font-semibold">LAYER:</span>{' '}
                  {fieldState.sliceData.variable === 'salinity' ? 'Practical Salinity' : 'Potential Temperature'}{' '}
                  ({(fieldState.sliceData.selected_depth ?? 0) === 0 ? '0m Surface' : `${fieldState.sliceData.selected_depth}m Subsurface`}) ·{' '}
                  {fieldState.sliceData.min_val?.toFixed(1)} to {fieldState.sliceData.max_val?.toFixed(1)} {(fieldState.sliceData.units === 'degC' || fieldState.sliceData.units === 'celsius') ? '°C' : (fieldState.sliceData.units || (fieldState.sliceData.variable === 'salinity' ? 'PSU' : '°C'))}
                </div>
              )}
              {fieldState.sliceData && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow bg-slate-900/90 border border-slate-700 max-w-full" data-testid="hud-depth-badge">
                  <span className="text-cyan-400 font-semibold">DEPTH:</span>{' '}
                  {fieldState.sliceData.requested_depth ?? requestedDepth}m requested{' '}
                  {fieldState.sliceData.selected_depth !== (fieldState.sliceData.requested_depth ?? requestedDepth)
                    ? `(snapped to ${fieldState.sliceData.selected_depth}m model level)`
                    : `(${(fieldState.sliceData.selected_depth ?? 0) === 0 ? 'Surface level' : `${fieldState.sliceData.selected_depth}m model layer`})`}
                  {fieldState.loading && <span className="ml-1.5 text-amber-300 animate-pulse">⟳ Slicing...</span>}
                </div>
              )}
              {fieldState.sliceData && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-amber-300 shadow bg-slate-900/90 border border-slate-700 max-w-full" data-testid="hud-time-badge">
                  <span className="text-amber-400 font-semibold">TIME:</span>{' '}
                  {formatTimeLabel(fieldState.sliceData.timestamp, fieldState.sliceData.time_idx ?? timeIndex)}{' '}
                  <span className="text-slate-400">[STEP {(fieldState.sliceData.time_idx ?? timeIndex) + 1}/8]</span>
                  {isBuffering && <span className="ml-1.5 text-amber-300 animate-pulse">⟳ Buffering...</span>}
                </div>
              )}
              {showCurrents && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-teal-300 shadow bg-slate-900/90 border border-teal-700 max-w-full" data-testid="hud-streamlines-badge">
                  <span className="text-teal-400 font-semibold">STREAMLINES:</span>{' '}
                  1,500 particles active
                </div>
              )}
              {showArgo && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-amber-300 shadow bg-slate-900/90 border border-amber-600 max-w-full" data-testid="hud-argo-badge">
                  <span className="text-amber-400 font-semibold">ARGO FLOATS:</span>{' '}
                  {argoFloats.length} active (INCOIS-DAC)
                </div>
              )}
              {showGliders && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-emerald-300 shadow bg-slate-900/90 border border-emerald-600 max-w-full" data-testid="hud-glider-badge">
                  <span className="text-emerald-400 font-semibold">GLIDERS:</span>{' '}
                  {gliderTransects.length} active (INCOIS-Seaglider)
                </div>
              )}
              {showAnomalyField && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-pink-300 shadow bg-slate-900/90 border border-pink-600 max-w-full" data-testid="hud-anomaly-badge">
                  <span className="text-pink-400 font-semibold">ANOMALY FIELD:</span>{' '}
                  {anomalyPoints.length} residual pairs
                </div>
              )}
              {fieldState.error && (
                <div className="hud-badge rounded px-2.5 py-1 text-[11px] shadow bg-red-950/90 border border-red-800 text-red-200 flex items-center gap-2">
                  <span>⚠️ {fieldState.error}</span>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="underline text-amber-300 hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handleResetCamera}
                className="hud-button rounded px-2.5 py-1 text-[11px] font-sans flex items-center gap-1 transition"
                title="Reset Camera"
              >
                ⟲ Reset View
              </button>
              {onToggleFullView && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={onToggleFullView}
                  className="hud-button rounded px-2.5 py-1 text-[11px] font-sans flex items-center gap-1 transition cursor-pointer select-none border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200"
                  title={isFullView ? 'Standard View' : 'Full View Globe'}
                  data-testid="toggle-full-view-btn"
                >
                  <span>{isFullView ? '◱ Standard View' : '⛶ Full View Globe'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Floating Probed Station Chip on Canvas */}
          {probedPoint && (
            <div className="probed-floating-chip pointer-events-auto absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 backdrop-blur border border-sky-500/60 rounded-full px-3.5 py-1.5 shadow-2xl flex items-center gap-2.5 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
              <span className="font-mono text-xs font-bold text-sky-300">
                📍 {probedPoint.lat}°N, {probedPoint.lon}°E
              </span>
              {probeData && (
                <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
                  {probeData.sst !== null && probeData.sst !== undefined ? `SST: ${probeData.sst}°C` : ''}
                  {probeData.mld !== null && probeData.mld !== undefined ? ` · MLD: ${probeData.mld}m` : ''}
                </span>
              )}
              <span
                role="button"
                tabIndex={-1}
                onClick={() => onProbePoint?.(null)}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer select-none ml-1"
                title="Clear probe station"
              >
                ✕
              </span>
            </div>
          )}

          {/* Controls Usage Hint */}
          <div className="viewport-controls-hint pointer-events-none absolute bottom-3 left-3 bg-slate-900/75 backdrop-blur border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono">
            Rotate: Left Click + Drag · Pan: Right Click · Zoom: Scroll Wheel · Click anywhere to probe data
          </div>
        </div>
      )}

      <ColorBarLegend
        activeField={fieldState.sliceData}
        rangeMode={rangeMode}
        onToggleRangeMode={() => setRangeMode((m) => (m === 'dynamic' ? 'fixed' : 'dynamic'))}
      />
    </section>
  );
}
