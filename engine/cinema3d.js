/**
 * Motor 3D Cel-Shaded Cinematográfico (Three.js r149 WebGL + Toon Shading + Contornos Ink).
 * Compone la escena 3D en tiempo real y exportación Full HD 1080p sobre el lienzo HTML5,
 * manteniendo sincronización determinista basada únicamente en (sceneTime, globalTime).
 */
(() => {
const NS = window.StickmanStudio = window.StickmanStudio || {};
const THREE = window.THREE;
const H = NS._hudHelpers;

if (!THREE || !H) {
  NS.is3DActive = false;
  return;
}

const {
  MOOD_PALETTES,
  WORLD_PROP_TYPES,
  clamp,
  lerp,
  easeInOut,
  reframeSceneForVertical,
  drawOverlayProp,
  drawInteractiveSpotlight,
  drawTypographyAndHUD
} = H;

/* ─────────────────────────── WEBGL & SHARED ASSETS ─────────────────────────── */

let glCanvas = null;
let renderer = null;
let curW = 0;
let curH = 0;
let webglBroken = false;

let sharedGradTex = null;
let sharedOutlineMatCache = new Map();
let activeSceneCache = null; // { key, threeScene, env, actors, lights, cameraRig }

const SKY_TEXTURES = new Map();

function ensureRenderer(outW, outH) {
  if (webglBroken) return false;
  if (!renderer) {
    try {
      glCanvas = document.createElement('canvas');
      glCanvas.width = outW;
      glCanvas.height = outH;
      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      curW = outW;
      curH = outH;
      NS.is3DActive = true;
    } catch (err) {
      console.warn('[Cinema3D] WebGL no disponible, usando motor 2D:', err);
      webglBroken = true;
      NS.is3DActive = false;
      return false;
    }
  }
  if (curW !== outW || curH !== outH) {
    curW = outW;
    curH = outH;
    renderer.setSize(outW, outH, false);
  }
  return true;
}

function getToonGradient() {
  if (sharedGradTex) return sharedGradTex;
  // Formato RGBA 4x1 con filtro Nearest para bandas cel-shaded limpias en WebGL1/WebGL2
  const bands = new Uint8Array([
    68, 68, 68, 255,
    126, 126, 126, 255,
    196, 196, 196, 255,
    255, 255, 255, 255
  ]);
  sharedGradTex = new THREE.DataTexture(bands, 4, 1, THREE.RGBAFormat);
  sharedGradTex.minFilter = THREE.NearestFilter;
  sharedGradTex.magFilter = THREE.NearestFilter;
  sharedGradTex.generateMipmaps = false;
  sharedGradTex.needsUpdate = true;
  return sharedGradTex;
}

function getOutlineMat(color = 0x090d16, opacity = 1) {
  const key = `${color}_${opacity}`;
  if (sharedOutlineMatCache.has(key)) return sharedOutlineMatCache.get(key);
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    transparent: opacity < 1,
    opacity
  });
  sharedOutlineMatCache.set(key, mat);
  return mat;
}

function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: Boolean(opts.transparent || (opts.opacity !== undefined && opts.opacity < 1)),
    opacity: opts.opacity ?? 1
  });
}

function metalMat(color, metalness = 0.72, roughness = 0.28, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0
  });
}

function addInkOutline(mesh, thickness = 0.022, color = 0x090d16) {
  if (!mesh.geometry) return mesh;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox;
  const sx = Math.max(0.05, bb.max.x - bb.min.x);
  const sy = Math.max(0.05, bb.max.y - bb.min.y);
  const sz = Math.max(0.05, bb.max.z - bb.min.z);
  const outline = new THREE.Mesh(mesh.geometry, getOutlineMat(color));
  outline.scale.set(
    1 + (thickness * 2) / sx,
    1 + (thickness * 2) / sy,
    1 + (thickness * 2) / sz
  );
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.userData.isOutline = true;
  mesh.add(outline);
  return mesh;
}

function createSkyTexture(topHex, midHex, botHex, hasSunGlow = false, sunColor = '#fde68a') {
  const key = `${topHex}_${midHex}_${botHex}_${hasSunGlow}_${sunColor}`;
  if (SKY_TEXTURES.has(key)) return SKY_TEXTURES.get(key);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const gctx = c.getContext('2d');
  const grad = gctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.56, midHex);
  grad.addColorStop(1, botHex);
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 512, 512);
  if (hasSunGlow) {
    const sg = gctx.createRadialGradient(256, 360, 12, 256, 360, 260);
    sg.addColorStop(0, sunColor);
    sg.addColorStop(0.45, 'rgba(251, 146, 60, 0.35)');
    sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gctx.fillStyle = sg;
    gctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  SKY_TEXTURES.set(key, tex);
  return tex;
}

function disposeObject3D(root) {
  if (!root) return;
  const kept = sharedGradTex;
  root.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
    for (const m of mats) {
      if (!m || m === getOutlineMat(0x090d16) || sharedOutlineMatCache.has(m)) continue;
      if (m.map && m.map !== kept && !SKY_TEXTURES.has(m.map)) {
        // Keep shared sky textures cached; dispose dynamic canvas textures if any
        let isSky = false;
        SKY_TEXTURES.forEach((v) => { if (v === m.map) isSky = true; });
        if (!isSky && typeof m.map.dispose === 'function') m.map.dispose();
      }
      if (typeof m.dispose === 'function') m.dispose();
    }
  });
}

/* ─────────────────────────── POSE & KEYFRAME MATH ─────────────────────────── */

function resolveActorFrame(actor, sceneTime, sceneDuration, index, interactive) {
  const kfs = actor.keyframes || [{ t: 0, x: 0.5, y: 0.74, pose: 'idle', facing: 1, expr: 'neutral', prop: 'none' }];
  const dur = Math.max(0.1, sceneDuration || 8);
  const tNorm = clamp(sceneTime / dur, 0, 1);

  let a = kfs[0];
  let b = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (tNorm >= kfs[i].t && tNorm <= kfs[i + 1].t) {
      a = kfs[i];
      b = kfs[i + 1];
      break;
    }
  }
  if (tNorm >= kfs[kfs.length - 1].t) {
    a = kfs[kfs.length - 1];
    b = kfs[kfs.length - 1];
  }

  const span = Math.max(0.0001, b.t - a.t);
  const localT = clamp((tNorm - a.t) / span, 0, 1);
  const smoothT = easeInOut(localT);

  const override = interactive?.overrides?.[actor.id];
  const baseX = override ? override.x : lerp(a.x ?? 0.5, b.x ?? a.x ?? 0.5, smoothT);
  const baseY = override ? override.y : lerp(a.y ?? 0.74, b.y ?? a.y ?? 0.74, smoothT);
  const defaultZ = (index % 2 === 0 ? 0.15 : -0.35) + Math.floor(index / 2) * 0.45;
  const baseZ = lerp(a.z ?? defaultZ, b.z ?? a.z ?? defaultZ, smoothT);

  const curKf = localT < 0.5 ? a : b;
  const pose = curKf.pose || 'idle';
  const facing = (curKf.facing ?? 1) < 0 ? -1 : 1;
  const expr = curKf.expr || (actor.role === 'shadow' ? 'empty_eyes' : 'neutral');
  const prop = curKf.prop || 'none';
  const speaking = Boolean(curKf.speaking);
  const speed = curKf.walkSpeed || 1;
  const alpha = lerp(a.alpha ?? 1, b.alpha ?? 1, smoothT);

  return {
    x: baseX,
    y: baseY,
    z: baseZ,
    pose,
    facing,
    expr,
    prop,
    speaking,
    speed,
    alpha: pose === 'vanish' ? alpha * Math.max(0, 1 - localT * 1.1) : alpha
  };
}

function getPoseAngles3D(pose, time, speed = 1) {
  const breathe = Math.sin(time * 2.5) * 0.035;
  const state = {
    bodyLean: Math.sin(time * 1.4) * 0.02,
    headTilt: Math.sin(time * 1.9) * 0.04,
    headYaw: 0,
    bobY: breathe * 0.4,
    lShoulderX: 0.18 + Math.sin(time * 2.0) * 0.04,
    lShoulderZ: 0.14,
    lElbowX: 0.32,
    rShoulderX: -0.16 - Math.sin(time * 2.0) * 0.04,
    rShoulderZ: -0.14,
    rElbowX: 0.34,
    lHipX: 0.04,
    lKneeX: -0.06,
    rHipX: -0.04,
    rKneeX: -0.06,
    wholeTiltZ: 0,
    jitter: 0
  };

  switch (pose) {
    case 'walk': {
      const w = time * 6.8 * speed;
      const swing = Math.sin(w) * 0.62;
      const kneeL = Math.max(0, -Math.sin(w + 0.85)) * 0.78;
      const kneeR = Math.max(0, Math.sin(w + 0.85)) * 0.78;
      return {
        ...state,
        bodyLean: 0.12 + Math.sin(w * 2) * 0.03,
        bobY: Math.abs(Math.sin(w)) * 0.06,
        lShoulderX: -swing * 0.75,
        lElbowX: 0.52,
        rShoulderX: swing * 0.75,
        rElbowX: 0.52,
        lHipX: swing,
        lKneeX: -kneeL,
        rHipX: -swing,
        rKneeX: -kneeR
      };
    }
    case 'run': {
      const w = time * 11.2 * speed;
      const swing = Math.sin(w) * 0.92;
      const kneeL = Math.max(0, -Math.sin(w + 0.95)) * 1.15;
      const kneeR = Math.max(0, Math.sin(w + 0.95)) * 1.15;
      return {
        ...state,
        bodyLean: 0.34 + Math.sin(w * 2) * 0.04,
        headTilt: -0.14,
        bobY: Math.abs(Math.sin(w)) * 0.11,
        lShoulderX: -swing * 0.9,
        lElbowX: 1.15,
        rShoulderX: swing * 0.9,
        rElbowX: 1.15,
        lHipX: swing,
        lKneeX: -kneeL,
        rHipX: -swing,
        rKneeX: -kneeR
      };
    }
    case 'talk': {
      const g1 = Math.sin(time * 7.2);
      const g2 = Math.cos(time * 5.4);
      return {
        ...state,
        bodyLean: 0.06 + g1 * 0.04,
        headTilt: g2 * 0.10,
        headYaw: g1 * 0.08,
        bobY: Math.abs(g1) * 0.025,
        lShoulderX: 0.55 + g1 * 0.35,
        lShoulderZ: 0.25,
        lElbowX: 0.75 + g2 * 0.35,
        rShoulderX: 0.65 - g2 * 0.35,
        rShoulderZ: -0.22,
        rElbowX: 0.85 + g1 * 0.3
      };
    }
    case 'point': {
      return {
        ...state,
        bodyLean: 0.10,
        rShoulderX: 1.48,
        rShoulderZ: -0.1,
        rElbowX: 0.08,
        lShoulderX: -0.2,
        lElbowX: 0.45
      };
    }
    case 'point_up': {
      return {
        ...state,
        bodyLean: -0.06,
        headTilt: -0.26,
        rShoulderX: 2.35,
        rShoulderZ: -0.25,
        rElbowX: 0.12,
        lShoulderX: 0.12,
        lElbowX: 0.4
      };
    }
    case 'insert_disk': {
      const lift = Math.sin(time * 3.0) * 0.06;
      return {
        ...state,
        bodyLean: 0.14,
        headTilt: -0.14,
        lShoulderX: 1.45 + lift,
        lShoulderZ: -0.22,
        lElbowX: 0.35,
        rShoulderX: 1.45 + lift,
        rShoulderZ: 0.22,
        rElbowX: 0.35
      };
    }
    case 'hold_torch': {
      return {
        ...state,
        bodyLean: 0.06,
        rShoulderX: 0.68 + Math.sin(time * 3.0) * 0.05,
        rShoulderZ: -0.18,
        rElbowX: 0.85,
        lShoulderX: -0.18,
        lElbowX: 0.5
      };
    }
    case 'inspect': {
      return {
        ...state,
        bodyLean: 0.24,
        headTilt: 0.22,
        rShoulderX: 0.92 + Math.sin(time * 3.4) * 0.08,
        rElbowX: 0.65,
        lShoulderX: 0.35,
        lElbowX: 0.9,
        lHipX: 0.18,
        lKneeX: -0.35,
        rHipX: -0.14
      };
    }
    case 'kneel': {
      return {
        ...state,
        bobY: -0.38,
        bodyLean: 0.22,
        headTilt: -0.1,
        lHipX: 1.15,
        lKneeX: -1.45,
        rHipX: -0.25,
        rKneeX: -1.15,
        lShoulderX: 0.85,
        lElbowX: 0.4,
        rShoulderX: 0.95,
        rElbowX: 0.45
      };
    }
    case 'gasp': {
      return {
        ...state,
        bodyLean: -0.16,
        headTilt: -0.15,
        bobY: 0.04,
        lShoulderX: 1.35,
        lShoulderZ: 0.45,
        lElbowX: 1.1,
        rShoulderX: 1.35,
        rShoulderZ: -0.45,
        rElbowX: 1.1,
        jitter: 0.015
      };
    }
    case 'scared':
    case 'shiver': {
      const shiv = Math.sin(time * 28) * 0.06;
      return {
        ...state,
        bodyLean: -0.1 + shiv,
        headTilt: 0.08 + Math.cos(time * 24) * 0.06,
        lShoulderX: 0.85,
        lShoulderZ: 0.2,
        lElbowX: 1.35,
        rShoulderX: 0.85,
        rShoulderZ: -0.2,
        rElbowX: 1.35,
        lHipX: 0.12,
        lKneeX: -0.24,
        rHipX: -0.06,
        rKneeX: -0.22,
        jitter: 0.025
      };
    }
    case 'cover_ears': {
      return {
        ...state,
        bodyLean: 0.14,
        headTilt: 0.16,
        lShoulderX: 1.65,
        lShoulderZ: 0.35,
        lElbowX: 1.85,
        rShoulderX: 1.65,
        rShoulderZ: -0.35,
        rElbowX: 1.85,
        jitter: 0.02
      };
    }
    case 'wave': {
      const wv = Math.sin(time * 9.5) * 0.42;
      return {
        ...state,
        bodyLean: -0.05,
        rShoulderX: 2.35,
        rShoulderZ: -0.4 + wv,
        rElbowX: 0.45 + wv * 0.5,
        lShoulderX: 0.12,
        lElbowX: 0.3
      };
    }
    case 'climb': {
      const c = time * 6.0;
      const a = Math.sin(c) * 0.55;
      return {
        ...state,
        bodyLean: 0.38,
        bobY: Math.abs(Math.sin(c)) * 0.07,
        lShoulderX: 1.45 + a,
        lElbowX: 0.75,
        rShoulderX: 1.45 - a,
        rElbowX: 0.75,
        lHipX: 0.65 - a * 0.7,
        lKneeX: -0.95,
        rHipX: 0.65 + a * 0.7,
        rKneeX: -0.95
      };
    }
    case 'fallen': {
      return {
        ...state,
        wholeTiltZ: 1.38,
        bobY: -0.74,
        lShoulderX: 0.9,
        rShoulderX: -0.4,
        lKneeX: -0.45,
        rKneeX: -0.3
      };
    }
    case 'shadow_lurk':
    case 'vanish': {
      return {
        ...state,
        bodyLean: 0.14,
        bobY: Math.sin(time * 2.2) * 0.12 + 0.08,
        lShoulderX: 0.45 + Math.sin(time * 1.8) * 0.12,
        lShoulderZ: 0.25,
        rShoulderX: 0.55 + Math.cos(time * 1.8) * 0.12,
        rShoulderZ: -0.25
      };
    }
    default:
      return state;
  }
}

/* ─────────────────────────── 3D CEL-SHADED CHARACTER RIG ─────────────────────────── */

function buildHandProp3D(propType) {
  const g = new THREE.Group();
  if (!propType || propType === 'none') return g;

  if (propType === 'solar_disk') {
    const diskMesh = addInkOutline(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.045, 24),
        metalMat(0xfbbf24, 0.78, 0.22, { emissive: 0xd97706, emissiveIntensity: 0.45 })
      ),
      0.016
    );
    diskMesh.rotation.x = Math.PI / 2;
    g.add(diskMesh);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.02, 8, 20),
      metalMat(0x38bdf8, 0.4, 0.25, { emissive: 0x0284c7, emissiveIntensity: 0.85 })
    );
    innerRing.position.z = 0.028;
    g.add(innerRing);

    const rayGeo = new THREE.ConeGeometry(0.036, 0.11, 6);
    const rayMat = metalMat(0xfde047, 0.75, 0.25, { emissive: 0xf59e0b, emissiveIntensity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = new THREE.Mesh(rayGeo, rayMat);
      r.position.set(Math.cos(ang) * 0.27, Math.sin(ang) * 0.27, 0);
      r.rotation.z = ang - Math.PI / 2;
      g.add(r);
    }

    const pLight = new THREE.PointLight(0xfbbf24, 1.8, 5.5);
    pLight.position.set(0, 0, 0.25);
    g.add(pLight);
    g.position.set(0, 0.04, 0.18);
    return g;
  }

  if (propType === 'torch') {
    const stick = addInkOutline(
      new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.46, 10), toonMat(0x573b26)),
      0.012
    );
    stick.position.y = 0.18;
    g.add(stick);

    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.30, 12),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.92 })
    );
    outerFlame.position.y = 0.50;
    outerFlame.name = 'torchFlameOuter';
    g.add(outerFlame);

    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.20, 10),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    innerFlame.position.y = 0.47;
    innerFlame.name = 'torchFlameInner';
    g.add(innerFlame);

    const fireLight = new THREE.PointLight(0xff7b24, 2.3, 6.8);
    fireLight.position.set(0, 0.54, 0.08);
    fireLight.name = 'torchLight';
    g.add(fireLight);
    return g;
  }

  if (propType === 'flashlight') {
    const body = addInkOutline(
      new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.22, 12), metalMat(0x334155, 0.6, 0.35)),
      0.01
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.08;
    g.add(body);

    const bulb = new THREE.Mesh(
      new THREE.CircleGeometry(0.038, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    bulb.position.z = 0.195;
    g.add(bulb);

    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 2.7, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef3c7,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.z = 1.54;
    g.add(beam);

    const light = new THREE.PointLight(0xfef3c7, 1.5, 5.2);
    light.position.set(0, 0, 0.55);
    g.add(light);
    return g;
  }

  if (propType === 'scanner' || propType === 'geiger_wand') {
    const dev = addInkOutline(
      new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.07), toonMat(0x1e293b)),
      0.012
    );
    dev.position.set(0, 0.04, 0.10);
    g.add(dev);
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.10, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    scr.position.set(0, 0.08, 0.138);
    g.add(scr);
    const scanBeam = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 1.35, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    scanBeam.rotation.x = -Math.PI / 2;
    scanBeam.position.set(0, 0.04, 0.82);
    scanBeam.name = 'scanCone';
    g.add(scanBeam);
    return g;
  }

  if (propType === 'compass') {
    const casing = addInkOutline(
      new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 18), metalMat(0xf59e0b, 0.72, 0.25)),
      0.01
    );
    casing.rotation.x = 0.8;
    casing.position.set(0, 0.02, 0.10);
    g.add(casing);
    return g;
  }

  if (propType === 'camera') {
    const camBody = addInkOutline(
      new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.10), toonMat(0x1e293b)),
      0.01
    );
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.07, 14),
      metalMat(0x94a3b8, 0.7, 0.25)
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.07;
    camBody.add(lens);
    camBody.position.set(0, 0.04, 0.12);
    g.add(camBody);
    return g;
  }

  if (propType === 'clipboard' || propType === 'passport') {
    const color = propType === 'passport' ? 0x7f1d1d : 0x78350f;
    const board = addInkOutline(
      new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.025), toonMat(color)),
      0.01
    );
    board.position.set(0, 0.05, 0.11);
    board.rotation.x = -0.35;
    g.add(board);
    return g;
  }

  return g;
}

function createCharacterRig3D(actor, index) {
  const isShadow = actor.role === 'shadow';
  const outfit = isShadow ? 'shadow' : (actor.outfit || 'explorer');
  const root = new THREE.Group();
  root.scale.setScalar(actor.scale || 1.0);

  // Palette por rol/vestimenta
  const skinColor = isShadow ? 0x1e1b4b : (actor.skin || (outfit === 'conquistador' ? 0xf3cbb0 : 0xd99f77));
  const ponchoDefault = index % 2 === 0 ? 0xb91c1c : 0x0f766e;
  const jacketColor = actor.color ? new THREE.Color(actor.color) : new THREE.Color(
    outfit === 'inca_priest' ? 0x991b1b :
    outfit === 'conquistador' ? 0x94a3b8 :
    outfit === 'guide' || outfit === 'andean' ? ponchoDefault :
    outfit === 'forensic' || outfit === 'scientist' ? 0xf1f5f9 :
    outfit === 'detective' ? 0x334155 : 0xd97706
  );

  const skinM = isShadow ? toonMat(0x130f26, { opacity: 0.78 }) : toonMat(skinColor);
  const clothM = outfit === 'conquistador'
    ? metalMat(0x94a3b8, 0.75, 0.30)
    : isShadow
      ? toonMat(0x191233, { opacity: 0.78 })
      : toonMat(jacketColor);
  const pantsColor = outfit === 'inca_priest' ? 0x451a03 :
    outfit === 'conquistador' ? 0x475569 :
    outfit === 'guide' || outfit === 'andean' ? 0x292524 : 0x1e293b;
  const pantsM = isShadow ? toonMat(0x130f26, { opacity: 0.78 }) : toonMat(pantsColor);
  const bootM = toonMat(outfit === 'inca_priest' ? 0x78350f : 0x1c1917);
  const goldM = metalMat(0xfbbf24, 0.78, 0.22, { emissive: 0x92400e, emissiveIntensity: 0.25 });

  // Pelvis / Hips pivot (at y = 0.88 above floor)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.88;
  root.add(bodyPivot);

  const torsoGroup = new THREE.Group();
  bodyPivot.add(torsoGroup);

  // Pelvis sphere
  const pelvis = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 12), pantsM), 0.018);
  pelvis.scale.set(1.05, 0.72, 0.86);
  torsoGroup.add(pelvis);

  // Legs builder (with hip -> thigh -> knee -> shin -> boot)
  const makeLeg = (sideSign) => {
    const hip = new THREE.Group();
    hip.position.set(sideSign * 0.11, -0.04, 0);
    bodyPivot.add(hip);

    const thigh = addInkOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.24, 6, 12), pantsM), 0.016);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.39;
    hip.add(knee);

    const shin = addInkOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 6, 12), pantsM), 0.015);
    shin.position.y = -0.19;
    shin.castShadow = true;
    knee.add(shin);

    const boot = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.25), bootM), 0.014);
    boot.position.set(0, -0.39, 0.045);
    boot.castShadow = true;
    knee.add(boot);

    return { hip, knee };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Sculpted Torso / Jacket / Poncho / Uncu / Cuirass
  const chest = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.56, 16), clothM), 0.02);
  chest.scale.set(1.05, 1, 0.76);
  chest.position.y = 0.29;
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Outfit-specific 3D garments
  if (outfit === 'guide' || outfit === 'andean') {
    const poncho = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.44, 0.60, 20, 1, false), clothM), 0.018);
    poncho.scale.set(1.02, 1, 0.72);
    poncho.position.y = 0.25;
    poncho.castShadow = true;
    torsoGroup.add(poncho);

    const stripeGold = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.38, 0.07, 20, 1, false), toonMat(0xfbbf24));
    stripeGold.scale.set(1.025, 1, 0.725);
    stripeGold.position.y = 0.06;
    torsoGroup.add(stripeGold);

    const stripeCyan = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.325, 0.055, 20, 1, false), toonMat(0x06b6d4));
    stripeCyan.scale.set(1.025, 1, 0.725);
    stripeCyan.position.y = 0.14;
    torsoGroup.add(stripeCyan);
  } else if (outfit === 'inca_priest') {
    const uncu = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.30, 0.76, 18), toonMat(0x991b1b)), 0.018);
    uncu.scale.set(1.05, 1, 0.78);
    uncu.position.y = 0.14;
    uncu.castShadow = true;
    torsoGroup.add(uncu);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.265, 0.09, 18), goldM);
    belt.scale.set(1.06, 1, 0.79);
    belt.position.y = 0.03;
    torsoGroup.add(belt);

    const pectoral = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 18), goldM);
    pectoral.rotation.x = Math.PI / 2;
    pectoral.position.set(0, 0.38, 0.175);
    torsoGroup.add(pectoral);

    const cape = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.78, 0.045), toonMat(0x78350f)), 0.015);
    cape.position.set(0, 0.16, -0.19);
    cape.rotation.x = 0.12;
    torsoGroup.add(cape);
  } else if (outfit === 'conquistador') {
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.32), toonMat(0xb91c1c));
    sash.position.set(0, 0.05, 0);
    sash.rotation.z = -0.15;
    torsoGroup.add(sash);
  } else if (outfit === 'archaeologist' || outfit === 'explorer' || outfit === 'parka' || outfit === 'rescuer') {
    const backpack = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.19), toonMat(0x785337)), 0.016);
    backpack.position.set(0, 0.30, -0.22);
    backpack.castShadow = true;
    torsoGroup.add(backpack);

    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.048, 8, 16), toonMat(0x334155));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.56;
    torsoGroup.add(scarf);
  } else if (outfit === 'forensic' || outfit === 'detective' || outfit === 'scientist') {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.28, 0.03), toonMat(outfit === 'detective' ? 0xdc2626 : 0x0284c7));
    tie.position.set(0, 0.34, 0.17);
    torsoGroup.add(tie);
  }

  // Arms builder
  const makeArm = (sideSign) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sideSign * 0.25, 0.52, 0);
    torsoGroup.add(shoulder);

    const sleeveMat = outfit === 'conquistador' ? toonMat(0x334155) : clothM;
    const upper = addInkOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.21, 6, 12), sleeveMat), 0.014);
    upper.position.y = -0.15;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.30;
    shoulder.add(elbow);

    const fore = addInkOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.20, 6, 12), sleeveMat), 0.013);
    fore.position.y = -0.14;
    fore.castShadow = true;
    elbow.add(fore);

    const hand = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), skinM), 0.012);
    hand.position.y = -0.28;
    elbow.add(hand);

    const propSocket = new THREE.Group();
    propSocket.position.set(0, -0.29, 0.03);
    elbow.add(propSocket);

    return { shoulder, elbow, hand, propSocket };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const chestPropSocket = new THREE.Group();
  chestPropSocket.position.set(0, 0.36, 0.42);
  torsoGroup.add(chestPropSocket);

  // Sculpted Cartoon Head Group
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.62, 0);
  torsoGroup.add(headPivot);

  const neck = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.12, 12), skinM), 0.012);
  neck.position.y = 0.04;
  headPivot.add(neck);

  const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.245, 22, 18), skinM), 0.020);
  head.scale.set(0.95, 1.05, 0.96);
  head.position.y = 0.28;
  head.castShadow = true;
  headPivot.add(head);

  // Nose + Ears
  if (!isShadow) {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), skinM);
    nose.position.set(0, 0.255, 0.235);
    headPivot.add(nose);

    [-1, 1].forEach((side) => {
      const ear = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinM), 0.01);
      ear.scale.set(0.55, 1, 0.7);
      ear.position.set(side * 0.23, 0.27, 0);
      headPivot.add(ear);
    });
  }

  // Stylized Eyes + Eyelids + Eyebrows + Mouth
  const irisColor = actor.eyeColor || (outfit === 'inca_priest' ? 0x451a03 : 0x1e3a8a);
  const scleraMat = new THREE.MeshBasicMaterial({ color: isShadow ? 0xc4b5fd : 0xffffff });
  const irisMat = new THREE.MeshBasicMaterial({ color: isShadow ? 0xddd6fe : irisColor });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050811 });
  const browMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

  const makeEye = (sideSign) => {
    const eyeGrp = new THREE.Group();
    eyeGrp.position.set(sideSign * 0.088, 0.305, 0.212);
    eyeGrp.rotation.y = sideSign * 0.20;
    headPivot.add(eyeGrp);

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.054, 16), scleraMat);
    eyeGrp.add(sclera);

    if (!isShadow) {
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), irisMat);
      iris.position.z = 0.002;
      eyeGrp.add(iris);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.017, 12), pupilMat);
      pupil.position.z = 0.004;
      eyeGrp.add(pupil);

      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.008, 8), scleraMat);
      glint.position.set(0.012, 0.012, 0.006);
      eyeGrp.add(glint);
    }

    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.056, 14, 0, Math.PI), skinM);
    lid.position.set(0, 0, 0.008);
    lid.scale.y = 0.05;
    eyeGrp.add(lid);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.022, 0.022), browMat);
    brow.position.set(sideSign * 0.088, 0.382, 0.215);
    brow.rotation.y = sideSign * 0.20;
    headPivot.add(brow);

    return { eyeGrp, sclera, lid, brow, baseY: 0.382 };
  };
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 12, 10),
    new THREE.MeshBasicMaterial({ color: isShadow ? 0x6d28d9 : 0x7f1d1d })
  );
  mouth.scale.set(1.25, 0.35, 0.45);
  mouth.position.set(0, 0.165, 0.22);
  headPivot.add(mouth);

  // Stylized Hair & Headgear
  if (!isShadow) {
    const hairM = toonMat(0x1f2937);
    if (outfit === 'guide' || outfit === 'andean') {
      // Gorro Chullo Peruano con orejeras y pompón
      const chulloCrown = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.258, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), toonMat(0xdc2626)), 0.016);
      chulloCrown.position.y = 0.305;
      headPivot.add(chulloCrown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.252, 0.260, 0.075, 20), toonMat(0xfbbf24));
      band.position.y = 0.37;
      headPivot.add(band);
      const tip = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 14), toonMat(0xdc2626)), 0.014);
      tip.position.set(-0.08, 0.56, -0.04);
      tip.rotation.z = 0.38;
      headPivot.add(tip);
      [-1, 1].forEach((side) => {
        const flap = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.20, 0.11), toonMat(0xb91c1c)), 0.012);
        flap.position.set(side * 0.255, 0.25, -0.01);
        flap.rotation.z = side * 0.12;
        headPivot.add(flap);
      });
    } else if (outfit === 'inca_priest') {
      const hairBack = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.60), hairM), 0.014);
      hairBack.position.y = 0.30;
      headPivot.add(hairBack);
      // Diadema Solar Mascapaicha dorada + penacho turquesa y rojo
      const diadem = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.258, 0.252, 0.09, 20), goldM), 0.012);
      diadem.position.y = 0.42;
      headPivot.add(diadem);
      const sunCrest = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 18), goldM), 0.01);
      sunCrest.rotation.x = Math.PI / 2;
      sunCrest.position.set(0, 0.50, 0.23);
      headPivot.add(sunCrest);
      const feather = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 8), toonMat(0x06b6d4)), 0.01);
      feather.position.set(0, 0.62, 0.10);
      headPivot.add(feather);
    } else if (outfit === 'conquistador') {
      // Casco Morión Español curvo
      const dome = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), metalMat(0x94a3b8, 0.78, 0.26)), 0.016);
      dome.position.y = 0.33;
      headPivot.add(dome);
      const crest = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.54), metalMat(0xcbd5e1, 0.8, 0.25)), 0.012);
      crest.position.set(0, 0.56, 0);
      headPivot.add(crest);
      const brim = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.04, 20), metalMat(0x64748b, 0.75, 0.3)), 0.012);
      brim.scale.set(0.95, 1, 1.35);
      brim.position.set(0, 0.35, 0);
      headPivot.add(brim);
    } else if (actor.hat === 'fedora' || outfit === 'detective' || outfit === 'archaeologist' || outfit === 'explorer') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.252, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
      hair.position.y = 0.295;
      headPivot.add(hair);
      const hatColor = outfit === 'detective' ? 0x334155 : 0x785337;
      const brim = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.03, 20), toonMat(hatColor)), 0.012);
      brim.position.y = 0.45;
      headPivot.add(brim);
      const crown = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.18, 18), toonMat(hatColor)), 0.014);
      crown.position.y = 0.54;
      headPivot.add(crown);
    } else {
      const hair = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.258, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM), 0.014);
      hair.position.set(0, 0.305, -0.02);
      headPivot.add(hair);
    }
  }

  return {
    actor,
    index,
    root,
    bodyPivot,
    torsoGroup,
    headPivot,
    legL,
    legR,
    armL,
    armR,
    chestPropSocket,
    eyeL,
    eyeR,
    mouth,
    activePropName: 'none',
    activePropObj: null,
    isShadow
  };
}

function updateCharacterRig3D(rig, state, sceneTime, globalTime, interactive) {
  const { root, bodyPivot, torsoGroup, headPivot, legL, legR, armL, armR, eyeL, eyeR, mouth } = rig;
  const poses = getPoseAngles3D(state.pose, globalTime, state.speed);

  // Convert normalized 2D coordinates (x: 0..1, y: 0..1) into 3D stage space
  const worldX = (state.x - 0.5) * 8.4;
  const worldZ = state.z;
  const reactAge = interactive?.reactions?.[rig.actor.id] !== undefined
    ? globalTime - interactive.reactions[rig.actor.id]
    : 99;
  const jumpOffset = reactAge >= 0 && reactAge < 0.6 ? Math.sin((reactAge / 0.6) * Math.PI) * 0.38 : 0;

  root.position.set(worldX, Math.max(0, jumpOffset), worldZ);
  // Subtle dramatic 3/4 turn toward camera instead of flat 90° side profile!
  const targetRotY = state.facing > 0 ? 0.58 : -0.58;
  root.rotation.y = targetRotY;
  root.rotation.z = poses.wholeTiltZ;
  root.visible = state.alpha > 0.02;

  const jitterX = poses.jitter ? Math.sin(globalTime * 36) * poses.jitter : 0;
  bodyPivot.position.set(jitterX, 0.88 + poses.bobY, 0);
  torsoGroup.rotation.x = poses.bodyLean;
  torsoGroup.rotation.z = Math.sin(globalTime * 1.3 + rig.index) * 0.025;

  // Limb articulation
  legL.hip.rotation.x = -poses.lHipX;
  legL.knee.rotation.x = -poses.lKneeX;
  legR.hip.rotation.x = -poses.rHipX;
  legR.knee.rotation.x = -poses.rKneeX;

  armL.shoulder.rotation.x = -poses.lShoulderX;
  armL.shoulder.rotation.z = -poses.lShoulderZ;
  armL.elbow.rotation.x = -poses.lElbowX;

  armR.shoulder.rotation.x = -poses.rShoulderX;
  armR.shoulder.rotation.z = -poses.rShoulderZ;
  armR.elbow.rotation.x = -poses.rElbowX;

  // Head look & tilt
  let gazeYaw = poses.headYaw;
  let gazePitch = poses.headTilt;
  if (interactive?.pointer?.active) {
    gazeYaw += clamp((interactive.pointer.x - 0.5) * 0.55, -0.35, 0.35);
    gazePitch += clamp((interactive.pointer.y - 0.45) * 0.35, -0.25, 0.25);
  }
  headPivot.rotation.set(gazePitch, gazeYaw, 0);

  // Expressive face (blinks, brows, mouth lip-sync)
  const blinkPhase = (globalTime + rig.index * 1.1) % 3.8;
  const blink = blinkPhase > 3.65 ? Math.sin(((blinkPhase - 3.65) / 0.15) * Math.PI) : 0;
  eyeL.lid.scale.y = Math.max(0.05, blink * 1.05);
  eyeR.lid.scale.y = Math.max(0.05, blink * 1.05);

  let browLift = 0;
  let browTilt = 0;
  if (state.expr === 'shocked') {
    browLift = 0.032;
    browTilt = -0.18;
  } else if (state.expr === 'suspicious') {
    browLift = -0.012;
    browTilt = 0.28;
  } else if (state.expr === 'sad') {
    browLift = 0.01;
    browTilt = -0.30;
  } else if (state.expr === 'curious' || state.expr === 'mysterious') {
    browLift = 0.018;
    browTilt = -0.08;
  }
  eyeL.brow.position.y = eyeL.baseY + browLift;
  eyeL.brow.rotation.z = -browTilt;
  eyeR.brow.position.y = eyeR.baseY + browLift;
  eyeR.brow.rotation.z = browTilt;

  if (state.expr === 'shocked') {
    mouth.scale.set(1.05, 1.35, 0.55);
  } else if (state.speaking) {
    const talkOpen = 0.28 + Math.abs(Math.sin(sceneTime * 11.5)) * 0.85;
    mouth.scale.set(1.2, talkOpen, 0.45);
  } else if (state.expr === 'sad') {
    mouth.scale.set(1.15, 0.28, 0.45);
  } else {
    mouth.scale.set(1.25, 0.30, 0.45);
  }

  // Hand prop swapping & animated flicker
  const targetSocket = (state.pose === 'insert_disk' && state.prop === 'solar_disk') ? rig.chestPropSocket : armR.propSocket;
  const propKey = `${state.prop}_${targetSocket === rig.chestPropSocket ? 'chest' : 'hand'}`;
  if (rig.activePropName !== propKey) {
    if (rig.activePropObj && rig.activePropObj.parent) {
      rig.activePropObj.parent.remove(rig.activePropObj);
      disposeObject3D(rig.activePropObj);
    }
    rig.activePropObj = buildHandProp3D(state.prop);
    targetSocket.add(rig.activePropObj);
    rig.activePropName = propKey;
  }

  if (rig.activePropObj) {
    // Mantiene las antorchas erguidas y linternas/escáneres apuntando al frente pese al balanceo del brazo
    if (targetSocket === armR.propSocket) {
      rig.activePropObj.rotation.x = poses.rShoulderX + poses.rElbowX;
    } else {
      rig.activePropObj.rotation.x = 0;
    }
    const outer = rig.activePropObj.getObjectByName('torchFlameOuter');
    const inner = rig.activePropObj.getObjectByName('torchFlameInner');
    const tLight = rig.activePropObj.getObjectByName('torchLight');
    if (outer && inner) {
      const flk = 0.88 + Math.sin(globalTime * 19 + rig.index) * 0.18;
      outer.scale.set(1 / Math.sqrt(flk), flk, 1 / Math.sqrt(flk));
      inner.scale.set(1, flk * 0.96, 1);
      if (tLight) tLight.intensity = 2.0 + Math.sin(globalTime * 22) * 0.45;
    }
    if (state.prop === 'solar_disk') {
      rig.activePropObj.rotation.z = Math.sin(globalTime * 1.4) * 0.08;
    }
  }
}

/* ─────────────────────────── 3D PERUVIAN & MYSTERY ENVIRONMENTS ─────────────────────────── */

function buildAndesMountains3D(group, snowColor = 0xdbeafe, rockColor = 0x1e293b) {
  const specs = [
    { x: -13, z: -15, r: 6.2, h: 8.5, snow: true },
    { x: -4.5, z: -17, r: 7.4, h: 10.6, snow: true },
    { x: 5.5, z: -16, r: 6.8, h: 9.2, snow: true },
    { x: 14, z: -14.5, r: 5.8, h: 7.8, snow: false }
  ];
  for (const m of specs) {
    const peak = addInkOutline(
      new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 7), toonMat(rockColor)),
      0.04
    );
    peak.position.set(m.x, m.h * 0.44, m.z);
    group.add(peak);
    if (m.snow) {
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(m.r * 0.42, m.h * 0.40, 7),
        toonMat(snowColor)
      );
      cap.position.set(m.x, m.h * 0.72, m.z);
      group.add(cap);
    }
  }
}

function buildHayuMarcaWall3D(group, warmSun = false) {
  const wallGroup = new THREE.Group();
  wallGroup.position.set(0, 0, -2.7);
  group.add(wallGroup);

  const redRock = toonMat(warmSun ? 0xa14933 : 0x743326);
  const darkRock = toonMat(warmSun ? 0x732f22 : 0x4b1f18);
  const recessMat = toonMat(0x28120e);

  // Acantilado principal de arenisca roja
  const cliff = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.9, 1.4), redRock), 0.035);
  cliff.position.set(0, 2.35, -0.55);
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  wallGroup.add(cliff);

  // Bloques rocosos laterales ("Bosque de Piedras de Hayu Marca")
  [[-4.4, 2.2, 1.5], [4.4, 2.5, 1.6], [-6.5, 1.9, 1.8], [6.4, 1.7, 1.9]].forEach(([bx, bh, bw], idx) => {
    const pillar = addInkOutline(
      new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.55, bw * 0.78, bh * 2.1, 7), idx % 2 === 0 ? redRock : darkRock),
      0.035
    );
    pillar.position.set(bx, bh, -0.1 - idx * 0.25);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    wallGroup.add(pillar);
  });

  // Marco exterior tallado (7 metros)
  const lintel = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.52, 0.55), darkRock), 0.025);
  lintel.position.set(0, 3.85, 0.22);
  wallGroup.add(lintel);

  [-1.85, 1.85].forEach((px) => {
    const sidePillar = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.8, 0.52), darkRock), 0.025);
    sidePillar.position.set(px, 1.9, 0.20);
    wallGroup.add(sidePillar);
  });

  // Fondo tallado profundo + Nicho interior en forma de T invertida (Puerta de los Dioses)
  const backFace = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.55, 0.24), recessMat);
  backFace.position.set(0, 1.8, 0.05);
  backFace.receiveShadow = true;
  wallGroup.add(backFace);

  const innerDoorFrame = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.95, 0.22), darkRock), 0.02);
  innerDoorFrame.position.set(0, 1.0, 0.20);
  wallGroup.add(innerDoorFrame);

  const innerNiche = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.72, 0.16), toonMat(0x160b0a));
  innerNiche.position.set(0, 0.92, 0.26);
  wallGroup.add(innerNiche);

  // Ranura circular sagrada del Disco Solar
  const discSlot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.08, 22),
    metalMat(0x92400e, 0.35, 0.7, { emissive: 0x0ea5e9, emissiveIntensity: 0.18 })
  );
  discSlot.rotation.x = Math.PI / 2;
  discSlot.position.set(0, 1.15, 0.34);
  discSlot.name = 'solarSlot';
  wallGroup.add(discSlot);

  // Losa escalonada ceremonial frente al portal
  const stepSlab = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.20, 1.6), darkRock), 0.02);
  stepSlab.position.set(0, 0.10, 0.9);
  stepSlab.receiveShadow = true;
  wallGroup.add(stepSlab);

  // Portal dimensional energético (visible según scene.portalPower)
  const portalGrp = new THREE.Group();
  portalGrp.position.set(0, 1.15, 0.39);
  portalGrp.name = 'portalVortex';
  wallGroup.add(portalGrp);

  const corePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.72),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  corePlane.position.y = -0.20;
  corePlane.name = 'portalCore';
  portalGrp.add(corePlane);

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.035, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 })
  );
  ring1.name = 'portalRing1';
  portalGrp.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.028, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0 })
  );
  ring2.name = 'portalRing2';
  portalGrp.add(ring2);

  const ring3 = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.026, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0 })
  );
  ring3.name = 'portalRing3';
  portalGrp.add(ring3);

  const portalBeam = new THREE.Mesh(
    new THREE.ConeGeometry(1.55, 3.8, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  portalBeam.rotation.x = -Math.PI / 2;
  portalBeam.position.z = 1.9;
  portalBeam.name = 'portalBeam';
  portalGrp.add(portalBeam);

  const portalLight = new THREE.PointLight(0x38bdf8, 0, 12);
  portalLight.position.set(0, 0, 0.9);
  portalLight.name = 'portalLight';
  portalGrp.add(portalLight);

  return { wallGroup, portalGrp };
}

function buildBalsaTotora3D() {
  const boat = new THREE.Group();
  const reedM = toonMat(0xd97706);
  const hull = addInkOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.45, 6, 12), reedM), 0.018);
  hull.rotation.z = Math.PI / 2;
  boat.add(hull);

  [-0.95, 0.95].forEach((bx) => {
    const prow = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 10), reedM), 0.014);
    prow.position.set(bx, 0.32, 0);
    prow.rotation.z = bx > 0 ? -0.45 : 0.45;
    boat.add(prow);
  });
  return boat;
}

function buildEnvironment3D(threeScene, scene) {
  const bg = scene.bg || 'hayuMarcaNight';
  const subBg = scene.subBg || 'default';
  const env = { bg, subBg, animated: {} };

  const isDay = bg === 'hayuMarcaDay';
  const isSunset = bg === 'hayuMarcaSunset';

  // Sky background & fog
  if (isDay) {
    threeScene.background = createSkyTexture('#0284c7', '#38bdf8', '#e0f2fe');
    threeScene.fog = new THREE.FogExp2(0xbae6fd, 0.018);
  } else if (isSunset) {
    threeScene.background = createSkyTexture('#1e1b4b', '#881337', '#f97316', true, '#fde047');
    threeScene.fog = new THREE.FogExp2(0x4c1d3d, 0.022);
  } else if (bg === 'incaTemple') {
    threeScene.background = createSkyTexture('#1a0808', '#33120b', '#451a03');
    threeScene.fog = new THREE.FogExp2(0x230c06, 0.028);
  } else if (bg === 'labRoom' || bg === 'radarRoom' || bg === 'darkRoom') {
    threeScene.background = createSkyTexture('#030712', '#0b1426', '#111d36');
    threeScene.fog = new THREE.FogExp2(0x060b16, 0.025);
  } else if (bg === 'spotlight' || bg === 'void') {
    threeScene.background = createSkyTexture('#02040a', '#090e1d', '#0f172a');
    threeScene.fog = new THREE.FogExp2(0x050811, 0.032);
  } else {
    threeScene.background = createSkyTexture('#030712', '#0a1936', '#162d54');
    threeScene.fog = new THREE.FogExp2(0x0a162e, 0.022);
  }

  // Lighting (strictly 1 shadow-casting directional light for fast GPU export!)
  const hemi = new THREE.HemisphereLight(
    isDay ? 0xe0f2fe : isSunset ? 0xfdba74 : bg === 'incaTemple' ? 0xf59e0b : 0x7dd3fc,
    isDay ? 0x573b26 : 0x111827,
    isDay ? 1.05 : isSunset ? 0.85 : 0.62
  );
  threeScene.add(hemi);

  const keyLight = new THREE.DirectionalLight(
    isDay ? 0xfffbeb : isSunset ? 0xfb923c : bg === 'incaTemple' ? 0xfbbf24 : 0xbae6fd,
    isDay ? 1.35 : isSunset ? 1.25 : 0.95
  );
  keyLight.position.set(5, 9, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -4;
  threeScene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(
    isSunset ? 0xfef08a : 0x38bdf8,
    isDay ? 0.45 : 0.72
  );
  rimLight.position.set(-6, 5, -5);
  threeScene.add(rimLight);

  // Starfield / Particles for night/outdoor scenes
  if (!isDay && bg !== 'labRoom' && bg !== 'radarRoom') {
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = ((i * 73) % 40) - 20;
      pos[i * 3 + 1] = 2.0 + ((i * 41) % 12);
      pos[i * 3 + 2] = -6 - ((i * 29) % 16);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.14, transparent: true, opacity: 0.85 })
    );
    threeScene.add(stars);
    env.animated.stars = stars;
  }

  // Ground plane
  const groundColor = bg === 'incaTemple' ? 0x3f2e24 :
    bg === 'labRoom' || bg === 'radarRoom' || bg === 'spotlight' || bg === 'void' ? 0x111827 :
    isDay ? 0x9c6b49 : 0x262129;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 36),
    toonMat(groundColor)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  threeScene.add(ground);

  // Scene-specific 3D architecture
  if (bg === 'hayuMarcaNight' || bg === 'hayuMarcaDay' || bg === 'hayuMarcaSunset') {
    buildAndesMountains3D(threeScene, isSunset ? 0xfecdd3 : 0xe2e8f0, isSunset ? 0x3b1d2e : 0x1e293b);
    const hm = buildHayuMarcaWall3D(threeScene, isDay || isSunset);
    env.animated.portalGrp = hm.portalGrp;

    // Paja brava (Ichu) and boulders
    const grassM = toonMat(isDay ? 0xca8a04 : 0x6b4f1d);
    const grassBlades = [];
    for (let i = 0; i < 18; i++) {
      const gx = ((i * 1.9) % 12) - 6;
      const gz = 0.8 + ((i * 0.7) % 3.4);
      if (Math.abs(gx) < 2.1 && gz < 2.2) continue;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 5), grassM);
      tuft.position.set(gx, 0.16, gz);
      threeScene.add(tuft);
      grassBlades.push({ mesh: tuft, phase: i * 0.6 });
    }
    env.animated.grass = grassBlades;
    if (isDay || isSunset) {
      // Cóndor Andino 3D planeando detrás del monumento
      const condor = new THREE.Group();
      const darkFeather = toonMat(0x0f172a);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 6, 8), darkFeather);
      body.rotation.z = Math.PI / 2;
      condor.add(body);
      const wingGeo = new THREE.BoxGeometry(0.18, 0.025, 0.72);
      const wingL = new THREE.Mesh(wingGeo, darkFeather);
      wingL.position.set(0, 0.02, -0.4);
      wingL.rotation.y = 0.25;
      const wingR = new THREE.Mesh(wingGeo, darkFeather);
      wingR.position.set(0, 0.02, 0.4);
      wingR.rotation.y = -0.25;
      condor.add(wingL, wingR);
      condor.position.set(0, 4.6, -7.2);
      threeScene.add(condor);
      env.animated.condor = { grp: condor, wingL, wingR };
    }
  } else if (bg === 'titicacaLake') {
    buildAndesMountains3D(threeScene, 0xe0f2fe, 0x172554);
    // Shoreline edge rocks
    const shore = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(24, 0.45, 5.2), toonMat(0x374151)), 0.025);
    shore.position.set(0, 0.02, 1.4);
    shore.receiveShadow = true;
    threeScene.add(shore);

    // Animated Lake Water Plane
    const waterGeo = new THREE.PlaneGeometry(40, 24, 34, 20);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = toonMat(0x0c4a6e, { emissive: 0x082f49, emissiveIntensity: 0.35 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -0.05, -11.8);
    water.receiveShadow = true;
    threeScene.add(water);
    env.animated.waterGeo = waterGeo;
    env.animated.waterBaseY = waterGeo.attributes.position.array.slice();

    // Traditional Balsa de Totora reed boat
    const balsa = buildBalsaTotora3D();
    balsa.position.set(-1.9, 0.12, -3.5);
    threeScene.add(balsa);
    env.animated.balsa = balsa;

    // Lakefront Totora reeds
    const reedM = toonMat(0x65a30d);
    for (let i = -7; i <= 7; i += 1.3) {
      if (Math.abs(i) < 2.4) continue;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 6), reedM);
      r.position.set(i, 0.42, -1.05);
      threeScene.add(r);
    }

    if (subBg === 'lights') {
      const orbs = [];
      for (let i = 0; i < 4; i++) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 14, 12),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc })
        );
        const oLight = new THREE.PointLight(0x38bdf8, 1.8, 7.5);
        orb.add(oLight);
        orb.position.set(-2.5 + i * 1.7, 0.6, -4.5 - (i % 2) * 2.2);
        threeScene.add(orb);
        orbs.push({ orb, baseX: orb.position.x, baseZ: orb.position.z, phase: i * 1.4 });
      }
      env.animated.lakeOrbs = orbs;
    }
  } else if (bg === 'incaTemple') {
    const stoneM = toonMat(0x44403c);
    const goldBandM = metalMat(0xfbbf24, 0.78, 0.24, { emissive: 0xb45309, emissiveIntensity: 0.35 });

    // Trapezoidal Inca wall facade
    const templeWall = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.4, 4.2, 4), stoneM), 0.03);
    templeWall.rotation.y = Math.PI / 4;
    templeWall.scale.set(1.35, 1, 0.35);
    templeWall.position.set(0, 2.1, -3.2);
    templeWall.receiveShadow = true;
    threeScene.add(templeWall);

    // Franja dorada del Coricancha
    const goldFrieze = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.38, 0.18), goldBandM), 0.016);
    goldFrieze.position.set(0, 2.75, -2.18);
    threeScene.add(goldFrieze);

    // Altar trapezoidal de piedra
    const altar = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.92, 0.95), stoneM), 0.02);
    altar.position.set(0, 0.46, -1.65);
    altar.castShadow = true;
    threeScene.add(altar);

    // Dos braseros encendidos con fuego 3D
    const braziers = [];
    [-2.4, 2.4].forEach((bx, idx) => {
      const bowl = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 0.85, 10), stoneM), 0.02);
      bowl.position.set(bx, 0.42, -1.35);
      threeScene.add(bowl);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.55, 10),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      flame.position.set(bx, 1.08, -1.35);
      threeScene.add(flame);

      const bLight = new THREE.PointLight(0xff7722, 2.2, 8);
      bLight.position.set(bx, 1.25, -1.1);
      threeScene.add(bLight);
      braziers.push({ flame, light: bLight, phase: idx * 2.1 });
    });
    env.animated.braziers = braziers;
  } else if (bg === 'andeanTrail') {
    buildAndesMountains3D(threeScene, 0xe0f2fe, 0x1e293b);
    const rockM = toonMat(0x334155);
    // Ancient stone path slabs
    for (let s = -4; s <= 4; s++) {
      const slab = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.85), rockM), 0.015);
      slab.position.set(s * 0.95, 0.06, -0.3 + Math.sin(s * 0.6) * 0.4);
      slab.receiveShadow = true;
      threeScene.add(slab);
    }
    [[-3.8, 1.6, -2.8], [3.6, 1.9, -2.5]].forEach(([px, py, pz]) => {
      const crag = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(1.4, py * 2, 6), toonMat(0x273549)), 0.03);
      crag.position.set(px, py, pz);
      threeScene.add(crag);
    });
  } else if (bg === 'expeditionCamp') {
    buildAndesMountains3D(threeScene, 0xe2e8f0, 0x1e293b);
    // Illuminated night expedition tent
    const tent = addInkOutline(
      new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.45, 5), toonMat(0xf59e0b, { emissive: 0xd97706, emissiveIntensity: 0.45 })),
      0.025
    );
    tent.position.set(-2.4, 0.72, -1.6);
    tent.castShadow = true;
    threeScene.add(tent);
    const tentLight = new THREE.PointLight(0xfbbf24, 1.8, 6.5);
    tentLight.position.set(-2.4, 0.8, -0.7);
    threeScene.add(tentLight);

    // Tripod geophysical scanner
    const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.35, 1.1, 3), metalMat(0x94a3b8));
    tri.position.set(2.1, 0.55, -1.1);
    threeScene.add(tri);
    const head = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.22), toonMat(0x0284c7)), 0.012);
    head.position.set(2.1, 1.15, -1.1);
    threeScene.add(head);
    const laser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 3.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    laser.rotation.z = Math.PI / 2;
    laser.position.set(0.5, 1.15, -1.1);
    threeScene.add(laser);
    env.animated.laser = laser;
  } else if (bg === 'labRoom' || bg === 'radarRoom') {
    // Mesa central con holograma 3D del portal de Hayu Marca
    const table = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.2), toonMat(0x1e293b)), 0.02);
    table.position.set(0, 0.39, -1.35);
    table.castShadow = true;
    threeScene.add(table);

    const holoGrp = new THREE.Group();
    holoGrp.position.set(0, 1.35, -1.35);
    const holoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.75 });
    const holoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.25), holoMat);
    holoGrp.add(holoMesh);
    const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    holoRing.rotation.x = Math.PI / 2;
    holoRing.position.y = -0.48;
    holoGrp.add(holoRing);
    threeScene.add(holoGrp);
    env.animated.hologram = holoGrp;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.65),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    screen.position.set(0, 2.1, -3.2);
    threeScene.add(screen);
    const frame = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(3.55, 1.8, 0.1), toonMat(0x334155)), 0.02);
    frame.position.set(0, 2.1, -3.28);
    threeScene.add(frame);
  } else {
    // Spotlight / Void volumetric cone
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 6.2, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef3c7,
        transparent: true,
        opacity: 0.10,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    cone.position.set(0, 2.9, 0);
    threeScene.add(cone);
  }

  return env;
}

function updateEnvironment3D(env, scene, sceneTime, globalTime) {
  const dur = Math.max(0.1, scene.duration || 8);
  const tNorm = clamp(sceneTime / dur, 0, 1);

  if (env.animated.portalGrp) {
    const pStart = scene.portalPower ?? 0;
    const pEnd = scene.portalPowerEnd ?? pStart;
    const p = clamp(lerp(pStart, pEnd, easeInOut(tNorm)), 0, 1);
    const grp = env.animated.portalGrp;
    grp.visible = p > 0.01;
    if (grp.visible) {
      const core = grp.getObjectByName('portalCore');
      const r1 = grp.getObjectByName('portalRing1');
      const r2 = grp.getObjectByName('portalRing2');
      const r3 = grp.getObjectByName('portalRing3');
      const beam = grp.getObjectByName('portalBeam');
      const pLight = grp.getObjectByName('portalLight');
      const pulse = 0.85 + 0.15 * Math.sin(globalTime * 8);
      if (core) core.material.opacity = p * 0.72 * pulse;
      if (r1) {
        r1.material.opacity = p * 0.9;
        r1.rotation.z = globalTime * 1.8;
        r1.scale.setScalar(0.8 + p * 0.25);
      }
      if (r2) {
        r2.material.opacity = p * 0.95;
        r2.rotation.z = -globalTime * 2.6;
      }
      if (r3) {
        r3.material.opacity = p * 0.55;
        r3.rotation.z = globalTime * 1.1;
      }
      if (beam) beam.material.opacity = p * 0.18 * pulse;
      if (pLight) pLight.intensity = p * 3.8 * pulse;
    }
  }

  if (env.animated.grass) {
    for (const g of env.animated.grass) {
      g.mesh.rotation.z = Math.sin(globalTime * 2.6 + g.phase) * 0.14;
    }
  }

  if (env.animated.condor) {
    const { grp, wingL, wingR } = env.animated.condor;
    const flap = Math.sin(globalTime * 4.5) * 0.28;
    wingL.rotation.x = flap;
    wingR.rotation.x = -flap;
    grp.position.x = -5.5 + ((sceneTime * 1.15) % 11);
    grp.position.y = 4.4 + Math.sin(globalTime * 1.6) * 0.35;
  }

  if (env.animated.waterGeo) {
    const pos = env.animated.waterGeo.attributes.position;
    const base = env.animated.waterBaseY;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.8 + globalTime * 2.1) * 0.08 + Math.cos(z * 0.9 - globalTime * 1.7) * 0.06);
    }
    pos.needsUpdate = true;
    env.animated.waterGeo.computeVertexNormals();
  }

  if (env.animated.balsa) {
    env.animated.balsa.position.y = 0.10 + Math.sin(globalTime * 1.8) * 0.06;
    env.animated.balsa.rotation.z = Math.sin(globalTime * 1.4) * 0.045;
  }

  if (env.animated.lakeOrbs) {
    for (const o of env.animated.lakeOrbs) {
      o.orb.position.y = 0.65 + Math.sin(globalTime * 1.9 + o.phase) * 0.45;
      o.orb.position.x = o.baseX + Math.cos(globalTime * 1.1 + o.phase) * 0.35;
    }
  }

  if (env.animated.braziers) {
    for (const b of env.animated.braziers) {
      const flk = 0.85 + Math.sin(globalTime * 17 + b.phase) * 0.22;
      b.flame.scale.set(1 / Math.sqrt(flk), flk, 1 / Math.sqrt(flk));
      b.light.intensity = 1.9 + Math.sin(globalTime * 20 + b.phase) * 0.45;
    }
  }

  if (env.animated.hologram) {
    env.animated.hologram.rotation.y = globalTime * 0.85;
  }

  if (env.animated.laser) {
    env.animated.laser.rotation.y = Math.sin(globalTime * 2.2) * 0.25;
  }
}

/* ─────────────────────────── SCENE CACHE & CAMERA ─────────────────────────── */

function getOrBuildScene3D(scene) {
  const actorSig = (scene.actors || []).map((a) => `${a.id}:${a.role}:${a.outfit || ''}:${a.hat || ''}:${a.color || ''}`).join('|');
  const key = `${scene.id}:${scene.bg}:${scene.subBg || ''}:${actorSig}`;
  if (activeSceneCache && activeSceneCache.key === key) {
    return activeSceneCache;
  }

  if (activeSceneCache) {
    disposeObject3D(activeSceneCache.threeScene);
    activeSceneCache = null;
  }

  const threeScene = new THREE.Scene();
  const env = buildEnvironment3D(threeScene, scene);

  const rigs = (scene.actors || []).map((actor, idx) => {
    const rig = createCharacterRig3D(actor, idx);
    threeScene.add(rig.root);
    return rig;
  });

  const pointerLight = new THREE.PointLight(0xfef3c7, 0, 8);
  pointerLight.position.set(0, 2.4, 2.2);
  threeScene.add(pointerLight);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.2, 90);
  camera.position.set(0, 2.0, 9.0);

  activeSceneCache = { key, threeScene, env, rigs, pointerLight, camera };
  return activeSceneCache;
}

/* ─────────────────────────── COMPOSITE ENTRYPOINT ─────────────────────────── */

window.StickmanStudio.renderFrame = function renderFrame3D(ctx, formatCfg, rawScene, sceneTime, globalTime, interactive) {
  const outW = ctx.canvas ? ctx.canvas.width : formatCfg.width;
  const outH = ctx.canvas ? ctx.canvas.height : formatCfg.height;

  if (!ensureRenderer(outW, outH)) {
    if (typeof NS.fallbackRender2D === 'function') {
      return NS.fallbackRender2D(ctx, formatCfg, rawScene, sceneTime, globalTime, interactive);
    }
    return;
  }

  const isPortrait = outH > outW;
  const scene = isPortrait && formatCfg?.reframeFromFull ? reframeSceneForVertical(rawScene) : rawScene;
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const scaleX = outW / width;
  const scaleY = outH / height;

  const entry = getOrBuildScene3D(scene);
  const { threeScene, env, rigs, pointerLight, camera } = entry;

  // 1. Update animated environment & all 3D character rigs
  updateEnvironment3D(env, scene, sceneTime, globalTime);

  let sumX = 0;
  let activeCount = 0;
  const resolvedStates = rigs.map((rig, idx) => {
    const st = resolveActorFrame(rig.actor, sceneTime, scene.duration, idx, interactive);
    updateCharacterRig3D(rig, st, sceneTime, globalTime, interactive);
    if (st.alpha > 0.05) {
      sumX += rig.root.position.x;
      activeCount++;
    }
    return st;
  });

  // 2. Interactive pointer 3D spotlight
  if (interactive?.pointer?.active && interactive?.pointer?.flashlight) {
    pointerLight.intensity = 1.6;
    pointerLight.position.set(
      (interactive.pointer.x - 0.5) * 9,
      Math.max(0.6, (1 - interactive.pointer.y) * 4.5),
      2.6
    );
  } else {
    pointerLight.intensity = 0;
  }

  // 3. Cinematic 3D Camera Orbit, Dolly, Crane & Vertical Safe Framing
  const cam = scene.camera || {};
  const tNorm = clamp(sceneTime / Math.max(0.1, scene.duration), 0, 1);
  const easeT = easeInOut(tNorm);

  let zoom = lerp(cam.zoomStart ?? 1.0, cam.zoomEnd ?? 1.12, easeT);
  if (isPortrait) {
    if (globalTime < 0.30) {
      zoom *= 1 + (1 - easeInOut(globalTime / 0.30)) * 0.14;
    } else if (sceneTime < 0.18) {
      zoom *= 1 + (1 - sceneTime / 0.18) * 0.05;
    }
  }

  const targetFov = isPortrait ? 52 : 39;
  if (camera.fov !== targetFov || Math.abs(camera.aspect - outW / outH) > 0.001) {
    camera.fov = targetFov;
    camera.aspect = outW / outH;
    camera.updateProjectionMatrix();
  }

  const orbitDeg = lerp(cam.orbitStart ?? -7, cam.orbitEnd ?? 7, easeT);
  const orbitRad = (orbitDeg * Math.PI) / 180;
  const baseDist = (isPortrait ? 10.6 : 8.6) / Math.max(0.65, zoom);
  const camH = lerp(cam.heightStart ?? 2.05, cam.heightEnd ?? 2.25, easeT);

  const actorFocusX = activeCount > 0 ? clamp(sumX / activeCount, -2.6, 2.6) : 0;
  const lookAtX = isPortrait ? actorFocusX * 0.72 : actorFocusX * 0.30;
  const lookAtY = isPortrait ? 1.05 : 1.28;
  const shake = cam.shake || 0;
  const shakeX = shake ? Math.sin(globalTime * 31) * shake * 0.035 : 0;
  const shakeY = shake ? Math.cos(globalTime * 37) * shake * 0.035 : 0;

  camera.position.set(
    lookAtX + Math.sin(orbitRad) * baseDist + shakeX,
    camH + shakeY,
    Math.cos(orbitRad) * baseDist - 0.5
  );
  camera.lookAt(lookAtX + shakeX * 0.5, lookAtY + shakeY * 0.5, -0.7);
  camera.updateMatrixWorld();

  // 4. Populate interactive 2D click/drag hitboxes from 3D world projection
  if (interactive?.hitboxes) {
    interactive.hitboxes.length = 0;
    const v = new THREE.Vector3();
    rigs.forEach((rig, idx) => {
      if (resolvedStates[idx].alpha <= 0.05) return;
      v.set(rig.root.position.x, 1.0, rig.root.position.z).project(camera);
      interactive.hitboxes.push({
        id: rig.actor.id,
        x: (v.x * 0.5 + 0.5) * outW,
        y: (-v.y * 0.5 + 0.5) * outH,
        r: Math.max(44, outH * 0.09)
      });
    });
  }

  // 5. Render 3D WebGL frame & composite cleanly onto destination 2D canvas
  renderer.render(threeScene, camera);

  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(glCanvas, 0, 0, outW, outH);

  // 6. Composite vector HUD overlays, vignette, title card, and dynamic karaoke subtitles
  ctx.save();
  ctx.scale(scaleX, scaleY);

  const props = scene.overlayProps || [];
  for (const prop of props) {
    if (!WORLD_PROP_TYPES.has(prop.type)) {
      if (prop.type === 'cta') {
        drawOverlayProp(ctx, { ...prop, _platform: formatCfg?.platform }, width, height, sceneTime, scene.mood);
      } else {
        drawOverlayProp(ctx, prop, width, height, sceneTime, scene.mood);
      }
    }
  }

  drawInteractiveSpotlight(ctx, interactive?.pointer, width, height);
  drawTypographyAndHUD(ctx, scene, width, height, sceneTime, globalTime, isPortrait, formatCfg);

  ctx.restore();
};
})();
