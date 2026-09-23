import * as THREE from 'three';

/**
 * Ocean-Centric Digital Twin Globe Shader
 * 
 * Specifically engineered for oceanographic visualization:
 * 1. Prioritizes the OCEAN as the hero element (GEBCO bathymetric hypsometry).
 * 2. Subdues continental landmasses into sleek dark graphite with luminous coastlines.
 * 3. Infinite Zoom Clarity: Evaluates dynamic micro-wave normals, specular sun glint,
 *    and Fresnel water sheen in screen-space so zooming in retains razor-sharp detail.
 * 4. Dual View Styles: [0] Bathymetric Digital Twin, [1] Satellite Ocean.
 */

export const oceanGlobeVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const oceanGlobeFragmentShader = `
  uniform sampler2D uDayTexture;
  uniform sampler2D uBathymetryTexture;
  uniform sampler2D uNormalMap;
  uniform sampler2D uSpecularMap;
  uniform float uTime;
  uniform int uOceanStyle; // 0 = Bathymetric Digital Twin, 1 = Satellite Ocean
  uniform vec3 uSunDirection;
  uniform float uWaveIntensity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Simple, fast procedural micro-wave normal perturbation for infinite zoom clarity
  vec3 getProceduralWaveNormal(vec3 worldPos, vec3 baseNormal, float time) {
    // High-frequency dual wave coordinates
    float scale1 = 0.45;
    float scale2 = 1.15;
    
    float w1 = sin(worldPos.x * scale1 + time * 1.8) * cos(worldPos.z * scale1 + time * 1.2);
    float w2 = sin(worldPos.y * scale2 - time * 2.2) * cos(worldPos.x * scale2 + time * 1.6);
    float w3 = sin((worldPos.x + worldPos.z) * 0.8 + time * 2.5);
    
    vec3 waveOffset = vec3(
      (w1 + w3 * 0.5) * 0.06,
      (w2 + w1 * 0.5) * 0.06,
      (w3 + w2 * 0.5) * 0.06
    );
    
    return normalize(baseNormal + waveOffset * uWaveIntensity);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 sunDir = normalize(uSunDirection);

    // Exact Geographic Texture Alignment:
    // Three.js SphereGeometry places +Z (lon=0°) at vertex UV u = 0.25.
    // Standard equirectangular textures place lon=0° at U = 0.50.
    // texUv aligns the equirectangular textures 1:1 with geoToCartesian coordinates.
    vec2 texUv = vec2(fract(vUv.x + 0.25), vUv.y);

    // Sample textures with unified equirectangular UV
    vec4 dayTex = texture2D(uDayTexture, texUv);
    vec4 bathyTex = texture2D(uBathymetryTexture, texUv);
    vec4 specTex = texture2D(uSpecularMap, texUv);

    // Specular mask: 1.0 = ocean water, 0.0 = continental land
    float isWater = specTex.r;

    // 1. Calculate lighting components
    float NdotL = max(dot(normal, sunDir), 0.0);
    // Soft ambient wrap light for dark side (space visualization)
    float diffuse = mix(0.18, 1.0, NdotL);

    // 2. Base Surface Coloring
    vec3 surfaceColor;

    if (uOceanStyle == 0) {
      // --- BATHYMETRIC DIGITAL TWIN (OCEAN-CENTRIC HERO MODE) ---
      if (isWater > 0.15) {
        // Deep ocean bathymetric rendering
        // Use bathymetry texture as primary depth relief
        surfaceColor = bathyTex.rgb;

        // Subtle depth contour accentuation
        float depthVal = (bathyTex.r + bathyTex.g + bathyTex.b) / 3.0;
        float contour = abs(fract(depthVal * 8.0) - 0.5);
        if (contour < 0.06) {
          surfaceColor += vec3(0.04, 0.12, 0.20);
        }
      } else {
        // Subdued continental landmasses: Sleek dark graphite
        // Prevents land from stealing visual attention from the ocean
        vec3 darkLand = vec3(0.09, 0.12, 0.16);
        // Retain subtle topographic texture from satellite map
        float landLuma = dot(dayTex.rgb, vec3(0.299, 0.587, 0.114));
        surfaceColor = mix(darkLand, darkLand * 1.45, landLuma);

        // Luminous coastline edge glow
        float coastEdge = smoothstep(0.05, 0.35, isWater);
        if (coastEdge > 0.01 && coastEdge < 0.95) {
          surfaceColor = mix(surfaceColor, vec3(0.10, 0.75, 0.85), 0.55);
        }
      }
    } else {
      // --- SATELLITE OCEAN MODE ---
      if (isWater > 0.15) {
        // Enhance satellite ocean with bathymetric depth gradient
        surfaceColor = mix(dayTex.rgb, bathyTex.rgb, 0.65);
      } else {
        surfaceColor = dayTex.rgb;
      }
    }

    // 3. Water-Only Procedural Waves & Specular Highlights
    if (isWater > 0.2) {
      // Perturb normal for water only (dynamic micro-waves)
      vec3 waveNormal = getProceduralWaveNormal(vWorldPosition, normal, uTime);

      // Specular sun glint (Blinn-Phong)
      vec3 halfDir = normalize(sunDir + viewDir);
      float NdotH = max(dot(waveNormal, halfDir), 0.0);
      float specular = pow(NdotH, 64.0) * 1.6;

      // Fresnel reflection (water shines brightly at grazing angles)
      float fresnel = pow(1.0 - max(dot(waveNormal, viewDir), 0.0), 3.5);
      vec3 waterSpecularColor = vec3(0.85, 0.95, 1.0);

      // Apply lighting to water
      vec3 litWater = surfaceColor * diffuse;
      litWater += waterSpecularColor * (specular * NdotL + fresnel * 0.35);

      // Subtle atmospheric ocean haze
      litWater += vec3(0.02, 0.08, 0.15) * fresnel;

      gl_FragColor = vec4(litWater, 1.0);
    } else {
      // Matte land: No specular sun glint, diffuse only
      vec3 litLand = surfaceColor * diffuse;
      gl_FragColor = vec4(litLand, 1.0);
    }
  }
`;

/**
 * Creates the high-fidelity Ocean-Centric Globe Shader Material
 */
export function createOceanGlobeMaterial(textures, options = {}) {
  const sunDir = options.sunDirection ?? new THREE.Vector3(160, 130, 140).normalize();

  const uniforms = {
    uDayTexture: { value: textures.dayTexture },
    uBathymetryTexture: { value: textures.bathymetryTexture },
    uNormalMap: { value: textures.normalTexture },
    uSpecularMap: { value: textures.specularTexture },
    uTime: { value: 0.0 },
    uOceanStyle: { value: options.oceanStyle ?? 0 }, // 0: Bathymetric, 1: Satellite
    uSunDirection: { value: sunDir },
    uWaveIntensity: { value: options.waveIntensity ?? 0.65 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: oceanGlobeVertexShader,
    fragmentShader: oceanGlobeFragmentShader,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true
  });

  return material;
}
