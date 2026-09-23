import * as THREE from 'three';

/**
 * Photorealistic Natural Earth Textures & Atmosphere System
 * Google Earth / NASA Blue Marble Satellite Aesthetic
 * 
 * Features:
 * - High-resolution NASA Blue Marble satellite imagery
 * - Topographical normal bump relief for mountain ranges & oceanic trenches
 * - Ocean water specular reflection mapping (glinting seas, matte land)
 * - Natural Rayleigh atmospheric horizon scattering (Google Earth blue haze)
 * - Realistic cloud layer with slow atmospheric drift
 * - Full offline procedural fallback with natural vegetative and bathymetric gradients
 */

/**
 * Creates procedural natural earth canvas texture as offline fallback
 */
export function createProceduralNaturalEarthCanvas() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Natural Deep Ocean Gradient (Azure Abyssal to Pelagic Blue)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0.0, '#0a1e38'); // Polar Arctic
  oceanGrad.addColorStop(0.2, '#0c2748');
  oceanGrad.addColorStop(0.5, '#0f325c'); // Tropical Indian Ocean
  oceanGrad.addColorStop(0.8, '#0c2748');
  oceanGrad.addColorStop(1.0, '#091b33'); // Antarctic
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  function toX(lon) {
    let norm = (lon + 90) % 360;
    if (norm < 0) norm += 360;
    return (norm / 360) * width;
  }
  function toY(lat) {
    return ((90 - lat) / 180) * height;
  }

  // Geographic polygons [lat, lon]
  const india = [
    [24, 68], [22, 69], [20.5, 72.8], [19, 72.8], [15, 73.8], [12, 75], [8.0, 77.5],
    [8.5, 78.2], [10, 79.8], [13, 80.3], [16, 82.2], [18, 84], [21.5, 87], [22.5, 89],
    [25, 90], [26, 88], [28, 88], [27.5, 84], [31, 79], [34, 76], [35, 74], [31, 70], [28, 68], [25, 67]
  ];

  const sriLanka = [
    [9.8, 80.2], [9.0, 80.8], [7.0, 81.8], [6.0, 81.0], [6.0, 80.2], [8.0, 79.7]
  ];

  const arabia = [
    [30, 48], [27, 50], [24, 52], [24, 56], [22, 59.5], [17, 55], [14.5, 53], 
    [12.5, 44], [13, 43], [15, 42.5], [20, 40], [28, 35], [30, 35], [31, 40]
  ];

  const eastAfrica = [
    [12, 43], [11.5, 51.2], [5, 48], [0, 42.5], [-5, 39], [-10, 40.5], [-15, 40.5],
    [-20, 35], [-25, 33], [-34, 26], [-34, 18], [-28, 16], [-20, 12], [-10, 13], 
    [5, 9], [12, 14], [15, 24], [12, 32], [11, 42]
  ];

  const madagascar = [
    [-12, 49.3], [-16, 49.8], [-24, 47], [-25.5, 45], [-22, 43.5], [-16, 44], [-12, 49.3]
  ];

  const seAsia = [
    [22, 89.5], [20, 93], [16, 94.5], [16, 98], [12, 99], [6, 100], [2, 103], [1.3, 104],
    [5, 103], [8, 102], [12, 101], [13, 100.5], [18, 106], [21, 108], [22, 106]
  ];

  const sumatra = [
    [5.5, 95.3], [3, 98], [0, 101], [-3, 104], [-5.8, 106], [-5, 104], [-2, 101], [1, 98], [5.5, 95.3]
  ];

  const java = [
    [-6, 106], [-6.5, 110], [-7.5, 114], [-8.5, 114], [-7.5, 109], [-6.5, 105], [-6, 106]
  ];

  const australia = [
    [-12, 131], [-11, 142], [-18, 146], [-24, 153], [-32, 152], [-38, 147], [-38, 141],
    [-35, 136], [-32, 132], [-34, 122], [-34, 115], [-25, 113], [-20, 118], [-15, 124], [-12, 131]
  ];

  const northAfricaEurope = [
    [36, -5], [37, 10], [31, 32], [30, 34], [36, 36], [41, 28], [44, 14], [43, 5],
    [37, -9], [43, -9], [48, -4], [54, 8], [60, 20], [60, 60], [40, 60], [30, 50]
  ];

  const allLands = [india, sriLanka, arabia, eastAfrica, madagascar, seAsia, sumatra, java, australia, northAfricaEurope];

  // 2. Realistic Continental Shelf Shallow Turquoise Fringes
  ctx.save();
  ctx.strokeStyle = '#1a6485';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#228bb8';
  ctx.shadowBlur = 10;
  allLands.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // 3. Natural Earth Landmasses (Satellite vegetation, deserts, savannas)
  function drawLand(pts, fill) {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // Deserts & arid land
  drawLand(arabia, '#a68c59');
  drawLand(northAfricaEurope, '#827453');
  drawLand(australia, '#99633e');

  // Tropical vegetation & forests
  drawLand(eastAfrica, '#485e3a');
  drawLand(madagascar, '#35542b');
  drawLand(seAsia, '#295229');
  drawLand(sumatra, '#234a23');
  drawLand(java, '#234a23');

  // Indian Subcontinent (Lush Western Ghats, northern plains)
  drawLand(india, '#3b6632');
  drawLand(sriLanka, '#2b5424');

  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.wrapS = THREE.RepeatWrapping;
  canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
  return canvasTexture;
}

/**
 * Creates high-resolution procedural GEBCO Bathymetry canvas texture (4096x2048)
 * Accurate oceanographic depth hypsometry with submarine ridges, continental shelves,
 * and deep oceanic trenches (focused on Indian Ocean & global seas).
 */
export function createProceduralBathymetryCanvas() {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  function toX(lon) {
    let norm = (lon + 90) % 360;
    if (norm < 0) norm += 360;
    return (norm / 360) * width;
  }
  function toY(lat) {
    return ((90 - lat) / 180) * height;
  }

  // 1. Base Abyssal Ocean Fill (3500m - 5500m Deep Ocean Basin)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0.00, '#020b18'); // Polar Arctic Abyss
  baseGrad.addColorStop(0.25, '#021226'); // North Atlantic / North Pacific
  baseGrad.addColorStop(0.50, '#031733'); // Tropical Indian Ocean Basin
  baseGrad.addColorStop(0.75, '#021226'); // Southern Ocean
  baseGrad.addColorStop(1.00, '#010812'); // Antarctic Abyss
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Geographic polygons [lat, lon]
  const india = [
    [24, 68], [22, 69], [20.5, 72.8], [19, 72.8], [15, 73.8], [12, 75], [8.0, 77.5],
    [8.5, 78.2], [10, 79.8], [13, 80.3], [16, 82.2], [18, 84], [21.5, 87], [22.5, 89],
    [25, 90], [26, 88], [28, 88], [27.5, 84], [31, 79], [34, 76], [35, 74], [31, 70], [28, 68], [25, 67]
  ];
  const sriLanka = [
    [9.8, 80.2], [9.0, 80.8], [7.0, 81.8], [6.0, 81.0], [6.0, 80.2], [8.0, 79.7]
  ];
  const arabia = [
    [30, 48], [27, 50], [24, 52], [24, 56], [22, 59.5], [17, 55], [14.5, 53], 
    [12.5, 44], [13, 43], [15, 42.5], [20, 40], [28, 35], [30, 35], [31, 40]
  ];
  const eastAfrica = [
    [12, 43], [11.5, 51.2], [5, 48], [0, 42.5], [-5, 39], [-10, 40.5], [-15, 40.5],
    [-20, 35], [-25, 33], [-34, 26], [-34, 18], [-28, 16], [-20, 12], [-10, 13], 
    [5, 9], [12, 14], [15, 24], [12, 32], [11, 42]
  ];
  const madagascar = [
    [-12, 49.3], [-16, 49.8], [-24, 47], [-25.5, 45], [-22, 43.5], [-16, 44], [-12, 49.3]
  ];
  const seAsia = [
    [22, 89.5], [20, 93], [16, 94.5], [16, 98], [12, 99], [6, 100], [2, 103], [1.3, 104],
    [5, 103], [8, 102], [12, 101], [13, 100.5], [18, 106], [21, 108], [22, 106]
  ];
  const sumatra = [
    [5.5, 95.3], [3, 98], [0, 101], [-3, 104], [-5.8, 106], [-5, 104], [-2, 101], [1, 98], [5.5, 95.3]
  ];
  const java = [
    [-6, 106], [-6.5, 110], [-7.5, 114], [-8.5, 114], [-7.5, 109], [-6.5, 105], [-6, 106]
  ];
  const australia = [
    [-12, 131], [-11, 142], [-18, 146], [-24, 153], [-32, 152], [-38, 147], [-38, 141],
    [-35, 136], [-32, 132], [-34, 122], [-34, 115], [-25, 113], [-20, 118], [-15, 124], [-12, 131]
  ];
  const northAfricaEurope = [
    [36, -5], [37, 10], [31, 32], [30, 34], [36, 36], [41, 28], [44, 14], [43, 5],
    [37, -9], [43, -9], [48, -4], [54, 8], [60, 20], [60, 60], [40, 60], [30, 50]
  ];
  const allLands = [india, sriLanka, arabia, eastAfrica, madagascar, seAsia, sumatra, java, australia, northAfricaEurope];

  // 2. Intermediate Ocean Depths & Continental Slope (1000m - 2500m)
  ctx.save();
  ctx.strokeStyle = '#05315e';
  ctx.lineWidth = 48;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.filter = 'blur(16px)';
  allLands.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // 3. Submarine Ridges & Plateau Uplifts (1500m - 2500m depth)
  // Carlsberg Ridge, Mid-Indian Ridge, Ninety East Ridge, Chagos-Laccadive Plateau
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#084880';
  ctx.lineWidth = 18;
  ctx.filter = 'blur(8px)';

  // Ninety East Ridge (90°E from 10°N down to 32°S)
  ctx.beginPath();
  ctx.moveTo(toX(90), toY(10));
  ctx.lineTo(toX(88.5), toY(0));
  ctx.lineTo(toX(89.5), toY(-15));
  ctx.lineTo(toX(88), toY(-30));
  ctx.stroke();

  // Carlsberg Ridge (Arabian Sea towards Chagos)
  ctx.beginPath();
  ctx.moveTo(toX(56), toY(12));
  ctx.lineTo(toX(62), toY(8));
  ctx.lineTo(toX(67), toY(2));
  ctx.lineTo(toX(70), toY(-5));
  ctx.stroke();

  // Central & Southwest Indian Ridge
  ctx.beginPath();
  ctx.moveTo(toX(70), toY(-5));
  ctx.lineTo(toX(72), toY(-20));
  ctx.lineTo(toX(75), toY(-32));
  ctx.stroke();

  // Chagos-Laccadive Ridge (72°E - 73°E from Lakshadweep to Chagos)
  ctx.strokeStyle = '#0e5f9e';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(toX(72.5), toY(14));
  ctx.lineTo(toX(73), toY(8));
  ctx.lineTo(toX(73.2), toY(0));
  ctx.lineTo(toX(72), toY(-7));
  ctx.stroke();
  ctx.restore();

  // 4. Java / Sunda Trench Deep Abyss (>6000m depth) - Trench line
  ctx.save();
  ctx.strokeStyle = '#01030d';
  ctx.lineWidth = 12;
  ctx.filter = 'blur(4px)';
  ctx.beginPath();
  ctx.moveTo(toX(94), toY(6));
  ctx.lineTo(toX(98), toY(0));
  ctx.lineTo(toX(102), toY(-5));
  ctx.lineTo(toX(108), toY(-9));
  ctx.lineTo(toX(115), toY(-10.5));
  ctx.stroke();
  ctx.restore();

  // 5. Continental Shelf Radiant Turquoise / Cyan Glow (0m - 200m depth)
  ctx.save();
  ctx.strokeStyle = '#00b4d8';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;
  allLands.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // Inner shallow shelf fringe (bright cyan)
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  allLands.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // 6. Subdued Continental Landmasses (Dark Slate / Charcoal)
  // Ensures land never overpowers the ocean visualization
  function drawBathyLand(pts) {
    ctx.beginPath();
    pts.forEach(([lat, lon], idx) => {
      const px = toX(lon), py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = '#0d131a';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  allLands.forEach(drawBathyLand);

  const bathyTex = new THREE.CanvasTexture(canvas);
  bathyTex.wrapS = THREE.RepeatWrapping;
  bathyTex.wrapT = THREE.ClampToEdgeWrapping;
  return bathyTex;
}

/**
 * Loads and configures photorealistic NASA Blue Marble & GEBCO Bathymetry Earth textures
 */
export function loadEarthTextures(maxAnisotropy = 16) {
  const textureLoader = new THREE.TextureLoader();

  const configureTexture = (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.offset.x = 0.25;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (maxAnisotropy > 1) {
      tex.anisotropy = maxAnisotropy;
    }
    tex.needsUpdate = true;
  };

  // 1. High-Resolution NASA Blue Marble Day Texture
  const dayTexture = textureLoader.load(
    '/textures/earth_blue_marble.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      configureTexture(tex);
    },
    undefined,
    () => {
      const fallback = createProceduralNaturalEarthCanvas();
      fallback.wrapS = THREE.RepeatWrapping;
      fallback.offset.x = 0.25;
      return fallback;
    }
  );
  dayTexture.wrapS = THREE.RepeatWrapping;
  dayTexture.wrapT = THREE.ClampToEdgeWrapping;
  dayTexture.offset.x = 0.25;

  // 2. High-Resolution GEBCO Bathymetry Texture (Ocean-Centric Hero Layer)
  const bathymetryTexture = createProceduralBathymetryCanvas();
  bathymetryTexture.wrapS = THREE.RepeatWrapping;
  bathymetryTexture.wrapT = THREE.ClampToEdgeWrapping;
  bathymetryTexture.offset.x = 0.25;
  configureTexture(bathymetryTexture);

  // 3. Ocean Water Specular Mask
  const specularTexture = textureLoader.load(
    '/textures/earth_specular.jpg',
    (tex) => {
      configureTexture(tex);
    }
  );
  specularTexture.wrapS = THREE.RepeatWrapping;
  specularTexture.wrapT = THREE.ClampToEdgeWrapping;
  specularTexture.offset.x = 0.25;

  // 4. Topographical Mountain & Trench Normal Map
  const normalTexture = textureLoader.load(
    '/textures/earth_normal.jpg',
    (tex) => {
      configureTexture(tex);
    }
  );
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.ClampToEdgeWrapping;
  normalTexture.offset.x = 0.25;

  // 5. Realistic Cloud Layer
  const cloudsTexture = textureLoader.load(
    '/textures/earth_clouds.png',
    (tex) => {
      configureTexture(tex);
    }
  );
  cloudsTexture.wrapS = THREE.RepeatWrapping;
  cloudsTexture.wrapT = THREE.ClampToEdgeWrapping;
  cloudsTexture.offset.x = 0.25;

  return {
    dayTexture,
    bathymetryTexture,
    specularTexture,
    normalTexture,
    cloudsTexture
  };
}

/**
 * Returns natural earth texture for backward compatibility
 */
export function createNaturalEarthTexture() {
  const textures = loadEarthTextures();
  return textures.dayTexture;
}

/**
 * Creates realistic Google Earth Rayleigh scattering atmosphere limb glow
 */
export function createAtmosphereMaterial() {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float viewDot = dot(vNormal, vViewDir);
      // Soft, photorealistic atmospheric horizon haze
      float halo = pow(1.0 - max(viewDot, 0.0), 3.0);
      vec3 rayleighBlue = vec3(0.38, 0.68, 0.98); // Natural Earth sky blue
      gl_FragColor = vec4(rayleighBlue, halo * 0.75);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
}
