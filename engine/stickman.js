/**
 * Motor 2D Cartoon Documental Cinematográfico (60 FPS)
 * Personajes ilustrados con vestimenta contextual, vehículos animados por keyframes,
 * escenarios multicapa con paralaje, clima en primer plano y tipografía cinética.
 */
(() => {
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const deg2rad = (deg) => (deg * Math.PI) / 180;

const MOOD_PALETTES = {
  tense: {
    bgTop: '#080e1d', bgMid: '#131d36', bgBot: '#213054',
    accent: '#f59e0b', accentGlow: 'rgba(245, 158, 11, 0.34)',
    rim: '#fcd34d', skyTint: 'rgba(245, 158, 11, 0.10)'
  },
  mysterious: {
    bgTop: '#061121', bgMid: '#0e2742', bgBot: '#183e63',
    accent: '#38bdf8', accentGlow: 'rgba(56, 189, 248, 0.34)',
    rim: '#7dd3fc', skyTint: 'rgba(56, 189, 248, 0.12)'
  },
  eerie: {
    bgTop: '#0b0818', bgMid: '#191336', bgBot: '#291c52',
    accent: '#a78bfa', accentGlow: 'rgba(167, 139, 250, 0.34)',
    rim: '#c4b5fd', skyTint: 'rgba(167, 139, 250, 0.12)'
  },
  shock: {
    bgTop: '#16070c', bgMid: '#2c0e17', bgBot: '#421421',
    accent: '#f87171', accentGlow: 'rgba(248, 113, 113, 0.38)',
    rim: '#fca5a5', skyTint: 'rgba(248, 113, 113, 0.14)'
  }
};

const HOOK_KEYWORDS = [
  'jamás ha existido', 'no existe', 'desapareció', 'desaparecieron', 'ninguno regresará',
  'descalzos', 'sin vida', 'extraño', 'nunca vuelven', 'imposible',
  'radiación', 'universos paralelos', 'triángulo de las bermudas', 'rastro',
  'trece tripulantes', 'nunca volvió', 'hayu marca', 'aramu muru', 'puerta de los dioses',
  'roca sólida', 'titicaca', 'portal', 'disco solar', 'fuego azul', 'piezoeléctric'
];

const WORLD_PROP_TYPES = new Set([
  'footprints', 'oilSlick', 'desk', 'door', 'bed', 'tent', 'campfire', 'avalancheWave', 'hayuPortal'
]);

const OUTLINE = '#0a0f1d';

/* ─────────────────────────── POSES & KEYFRAMES ─────────────────────────── */

function getPoseAngles(pose, time, speed = 1) {
  const breathe = Math.sin(time * 2.6) * 2.2;
  const sway = Math.sin(time * 1.4) * 1.5;
  const base = {
    bodyLean: sway,
    headTilt: Math.sin(time * 1.9) * 2.2,
    bobY: breathe * 0.55,
    lShoulder: 18 + Math.sin(time * 2.0) * 3.0,
    lElbow: 22,
    rShoulder: -18 - Math.sin(time * 2.0) * 3.0,
    rElbow: -22,
    lHip: 8,
    lKnee: 4,
    rHip: -8,
    rKnee: -4,
    jitter: 0,
    squashX: 1,
    squashY: 1,
    alpha: 1,
    wholeTilt: 0
  };

  switch (pose) {
    case 'walk': {
      const w = time * 6.8 * speed;
      const swing = Math.sin(w) * 38;
      const kneeL = Math.max(0, Math.sin(w + 0.9)) * 46;
      const kneeR = Math.max(0, -Math.sin(w + 0.9)) * 46;
      const lift = Math.abs(Math.sin(w)) * -8;
      return {
        ...base,
        bodyLean: 10 + Math.sin(w * 2) * 2,
        headTilt: Math.sin(w * 2) * 2.5,
        bobY: lift,
        squashX: 1 - Math.abs(Math.sin(w)) * 0.025,
        squashY: 1 + Math.abs(Math.sin(w)) * 0.025,
        lShoulder: -swing * 0.78,
        lElbow: -32,
        rShoulder: swing * 0.78,
        rElbow: -32,
        lHip: swing,
        lKnee: kneeL,
        rHip: -swing,
        rKnee: kneeR
      };
    }
    case 'run': {
      const w = time * 11.2 * speed;
      const swing = Math.sin(w) * 56;
      const kneeL = Math.max(0, Math.sin(w + 1.0)) * 72;
      const kneeR = Math.max(0, -Math.sin(w + 1.0)) * 72;
      const lift = Math.abs(Math.sin(w)) * -14;
      return {
        ...base,
        bodyLean: 24 + Math.sin(w * 2) * 3,
        headTilt: -6 + Math.sin(w * 2) * 3,
        bobY: lift,
        squashX: 0.95,
        squashY: 1.05,
        lShoulder: -swing * 0.95,
        lElbow: -72,
        rShoulder: swing * 0.95,
        rElbow: -72,
        lHip: swing,
        lKnee: kneeL,
        rHip: -swing,
        rKnee: kneeR
      };
    }
    case 'talk': {
      const g1 = Math.sin(time * 7.4);
      const g2 = Math.cos(time * 5.6);
      return {
        ...base,
        bodyLean: 4 + g1 * 3.2,
        headTilt: g2 * 6.5,
        bobY: Math.abs(g1) * -3,
        lShoulder: 36 + g1 * 24,
        lElbow: 54 + g2 * 26,
        rShoulder: -48 + g2 * 28,
        rElbow: -58 - g1 * 22
      };
    }
    case 'point': {
      return {
        ...base,
        bodyLean: 11,
        headTilt: -4,
        bobY: Math.sin(time * 3.5) * 1.8,
        rShoulder: -88 + Math.sin(time * 4.2) * 3.5,
        rElbow: -8,
        lShoulder: 26 + Math.sin(time * 2.8) * 5,
        lElbow: 38
      };
    }
    case 'point_up': {
      return {
        ...base,
        bodyLean: -6,
        headTilt: -22 + Math.sin(time * 2.4) * 2,
        bobY: Math.sin(time * 3.0) * 1.6,
        rShoulder: -136 + Math.sin(time * 3.5) * 4,
        rElbow: -12,
        lShoulder: 28,
        lElbow: 46
      };
    }
    case 'wave': {
      const w = Math.sin(time * 7.2) * 22;
      return {
        ...base,
        bodyLean: -4,
        headTilt: 5,
        rShoulder: -136 + w,
        rElbow: -28 - w * 0.4,
        lShoulder: 22,
        lElbow: 24
      };
    }
    case 'confused': {
      return {
        ...base,
        bodyLean: -5,
        headTilt: Math.sin(time * 3.2) * 10 - 4,
        lShoulder: 54 + Math.sin(time * 4) * 5,
        lElbow: 108,
        rShoulder: -116,
        rElbow: -114 + Math.sin(time * 5) * 8
      };
    }
    case 'inspect': {
      return {
        ...base,
        bodyLean: 20,
        headTilt: 18 + Math.sin(time * 2.8) * 3,
        bobY: 4,
        lShoulder: 42,
        lElbow: 48,
        rShoulder: -66,
        rElbow: -72 + Math.sin(time * 3.2) * 5,
        lHip: 16,
        lKnee: 16,
        rHip: -14,
        rKnee: 6
      };
    }
    case 'gasp': {
      return {
        ...base,
        bodyLean: -13,
        headTilt: -10,
        bobY: -7 + Math.sin(time * 10) * 1.5,
        squashX: 0.93,
        squashY: 1.07,
        lShoulder: 86,
        lElbow: 112,
        rShoulder: -86,
        rElbow: -112,
        lHip: 18,
        lKnee: 20,
        rHip: -18,
        rKnee: 18
      };
    }
    case 'scared': {
      return {
        ...base,
        bodyLean: -16,
        headTilt: -8 + Math.sin(time * 15) * 2.5,
        bobY: Math.sin(time * 15) * 2.5,
        jitter: 2.2,
        lShoulder: 108,
        lElbow: 76,
        rShoulder: -108,
        rElbow: -76,
        lHip: 20,
        lKnee: 26,
        rHip: -18,
        rKnee: 20
      };
    }
    case 'shiver': {
      return {
        ...base,
        bodyLean: 12,
        headTilt: 12,
        bobY: 5 + Math.sin(time * 22) * 1.4,
        jitter: 2.0,
        lShoulder: 52,
        lElbow: -105,
        rShoulder: -52,
        rElbow: 105,
        lHip: 12,
        lKnee: 18,
        rHip: -8,
        rKnee: 16
      };
    }
    case 'cover_ears': {
      return {
        ...base,
        bodyLean: 14,
        headTilt: 14,
        bobY: 7 + Math.sin(time * 18) * 1.6,
        jitter: 2.4,
        lShoulder: 126,
        lElbow: 116,
        rShoulder: -126,
        rElbow: -116,
        lHip: 18,
        lKnee: 24,
        rHip: -16,
        rKnee: 22
      };
    }
    case 'climb': {
      const c = Math.sin(time * 5.2);
      return {
        ...base,
        bodyLean: 12,
        headTilt: -14,
        bobY: -22 + c * 6,
        lShoulder: -128 + c * 32,
        lElbow: -42,
        rShoulder: -128 - c * 32,
        rElbow: -42,
        lHip: 56 + c * 22,
        lKnee: 74,
        rHip: 56 - c * 22,
        rKnee: 74
      };
    }
    case 'fallen': {
      return {
        ...base,
        bodyLean: 6,
        headTilt: 8,
        bobY: 4,
        lShoulder: 78,
        lElbow: 26,
        rShoulder: -92,
        rElbow: -18,
        lHip: 28,
        lKnee: 14,
        rHip: -24,
        rKnee: 22,
        wholeTilt: 82
      };
    }
    case 'sit_think': {
      return {
        ...base,
        bodyLean: 16,
        headTilt: 18 + Math.sin(time * 2) * 3,
        bobY: 24 + breathe * 0.3,
        lShoulder: 44,
        lElbow: 88,
        rShoulder: -50,
        rElbow: -98,
        lHip: 80,
        lKnee: 86,
        rHip: 64 + Math.sin(time * 5.6) * 5.5,
        rKnee: 82
      };
    }
    case 'shadow_lurk': {
      return {
        ...base,
        bodyLean: 7 + Math.sin(time * 1.8) * 6,
        headTilt: Math.sin(time * 2.1) * 8,
        bobY: Math.sin(time * 2.3) * 6,
        lShoulder: 20 + Math.sin(time * 2.4) * 10,
        lElbow: 14,
        rShoulder: -20 - Math.sin(time * 2.4) * 10,
        rElbow: -14,
        alpha: 0.85 + Math.sin(time * 2.6) * 0.12
      };
    }
    case 'vanish': {
      const fade = clamp(1 - (time % 6) * 0.16, 0.08, 0.86);
      return {
        ...base,
        bodyLean: -4,
        bobY: -Math.sin(time * 2.2) * 8 - 10,
        lShoulder: 46 + Math.sin(time * 3.5) * 14,
        lElbow: 18,
        rShoulder: -46 - Math.sin(time * 3.5) * 14,
        rElbow: -18,
        alpha: fade
      };
    }
    default:
      return base;
  }
}

function interpolatePose(p1, p2, t) {
  const keys = [
    'bodyLean', 'headTilt', 'bobY', 'lShoulder', 'lElbow',
    'rShoulder', 'rElbow', 'lHip', 'lKnee', 'rHip', 'rKnee',
    'jitter', 'squashX', 'squashY', 'alpha', 'wholeTilt'
  ];
  const out = {};
  for (const k of keys) out[k] = lerp(p1[k], p2[k], t);
  return out;
}

function resolveKeyframedTransform(actor, sceneTime, sceneDuration) {
  const kfs = actor.keyframes;
  if (!Array.isArray(kfs) || kfs.length === 0) {
    return {
      prev: actor,
      next: actor,
      segT: 0,
      x: actor.x ?? 0.5,
      y: actor.y ?? 0.5,
      facing: actor.facing ?? 1,
      scale: actor.scale ?? 1,
      pitch: actor.pitch ?? 0,
      alpha: actor.alpha ?? 1,
      smoke: Boolean(actor.smoke),
      searchlight: Boolean(actor.searchlight)
    };
  }
  const normT = clamp(sceneTime / Math.max(0.1, sceneDuration), 0, 1);
  let prev = kfs[0];
  let next = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (normT >= kfs[i].t && normT <= kfs[i + 1].t) {
      prev = kfs[i];
      next = kfs[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, next.t - prev.t);
  const segT = prev === next ? 0 : easeInOut(clamp((normT - prev.t) / span, 0, 1));
  const baseScale = actor.scale ?? 1;
  return {
    prev,
    next,
    segT,
    x: lerp(prev.x ?? 0.5, next.x ?? prev.x ?? 0.5, segT),
    y: lerp(prev.y ?? 0.5, next.y ?? prev.y ?? 0.5, segT),
    facing: segT < 0.5 ? (prev.facing ?? actor.facing ?? 1) : (next.facing ?? prev.facing ?? actor.facing ?? 1),
    scale: baseScale * lerp(prev.scale ?? 1, next.scale ?? prev.scale ?? 1, segT),
    pitch: lerp(prev.pitch ?? 0, next.pitch ?? prev.pitch ?? 0, segT),
    alpha: lerp(prev.alpha ?? actor.alpha ?? 1, next.alpha ?? prev.alpha ?? actor.alpha ?? 1, segT),
    smoke: Boolean(prev.smoke || next.smoke || actor.smoke),
    searchlight: Boolean(prev.searchlight || next.searchlight || actor.searchlight)
  };
}

function resolveActorState(actor, sceneTime, sceneDuration, globalTime) {
  const tr = resolveKeyframedTransform(actor, sceneTime, sceneDuration);
  const kfs = actor.keyframes;
  if (!Array.isArray(kfs) || kfs.length === 0) {
    return {
      ...tr,
      expr: actor.expr || 'neutral',
      prop: actor.prop || 'none',
      speaking: Boolean(actor.speaking),
      poseName: actor.pose || 'idle',
      angles: getPoseAngles(actor.pose || 'idle', globalTime, actor.walkSpeed || 1)
    };
  }
  const { prev, next, segT } = tr;
  const a1 = getPoseAngles(prev.pose || 'idle', globalTime, prev.walkSpeed || 1);
  const a2 = getPoseAngles(next.pose || prev.pose || 'idle', globalTime, next.walkSpeed || prev.walkSpeed || 1);
  const angles = interpolatePose(a1, a2, segT);
  if (typeof prev.alpha === 'number' || typeof next.alpha === 'number') {
    angles.alpha = tr.alpha;
  }
  return {
    ...tr,
    expr: segT < 0.6 ? (prev.expr || 'neutral') : (next.expr || prev.expr || 'neutral'),
    prop: segT < 0.5 ? (prev.prop || 'none') : (next.prop || prev.prop || 'none'),
    speaking: segT < 0.5 ? Boolean(prev.speaking) : Boolean(next.speaking),
    poseName: segT < 0.5 ? (prev.pose || 'idle') : (next.pose || prev.pose || 'idle'),
    angles
  };
}

function resolveOutfit(actor, sceneBg) {
  if (actor.role === 'shadow') return 'shadow';
  if (actor.outfit) return actor.outfit;
  if (actor.hat === 'fedora' || actor.id === 'narrator') return 'detective';
  if (actor.id === 'radio') return 'radio';
  if (actor.hat === 'cap') {
    return sceneBg === 'snowNight' || sceneBg === 'darkRoom' || sceneBg === 'spotlight'
      ? 'rescuer'
      : 'pilot';
  }
  if (sceneBg === 'snowNight') return 'parka';
  return 'detective';
}

function limbEnd(x, y, angleDeg, len) {
  const rad = deg2rad(angleDeg);
  return {
    x: x + Math.sin(rad) * len,
    y: y + Math.cos(rad) * len
  };
}

function drawCartoonLimb(ctx, x1, y1, x2, y2, thickness, fillCol, outlineCol, isShadow) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = isShadow ? 'rgba(167, 139, 250, 0.55)' : outlineCol;
  ctx.lineWidth = thickness + 4.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = fillCol;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/* ─────────────────────────── HUMAN CARTOON RIG ─────────────────────────── */

function drawActor(ctx, actor, width, height, scene, sceneTime, sceneDuration, globalTime, interactive, pal) {
  const state = resolveActorState(actor, sceneTime, sceneDuration, globalTime);
  const overridePos = interactive?.overrides?.[actor.id];
  const ax = overridePos ? overridePos.x : state.x;
  const ay = overridePos ? overridePos.y : state.y;

  const scale = state.scale * (Math.min(width, height) / 720);
  const cx = ax * width;
  const cy = ay * height;
  const facing = state.facing;
  const outfit = resolveOutfit(actor, scene.bg);
  const isShadow = outfit === 'shadow';

  // Color palette per outfit
  let jacketTop = actor.color || '#3b82f6';
  let jacketBot = shadeColor(jacketTop, -42);
  let pantsCol = '#1e293b';
  let pantsDark = '#0f172a';
  let sleeveTop = jacketTop;
  let sleeveBack = shadeColor(jacketTop, -44);
  let bootCol = '#111827';
  let skinTop = '#f8d5b8';
  let skinBot = '#dca17b';
  let handCol = '#f3c6a5';

  if (isShadow) {
    jacketTop = '#070a14';
    jacketBot = '#04060c';
    pantsCol = '#05070e';
    pantsDark = '#020408';
    sleeveTop = '#070a14';
    sleeveBack = '#04060c';
    skinTop = '#14192b';
    skinBot = '#04060c';
    handCol = '#090d18';
  } else if (outfit === 'parka') {
    jacketTop = actor.color || '#eab308';
    jacketBot = shadeColor(jacketTop, -45);
    sleeveTop = jacketTop;
    sleeveBack = shadeColor(jacketTop, -46);
    pantsCol = '#1e293b';
    pantsDark = '#0f172a';
    bootCol = '#271a12';
    handCol = '#334155'; // mittens
  } else if (outfit === 'barefoot') {
    jacketTop = actor.color || '#64748b';
    jacketBot = '#475569';
    sleeveTop = jacketTop;
    sleeveBack = '#334155';
    pantsCol = '#334155';
    pantsDark = '#1e293b';
    bootCol = '#cbd5e1'; // pale bare feet / socks
    skinTop = '#e2d7d5';
    skinBot = '#b8a9b2';
    handCol = '#d8c8cc';
  } else if (outfit === 'rescuer') {
    jacketTop = '#3f5a4a';
    jacketBot = '#283b30';
    sleeveTop = '#3f5a4a';
    sleeveBack = '#283b30';
    pantsCol = '#1f2937';
    pantsDark = '#111827';
    bootCol = '#111827';
    handCol = '#1e293b';
  } else if (outfit === 'forensic') {
    jacketTop = '#f8fafc';
    jacketBot = '#cbd5e1';
    sleeveTop = '#f1f5f9';
    sleeveBack = '#94a3b8';
    pantsCol = '#1e293b';
    pantsDark = '#0f172a';
    bootCol = '#090d16';
  } else if (outfit === 'pilot') {
    jacketTop = '#7c4a2d';
    jacketBot = '#4a2916';
    sleeveTop = '#7c4a2d';
    sleeveBack = '#4a2916';
    pantsCol = '#78716c';
    pantsDark = '#57534e';
    bootCol = '#27170e';
    handCol = '#4a2916'; // flight gloves
  } else if (outfit === 'radio') {
    jacketTop = '#334e68';
    jacketBot = '#1e3246';
    sleeveTop = '#334e68';
    sleeveBack = '#1e3246';
    pantsCol = '#1e293b';
    pantsDark = '#0f172a';
    bootCol = '#0f172a';
  } else if (outfit === 'detective') {
    jacketTop = '#475569';
    jacketBot = '#1e293b';
    sleeveTop = '#475569';
    sleeveBack = '#1e293b';
    pantsCol = '#111827';
    pantsDark = '#070b14';
  }

  const reactAge = interactive?.reactions?.[actor.id] != null
    ? Math.max(0, globalTime - interactive.reactions[actor.id])
    : 99;
  const reactBounce = reactAge < 0.55 ? Math.sin((reactAge / 0.55) * Math.PI) * -32 : 0;
  const reactSquash = reactAge < 0.55 ? 1 + Math.sin((reactAge / 0.55) * Math.PI) * 0.16 : 1;

  const p = state.angles;
  const jx = p.jitter ? Math.sin(globalTime * 34) * p.jitter * scale : 0;
  const jy = p.jitter ? Math.cos(globalTime * 28) * p.jitter * scale : 0;

  if (interactive?.hitboxes) {
    interactive.hitboxes.push({
      id: actor.id,
      x: cx,
      y: cy - 78 * scale,
      r: 62 * scale
    });
  }

  // Snow/dust kick particles when walking or running
  if ((state.poseName === 'walk' || state.poseName === 'run') && !isShadow) {
    const stepFreq = state.poseName === 'run' ? 18 : 11;
    if (Math.sin(globalTime * stepFreq) > 0.72) {
      ctx.save();
      ctx.fillStyle = scene.bg === 'snowNight' ? 'rgba(241, 245, 249, 0.5)' : 'rgba(203, 213, 225, 0.3)';
      ctx.beginPath();
      ctx.arc(cx - facing * 22 * scale, cy - 4 * scale, (state.poseName === 'run' ? 8 : 5.5) * scale, 0, Math.PI * 2);
      ctx.arc(cx - facing * 34 * scale, cy - 8 * scale, (state.poseName === 'run' ? 5 : 3) * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (isShadow || state.poseName === 'vanish') {
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const px = cx + Math.sin(globalTime * 2.8 + i * 1.4) * (24 + (i % 3) * 10) * scale;
      const py = cy - ((globalTime * 54 + i * 24) % (170 * scale));
      ctx.fillStyle = i % 2 === 0 ? 'rgba(167, 139, 250, 0.45)' : 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(px, py, (2 + (i % 3)) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = clamp(p.alpha, 0, 1);

  // Ground shadow before wholeTilt
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const shGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, p.wholeTilt > 30 ? 64 : 44);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.ellipse(p.wholeTilt > 30 ? 22 : 0, 0, p.wholeTilt > 30 ? 64 : 44, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(cx + jx, cy + (p.bobY + reactBounce) * scale + jy);
  ctx.scale(facing * scale * (p.squashX / reactSquash), scale * (p.squashY * reactSquash));
  if (p.wholeTilt) {
    ctx.translate(0, -14);
    ctx.rotate(deg2rad(p.wholeTilt));
    ctx.translate(0, 14);
  }

  const hipX = 0;
  const hipY = -74;
  const torsoLen = 64;
  const leanRad = deg2rad(p.bodyLean);
  const shoulderX = hipX + Math.sin(leanRad) * torsoLen;
  const shoulderY = hipY - Math.cos(leanRad) * torsoLen;

  const headRadius = 24;
  const neckX = shoulderX + Math.sin(leanRad) * 11;
  const neckY = shoulderY - Math.cos(leanRad) * 11;
  const headX = neckX + Math.sin(deg2rad(p.bodyLean + p.headTilt)) * (headRadius + 4);
  const headY = neckY - Math.cos(deg2rad(p.bodyLean + p.headTilt)) * (headRadius + 4);

  // Legs helper
  const thighLen = 38;
  const shinLen = 38;
  const drawLeg = (hipAngle, kneeAngle, isBack) => {
    const knee = limbEnd(hipX, hipY, hipAngle, thighLen);
    const foot = limbEnd(knee.x, knee.y, hipAngle - kneeAngle, shinLen);
    const col = isBack ? pantsDark : pantsCol;
    drawCartoonLimb(ctx, hipX, hipY, knee.x, knee.y, 13, col, OUTLINE, isShadow);
    drawCartoonLimb(ctx, knee.x, knee.y, foot.x, foot.y, 11, col, OUTLINE, isShadow);

    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.fillStyle = bootCol;
    ctx.strokeStyle = isShadow ? 'rgba(167, 139, 250, 0.5)' : OUTLINE;
    ctx.lineWidth = 2.4;
    if (outfit === 'barefoot') {
      // Exposed ankle & pale foot
      ctx.beginPath();
      ctx.ellipse(6, 1, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Rugged boot
      roundRect(ctx, -7, -7, 23, 12, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return foot;
  };

  drawLeg(p.lHip, p.lKnee, true);

  // Arms helper
  const upperArmLen = 31;
  const foreArmLen = 29;
  const drawArm = (shAngle, elAngle, isBack) => {
    const elbow = limbEnd(shoulderX, shoulderY, shAngle, upperArmLen);
    const hand = limbEnd(elbow.x, elbow.y, shAngle + elAngle, foreArmLen);
    const col = isBack ? sleeveBack : sleeveTop;
    drawCartoonLimb(ctx, shoulderX, shoulderY, elbow.x, elbow.y, 11.5, col, OUTLINE, isShadow);
    drawCartoonLimb(ctx, elbow.x, elbow.y, hand.x, hand.y, 10, col, OUTLINE, isShadow);

    ctx.save();
    ctx.fillStyle = handCol;
    ctx.strokeStyle = isShadow ? 'rgba(167, 139, 250, 0.6)' : OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, outfit === 'parka' ? 7 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return hand;
  };

  const leftHand = drawArm(p.lShoulder, p.lElbow, true);

  // Backpack behind torso for hikers
  if (outfit === 'parka' && !isShadow) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(leanRad);
    ctx.fillStyle = '#573b26';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    roundRect(ctx, -29, -torsoLen + 4, 18, 46, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#785337';
    ctx.fillRect(-28, -torsoLen + 10, 15, 10);
    ctx.restore();
  }

  // Flowing trenchcoat / long winter coat tail
  if ((outfit === 'detective' || outfit === 'rescuer' || outfit === 'forensic') && !isShadow) {
    const flap = Math.sin(globalTime * 4.8) * (state.poseName === 'walk' || state.poseName === 'run' ? 12 : 3);
    ctx.save();
    ctx.fillStyle = outfit === 'forensic' ? '#cbd5e1' : jacketBot;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 13, shoulderY + 6);
    ctx.quadraticCurveTo(hipX - 24 - flap, hipY + 14, hipX - 22 - flap, hipY + 32);
    ctx.lineTo(hipX + 14, hipY + 24);
    ctx.lineTo(shoulderX + 12, shoulderY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Sculpted Jacket / Torso
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(leanRad);
  const torsoGrad = ctx.createLinearGradient(-16, -torsoLen, 16, 0);
  torsoGrad.addColorStop(0, jacketTop);
  torsoGrad.addColorStop(1, jacketBot);
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = isShadow ? 'rgba(167, 139, 250, 0.65)' : OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -torsoLen + 4);
  ctx.quadraticCurveTo(0, -torsoLen - 5, 16, -torsoLen + 4);
  ctx.lineTo(14, 3);
  ctx.quadraticCurveTo(0, 8, -14, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outfit chest details
  if (!isShadow) {
    if (outfit === 'parka') {
      // Center storm flap + quilt ribs + fur collar
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3, -torsoLen + 2);
      ctx.lineTo(3, 3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.moveTo(-14, -torsoLen * 0.66);
      ctx.lineTo(14, -torsoLen * 0.66);
      ctx.moveTo(-14, -torsoLen * 0.34);
      ctx.lineTo(14, -torsoLen * 0.34);
      ctx.stroke();
      // Fur hood collar around neck
      ctx.fillStyle = '#e7e5e4';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(-2, -torsoLen + 2, 17, 7, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (outfit === 'pilot') {
      // Shearling collar + Yellow Mae West life vest
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -torsoLen + 2, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      roundRect(ctx, -11, -torsoLen + 9, 22, 34, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-13, -torsoLen + 36, 26, 5);
    } else if (outfit === 'forensic') {
      // Tie & V-neck shirt inside white lab coat
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-6, -torsoLen + 2);
      ctx.lineTo(9, -torsoLen + 2);
      ctx.lineTo(3, -torsoLen + 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(1, -torsoLen + 4);
      ctx.lineTo(5, -torsoLen + 24);
      ctx.lineTo(2, -torsoLen + 28);
      ctx.lineTo(-1, -torsoLen + 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3, -torsoLen + 28);
      ctx.lineTo(3, 3);
      ctx.stroke();
    } else if (outfit === 'rescuer') {
      // Belt + buttons
      ctx.fillStyle = '#111827';
      ctx.fillRect(-15, -20, 30, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(4, -20, 6, 6);
    } else if (outfit === 'radio' || outfit === 'detective') {
      // Tie & belt
      ctx.fillStyle = outfit === 'radio' ? '#1e293b' : '#dc2626';
      ctx.beginPath();
      ctx.moveTo(2, -torsoLen + 2);
      ctx.lineTo(6, -torsoLen + 26);
      ctx.lineTo(3, -torsoLen + 31);
      ctx.lineTo(0, -torsoLen + 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, -18, 28, 5);
    }

    // Rim-light highlight along facing shoulder/chest edge
    ctx.strokeStyle = pal.rim;
    ctx.globalAlpha *= 0.45;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(13, -torsoLen + 6);
    ctx.lineTo(11, -3);
    ctx.stroke();
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
  }
  ctx.restore();

  // Front leg
  drawLeg(p.rHip, p.rKnee, false);

  // Neck cylinder
  if (!isShadow) {
    ctx.fillStyle = skinBot;
    ctx.fillRect(neckX - 5, neckY - 8, 10, 14);
  }

  // Sculpted Cartoon Head
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(deg2rad((p.bodyLean + p.headTilt) * 0.45));

  const hGrad = ctx.createRadialGradient(-5, -8, 4, 0, 0, headRadius + 5);
  hGrad.addColorStop(0, skinTop);
  hGrad.addColorStop(1, skinBot);

  ctx.fillStyle = hGrad;
  ctx.strokeStyle = isShadow ? 'rgba(167, 139, 250, 0.72)' : OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Slightly elongated jaw-to-cranium head contour
  ctx.ellipse(0, 0, headRadius - 1, headRadius + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Back hair & ear
  if (!isShadow) {
    ctx.fillStyle = outfit === 'pilot' || outfit === 'rescuer' ? '#291c15' : '#1f2937';
    ctx.beginPath();
    ctx.arc(-8, -7, 17, Math.PI * 0.6, Math.PI * 1.65);
    ctx.fill();

    // Ear
    ctx.fillStyle = skinBot;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-12, 2, 4.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim-light on front cheek/forehead
    ctx.strokeStyle = pal.rim;
    ctx.globalAlpha *= 0.6;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, headRadius - 3, -0.85, 0.75);
    ctx.stroke();
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
  }

  // Eye gaze toward cursor
  let gazeOffsetX = 0;
  let gazeOffsetY = 0;
  if (interactive?.pointer?.active) {
    const dx = interactive.pointer.x * width - cx;
    const dy = interactive.pointer.y * height - (cy - 140 * scale);
    gazeOffsetX = clamp((dx * facing) / 140, -2.5, 3.2);
    gazeOffsetY = clamp(dy / 160, -2.5, 2.5);
  }

  drawCartoonExpression(
    ctx, 0, 0, state.expr, isShadow, outfit, globalTime,
    state.speaking, gazeOffsetX, gazeOffsetY, pal
  );

  // Headgear / Hair per outfit
  if (!isShadow) {
    drawHeadgear(ctx, outfit, actor, headRadius, pal);
  }

  // Cold breath vapor in snow scenes
  if (scene.bg === 'snowNight' && !isShadow && state.poseName !== 'fallen') {
    const breathPhase = (globalTime + (actor.id.charCodeAt(0) % 5) * 0.45) % 2.4;
    if (breathPhase < 1.15) {
      const bp = breathPhase / 1.15;
      ctx.save();
      ctx.globalAlpha = (1 - bp) * 0.48;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(20 + bp * 22, 9 - bp * 8, 4 + bp * 9, 0, Math.PI * 2);
      ctx.arc(25 + bp * 28, 6 - bp * 12, 3 + bp * 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore(); // end head transform

  // Expressive emotion markers
  if (state.poseName === 'scared' || state.poseName === 'gasp') {
    const pop = Math.sin(globalTime * 9) * 3.5;
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 2;
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('!', headX - 30, headY - 30 + pop);
    ctx.fillText('!', headX - 30, headY - 30 + pop);
    ctx.restore();
  } else if (state.poseName === 'confused') {
    const pop = Math.sin(globalTime * 4.5) * 4;
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('?', headX + 26, headY - 32 + pop);
    ctx.fillText('?', headX + 26, headY - 32 + pop);
    ctx.restore();
  }

  // Front arm & held prop
  const rightHand = drawArm(p.rShoulder, p.rElbow, false);
  if (state.prop && state.prop !== 'none') {
    drawHandProp(ctx, state.prop, rightHand, leftHand, globalTime);
  }

  ctx.restore();
}

function drawHeadgear(ctx, outfit, actor, r, pal) {
  ctx.save();
  if (outfit === 'detective' || actor.hat === 'fedora') {
    ctx.translate(0, -r + 5);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(2, 2, 32, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -16, -18, 32, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-16, -4, 32, 4);
  } else if (outfit === 'pilot') {
    // Leather aviator helmet + goggles on forehead
    ctx.fillStyle = '#4a2916';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -3, r + 1.5, Math.PI * 0.92, Math.PI * 0.08);
    ctx.lineTo(-14, 14);
    ctx.lineTo(-22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Silver aviator goggles sitting on brow
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-10, -18, 28, 9);
    ctx.strokeRect(-10, -18, 28, 9);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(5, -16, 11, 5);
  } else if (outfit === 'rescuer') {
    // Fur Ushanka hat with earflaps
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    roundRect(ctx, -21, -r - 8, 42, 20, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    roundRect(ctx, -18, -r + 1, 36, 12, 5);
    ctx.fill();
    ctx.stroke();
    // Earflap down side
    ctx.fillStyle = '#475569';
    roundRect(ctx, -22, -r + 4, 11, 22, 4);
    ctx.fill();
    ctx.stroke();
  } else if (outfit === 'radio') {
    // Naval cap + dual radio headset + boom mic
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -6, r, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(15, -6, 13, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Headset band & ear cup + mic
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-8, -2, r - 2, -Math.PI * 0.72, -Math.PI * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-11, 1, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(2, 16, 14, 12);
    ctx.stroke();
  } else if (outfit === 'parka') {
    // Knit winter beanie / fur hood brim
    ctx.fillStyle = actor.color ? shadeColor(actor.color, -25) : '#b45309';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -6, r + 1, Math.PI * 0.96, -0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e7e5e4';
    ctx.beginPath();
    ctx.ellipse(0, -9, r + 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Neat swept hair for barefoot / forensic
    ctx.fillStyle = outfit === 'forensic' ? '#475569' : '#27272a';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.quadraticCurveTo(-22, -28, 2, -26);
    ctx.quadraticCurveTo(18, -24, 19, -11);
    ctx.quadraticCurveTo(4, -17, -11, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawCartoonExpression(ctx, hx, hy, expr, isShadow, outfit, time, speaking, gx, gy, pal) {
  ctx.save();
  const blinkPhase = time % 3.4;
  const isBlinking = !isShadow && blinkPhase > 3.25;

  if (expr === 'empty_eyes' || isShadow) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(hx + 6 + gx, hy - 3 + gy, 4.4, 2.4, -0.18, 0, Math.PI * 2);
    ctx.ellipse(hx + 16 + gx, hy - 3 + gy, 3.8, 2.2, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Subtle nose bridge
  ctx.strokeStyle = 'rgba(120, 62, 34, 0.55)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx + 12, hy - 2);
  ctx.lineTo(hx + 15, hy + 4);
  ctx.lineTo(hx + 11.5, hy + 5);
  ctx.stroke();

  if (isBlinking) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx + 2 + gx, hy - 3 + gy);
    ctx.lineTo(hx + 10 + gx, hy - 3 + gy);
    ctx.moveTo(hx + 13 + gx, hy - 3 + gy);
    ctx.lineTo(hx + 20 + gx, hy - 3 + gy);
    ctx.stroke();
  } else {
    const eyeR = expr === 'shocked' ? 5.0 : 4.0;
    [hx + 6, hx + 16].forEach((ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ex + gx * 0.5, hy - 4 + gy * 0.5, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Iris
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(ex + gx * 0.85 + 0.8, hy - 4 + gy * 0.85, expr === 'shocked' ? 2.1 : 2.7, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex + gx * 0.9 + 0.9, hy - 4 + gy * 0.9, expr === 'shocked' ? 1.3 : 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + gx * 0.9 + 1.6, hy - 5.2 + gy * 0.9, 0.95, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Forensic glasses rim
  if (outfit === 'forensic') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(hx + 1, hy - 9, 9.5, 9);
    ctx.strokeRect(hx + 11.5, hy - 9, 9.5, 9);
  }

  // Expressive eyebrows
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.3;
  ctx.lineCap = 'round';
  if (expr === 'suspicious') {
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy - 11);
    ctx.lineTo(hx + 10, hy - 9);
    ctx.moveTo(hx + 13, hy - 9);
    ctx.lineTo(hx + 21, hy - 11);
    ctx.stroke();
  } else if (expr === 'sad') {
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy - 9);
    ctx.lineTo(hx + 9, hy - 12);
    ctx.moveTo(hx + 13, hy - 12);
    ctx.lineTo(hx + 20, hy - 9);
    ctx.stroke();
  } else if (expr === 'shocked' || expr === 'curious') {
    ctx.beginPath();
    ctx.arc(hx + 6, hy - 11, 4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx + 16, hy - 11, 4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy - 10);
    ctx.lineTo(hx + 9, hy - 10);
    ctx.moveTo(hx + 13, hy - 10);
    ctx.lineTo(hx + 20, hy - 10);
    ctx.stroke();
  }

  // Mouth
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  if (speaking) {
    const open = 1.8 + Math.abs(Math.sin(time * 16)) * 4.4;
    ctx.beginPath();
    ctx.ellipse(hx + 10.5, hy + 11, 4.4, open, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'shocked') {
    ctx.beginPath();
    ctx.ellipse(hx + 10.5, hy + 11, 4.2, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'sad') {
    ctx.beginPath();
    ctx.arc(hx + 10.5, hy + 14, 4.2, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else if (expr === 'curious') {
    ctx.beginPath();
    ctx.arc(hx + 10.5, hy + 9, 4.2, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy + 11);
    ctx.lineTo(hx + 14, hy + 10.5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─────────────────────────── HAND PROPS ─────────────────────────── */

function drawHandProp(ctx, prop, hand, altHand, time) {
  ctx.save();
  if (prop === 'passport') {
    ctx.translate(hand.x + 2, hand.y - 4);
    ctx.rotate(-0.2 + Math.sin(time * 3) * 0.06);
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 2;
    ctx.fillRect(-10, -13, 20, 26);
    ctx.strokeRect(-10, -13, 20, 26);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -1, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'clipboard') {
    ctx.translate(hand.x + 3, hand.y - 4);
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRect(ctx, -12, -16, 24, 30, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-9, -11, 18, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -7, 12, 2);
    ctx.fillRect(-6, -2, 10, 2);
    ctx.fillRect(-6, 3, 12, 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-5, -18, 10, 5);
  } else if (prop === 'suitcase') {
    ctx.translate(altHand.x, altHand.y + 13);
    ctx.rotate(Math.sin(time * 6) * 0.1);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    roundRect(ctx, -19, -12, 38, 25, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -12, 7, Math.PI, 0);
    ctx.stroke();
  } else if (prop === 'flashlight') {
    ctx.translate(hand.x, hand.y);
    const wobble = Math.sin(time * 2.5) * 0.12;
    ctx.rotate(-0.18 + wobble);
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8;
    roundRect(ctx, -5, -5, 22, 10, 3);
    ctx.fill();
    ctx.stroke();
    const grad = ctx.createLinearGradient(17, 0, 330, 0);
    grad.addColorStop(0, 'rgba(254, 243, 199, 0.55)');
    grad.addColorStop(0.55, 'rgba(254, 243, 199, 0.15)');
    grad.addColorStop(1, 'rgba(254, 243, 199, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(17, -5);
    ctx.lineTo(330, -98);
    ctx.lineTo(330, 98);
    ctx.lineTo(17, 5);
    ctx.closePath();
    ctx.fill();
  } else if (prop === 'knife') {
    ctx.translate(hand.x + 2, hand.y - 2);
    ctx.rotate(-0.45 + Math.sin(time * 8) * 0.08);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillRect(-6, -3, 12, 6);
    ctx.strokeRect(-6, -3, 12, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.lineTo(28, -1);
    ctx.lineTo(22, 4);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (prop === 'camera') {
    ctx.translate(hand.x + 4, hand.y - 3);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRect(ctx, -13, -10, 26, 18, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-13, -10, 26, 5);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(3, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'radio_mic') {
    ctx.translate(hand.x + 2, hand.y - 3);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRect(ctx, -7, -10, 14, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(4, -4);
    ctx.moveTo(-2, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
  } else if (prop === 'geiger_wand') {
    ctx.translate(hand.x, hand.y);
    ctx.rotate(0.25 + Math.sin(time * 4) * 0.08);
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillRect(0, -3, 28, 6);
    ctx.strokeRect(0, -3, 28, 6);
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, 26, -7, 16, 14, 3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/* ─────────────────────────── VEHICLE ACTORS ─────────────────────────── */

function drawVehicleActor(ctx, actor, width, height, sceneTime, sceneDuration, globalTime, interactive, floorRatio) {
  const tr = resolveKeyframedTransform(actor, sceneTime, sceneDuration);
  const overridePos = interactive?.overrides?.[actor.id];
  const ax = overridePos ? overridePos.x : tr.x;
  const ay = overridePos ? overridePos.y : tr.y;

  const baseScale = tr.scale * (Math.min(width, height) / 720);
  const cx = ax * width;
  const cy = ay * height;
  const pitch = tr.pitch || 0;
  const facing = tr.facing;

  if (interactive?.hitboxes) {
    interactive.hitboxes.push({
      id: actor.id,
      x: cx,
      y: cy,
      r: 64 * baseScale
    });
  }

  ctx.save();
  ctx.globalAlpha = clamp(tr.alpha, 0, 1);

  // Subtle ambient bob for flying planes/helicopters or waves for ship
  const flyBobY = actor.role === 'ship'
    ? Math.sin(globalTime * 2.2) * 5
    : Math.sin(globalTime * 3.1 + ax * 4) * 4;
  const shipRock = actor.role === 'ship' ? Math.sin(globalTime * 1.9) * 2.6 : 0;

  ctx.translate(cx, cy + flyBobY * baseScale);
  ctx.scale(facing * baseScale, baseScale);
  ctx.rotate(deg2rad(-pitch + shipRock));

  if (actor.role === 'plane') {
    const isMariner = actor.variant === 'mariner';
    const s = isMariner ? 1.32 : 1.0;
    ctx.scale(s, s);

    // Searchlight cone beneath rescue plane
    if (tr.searchlight) {
      const sweep = Math.sin(globalTime * 2.1) * 35;
      const beam = ctx.createLinearGradient(10, 12, sweep, 280);
      beam.addColorStop(0, 'rgba(254, 243, 199, 0.42)');
      beam.addColorStop(1, 'rgba(254, 243, 199, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(4, 12);
      ctx.lineTo(sweep - 75, 290);
      ctx.lineTo(sweep + 95, 290);
      ctx.lineTo(22, 12);
      ctx.closePath();
      ctx.fill();
    }

    // Smoke plume when engine fails / descending
    if (tr.smoke) {
      for (let i = 0; i < 6; i++) {
        const tOff = ((globalTime * 1.8 + i * 0.28) % 1);
        ctx.fillStyle = `rgba(30, 41, 59, ${(1 - tOff) * 0.58})`;
        ctx.beginPath();
        ctx.arc(-18 - tOff * 95, -4 - tOff * 22 + Math.sin(globalTime * 5 + i) * 4, 8 + tOff * 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fuselage upper (US Navy Deep Blue) + lower belly
    const fuseGrad = ctx.createLinearGradient(0, -18, 0, 18);
    fuseGrad.addColorStop(0, '#2e5485');
    fuseGrad.addColorStop(0.58, '#1e3a5f');
    fuseGrad.addColorStop(0.6, '#cbd5e1');
    fuseGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = fuseGrad;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (isMariner) {
      // PBM Mariner flying boat hull
      ctx.moveTo(-88, -14);
      ctx.lineTo(-68, -42);
      ctx.lineTo(-50, -40);
      ctx.lineTo(-42, -16);
      ctx.lineTo(22, -20);
      ctx.quadraticCurveTo(68, -18, 76, -2);
      ctx.quadraticCurveTo(64, 18, 22, 20);
      ctx.lineTo(-10, 20);
      ctx.lineTo(-24, 11);
      ctx.lineTo(-84, 6);
    } else {
      // TBM Avenger bomber profile
      ctx.moveTo(-76, -8);
      ctx.lineTo(-66, -34);
      ctx.lineTo(-48, -32);
      ctx.lineTo(-38, -12);
      ctx.lineTo(18, -16);
      ctx.quadraticCurveTo(56, -15, 62, -2);
      ctx.quadraticCurveTo(58, 14, 18, 16);
      ctx.lineTo(-62, 10);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Greenhouse cockpit canopy
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-24, -14);
    ctx.quadraticCurveTo(0, -30, 26, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(-4, -14);
    ctx.moveTo(10, -21);
    ctx.lineTo(10, -14);
    ctx.stroke();

    // Wing silhouette with slight perspective
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(18, 2);
    ctx.lineTo(-14, 24);
    ctx.lineTo(-26, 22);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // US Star roundel emblem on aft fuselage
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-38, -3, 18, 6);
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.arc(-29, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(-29, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Red/Yellow engine nose ring + spinning propeller blur
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(58, -11, 5, 22);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(65, 0, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const propR = 24 + Math.sin(globalTime * 42) * 3;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(67, 0, 3.5, propR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wingtip nav strobe
    if (Math.sin(globalTime * 8) > 0.2) {
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(-18, 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (actor.role === 'helicopter') {
    // Sweeping rescue searchlight cone
    const sweep = Math.sin(globalTime * 2.2) * 45;
    const beam = ctx.createLinearGradient(12, 16, sweep, 290);
    beam.addColorStop(0, 'rgba(254, 243, 199, 0.48)');
    beam.addColorStop(1, 'rgba(254, 243, 199, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(sweep - 85, 295);
    ctx.lineTo(sweep + 95, 295);
    ctx.lineTo(24, 16);
    ctx.closePath();
    ctx.fill();

    // Tail boom & vertical fin
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-22, -6);
    ctx.lineTo(-86, -12);
    ctx.lineTo(-92, -32);
    ctx.lineTo(-80, -32);
    ctx.lineTo(-74, -4);
    ctx.lineTo(-22, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail rotor blur
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-88, -22, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Rounded rescue cabin fuselage
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(6, 2, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Orange rescue stripe + red star emblem
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-20, 4, 48, 7);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-14, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Large glass cockpit nose
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(24, -2, 16, -Math.PI * 0.55, Math.PI * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Landing skids
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-14, 22);
    ctx.lineTo(-18, 32);
    ctx.moveTo(22, 22);
    ctx.lineTo(26, 32);
    ctx.moveTo(-28, 32);
    ctx.lineTo(38, 32);
    ctx.stroke();

    // Top main rotor mast & spinning disc blur
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, -30, 10, 11);
    const bladeLen = 68 + Math.sin(globalTime * 48) * 14;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(1, -30, bladeLen, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (actor.role === 'ship') {
    // Upward/forward bridge searchlight cone
    if (tr.searchlight) {
      const sweep = Math.sin(globalTime * 1.4) * 40;
      const beam = ctx.createLinearGradient(-10, -45, 220, -180 + sweep);
      beam.addColorStop(0, 'rgba(254, 243, 199, 0.45)');
      beam.addColorStop(1, 'rgba(254, 243, 199, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-10, -45);
      ctx.lineTo(240, -220 + sweep);
      ctx.lineTo(255, -110 + sweep);
      ctx.lineTo(-10, -34);
      ctx.closePath();
      ctx.fill();
    }

    // Smokestack chimney + smoke
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    roundRect(ctx, -24, -66, 16, 32, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-24, -60, 16, 6);

    for (let i = 0; i < 5; i++) {
      const tOff = (globalTime * 0.7 + i * 0.2) % 1;
      ctx.fillStyle = `rgba(148, 163, 184, ${(1 - tOff) * 0.45})`;
      ctx.beginPath();
      ctx.arc(-18 - tOff * 58, -72 - tOff * 36, 7 + tOff * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // White superstructure bridge + glowing portholes
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.fillRect(-44, -40, 56, 26);
    ctx.strokeRect(-44, -40, 56, 26);
    ctx.fillStyle = '#fbbf24';
    for (let wx = -36; wx <= 2; wx += 11) {
      ctx.fillRect(wx, -34, 6, 6);
    }

    // Main cargo hull
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-88, -14);
    ctx.lineTo(74, -18);
    ctx.lineTo(94, -22);
    ctx.lineTo(78, 14);
    ctx.lineTo(-82, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red waterline band
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-81, 4, 159, 10);
  }

  ctx.restore();

  // Water splash if plane hits ocean level
  if (actor.role === 'plane' && ay >= floorRatio - 0.04) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(baseScale, baseScale);
    const sp = (globalTime * 3) % 1;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 6, 30 + sp * 48, 8 + sp * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 14, -Math.abs(Math.sin(globalTime * 9 + i)) * 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ─────────────────────────── MULTI-LAYER BACKGROUNDS ─────────────────────────── */

function drawBackground(ctx, bg, mood, width, height, sceneTime, globalTime, subBg) {
  const pal = MOOD_PALETTES[mood] || MOOD_PALETTES.mysterious;
  const isPortrait = height > width;
  const floorRatio = isPortrait ? 0.68 : 0.74;
  const floorY = height * floorRatio;

  if (bg === 'oceanDay') {
    const sky = ctx.createLinearGradient(0, 0, 0, floorY);
    sky.addColorStop(0, '#0c4a6e');
    sky.addColorStop(0.55, '#0284c7');
    sky.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Warm sun + soft glow
    const sunGrad = ctx.createRadialGradient(width * 0.78, height * 0.2, 8, width * 0.78, height * 0.2, 130);
    sunGrad.addColorStop(0, '#fef9c3');
    sunGrad.addColorStop(0.25, 'rgba(253, 224, 71, 0.65)');
    sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.2, 130, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy drifting cumulus clouds
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    for (let c = 0; c < 4; c++) {
      const cx = ((c * width * 0.34 + globalTime * (10 + c * 3)) % (width + 240)) - 120;
      const cy = height * (0.16 + (c % 2) * 0.1);
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.arc(cx + 26, cy - 8, 34, 0, Math.PI * 2);
      ctx.arc(cx + 56, cy, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant Bahama shoal islands
    ctx.fillStyle = '#0f5132';
    ctx.beginPath();
    ctx.ellipse(width * 0.24, floorY, 75, 11, 0, Math.PI, 0);
    ctx.ellipse(width * 0.68, floorY, 55, 8, 0, Math.PI, 0);
    ctx.fill();

    drawOceanWaves(ctx, width, height, floorY, globalTime, ['#0369a1', '#0284c7', '#0e7490', '#0c4a6e']);
    return;
  }

  if (bg === 'oceanSunset') {
    const sky = ctx.createLinearGradient(0, 0, 0, floorY);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(0.45, '#7c2d12');
    sky.addColorStop(0.82, '#ea580c');
    sky.addColorStop(1, '#fbbf24');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Low amber sun on left horizon
    const sunGrad = ctx.createRadialGradient(width * 0.24, floorY - 24, 12, width * 0.24, floorY - 24, 140);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.35, 'rgba(251, 146, 60, 0.65)');
    sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.24, floorY - 24, 140, 0, Math.PI * 2);
    ctx.fill();

    // Dark storm clouds gathering on right
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      ctx.arc(width * 0.68 + c * 65, height * 0.24 + (c % 2) * 18, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    drawOceanWaves(ctx, width, height, floorY, globalTime, ['#7c2d12', '#4c1d95', '#1e293b', '#0f172a']);
    return;
  }

  // Standard dark mood sky backdrop
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, pal.bgTop);
  g.addColorStop(0.58, pal.bgMid);
  g.addColorStop(1, pal.bgBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  if (bg === 'snowNight') {
    // Twinkling stars
    ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
    for (let i = 0; i < 38; i++) {
      const sx = ((i * 137) % width);
      const sy = ((i * 79) % (floorY * 0.65));
      const r = 0.8 + Math.abs(Math.sin(globalTime * 2 + i)) * 1.3;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing moon with corona
    const mx = width * 0.82;
    const my = height * 0.17;
    const moonGlow = ctx.createRadialGradient(mx, my, 18, mx, my, 120);
    moonGlow.addColorStop(0, 'rgba(226, 232, 240, 0.92)');
    moonGlow.addColorStop(0.28, 'rgba(186, 230, 253, 0.28)');
    moonGlow.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(mx, my, 24, 0, Math.PI * 2);
    ctx.fill();

    // Subtle undulating arctic aurora ribbon
    const aurGrad = ctx.createLinearGradient(0, height * 0.08, width, height * 0.34);
    aurGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
    aurGrad.addColorStop(0.45, 'rgba(52, 211, 153, 0.12)');
    aurGrad.addColorStop(1, 'rgba(167, 139, 250, 0.08)');
    ctx.fillStyle = aurGrad;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.22);
    for (let x = 0; x <= width; x += 60) {
      ctx.lineTo(x, height * 0.18 + Math.sin(x * 0.008 + globalTime * 0.5) * 18);
    }
    ctx.lineTo(width, height * 0.32);
    ctx.lineTo(0, height * 0.32);
    ctx.closePath();
    ctx.fill();

    // Faceted 3D Far Mountain Range
    drawFacetedMountain(ctx, width * 0.18, floorY, width * 0.42, height * 0.42, '#476b8f', '#15233a');
    drawFacetedMountain(ctx, width * 0.56, floorY, width * 0.52, height * 0.52, '#5c84ab', '#101d32');
    drawFacetedMountain(ctx, width * 0.88, floorY, width * 0.38, height * 0.38, '#476b8f', '#142238');

    // Ravine steep gorge walls on left & right when subBg === 'ravine'
    if (subBg === 'ravine') {
      ctx.fillStyle = '#09101f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.24, floorY * 0.72);
      ctx.lineTo(width * 0.32, floorY);
      ctx.lineTo(0, floorY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width * 0.76, floorY * 0.7);
      ctx.lineTo(width * 0.68, floorY);
      ctx.lineTo(width, floorY);
      ctx.closePath();
      ctx.fill();
    }

    // Layered Siberian snow-draped pine trees along horizon
    for (let px = 42; px < width; px += 108) {
      const hTree = 58 + ((px * 13) % 36);
      drawSnowPine(ctx, px, floorY + 2, hTree);
    }

    // Giant Siberian Cedar with snapped branches when subBg === 'cedar'
    if (subBg === 'cedar') {
      drawGiantCedar(ctx, width * 0.2, floorY + 4, height * 0.64);
    }

    // Contoured Snowy Ground Terrain (replaces dark floor!)
    const snowGrad = ctx.createLinearGradient(0, floorY - 12, 0, height);
    snowGrad.addColorStop(0, '#c7dcf2');
    snowGrad.addColorStop(0.35, '#89a8c9');
    snowGrad.addColorStop(1, '#364d6e');
    ctx.fillStyle = snowGrad;
    ctx.beginPath();
    ctx.moveTo(0, floorY - 8);
    for (let x = 0; x <= width; x += 48) {
      ctx.lineTo(x, floorY - 4 + Math.sin(x * 0.008) * 7);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Rim ridge highlight on snow horizon
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY - 8);
    for (let x = 0; x <= width; x += 48) {
      ctx.lineTo(x, floorY - 4 + Math.sin(x * 0.008) * 7);
    }
    ctx.stroke();
    return;
  }

  if (bg === 'oceanStorm') {
    // Periodic dramatic lightning flash & forked bolt
    const boltCycle = (globalTime + 1.2) % 5.5;
    const isFlash = boltCycle < 0.22;
    if (isFlash) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const bx = width * 0.72;
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx - 18, height * 0.16);
      ctx.lineTo(bx + 14, height * 0.26);
      ctx.lineTo(bx - 12, height * 0.44);
      ctx.stroke();
    }

    // Dark thunderclouds
    ctx.fillStyle = 'rgba(9, 13, 24, 0.75)';
    for (let c = 0; c < 6; c++) {
      const cx = (c * width * 0.22 + globalTime * 14) % (width + 180) - 90;
      ctx.beginPath();
      ctx.arc(cx, height * 0.14 + (c % 2) * 20, 64, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sweeping far searchlight beam
    const beamX = width * 0.5 + Math.sin(globalTime * 0.9) * width * 0.35;
    const beamGrad = ctx.createLinearGradient(width * 0.1, height * 0.15, beamX, floorY);
    beamGrad.addColorStop(0, 'rgba(125, 211, 252, 0.18)');
    beamGrad.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.15);
    ctx.lineTo(beamX - 110, floorY);
    ctx.lineTo(beamX + 110, floorY);
    ctx.closePath();
    ctx.fill();

    // Back ocean wave swells (front wave crests drawn in drawForegroundWeather)
    drawOceanWaves(ctx, width, height, floorY, globalTime, ['#0c2238', '#081a2e', '#051221']);
    return;
  }

  if (bg === 'airport') {
    // 1945 Naval Airbase (clean aviation base — NO Taured text)
    const sky = ctx.createLinearGradient(0, 0, 0, floorY);
    sky.addColorStop(0, '#0f2847');
    sky.addColorStop(0.65, '#1e4b7a');
    sky.addColorStop(1, '#93c5fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, floorY);

    // Distant Florida palms
    ctx.fillStyle = '#0f291e';
    for (let px = width * 0.36; px <= width * 0.72; px += width * 0.08) {
      drawPalmTree(ctx, px, floorY, 44);
    }

    // Curved WWII Hangar on left
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.03, floorY);
    ctx.quadraticCurveTo(width * 0.16, floorY - height * 0.26, width * 0.31, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Control Tower on right + rotating beacon
    ctx.fillStyle = '#334155';
    ctx.fillRect(width * 0.8, floorY - height * 0.32, width * 0.07, height * 0.32);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(width * 0.77, floorY - height * 0.42, width * 0.13, height * 0.1);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.75)';
    ctx.fillRect(width * 0.785, floorY - height * 0.405, width * 0.1, height * 0.06);
    if (Math.sin(globalTime * 4) > 0) {
      const bGrad = ctx.createRadialGradient(width * 0.835, floorY - height * 0.45, 2, width * 0.835, floorY - height * 0.45, 42);
      bGrad.addColorStop(0, 'rgba(74, 222, 128, 0.9)');
      bGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(width * 0.835, floorY - height * 0.45, 42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Naval tarmac floor with runway markings & lights
    const tarmac = ctx.createLinearGradient(0, floorY, 0, height);
    tarmac.addColorStop(0, '#1e293b');
    tarmac.addColorStop(1, '#090d16');
    ctx.fillStyle = tarmac;
    ctx.fillRect(0, floorY, width, height - floorY);

    ctx.fillStyle = '#fbbf24';
    for (let lx = 30; lx < width; lx += 86) {
      ctx.fillRect(lx, floorY + 28, 42, 5);
    }
    ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
    for (let i = 0; i < 11; i++) {
      ctx.beginPath();
      ctx.arc(width * 0.06 + i * width * 0.088, floorY - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (bg === 'cockpit') {
    // Stormy sky outside cockpit canopy
    const storm = ctx.createLinearGradient(0, 0, 0, floorY);
    storm.addColorStop(0, '#070b14');
    storm.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = storm;
    ctx.fillRect(0, 0, width, height);

    if ((globalTime % 4.2) < 0.18) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.fillRect(0, 0, width, height);
    }

    // Metallic WWII canopy struts
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(width * 0.22, 0);
    ctx.lineTo(width * 0.08, floorY);
    ctx.moveTo(width * 0.78, 0);
    ctx.lineTo(width * 0.92, floorY);
    ctx.moveTo(0, height * 0.14);
    ctx.lineTo(width, height * 0.14);
    ctx.stroke();

    // Lower cockpit glare-shield & glowing flight gauges
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, floorY - 12, width, height - floorY + 12);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(-2, floorY - 12, width + 4, height - floorY + 14);
    for (let i = 0; i < 6; i++) {
      const gx = width * 0.16 + i * width * 0.136;
      const gy = floorY + 34;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = i === 2 ? '#f87171' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, gy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }

  if (bg === 'radarRoom') {
    // Tactical wall & strategic grid map
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.14)';
    ctx.lineWidth = 1.5;
    for (let gx = 40; gx < width; gx += 64) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, floorY);
      ctx.stroke();
    }
    for (let gy = 40; gy < floorY; gy += 64) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    // Back console bank with glowing phosphor CRT screens
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(width * 0.06, floorY - 82, width * 0.88, 82);
    for (let i = 0; i < 4; i++) {
      const rx = width * 0.12 + i * width * 0.22;
      ctx.fillStyle = '#022c22';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.fillRect(rx, floorY - 68, 72, 44);
      ctx.strokeRect(rx, floorY - 68, 72, 44);
      // Blinking status light
      ctx.fillStyle = (Math.sin(globalTime * 4 + i) > 0) ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(rx + 84, floorY - 56, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    drawDarkFloor(ctx, width, height, floorY, pal);
    return;
  }

  if (bg === 'spotlight') {
    // Background evidence corkboard with red strings
    ctx.fillStyle = '#1e1b29';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(width * 0.14, height * 0.16, width * 0.72, floorY * 0.56);
    ctx.strokeRect(width * 0.14, height * 0.16, width * 0.72, floorY * 0.56);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.22, height * 0.24);
    ctx.lineTo(width * 0.5, height * 0.34);
    ctx.lineTo(width * 0.76, height * 0.25);
    ctx.stroke();

    // Swinging industrial overhead lamp + volumetric cone
    const swing = Math.sin(globalTime * 1.4) * 16;
    const lx = width * 0.5 + swing;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, 0);
    ctx.lineTo(lx, height * 0.1);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(lx - 28, height * 0.14);
    ctx.lineTo(lx + 28, height * 0.14);
    ctx.lineTo(lx + 12, height * 0.09);
    ctx.lineTo(lx - 12, height * 0.09);
    ctx.closePath();
    ctx.fill();

    const cone = ctx.createRadialGradient(lx, height * 0.14, 12, width * 0.5, floorY, Math.max(width, height) * 0.62);
    cone.addColorStop(0, 'rgba(254, 243, 199, 0.34)');
    cone.addColorStop(0.55, 'rgba(254, 243, 199, 0.09)');
    cone.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx - 24, height * 0.14);
    ctx.lineTo(width * 0.86, floorY + 60);
    ctx.lineTo(width * 0.14, floorY + 60);
    ctx.lineTo(lx + 24, height * 0.14);
    ctx.closePath();
    ctx.fill();

    drawDarkFloor(ctx, width, height, floorY, pal);
    return;
  }

  if (bg === 'hotelRoom' || bg === 'darkRoom') {
    // 1959 archive office window with falling night snow + moonlight beam
    ctx.fillStyle = '#070f1d';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 3;
    ctx.fillRect(width * 0.08, height * 0.16, width * 0.22, height * 0.26);
    ctx.strokeRect(width * 0.08, height * 0.16, width * 0.22, height * 0.26);
    ctx.beginPath();
    ctx.moveTo(width * 0.19, height * 0.16);
    ctx.lineTo(width * 0.19, height * 0.42);
    ctx.moveTo(width * 0.08, height * 0.29);
    ctx.lineTo(width * 0.3, height * 0.29);
    ctx.stroke();

    // Diagonal moonlight shaft
    const wg = ctx.createLinearGradient(width * 0.08, height * 0.16, width * 0.45, floorY);
    wg.addColorStop(0, 'rgba(148, 197, 255, 0.2)');
    wg.addColorStop(1, 'rgba(148, 197, 255, 0)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.16);
    ctx.lineTo(width * 0.3, height * 0.16);
    ctx.lineTo(width * 0.52, floorY);
    ctx.lineTo(width * 0.16, floorY);
    ctx.closePath();
    ctx.fill();

    // Subtle filing cabinet silhouette
    ctx.fillStyle = '#111827';
    ctx.fillRect(width * 0.84, floorY - 126, 62, 126);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let dy = 14; dy < 110; dy += 34) {
      ctx.strokeRect(width * 0.84 + 6, floorY - 126 + dy, 50, 26);
    }

    drawDarkFloor(ctx, width, height, floorY, pal);
    return;
  }

  // 'void' — Deep space/mystery investigation space
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, floorY);
    ctx.stroke();
  }
  for (let y = 0; y <= floorY; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
  drawDarkFloor(ctx, width, height, floorY, pal);
}

function drawDarkFloor(ctx, width, height, floorY, pal) {
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
  floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.94)');
  floorGrad.addColorStop(1, '#04060c');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, width, height - floorY);

  ctx.strokeStyle = pal.accentGlow;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();
}

function drawFacetedMountain(ctx, cx, floorY, baseW, peakH, litCol, shadowCol) {
  const peakX = cx + baseW * 0.04;
  const peakY = floorY - peakH;
  // Sunlit/moonlit snow ridge face
  ctx.fillStyle = litCol;
  ctx.beginPath();
  ctx.moveTo(cx - baseW * 0.5, floorY);
  ctx.lineTo(peakX, peakY);
  ctx.lineTo(cx + baseW * 0.08, floorY);
  ctx.closePath();
  ctx.fill();

  // Dark shadowed side face
  ctx.fillStyle = shadowCol;
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(cx + baseW * 0.5, floorY);
  ctx.lineTo(cx + baseW * 0.06, floorY);
  ctx.closePath();
  ctx.fill();

  // Bright snow cap edge
  ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(peakX - baseW * 0.14, peakY + peakH * 0.28);
  ctx.lineTo(peakX - baseW * 0.02, peakY + peakH * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawSnowPine(ctx, x, y, h) {
  ctx.fillStyle = '#0c1526';
  for (let tier = 0; tier < 3; tier++) {
    const ty = y - tier * h * 0.26;
    const tw = (24 - tier * 5);
    const th = h * 0.44;
    ctx.beginPath();
    ctx.moveTo(x - tw, ty);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw, ty);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.35, ty - th * 0.55);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw * 0.45, ty - th * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0c1526';
  }
}

function drawGiantCedar(ctx, x, floorY, h) {
  ctx.save();
  // Massive bark trunk
  ctx.fillStyle = '#1e1612';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 24, floorY);
  ctx.lineTo(x - 16, floorY - h);
  ctx.lineTo(x + 14, floorY - h);
  ctx.lineTo(x + 26, floorY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Snapped / splintered branches at mid height (~5m scale)
  ctx.strokeStyle = '#4a3525';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 12, floorY - h * 0.52);
  ctx.lineTo(x + 68, floorY - h * 0.62);
  ctx.lineTo(x + 84, floorY - h * 0.46); // broken hanging branch!
  ctx.moveTo(x - 14, floorY - h * 0.64);
  ctx.lineTo(x - 58, floorY - h * 0.7);
  ctx.lineTo(x - 66, floorY - h * 0.55); // broken hanging branch!
  ctx.stroke();

  // Dark upper pine canopy
  ctx.fillStyle = '#0f2419';
  ctx.beginPath();
  ctx.ellipse(x, floorY - h + 16, 95, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPalmTree(ctx, x, y, h) {
  ctx.save();
  ctx.strokeStyle = '#0f291e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 8, y - h * 0.5, x + 12, y - h);
  ctx.stroke();
  ctx.fillStyle = '#14532d';
  for (let a = -2; a <= 2; a++) {
    ctx.beginPath();
    ctx.ellipse(x + 12 + a * 10, y - h + Math.abs(a) * 4, 15, 4, a * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawOceanWaves(ctx, width, height, floorY, time, waveColors) {
  waveColors.forEach((col, w) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    const baseWy = floorY - 6 + w * ((height - floorY + 12) / waveColors.length);
    ctx.moveTo(0, height);
    ctx.lineTo(0, baseWy);
    for (let x = 0; x <= width; x += 28) {
      const yOff = Math.sin(x * 0.018 + time * (2.6 + w * 0.35) + w * 1.4) * (7 + w * 1.5);
      ctx.lineTo(x, baseWy + yOff);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Crisp foam highlight along crest
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 28) {
      const yOff = Math.sin(x * 0.018 + time * (2.6 + w * 0.35) + w * 1.4) * (7 + w * 1.5);
      if (x === 0) ctx.moveTo(x, baseWy + yOff);
      else ctx.lineTo(x, baseWy + yOff);
    }
    ctx.stroke();
  });
}

function drawForegroundWeather(ctx, bg, subBg, width, height, globalTime) {
  const isPortrait = height > width;
  const floorY = height * (isPortrait ? 0.68 : 0.74);

  if (bg === 'snowNight') {
    const isBlizzard = subBg === 'blizzard';
    const count = isBlizzard ? 70 : 42;
    ctx.save();
    ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
    for (let i = 0; i < count; i++) {
      const windX = isBlizzard ? 175 : 42;
      const fallY = isBlizzard ? 95 : 52;
      const sx = ((i * 73 + globalTime * (windX + (i % 5) * 14)) % width);
      const sy = ((i * 53 + globalTime * (fallY + (i % 3) * 18)) % height);
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 2.8 : 1.6), 0, Math.PI * 2);
      ctx.fill();
    }
    if (isBlizzard) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
      ctx.lineWidth = 1.6;
      for (let s = 0; s < 16; s++) {
        const lx = ((s * 119 + globalTime * 320) % (width + 140)) - 70;
        const ly = ((s * 67 + globalTime * 110) % height);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 42, ly - 10);
        ctx.stroke();
      }
    }
    ctx.restore();
  } else if (bg === 'oceanStorm') {
    // Foreground ocean swell so ships/ditched planes sit IN the water + rain streaks
    drawOceanWaves(ctx, width, height, floorY + 26, globalTime + 1.5, ['rgba(12, 34, 56, 0.72)']);
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.26)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 34; r++) {
      const rx = ((r * 89 + globalTime * 210) % width);
      const ry = ((r * 61 + globalTime * 460) % height);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 14, ry + 26);
      ctx.stroke();
    }
    ctx.restore();
  } else if (bg === 'cockpit') {
    // Raindrops streaking across cockpit windshield
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 22; r++) {
      const rx = ((r * 97 + globalTime * 90) % width);
      const ry = ((r * 59 + globalTime * 340) % (floorY - 20));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Subtle ambient dust motes for indoor scenes
  if (bg === 'spotlight' || bg === 'darkRoom' || bg === 'hotelRoom' || bg === 'void') {
    ctx.save();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.28)';
    for (let i = 0; i < 20; i++) {
      const mx = ((i * 97 + globalTime * 11) % width);
      const my = ((i * 61 + Math.sin(globalTime * 1.1 + i) * 32) % floorY);
      ctx.beginPath();
      ctx.arc(mx, my, (i % 2) + 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ─────────────────────────── OVERLAY & WORLD PROPS ─────────────────────────── */

function drawOverlayProp(ctx, prop, width, height, sceneTime, mood) {
  const pal = MOOD_PALETTES[mood] || MOOD_PALETTES.mysterious;
  const x = prop.x * width;
  const y = prop.y * height;
  const s = (prop.scale || 1) * (Math.min(width, height) / 720);
  const popIn = WORLD_PROP_TYPES.has(prop.type)
    ? 1
    : easeOutBack(clamp(sceneTime / 0.42, 0, 1));

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * popIn, s * popIn);

  if (prop.type === 'tent') {
    // 3D Shaded Mountaineering Ridge Tent
    ctx.fillStyle = prop.lit ? '#b45309' : '#334155';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-88, 0);
    ctx.lineTo(-10, -104);
    ctx.lineTo(86, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner lit glow if occupied before panic
    if (prop.lit) {
      const glow = ctx.createRadialGradient(0, -34, 4, 0, -34, 58);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      glow.addColorStop(1, 'rgba(251, 146, 60, 0.0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(-54, -2);
      ctx.lineTo(-8, -80);
      ctx.lineTo(54, -2);
      ctx.closePath();
      ctx.fill();
    }

    // Side ridge shading & ski pole mast
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-10, -104);
    ctx.lineTo(86, 0);
    ctx.lineTo(34, 0);
    ctx.closePath();
    ctx.fill();

    // Slashed knife openings
    if (prop.slashed) {
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-22, -58);
      ctx.lineTo(12, -26);
      ctx.lineTo(-4, -8);
      ctx.stroke();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-22, -58);
      ctx.lineTo(12, -26);
      ctx.lineTo(-4, -8);
      ctx.stroke();
    }

    // Half buried under snow slab
    if (prop.buried) {
      ctx.fillStyle = '#dbeafe';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-98, 4);
      ctx.quadraticCurveTo(-30, -56, 38, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Neat row of abandoned boots outside
    if (prop.boots) {
      ctx.fillStyle = '#1f1612';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      for (let b = 0; b < 4; b++) {
        const bx = 94 + b * 14;
        ctx.fillRect(bx, -8, 10, 8);
        ctx.strokeRect(bx, -8, 10, 8);
      }
    }
  } else if (prop.type === 'avalancheWave') {
    // Rushing snow slab & powder cloud driven by sceneTime
    const p = clamp(sceneTime / 3.2, 0, 1);
    const shiftX = lerp(-120, 15, easeInOut(p));
    ctx.translate(shiftX, 0);
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-115, -75);
    ctx.quadraticCurveTo(-20, -68, 48, 0);
    ctx.lineTo(-115, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Billowing powder puffs
    ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-60 + i * 32, -20 + Math.sin(sceneTime * 6 + i) * 6, 18 - i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (prop.type === 'campfire') {
    // Charred logs + flickering flames or smoldering embers
    ctx.fillStyle = '#291c15';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillRect(-26, -6, 52, 8);
    ctx.strokeRect(-26, -6, 52, 8);
    ctx.fillRect(-18, -12, 36, 7);

    if (prop.dying) {
      const emberGlow = ctx.createRadialGradient(0, -10, 2, 0, -10, 42);
      emberGlow.addColorStop(0, 'rgba(239, 68, 68, 0.65)');
      emberGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = emberGlow;
      ctx.beginPath();
      ctx.arc(0, -10, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-4, -8, 4, 0, Math.PI * 2);
      ctx.arc(6, -9, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const fGlow = ctx.createRadialGradient(0, -24, 6, 0, -24, 92);
      fGlow.addColorStop(0, 'rgba(251, 146, 60, 0.55)');
      fGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = fGlow;
      ctx.beginPath();
      ctx.arc(0, -24, 92, 0, Math.PI * 2);
      ctx.fill();

      const flick = Math.sin(sceneTime * 14) * 5;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-18, -8);
      ctx.quadraticCurveTo(-8, -54 - flick, 0, -64 + flick);
      ctx.quadraticCurveTo(12, -52 + flick, 18, -8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.quadraticCurveTo(0, -40 + flick, 10, -8);
      ctx.closePath();
      ctx.fill();
    }
  } else if (prop.type === 'footprints') {
    // 9 bare footprint impressions in snow
    ctx.fillStyle = 'rgba(30, 58, 95, 0.65)';
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const fx = -160 + i * 42;
      const fy = (i % 2 === 0 ? -6 : 6) + i * 1.4;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 11, 5, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (prop.type === 'oilSlick') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 95 + Math.sin(sceneTime * 2) * 8, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (prop.type === 'orbs') {
    // Glowing orange plasma spheres drifting in sky
    const pts = [[-52, -12], [18, -28], [68, 8]];
    pts.forEach(([ox, oy], idx) => {
      const dx = ox + Math.sin(sceneTime * 1.4 + idx) * 16;
      const dy = oy + Math.cos(sceneTime * 1.9 + idx) * 10;
      const rGlow = ctx.createRadialGradient(dx, dy, 4, dx, dy, 42);
      rGlow.addColorStop(0, '#fef08a');
      rGlow.addColorStop(0.35, 'rgba(251, 146, 60, 0.78)');
      rGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = rGlow;
      ctx.beginPath();
      ctx.arc(dx, dy, 42, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (prop.type === 'infrasound') {
    for (let r = 0; r < 4; r++) {
      const waveT = ((sceneTime * 0.8 + r * 0.25) % 1);
      ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - waveT) * 0.65})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + waveT * 130, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (prop.type === 'xray') {
    // Medical X-Ray lightbox with skull & broken ribcage
    ctx.fillStyle = '#071426';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    roundRect(ctx, -115, -82, 230, 164, 10);
    ctx.fill();
    ctx.stroke();
    // Stylized skull & ribs
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.82)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-44, -18, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(-54, 4, 20, 12);
    // Ribcage on right side
    ctx.beginPath();
    ctx.moveTo(42, -38);
    ctx.lineTo(42, 26);
    for (let ry = -28; ry <= 14; ry += 12) {
      ctx.moveTo(16, ry);
      ctx.quadraticCurveTo(42, ry - 6, 68, ry);
    }
    ctx.stroke();
    // Pulsing red trauma markers
    const pulseR = 6 + Math.abs(Math.sin(sceneTime * 5)) * 6;
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-34, -26, pulseR, 0, Math.PI * 2);
    ctx.arc(54, -8, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.font = '800 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'AUTOPSIA FORENSE', 0, 62);
  } else if (prop.type === 'geiger') {
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    roundRect(ctx, -96, -64, 192, 128, 10);
    ctx.fill();
    ctx.stroke();
    // Analog scale arc
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 12, 48, Math.PI, Math.PI * 1.65);
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 12, 48, Math.PI * 1.65, Math.PI * 2);
    ctx.stroke();
    // Spiking jittering needle into red danger zone
    const ang = -0.35 + Math.sin(sceneTime * 22) * 0.25;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(Math.sin(ang + 0.9) * 44, 12 - Math.cos(ang + 0.9) * 44);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '800 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'RADIACIÓN ELEVADA', 0, 46);
  } else if (prop.type === 'fuelGauge') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', -34, 14);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('F', 34, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillText(prop.label || 'FUEL', 0, -24);
    const p = clamp(sceneTime / 3.5, 0, 1);
    const needleAng = lerp(0.85, -1.15, easeInOut(p));
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(Math.sin(needleAng) * 38, 14 - Math.cos(needleAng) * 38);
    ctx.stroke();
    if (p > 0.7 && Math.sin(sceneTime * 10) > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 28, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (prop.type === 'radioWave') {
    ctx.fillStyle = '#071421';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.6;
    roundRect(ctx, -110, -48, 220, 96, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let rx = -92; rx <= 92; rx += 6) {
      const amp = Math.sin(rx * 0.14 + sceneTime * 16) * (6 + Math.abs(Math.cos(sceneTime * 7 + rx)) * 16);
      if (rx === -92) ctx.moveTo(rx, amp);
      else ctx.lineTo(rx, amp);
    }
    ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'SEÑAL DE RADIO', 0, 35);
  } else if (prop.type === 'explosion') {
    const p = clamp(sceneTime / 2.2, 0, 1);
    const r = 22 + Math.sin(p * Math.PI * 0.7) * 78;
    const fGlow = ctx.createRadialGradient(0, 0, 6, 0, 0, r * 1.3);
    fGlow.addColorStop(0, '#fef9c3');
    fGlow.addColorStop(0.45, '#f97316');
    fGlow.addColorStop(0.8, 'rgba(220, 38, 38, 0.75)');
    fGlow.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = fGlow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(254, 240, 138, ${1 - p})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + p * 120, 0, Math.PI * 2);
    ctx.stroke();
  } else if (prop.type === 'cameraFlash') {
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)';
    ctx.lineWidth = 2.5;
    // Viewfinder corners
    ctx.beginPath();
    ctx.moveTo(-140, -56); ctx.lineTo(-140, -82); ctx.lineTo(-110, -82);
    ctx.moveTo(110, -82); ctx.lineTo(140, -82); ctx.lineTo(140, -56);
    ctx.moveTo(-140, 56); ctx.lineTo(-140, 82); ctx.lineTo(-110, 82);
    ctx.moveTo(110, 82); ctx.lineTo(140, 82); ctx.lineTo(140, 56);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || '35MM // URAL 1959', 0, -68);
    // Subtle shutter flash at 1.2s and 4.8s
    const flash = Math.max(
      Math.max(0, 1 - Math.abs(sceneTime - 1.2) * 5),
      Math.max(0, 1 - Math.abs(sceneTime - 4.8) * 5)
    );
    if (flash > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.42})`;
      roundRect(ctx, -138, -80, 276, 160, 4);
      ctx.fill();
    }
  } else if (prop.type === 'map') {
    const lbl = (prop.label || '').toUpperCase();
    const isBermuda = prop.mapStyle === 'bermuda' || /BERMUDA|FLORIDA|BAHAMAS|GOLFO|TRIANGULAR/.test(lbl);
    ctx.fillStyle = '#091426';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    roundRect(ctx, -155, -88, 310, 176, 12);
    ctx.fill();
    ctx.stroke();

    if (isBermuda) {
      // Stylized Florida peninsula & Bahamas islands + dashed vector
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(-135, -75);
      ctx.lineTo(-82, -75);
      ctx.lineTo(-78, 12);
      ctx.lineTo(-96, 18);
      ctx.lineTo(-105, -24);
      ctx.lineTo(-135, -36);
      ctx.closePath();
      ctx.fill();
      // Bermuda Triangle outline + animated flight path
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(-84, 8);
      ctx.lineTo(68, -46);
      ctx.lineTo(108, 38);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Ural topographic contour lines & mountain peaks + animated red expedition trail
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(24, -14, 92, 42, -0.2, 0, Math.PI * 2);
      ctx.ellipse(24, -14, 52, 22, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      const prog = clamp(sceneTime / 3.5, 0.15, 1);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(-118, 30);
      ctx.lineTo(lerp(-118, 22, prog), lerp(30, -14, prog));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pulse = 8 + Math.sin(sceneTime * 5) * 4;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(22, -14, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(22, -14, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'MAPA DE RUTA', 0, 68);
  } else if (prop.type === 'compass') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -44);
    ctx.fillText('S', 0, 52);
    ctx.fillText('E', 47, 4);
    ctx.fillText('O', -47, 4);
    ctx.save();
    ctx.rotate(sceneTime * 5.2 + Math.sin(sceneTime * 9) * 1.1);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -40); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, 40); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (prop.type === 'radar') {
    ctx.fillStyle = 'rgba(2, 44, 34, 0.9)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.moveTo(-74, 0); ctx.lineTo(74, 0);
    ctx.moveTo(0, -74); ctx.lineTo(0, 74);
    ctx.stroke();

    // Sweep sector
    ctx.save();
    ctx.rotate(sceneTime * 2.4);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 72, -0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(72, 0);
    ctx.stroke();
    ctx.restore();

    // Blip vanishes if vanishBlip is set
    const showBlip = !prop.vanishBlip || sceneTime < 3.6;
    if (showBlip) {
      ctx.fillStyle = prop.vanishBlip && sceneTime > 2.2 ? '#ef4444' : '#4ade80';
      ctx.beginPath();
      ctx.arc(28, -24, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (prop.label) {
      ctx.fillStyle = '#bbf7d0';
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(prop.label, 0, 92);
    }
  } else if (prop.type === 'plane') {
    // Fallback overlay plane silhouette for legacy custom JSON
    const flyX = Math.sin(sceneTime * 1.5) * 20;
    const flyY = Math.cos(sceneTime * 2.2) * 7;
    ctx.translate(flyX, flyY);
    ctx.fillStyle = '#2e5485';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-64, 0); ctx.lineTo(-10, -8); ctx.lineTo(16, -38);
    ctx.lineTo(26, -8); ctx.lineTo(66, -4); ctx.lineTo(74, -18);
    ctx.lineTo(80, -4); ctx.lineTo(66, 6); ctx.lineTo(24, 8);
    ctx.lineTo(10, 36); ctx.lineTo(-8, 8); ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (prop.type === 'folder') {
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.8;
    roundRect(ctx, -68, -46, 136, 92, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b45309';
    roundRect(ctx, -68, -56, 54, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(-52, -12, 104, 30);
    ctx.fillStyle = '#fecaca';
    ctx.font = '800 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'CONFIDENCIAL', 0, 7);
  } else if (prop.type === 'clock') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(sceneTime * 1.8) * 34, -Math.cos(sceneTime * 1.8) * 34);
    ctx.stroke();
    if (prop.label) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(prop.label, 0, 70);
    }
  } else if (prop.type === 'question') {
    const bob = Math.sin(sceneTime * 3) * 7;
    ctx.fillStyle = pal.accent;
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, bob);
    if (prop.label) {
      ctx.font = '800 17px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(prop.label, 0, bob + 32);
    }
  } else if (prop.type === 'splitPortal') {
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 3.2;
    for (let r = 22; r <= 82; r += 15) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65, r, sceneTime * 1.1 + r * 0.04, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (prop.type === 'cta') {
    const pulseScale = 1 + Math.sin(sceneTime * 5.2) * 0.055;
    ctx.scale(pulseScale, pulseScale);
    const isSocialReel = prop._platform === 'fb_tiktok';
    const ctaText = isSocialReel
      ? 'SÍGUEME · COMENTA TU TEORÍA'
      : (prop.label || 'SUSCRÍBETE');
    ctx.fillStyle = isSocialReel ? '#2563eb' : '#dc2626';
    ctx.strokeStyle = isSocialReel ? '#bfdbfe' : '#fecaca';
    ctx.lineWidth = 3;
    roundRect(ctx, -205, -36, 410, 72, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, 0, 0);
  } else if (prop.type === 'desk') {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    roundRect(ctx, -62, -56, 124, 56, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillRect(-66, -62, 132, 10);
  } else if (prop.type === 'door') {
    ctx.fillStyle = prop.locked ? '#1e293b' : '#020617';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    roundRect(ctx, -40, -148, 80, 148, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = prop.locked ? '#f59e0b' : '#475569';
    ctx.beginPath();
    ctx.arc(-26, -72, 5, 0, Math.PI * 2);
    ctx.fill();
    if (prop.locked) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERRADO', 0, -162);
    }
  } else if (prop.type === 'bed') {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    roundRect(ctx, -70, -34, 140, 34, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, -64, -44, 34, 14, 5);
    ctx.fill();
  } else if (prop.type === 'passportZoom') {
    const floatY = Math.sin(sceneTime * 2.5) * 6;
    ctx.translate(0, floatY);
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    roundRect(ctx, -90, -114, 180, 228, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOCUMENTO', 0, -80);
    ctx.fillText(prop.label || 'ARCHIVO', 0, 62);
  } else if (prop.type === 'peruMap') {
    ctx.fillStyle = 'rgba(9, 20, 38, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    roundRect(ctx, -148, -94, 296, 188, 12);
    ctx.fill();
    ctx.stroke();
    // Stylized silhouette of Peru
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-48, -72);
    ctx.lineTo(-10, -76);
    ctx.lineTo(14, -52);
    ctx.lineTo(10, -14);
    ctx.lineTo(38, 10);
    ctx.lineTo(32, 46);
    ctx.lineTo(6, 70);
    ctx.lineTo(-34, 40);
    ctx.lineTo(-56, -8);
    ctx.lineTo(-68, -42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Animated route from Cusco (-2, 10) to Puno / Hayu Marca (26, 40)
    const prog = clamp(sceneTime / 3.0, 0.15, 1);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(lerp(-2, 26, prog), lerp(10, 40, prog));
    ctx.stroke();
    ctx.setLineDash([]);
    // Pulse pin at Puno / Hayu Marca
    const pulse = 8 + Math.sin(sceneTime * 5.2) * 4.5;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(26, 40, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(26, 40, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CUSCO', -64, 14);
    ctx.fillText('PUNO · 4,000m', 42, 42);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(prop.label || 'HAYU MARCA · PERÚ', 0, 82);
  } else if (prop.type === 'solarDiskZoom') {
    const floatY = Math.sin(sceneTime * 2.4) * 5;
    const rot = sceneTime * 0.45;
    ctx.translate(0, floatY);
    ctx.fillStyle = 'rgba(10, 15, 30, 0.90)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    roundRect(ctx, -110, -96, 220, 192, 14);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(rot);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-6, -42); ctx.lineTo(0, -58); ctx.lineTo(6, -42); ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 44);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(0.55, '#f59e0b');
    g.addColorStop(1, '#92400e');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'DISCO SOLAR DE ORO', 0, 74);
  } else if (prop.type === 'seismicWave') {
    ctx.fillStyle = 'rgba(7, 15, 30, 0.90)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.6;
    roundRect(ctx, -150, -68, 300, 136, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    for (let gx = -120; gx <= 120; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, -46); ctx.lineTo(gx, 32); ctx.stroke();
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    for (let x = -132; x <= 132; x += 6) {
      const env = 1 - Math.abs(x) / 145;
      const y = -8 + Math.sin(x * 0.14 - sceneTime * 11) * 28 * env * (0.65 + 0.35 * Math.sin(sceneTime * 4));
      if (x === -132) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'VIBRACIÓN PIEZOELÉCTRICA', 0, 54);
  } else if (prop.type === 'rockScan') {
    ctx.fillStyle = 'rgba(7, 15, 28, 0.90)';
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.6;
    roundRect(ctx, -142, -74, 284, 148, 12);
    ctx.fill();
    ctx.stroke();
    // T-shaped doorway schematic with laser sweep
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-72, -48, 144, 88);
    ctx.fillStyle = 'rgba(167, 139, 250, 0.28)';
    ctx.fillRect(-16, -2, 32, 42);
    ctx.strokeRect(-16, -2, 32, 42);
    const sweepY = -44 + ((sceneTime * 38) % 82);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-78, sweepY); ctx.lineTo(78, sweepY);
    ctx.stroke();
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(prop.label || 'NICHO DE 7 METROS · CUARZO', 0, 58);
  }

  ctx.restore();
}

/* ─────────────────────────── SPOTLIGHT, TYPOGRAPHY & HUD ─────────────────────────── */

function drawInteractiveSpotlight(ctx, pointer, width, height) {
  if (!pointer?.active || !pointer?.flashlight) return;
  const px = pointer.x * width;
  const py = pointer.y * height;
  const radius = Math.min(width, height) * 0.36;
  ctx.save();
  const spot = ctx.createRadialGradient(px, py, 16, px, py, radius);
  spot.addColorStop(0, 'rgba(254, 243, 199, 0.24)');
  spot.addColorStop(0.55, 'rgba(254, 243, 199, 0.08)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawTypographyAndHUD(ctx, scene, width, height, sceneTime, globalTime, isPortrait, formatCfg) {
  const pal = MOOD_PALETTES[scene.mood] || MOOD_PALETTES.mysterious;
  const isSocialReel = formatCfg?.platform === 'fb_tiktok';
  const totalDur = formatCfg?._totalDuration || 35;

  if (globalTime < 15 && !isPortrait) {
    const barH = 24;
    ctx.fillStyle = 'rgba(4, 6, 12, 0.92)';
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
  }

  const vig = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.34,
    width / 2, height / 2, Math.max(width, height) * 0.78
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, isPortrait ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.56)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  if (isPortrait) {
    // Barra superior de progreso de retención
    const overallPct = clamp(globalTime / Math.max(1, totalDur), 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, 0, width, 6);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(0, 0, width * overallPct, 6);
    ctx.restore();

    // Gancho explosivo en los primeros 3.2 segundos (anti-swipe)
    if (globalTime < 3.2) {
      const hookIn = easeOutBack(clamp(globalTime / 0.28, 0, 1));
      const hookOut = globalTime > 2.75 ? clamp((3.2 - globalTime) / 0.45, 0, 1) : 1;
      ctx.save();
      ctx.globalAlpha = hookOut;
      ctx.translate(width / 2, 54);
      ctx.scale(hookIn, hookIn);
      const hookText = 'CASO REAL DOCUMENTADO · MIRA ESTO';
      ctx.font = '900 16px system-ui, -apple-system, sans-serif';
      const htw = ctx.measureText(hookText).width;
      const pillW = htw + 54;
      ctx.fillStyle = 'rgba(185, 28, 28, 0.94)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      roundRect(ctx, -pillW / 2, -19, pillW, 38, 19);
      ctx.fill();
      ctx.stroke();

      // Punto vivo parpadeante
      const blink = 0.55 + 0.45 * Math.sin(globalTime * 14);
      ctx.fillStyle = `rgba(254, 240, 138, ${blink})`;
      ctx.beginPath();
      ctx.arc(-pillW / 2 + 20, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(hookText, -pillW / 2 + 34, 1);
      ctx.restore();
    }
  }

  if (scene.titleCard) {
    const slideIn = easeOutBack(clamp(sceneTime / 0.32, 0, 1));
    const badgePadX = isPortrait ? 28 : 36;
    const badgeY = isPortrait ? (globalTime < 3.2 ? 86 : 44) : 36;
    ctx.save();
    ctx.translate((slideIn - 1) * 40, 0);
    ctx.globalAlpha = clamp(sceneTime / 0.18, 0, 1);
    ctx.font = `800 ${isPortrait ? 18 : 16}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const tw = ctx.measureText(scene.titleCard).width;
    ctx.fillStyle = 'rgba(10, 15, 28, 0.90)';
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2.0;
    roundRect(ctx, badgePadX, badgeY, tw + 30, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.rim;
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.titleCard, badgePadX + 15, badgeY + 18);
    ctx.restore();
  }

  if (scene.caption) {
    const speechSpan = Math.max(0.6, scene.duration - 0.48);

    if (isPortrait) {
      // Subtítulos dinámicos de alto impacto (estilo documental viral Shorts / Reels / TikTok)
      // Ubicados en la zona segura universal (encima del título inferior y lejos de iconos laterales)
      const allWords = scene.caption.trim().split(/\s+/).filter(Boolean);
      const wordProgress = clamp(sceneTime / speechSpan, 0, 0.9999);
      const activeIdx = Math.min(allWords.length - 1, Math.floor(wordProgress * allWords.length));
      const chunkSize = 6;
      const chunkStart = Math.floor(activeIdx / chunkSize) * chunkSize;
      const chunkWords = allWords.slice(chunkStart, chunkStart + chunkSize);
      const activeInChunk = activeIdx - chunkStart;

      ctx.save();
      const fontSize = 33;
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      const safeMaxW = width * (isSocialReel ? 0.77 : 0.84);
      const centerX = isSocialReel ? width * 0.47 : width * 0.5;
      const centerY = isSocialReel ? height * 0.765 : height * 0.735;

      // Dividir el bloque activo de palabras en 1 o 2 líneas manteniendo el índice de cada palabra
      const wordLines = [];
      let curLine = [];
      let curWidth = 0;
      const spaceW = ctx.measureText(' ').width;
      chunkWords.forEach((w, idx) => {
        const ww = ctx.measureText(w.toUpperCase()).width;
        if (curLine.length > 0 && curWidth + spaceW + ww > safeMaxW) {
          wordLines.push(curLine);
          curLine = [{ text: w.toUpperCase(), idx, w: ww }];
          curWidth = ww;
        } else {
          curLine.push({ text: w.toUpperCase(), idx, w: ww });
          curWidth += (curLine.length > 1 ? spaceW : 0) + ww;
        }
      });
      if (curLine.length > 0) wordLines.push(curLine);

      const lineH = fontSize * 1.34;
      const totalBlockH = wordLines.length * lineH;
      const widestLine = Math.max(...wordLines.map((ln) => ln.reduce((a, b) => a + b.w, 0) + Math.max(0, ln.length - 1) * spaceW));

      // Caja cristal oscura sutil para máxima legibilidad sobre nieve/océano
      const padX = 24;
      const padY = 14;
      ctx.fillStyle = 'rgba(6, 9, 18, 0.78)';
      ctx.strokeStyle = pal.accentGlow;
      ctx.lineWidth = 2.2;
      roundRect(
        ctx,
        centerX - widestLine / 2 - padX,
        centerY - totalBlockH / 2 - padY,
        widestLine + padX * 2,
        totalBlockH + padY * 2,
        18
      );
      ctx.fill();
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.lineJoin = 'round';

      wordLines.forEach((ln, lineIdx) => {
        const lnW = ln.reduce((a, b) => a + b.w, 0) + Math.max(0, ln.length - 1) * spaceW;
        let cursorX = centerX - lnW / 2;
        const lineY = centerY - totalBlockH / 2 + lineIdx * lineH + lineH / 2;

        ln.forEach((item) => {
          const isActive = item.idx === activeInChunk;
          if (isActive) {
            ctx.save();
            ctx.fillStyle = pal.accent;
            roundRect(ctx, cursorX - 6, lineY - fontSize * 0.56, item.w + 12, fontSize * 1.12, 8);
            ctx.fill();
            ctx.strokeStyle = '#050811';
            ctx.lineWidth = 5;
            ctx.strokeText(item.text, cursorX, lineY);
            ctx.fillStyle = '#fef9c3';
            ctx.fillText(item.text, cursorX, lineY);
            ctx.restore();
          } else {
            ctx.strokeStyle = '#050811';
            ctx.lineWidth = 5.5;
            ctx.strokeText(item.text, cursorX, lineY);
            ctx.fillStyle = item.idx < activeInChunk ? '#f8fafc' : 'rgba(226, 232, 240, 0.85)';
            ctx.fillText(item.text, cursorX, lineY);
          }
          cursorX += item.w + spaceW;
        });
      });
      ctx.restore();
    } else {
      // Formato horizontal 16:9 Full HD: subtítulos documentales sincronizados con toda la locución
      const progress = clamp(sceneTime / (speechSpan * 0.88), 0, 1);
      const charCount = Math.max(1, Math.ceil(scene.caption.length * progress));
      const visibleText = scene.caption.slice(0, charCount);

      ctx.save();
      const fontSize = 25;
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
      const maxW = width * 0.78;
      const lines = wrapText(ctx, visibleText, maxW);
      const lineH = fontSize * 1.36;
      const boxH = lines.length * lineH + 28;
      const boxW = maxW + 44;
      const boxX = (width - boxW) / 2;
      const boxY = height - boxH - 34;

      ctx.fillStyle = 'rgba(7, 10, 20, 0.88)';
      ctx.strokeStyle = pal.accentGlow;
      ctx.lineWidth = 1.8;
      roundRect(ctx, boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textBaseline = 'top';
      const lowerFull = scene.caption.toLowerCase();
      const hasHookWord = HOOK_KEYWORDS.some((kw) => lowerFull.includes(kw));

      lines.forEach((line, idx) => {
        ctx.fillStyle = hasHookWord && idx === lines.length - 1 ? pal.rim : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(line, width / 2, boxY + 15 + idx * lineH);
      });
      ctx.restore();
    }
  }

  // En Shorts NUNCA oscurecemos el fotograma 0: usamos un destello de impacto cinematográfico
  if (isPortrait) {
    if (globalTime < 0.18) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 248, 220, ${(1 - globalTime / 0.18) * 0.22})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (sceneTime < 0.12) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - sceneTime / 0.12) * 0.10})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  } else if (sceneTime < 0.22 && globalTime > 0.25) {
    ctx.save();
    ctx.fillStyle = `rgba(4, 6, 12, ${(1 - sceneTime / 0.22) * 0.78})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shadeColor(hex, amt) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex || '#3b82f6';
  const num = parseInt(hex.slice(1), 16);
  const r = clamp((num >> 16) + amt, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + amt, 0, 255);
  const b = clamp((num & 0xff) + amt, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ─────────────────────────── MAIN RENDER ENTRYPOINT ─────────────────────────── */

function reframeSceneForVertical(scene) {
  const remapX = (x) => {
    if (typeof x !== 'number') return x;
    if (x <= 0.02 || x >= 0.98) return x;
    return clamp(0.49 + (x - 0.5) * 0.80, 0.12, 0.86);
  };

  const actors = (scene.actors || []).map((a) => {
    const isVeh = a.role === 'plane' || a.role === 'helicopter' || a.role === 'ship';
    const kfs = (a.keyframes || []).map((kf) => {
      let ny = kf.y;
      if (typeof ny === 'number') {
        if (!isVeh && ny >= 0.66 && ny <= 0.84) {
          // Mapea el suelo horizontal (0.74) exactamente al suelo vertical (0.68) sobre los subtítulos
          ny = ny - 0.06;
        } else if (isVeh && a.role === 'ship' && ny >= 0.64) {
          ny = ny - 0.06;
        } else if (isVeh && ny < 0.64) {
          ny = clamp(ny * 0.92, 0.14, 0.54);
        }
      }
      return {
        ...kf,
        x: remapX(kf.x),
        y: ny
      };
    });
    return {
      ...a,
      scale: (a.scale || 1) * (isVeh ? 0.92 : 0.94),
      keyframes: kfs
    };
  });

  const overlayProps = (scene.overlayProps || []).map((p) => {
    if (WORLD_PROP_TYPES.has(p.type)) {
      const wy = typeof p.y === 'number' && p.y >= 0.66 ? p.y - 0.06 : p.y;
      return {
        ...p,
        x: clamp(0.49 + ((p.x ?? 0.5) - 0.5) * 0.78, 0.16, 0.82),
        y: wy,
        scale: (p.scale || 1) * 0.92
      };
    }
    return {
      ...p,
      x: clamp(0.49 + ((p.x ?? 0.5) - 0.5) * 0.66, 0.24, 0.74),
      y: clamp((p.y ?? 0.28) * 0.84, 0.17, 0.36),
      scale: (p.scale || 1) * 0.88
    };
  });

  return {
    ...scene,
    actors,
    overlayProps
  };
}

window.StickmanStudio = window.StickmanStudio || {};
window.StickmanStudio.renderFrame = function renderFrame(ctx, formatCfg, rawScene, sceneTime, globalTime, interactive) {
  const outW = ctx.canvas ? ctx.canvas.width : formatCfg.width;
  const outH = ctx.canvas ? ctx.canvas.height : formatCfg.height;
  const isPortrait = outH > outW;
  const scene = isPortrait && formatCfg?.reframeFromFull ? reframeSceneForVertical(rawScene) : rawScene;
  // Espacio lógico vectorial calibrado (escalado nativamente a Full HD 1920x1080 / 1080x1920 sin perder proporciones)
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const scaleX = outW / width;
  const scaleY = outH / height;

  const floorRatio = isPortrait ? 0.68 : 0.74;
  const pal = MOOD_PALETTES[scene.mood] || MOOD_PALETTES.mysterious;
  const tNorm = clamp(sceneTime / Math.max(0.1, scene.duration), 0, 1);
  const cam = scene.camera || { zoomStart: 1, zoomEnd: 1.08, panX: 0, panY: 0, shake: 0 };

  let zoom = lerp(cam.zoomStart || 1, cam.zoomEnd || 1.08, easeInOut(tNorm));
  if (isPortrait) {
    // Golpe de cámara inicial anti-swipe (0.00s - 0.30s) + micro-empuje a mitad de escena
    if (globalTime < 0.30) {
      zoom *= 1 + (1 - easeInOut(globalTime / 0.30)) * 0.16;
    } else if (sceneTime < 0.18) {
      zoom *= 1 + (1 - sceneTime / 0.18) * 0.06;
    }
    if (tNorm > 0.48) {
      zoom += easeInOut((tNorm - 0.48) / 0.52) * 0.055;
    }
  }

  const panX = lerp(0, cam.panX || 0, easeInOut(tNorm));
  const panY = lerp(0, cam.panY || 0, easeInOut(tNorm));
  const shakeAmt = cam.shake || 0;
  const shakeX = shakeAmt ? Math.sin(globalTime * 29) * shakeAmt : 0;
  const shakeY = shakeAmt ? Math.cos(globalTime * 34) * shakeAmt : 0;
  const swayY = Math.sin(globalTime * 1.1) * 2.5;

  if (interactive?.hitboxes) {
    interactive.hitboxes.length = 0;
  }

  ctx.clearRect(0, 0, outW, outH);

  ctx.save();
  ctx.scale(scaleX, scaleY);

  ctx.save();
  ctx.translate(width / 2 + panX + shakeX, height / 2 + panY + swayY + shakeY);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);

  // 1. Multi-layer illustrated background
  drawBackground(ctx, scene.bg, scene.mood, width, height, sceneTime, globalTime, scene.subBg);

  const props = scene.overlayProps || [];
  // 2. Ground-level world props
  for (const prop of props) {
    if (WORLD_PROP_TYPES.has(prop.type) && prop.type !== 'avalancheWave') {
      drawOverlayProp(ctx, prop, width, height, sceneTime, scene.mood);
    }
  }
  for (const prop of props) {
    if (prop.type === 'avalancheWave') {
      drawOverlayProp(ctx, prop, width, height, sceneTime, scene.mood);
    }
  }

  // 3. Vehicle actors & human cartoon actors
  if (scene.actors) {
    for (const actor of scene.actors) {
      if (actor.role === 'plane' || actor.role === 'helicopter' || actor.role === 'ship') {
        drawVehicleActor(ctx, actor, width, height, sceneTime, scene.duration, globalTime, interactive, floorRatio);
      } else {
        drawActor(ctx, actor, width, height, scene, sceneTime, scene.duration, globalTime, interactive, pal);
      }
    }
  }

  // 4. Floating / HUD / Sky overlay props
  for (const prop of props) {
    if (!WORLD_PROP_TYPES.has(prop.type)) {
      if (prop.type === 'cta') {
        drawOverlayProp(ctx, { ...prop, _platform: formatCfg?.platform }, width, height, sceneTime, scene.mood);
      } else {
        drawOverlayProp(ctx, prop, width, height, sceneTime, scene.mood);
      }
    }
  }

  // 5. Foreground weather / depth layer
  drawForegroundWeather(ctx, scene.bg, scene.subBg, width, height, globalTime);

  ctx.restore();

  drawInteractiveSpotlight(ctx, interactive?.pointer, width, height);
  drawTypographyAndHUD(ctx, scene, width, height, sceneTime, globalTime, isPortrait, formatCfg);

  ctx.restore();

  // Escalar hitboxes interactivos al tamaño real del lienzo Full HD
  if (interactive?.hitboxes && (scaleX !== 1 || scaleY !== 1)) {
    for (const hb of interactive.hitboxes) {
      hb.x *= scaleX;
      hb.y *= scaleY;
      hb.r *= Math.max(scaleX, scaleY);
    }
  }
};

window.StickmanStudio.fallbackRender2D = window.StickmanStudio.renderFrame;
window.StickmanStudio._hudHelpers = {
  MOOD_PALETTES,
  WORLD_PROP_TYPES,
  clamp,
  lerp,
  easeInOut,
  reframeSceneForVertical,
  drawOverlayProp,
  drawInteractiveSpotlight,
  drawTypographyAndHUD
};
})();
