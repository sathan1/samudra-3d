import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadEarthTextures, createAtmosphereMaterial } from '../utils/earthTexture.js';
import { geoToCartesian, DEFAULT_GLOBE_RADIUS } from '../utils/coordinates.js';
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
 * OceanCanvas - Interactive 3D Earth Globe & 3D Scalar Field Visualizer
 * Authority: Master Handbook physical pp. 6-7, 9-11; roadmap p. 10 (SIH26067)
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
  onSelectAnomalyPoint = null
}) {
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const scalarMeshRef = useRef(null);
  const globeMaterialRef = useRef(null);
  const earthMeshRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const particleSystemRef = useRef(null);
  const currentsDataRef = useRef(null);
  const requestedDepthRef = useRef(requestedDepth);
  useEffect(() => {
    requestedDepthRef.current = requestedDepth;
    if (globeMaterialRef.current) {
      if (requestedDepth === 0) {
        globeMaterialRef.current.transparent = false;
        globeMaterialRef.current.opacity = 1.0;
        globeMaterialRef.current.depthWrite = true;
      } else {
        globeMaterialRef.current.transparent = true;
        globeMaterialRef.current.opacity = 0.68;
        globeMaterialRef.current.depthWrite = false;
      }
      globeMaterialRef.current.needsUpdate = true;
    }
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
      cameraRef.current.position.set(INITIAL_CAM_POS.x, INITIAL_CAM_POS.y, INITIAL_CAM_POS.z);
      controlsRef.current.target.set(0, 0, 0);
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

    // Zero delay when actively playing; 100ms debounce during manual slider scrubbing
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

  // 3. Three.js Scalar Mesh Update Effect
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous scalar field mesh
    if (scalarMeshRef.current) {
      scene.remove(scalarMeshRef.current);
      scalarMeshRef.current.geometry?.dispose();
      scalarMeshRef.current.material?.dispose();
      scalarMeshRef.current = null;
    }

    // Add new scalar field mesh if slice data is present
    if (fieldState.sliceData) {
      const isSalinity = fieldState.sliceData.variable === 'salinity';
      const depth = fieldState.sliceData.selected_depth ?? 0.0;
      const geometry = buildScalarFieldGeometry(fieldState.sliceData, {
        globeRadius: DEFAULT_GLOBE_RADIUS,
        palette: isSalinity ? 'haline' : 'thermal',
        min_val: rangeMode === 'fixed' ? (isSalinity ? 32.0 : 2.0) : fieldState.sliceData.min_val,
        max_val: rangeMode === 'fixed' ? (isSalinity ? 38.0 : 32.0) : fieldState.sliceData.max_val
      });
      const material = createScalarFieldMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `scalar_field_${fieldState.sliceData.variable}_${depth}`;
      // Subsurface renders inside/under the globe, surface renders on top
      mesh.renderOrder = depth > 0 ? 1 : 3;

      scene.add(mesh);
      scalarMeshRef.current = mesh;
    }
  }, [fieldState.sliceData, rangeMode]);

  // 3. Main Three.js Scene Setup & Lifecycle Effect
  useEffect(() => {
    if (!webglAvailable) return;

    const container = containerRef.current;
    if (!container) return;

    // Clean up any existing children (React 18 StrictMode safety)
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

    // Balanced 360-Degree Photorealistic Illumination (Google Earth / Blue Marble System)
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
        starColors[i * 3 + 2] = 0.83; // Cyan
      } else if (tint > 0.35) {
        starColors[i * 3] = 0.22;
        starColors[i * 3 + 1] = 0.74;
        starColors[i * 3 + 2] = 0.97; // Sky blue
      } else {
        starColors[i * 3] = 0.85;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 1.0; // White
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

    // Photorealistic Earth Globe (NASA Blue Marble Satellite & Google Earth System)
    const earthTextures = loadEarthTextures();
    const globeGeometry = new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS, 64, 64);
    const isSubsurface = requestedDepthRef.current > 0;
    const globeMaterial = new THREE.MeshStandardMaterial({
      map: earthTextures.dayTexture,
      normalMap: earthTextures.normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: earthTextures.specularTexture,
      roughness: 0.65,
      metalness: 0.05,
      transparent: isSubsurface,
      opacity: isSubsurface ? 0.68 : 1.0,
      depthWrite: !isSubsurface
    });
    const earthMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    earthMesh.renderOrder = 2;
    scene.add(earthMesh);
    globeMaterialRef.current = globeMaterial;
    earthMeshRef.current = earthMesh;

    // Subtle Natural Cloud Layer (like Google Earth Satellite mode)
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

    // Soft Atmospheric Limb Glow (Natural Google Earth Rayleigh Scattering)
    const atmosphereGeometry = new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS * 1.020, 48, 48);
    const atmosphereMaterial = createAtmosphereMaterial();
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.renderOrder = 4;
    scene.add(atmosphereMesh);

    // In-situ Argo float markers group
    const argoGroup = new THREE.Group();
    argoGroup.name = 'argo-markers-group';
    scene.add(argoGroup);
    argoMarkersGroupRef.current = argoGroup;

    const gliderGroup = new THREE.Group();
    gliderGroup.name = 'glider-transects';
    scene.add(gliderGroup);
    gliderGroupRef.current = gliderGroup;

    // Phase 14: Anomaly Residual Spheres Group
    const anomalyGroup = new THREE.Group();
    anomalyGroup.name = 'anomaly-spheres-group';
    scene.add(anomalyGroup);
    anomalyGroupRef.current = anomalyGroup;

    // Pointer events for drag vs click discrimination (threshold <= 4px)
    const handlePointerDown = (e) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e) => {
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      if (dx * dx + dy * dy > 16) return; // Drag occurred, ignore click

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      if (showArgoRef.current && argoMarkersGroupRef.current) {
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

      if (showGlidersRef.current && gliderGroupRef.current) {
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

      if (showAnomalyFieldRef.current && anomalyGroupRef.current) {
        const hitAnomaly = raycastAnomalyField(raycaster, anomalyGroupRef.current);
        if (hitAnomaly) {
          onSelectAnomalyPointRef.current?.(hitAnomaly);
          return;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

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
      if (particleSystemRef.current && currentsDataRef.current) {
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

      // Update far-side Earth occlusion for Argo markers
      if (argoMarkersGroupRef.current && showArgoRef.current) {
        updateOccludedMarkersVisibility(argoMarkersGroupRef.current, camera.position, DEFAULT_GLOBE_RADIUS);
      }

      // Update far-side Earth occlusion for Glider transects
      if (gliderGroupRef.current && showGlidersRef.current) {
        updateGliderOcclusion(gliderGroupRef.current, camera.position, DEFAULT_GLOBE_RADIUS);
      }

      // Update far-side Earth occlusion for Anomaly spheres
      if (anomalyGroupRef.current && showAnomalyFieldRef.current) {
        updateAnomalyOcclusion(anomalyGroupRef.current, camera, DEFAULT_GLOBE_RADIUS);
      }

      // Animate subtle natural cloud drift (Google Earth atmospheric motion)
      if (cloudsMesh) {
        cloudsMesh.rotation.y += 0.00015;
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

    // Resize Handling via ResizeObserver
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

      controls.dispose();

      // Dispose particle streamlines
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }

      // Dispose scalar field mesh
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

  // Synchronize Argo float markers when showArgo or argoFloats change
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

  // Synchronize Glider transect meshes when showGliders or gliderTransects change
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

  // Synchronize 3D Anomaly Residual Spheres when showAnomalyField or anomalyPoints change
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
    <section className="panel viewport relative flex flex-col" aria-labelledby="viewport-heading">
      <div className="viewport-top flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="eyebrow text-ocean">SPATIAL OBSERVATORY</span>
          <h2 id="viewport-heading" className="m-0">3D Indian Ocean Globe</h2>
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
        <div className="viewport-canvas-container relative flex-1 min-h-[460px] w-full overflow-hidden">
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
                  {argoFloats.length} loaded sample profiles
                </div>
              )}
              {showGliders && (
                <div className="hud-badge rounded px-2 py-0.5 font-mono text-[10px] text-emerald-300 shadow bg-slate-900/90 border border-emerald-600 max-w-full" data-testid="hud-glider-badge">
                  <span className="text-emerald-400 font-semibold">GLIDERS:</span>{' '}
                  {gliderTransects.length} loaded sample missions
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
                title="Reset Camera to Indian Ocean"
              >
                ⟲ Reset View
              </button>
            </div>
          </div>

          {/* Controls Usage Hint */}
          <div className="viewport-controls-hint pointer-events-none absolute bottom-3 left-3 bg-slate-900/75 backdrop-blur border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono">
            Rotate: Left Click + Drag · Pan: Right Click · Zoom: Scroll Wheel
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
