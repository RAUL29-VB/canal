(() => {
const { EPISODES = [], renderFrame, MysteryAudioEngine } = window.StickmanStudio;

const STORAGE_KEY = 'stickman_custom_episodes_v1';
function loadCustomEpisodes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const episodeCopies = [...EPISODES, ...loadCustomEpisodes()].map((ep) => structuredClone(ep));
let episode = episodeCopies[0];
let currentFormatKey = 'full'; // 'full' | 'short' | 'reel'
let isPlaying = false;
let isExporting = false;
let elapsed = 0;
let playAnchorElapsed = 0;
let playAnchorWallMs = 0;
let lastSceneId = null;
let rafId = null;
const audioByTrack = {};
const customBlobTracks = new Set();

function baseFormatKey(key = currentFormatKey) {
  return key === 'short' ? 'short' : 'full';
}

function trackKey(key = currentFormatKey) {
  return `${episode.id}:${baseFormatKey(key)}`;
}

async function yieldToMain() {
  if ('scheduler' in window && typeof window.scheduler?.yield === 'function') {
    return window.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const interactive = {
  pointer: { x: 0.5, y: 0.5, active: false, flashlight: true },
  hitboxes: [],
  reactions: {},
  overrides: {}
};

let draggingActorId = null;
let dragMoved = false;

const audioEngine = new MysteryAudioEngine();

const canvas = document.getElementById('stage-canvas');
const ctx = canvas.getContext('2d');
const formatFullBtn = document.getElementById('fmt-full');
const formatShortBtn = document.getElementById('fmt-short');
const formatReelBtn = document.getElementById('fmt-reel');
const playBtn = document.getElementById('btn-play');
const restartBtn = document.getElementById('btn-restart');
const exportBtn = document.getElementById('btn-export');
const resetPosBtn = document.getElementById('btn-reset-pos');
const scrubber = document.getElementById('timeline-scrubber');
const timeReadout = document.getElementById('time-readout');
const sceneList = document.getElementById('scene-list');
const audioToggle = document.getElementById('audio-enabled');
const ttsToggle = document.getElementById('tts-enabled');
const flashlightToggle = document.getElementById('interactive-flashlight');
const volumeInput = document.getElementById('audio-volume');
const voiceFileInput = document.getElementById('voice-file');
const syncVoiceBtn = document.getElementById('btn-sync-voice');
const voicePlayer = document.getElementById('voice-player');
const jsonEditor = document.getElementById('script-json');
const applyJsonBtn = document.getElementById('btn-apply-json');
const statusLive = document.getElementById('status-live');
const exportProgress = document.getElementById('export-progress');
const captionLive = document.getElementById('caption-live');
const transcriptList = document.getElementById('transcript-list');
const episodeSelect = document.getElementById('episode-select');
const serverBadge = document.getElementById('server-badge');
const recordVoiceBtn = document.getElementById('btn-record-voice');
const cloneVoiceBtn = document.getElementById('btn-clone-voice');
const sampleFileInput = document.getElementById('sample-file');
const progressModal = document.getElementById('progress-modal');
const progressTitle = document.getElementById('progress-title');
const progressDetail = document.getElementById('progress-detail');
const modalProgress = document.getElementById('modal-progress');
const progressPercent = document.getElementById('progress-percent');
const cancelModalBtn = document.getElementById('btn-cancel-modal');
const ytTitleInput = document.getElementById('yt-title');
const ytDescInput = document.getElementById('yt-desc');
const fbTitleInput = document.getElementById('fb-title');
const fbDescInput = document.getElementById('fb-desc');
const ttDescInput = document.getElementById('tt-desc');
const cardYt = document.getElementById('card-yt');
const cardFb = document.getElementById('card-fb');
const cardTt = document.getElementById('card-tt');
const geminiTopicInput = document.getElementById('gemini-topic');
const copyPromptBtn = document.getElementById('btn-copy-prompt');
const importEpisodeJson = document.getElementById('import-episode-json');
const importEpisodeBtn = document.getElementById('btn-import-episode');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const generateApiBtn = document.getElementById('btn-generate-api');

let serverReady = false;
let hasVoiceSample = false;
let micRecorder = null;
let micStream = null;
let micTimer = null;
let exportCancelled = false;

function showProgressModal(title, detail, pct = 0, cancelText = 'Ocultar') {
  progressTitle.textContent = title;
  progressDetail.textContent = detail;
  updateProgressModal(detail, pct);
  cancelModalBtn.textContent = cancelText;
  if (!progressModal.open) {
    progressModal.showModal();
  }
}

function updateProgressModal(detail, pct) {
  progressDetail.textContent = detail;
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  modalProgress.value = clamped;
  progressPercent.textContent = `${clamped}%`;
}

function hideProgressModal() {
  if (progressModal.open) {
    progressModal.close();
  }
}

audioEngine.attachVoiceElement(voicePlayer);

function getFormatCfg(key = currentFormatKey) {
  const baseKey = baseFormatKey(key);
  const rawCfg = episode.formats[baseKey];
  const isPortrait = key === 'short' || key === 'reel' || rawCfg.height > rawCfg.width;
  const outWidth = isPortrait ? 1080 : 1920;
  const outHeight = isPortrait ? 1920 : 1080;
  const platform = key === 'reel' ? 'fb_tiktok' : (isPortrait ? 'youtube_short' : 'youtube_full');
  const label = key === 'reel'
    ? 'Video Completo Vertical Facebook / TikTok (9:16 · 5-6 min Full HD 1080×1920)'
    : key === 'short'
      ? 'YouTube Short Impacto (9:16 · Full HD 1080×1920)'
      : 'YouTube Documental Largo (16:9 · Full HD 1920×1080)';

  let total = 0;
  for (const s of rawCfg.scenes) total += s.duration;

  return {
    ...rawCfg,
    width: outWidth,
    height: outHeight,
    platform,
    reframeFromFull: key === 'reel',
    label,
    _totalDuration: total
  };
}

function getTimelineMetrics(cfg) {
  let total = 0;
  const spans = cfg.scenes.map((scene) => {
    const start = total;
    total += scene.duration;
    return { scene, start, end: total };
  });
  return { total, spans };
}

function findSceneAt(cfg, t) {
  const { total, spans } = getTimelineMetrics(cfg);
  const clamped = Math.max(0, Math.min(t, Math.max(0, total - 0.0005)));
  const hit = spans.find((s) => clamped >= s.start && clamped < s.end) || spans[spans.length - 1];
  return {
    total,
    spans,
    current: hit.scene,
    sceneTime: Math.max(0, clamped - hit.start)
  };
}

function formatSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function speakCaption(text) {
  if (!ttsToggle?.checked || isExporting || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const esVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
  if (esVoice) utter.voice = esVoice;
  utter.lang = esVoice?.lang || 'es-ES';
  utter.rate = 1.04;
  utter.pitch = 0.92;
  window.speechSynthesis.speak(utter);
}

function stopTTS() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function syncUILists() {
  const cfg = getFormatCfg();
  const { total, spans } = getTimelineMetrics(cfg);

  scrubber.max = total.toFixed(2);
  scrubber.value = elapsed.toFixed(2);
  timeReadout.textContent = `${formatSec(elapsed)} / ${formatSec(total)}`;

  sceneList.innerHTML = '';
  transcriptList.innerHTML = '';

  spans.forEach((span, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scene-chip';
    btn.dataset.sceneId = span.scene.id;
    btn.textContent = `${idx + 1}. ${span.scene.titleCard || span.scene.id} (${Number(span.scene.duration).toFixed(1)}s)`;
    btn.addEventListener('click', () => {
      elapsed = span.start;
      playAnchorElapsed = elapsed;
      playAnchorWallMs = performance.now();
      lastSceneId = null;
      if (voicePlayer.src) {
        voicePlayer.currentTime = Math.min(elapsed, voicePlayer.duration || elapsed);
      }
      drawCurrent();
    });
    li.appendChild(btn);
    sceneList.appendChild(li);

    const tLi = document.createElement('li');
    tLi.textContent = `[${formatSec(span.start)} - ${span.scene.titleCard || span.scene.id}] ${span.scene.caption}`;
    transcriptList.appendChild(tLi);
  });

  jsonEditor.value = JSON.stringify(episode.formats[baseFormatKey()].scenes, null, 2);
}

function updateActiveSceneHighlight(sceneId, caption) {
  for (const btn of sceneList.querySelectorAll('.scene-chip')) {
    const active = btn.dataset.sceneId === sceneId;
    btn.classList.toggle('is-active', active);
    if (active) {
      btn.setAttribute('aria-current', 'true');
    } else {
      btn.removeAttribute('aria-current');
    }
  }
  if (captionLive.textContent !== caption) {
    captionLive.textContent = caption;
  }
}

function applyFormat(key) {
  if (isExporting) return;
  pausePlayback();
  currentFormatKey = key;
  elapsed = 0;
  playAnchorElapsed = 0;
  lastSceneId = null;
  interactive.overrides = {};

  const cfg = getFormatCfg(key);
  canvas.width = cfg.width;
  canvas.height = cfg.height;
  canvas.dataset.orientation = cfg.height > cfg.width ? 'portrait' : 'landscape';

  formatFullBtn.setAttribute('aria-pressed', String(key === 'full'));
  formatShortBtn.setAttribute('aria-pressed', String(key === 'short'));
  formatReelBtn?.setAttribute('aria-pressed', String(key === 'reel'));
  formatFullBtn.classList.toggle('is-selected', key === 'full');
  formatShortBtn.classList.toggle('is-selected', key === 'short');
  formatReelBtn?.classList.toggle('is-selected', key === 'reel');

  cardYt?.classList.toggle('is-highlighted', key === 'full' || key === 'short');
  cardFb?.classList.toggle('is-highlighted', key === 'reel');
  cardTt?.classList.toggle('is-highlighted', key === 'reel');

  const savedAudio = audioByTrack[trackKey(key)];
  if (savedAudio) {
    if (voicePlayer.getAttribute('src') !== savedAudio) {
      voicePlayer.src = savedAudio;
    }
    syncVoiceBtn.disabled = false;
  } else {
    voicePlayer.removeAttribute('src');
    voicePlayer.load();
    syncVoiceBtn.disabled = true;
  }

  syncUILists();
  syncSocialFields();
  drawCurrent();
  announceStatus(`Modo: ${cfg.label}${savedAudio ? ' — Audio sincronizado al milisegundo.' : ' — Sin audio clonado aún para este formato.'}`);
}

function syncSocialFields() {
  const cfg = getFormatCfg();
  const s = cfg.social || {};
  const fallbackTitle = episode.title || 'Expediente Misterio';
  ytTitleInput.value = s.youtube?.title || fallbackTitle;
  ytDescInput.value = s.youtube?.description || `${fallbackTitle}\n\n#misteriossinresolver #casosreales #documental`;
  fbTitleInput.value = s.facebook?.title || fallbackTitle;
  fbDescInput.value = s.facebook?.description || `${fallbackTitle}\n\n¿Tú qué opinas de este caso? Déjalo en los comentarios.`;
  ttDescInput.value = s.tiktok?.description || `${fallbackTitle} #misterio #casosreales #documental #parati`;
}

function drawCurrent() {
  const cfg = getFormatCfg();
  const { total, current, sceneTime } = findSceneAt(cfg, elapsed);

  renderFrame(ctx, cfg, current, sceneTime, elapsed, interactive);

  if (current.id !== lastSceneId) {
    lastSceneId = current.id;
    if (isPlaying) {
      if (current.sfx) audioEngine.triggerSceneSFX(current.sfx);
      if (!voicePlayer.src) speakCaption(current.caption);
    }
    updateActiveSceneHighlight(current.id, current.caption || '');
  }

  scrubber.value = elapsed.toFixed(2);
  timeReadout.textContent = `${formatSec(elapsed)} / ${formatSec(total)}`;
}

async function startPlayback() {
  if (isPlaying) return;
  const cfg = getFormatCfg();
  const { total } = getTimelineMetrics(cfg);
  if (elapsed >= total - 0.05) {
    elapsed = 0;
    lastSceneId = null;
  }

  await audioEngine.startDrone();
  if (voicePlayer.src) {
    voicePlayer.currentTime = elapsed;
    try {
      await voicePlayer.play();
    } catch {
      // ignore autoplay block if any
    }
  }

  isPlaying = true;
  playBtn.textContent = 'Pausar';
  playAnchorElapsed = elapsed;
  playAnchorWallMs = performance.now();
  rafId = requestAnimationFrame(tick);
}

function pausePlayback() {
  isPlaying = false;
  playBtn.textContent = 'Reproducir';
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  audioEngine.stopDrone();
  stopTTS();
  if (voicePlayer.src && !voicePlayer.paused) {
    voicePlayer.pause();
  }
}

function tick(now) {
  if (!isPlaying) return;

  const cfg = getFormatCfg();
  const { total } = getTimelineMetrics(cfg);

  // RELOJ MAESTRO DE AUDIO: si hay narración activa, el video obedece al sample exacto de la voz
  if (voicePlayer.src && !voicePlayer.paused && !voicePlayer.ended) {
    elapsed = voicePlayer.currentTime;
    playAnchorElapsed = elapsed;
    playAnchorWallMs = now;
  } else {
    elapsed = playAnchorElapsed + (now - playAnchorWallMs) / 1000;
  }

  if (elapsed >= total) {
    elapsed = total;
    drawCurrent();
    pausePlayback();
    if (isExporting) {
      finishExport();
    }
    return;
  }

  drawCurrent();
  rafId = requestAnimationFrame(tick);
}

function getCanvasCoords(ev) {
  const rect = canvas.getBoundingClientRect();
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  return {
    nx: Math.max(0, Math.min(1, nx)),
    ny: Math.max(0, Math.min(1, ny)),
    px: nx * canvas.width,
    py: ny * canvas.height
  };
}

canvas.addEventListener('pointerdown', (ev) => {
  const { nx, ny, px, py } = getCanvasCoords(ev);
  interactive.pointer.x = nx;
  interactive.pointer.y = ny;
  interactive.pointer.active = true;

  for (let i = interactive.hitboxes.length - 1; i >= 0; i--) {
    const hb = interactive.hitboxes[i];
    const dist = Math.hypot(px - hb.x, py - hb.y);
    if (dist <= hb.r) {
      draggingActorId = hb.id;
      dragMoved = false;
      canvas.setPointerCapture(ev.pointerId);
      return;
    }
  }
});

canvas.addEventListener('pointermove', (ev) => {
  const { nx, ny } = getCanvasCoords(ev);
  interactive.pointer.x = nx;
  interactive.pointer.y = ny;
  interactive.pointer.active = true;

  if (draggingActorId) {
    dragMoved = true;
    interactive.overrides[draggingActorId] = {
      x: Math.max(0.08, Math.min(0.92, nx)),
      y: Math.max(0.35, Math.min(0.9, ny + 0.08))
    };
  }
  if (!isPlaying && !isExporting) drawCurrent();
});

canvas.addEventListener('pointerup', (ev) => {
  if (draggingActorId) {
    if (!dragMoved) {
      interactive.reactions[draggingActorId] = elapsed;
      audioEngine.ensureContext();
      audioEngine.triggerSceneSFX('pulse');
      announceStatus(`Reacción activada en ${draggingActorId}.`);
    } else {
      announceStatus(`Posición ajustada para ${draggingActorId}.`);
    }
    draggingActorId = null;
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    if (!isPlaying && !isExporting) {
      animateReactionBriefly();
    }
  }
});

canvas.addEventListener('pointerleave', () => {
  if (!draggingActorId) {
    interactive.pointer.active = false;
    if (!isPlaying && !isExporting) drawCurrent();
  }
});

function animateReactionBriefly() {
  const start = performance.now();
  const baseElapsed = elapsed;
  function step(now) {
    if (isPlaying || isExporting) return;
    const age = (now - start) / 1000;
    const cfg = getFormatCfg();
    const { current, sceneTime } = findSceneAt(cfg, baseElapsed);
    renderFrame(ctx, cfg, current, sceneTime, baseElapsed + age, interactive);
    if (age < 0.6) {
      requestAnimationFrame(step);
    } else {
      drawCurrent();
    }
  }
  requestAnimationFrame(step);
}

let activeRecorder = null;
let recordedChunks = [];

function pickSupportedMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return candidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}

function buildIvfHeader(width, height, fps, numFrames, fourcc) {
  const header = new Uint8Array(32);
  const view = new DataView(header.buffer);
  header.set([0x44, 0x4b, 0x49, 0x46], 0); // 'DKIF'
  view.setUint16(4, 0, true); // version 0
  view.setUint16(6, 32, true); // header size
  for (let i = 0; i < 4; i++) header[8 + i] = fourcc.charCodeAt(i);
  view.setUint16(12, width, true);
  view.setUint16(14, height, true);
  view.setUint32(16, fps, true); // timebase denominator
  view.setUint32(20, 1, true); // timebase numerator
  view.setUint32(24, numFrames, true);
  view.setUint32(28, 0, true);
  return header;
}

const macroTick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function pickWebCodecsConfig(width, height, fps) {
  if (typeof window.VideoEncoder !== 'function' || typeof window.VideoFrame !== 'function') {
    return null;
  }
  const h264Candidates = ['avc1.640028', 'avc1.4d0028', 'avc1.420028'];
  for (const codec of h264Candidates) {
    for (const hw of ['prefer-hardware', 'no-preference']) {
      try {
        const cfg = {
          codec,
          width,
          height,
          bitrate: 9_000_000,
          framerate: fps,
          hardwareAcceleration: hw,
          latencyMode: 'quality',
          avc: { format: 'annexb' }
        };
        const support = await VideoEncoder.isConfigSupported(cfg);
        if (support?.supported) {
          return { config: support.config || cfg, container: 'h264' };
        }
      } catch {
        // try next
      }
    }
  }
  try {
    const vp8Cfg = { codec: 'vp8', width, height, bitrate: 9_000_000, framerate: fps };
    const support = await VideoEncoder.isConfigSupported(vp8Cfg);
    if (support?.supported) {
      return { config: vp8Cfg, container: 'ivf', fourcc: 'VP80' };
    }
  } catch {
    // ignore
  }
  return null;
}

function exportFilenameSuffix() {
  if (currentFormatKey === 'reel') return 'fb-tiktok-completo-1080p';
  if (currentFormatKey === 'short') return 'youtube-short-1080p';
  return 'youtube-full-1080p';
}

function waitEncoderDrain(encoder) {
  if (encoder.encodeQueueSize <= 6) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      encoder.removeEventListener('dequeue', onDeq);
      resolve();
    };
    const onDeq = () => {
      if (encoder.encodeQueueSize <= 4) done();
    };
    encoder.addEventListener('dequeue', onDeq);
    setTimeout(done, 120);
  });
}

async function exportDeterministicFullHD() {
  const cfg = getFormatCfg();
  const exportFps = 30;
  const { total, spans } = getTimelineMetrics(cfg);
  const totalFrames = Math.max(1, Math.ceil(total * exportFps));
  const wc = await pickWebCodecsConfig(cfg.width, cfg.height, exportFps);
  if (!wc) return false;

  pausePlayback();
  isExporting = true;
  exportCancelled = false;
  exportBtn.disabled = true;
  exportProgress.hidden = false;
  exportProgress.value = 0;

  canvas.width = cfg.width;
  canvas.height = cfg.height;

  showProgressModal(
    `Exportando Full HD (${cfg.width}×${cfg.height})`,
    'Acelerando por GPU RTX con sincronización exacta audio-video...',
    2,
    'Cancelar exportación'
  );

  const outParts = wc.container === 'ivf'
    ? [buildIvfHeader(cfg.width, cfg.height, exportFps, totalFrames, wc.fourcc)]
    : [];
  let encoderError = null;
  let encodedCount = 0;

  const encoder = new VideoEncoder({
    output: (chunk) => {
      const payload = new Uint8Array(chunk.byteLength);
      chunk.copyTo(payload);
      if (wc.container === 'ivf') {
        const frameHeader = new Uint8Array(12);
        const fv = new DataView(frameHeader.buffer);
        const ptsFrame = Math.round((chunk.timestamp / 1_000_000) * exportFps);
        fv.setUint32(0, chunk.byteLength, true);
        fv.setUint32(4, ptsFrame >>> 0, true);
        fv.setUint32(8, 0, true);
        outParts.push(frameHeader, payload);
      } else {
        outParts.push(payload);
      }
      encodedCount++;
    },
    error: (err) => {
      encoderError = err;
    }
  });

  encoder.configure(wc.config);

  const cleanInteractive = {
    pointer: { x: 0.5, y: 0.5, active: false, flashlight: false },
    hitboxes: [],
    reactions: {},
    overrides: interactive.overrides
  };

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (exportCancelled) break;
      if (encoderError) throw encoderError;

      if (encoder.encodeQueueSize > 8) {
        await waitEncoderDrain(encoder);
      }

      const t = f / exportFps;
      const { current, sceneTime } = findSceneAt(cfg, t);
      renderFrame(ctx, cfg, current, sceneTime, t, cleanInteractive);

      const vf = new VideoFrame(canvas, {
        timestamp: Math.round(t * 1_000_000),
        duration: Math.round(1_000_000 / exportFps)
      });
      encoder.encode(vf, { keyFrame: f % (exportFps * 2) === 0 });
      vf.close();

      if (f % 10 === 0) {
        const pct = Math.min(82, ((f + 1) / totalFrames) * 82);
        exportProgress.value = pct;
        scrubber.value = t.toFixed(2);
        timeReadout.textContent = `${formatSec(t)} / ${formatSec(total)}`;
        updateProgressModal(
          `Renderizando Full HD ${cfg.width}×${cfg.height} (${formatSec(t)} / ${formatSec(total)}) — 0% desfase...`,
          pct
        );
        await macroTick();
      }
    }

    if (exportCancelled) {
      try { encoder.close(); } catch {}
      isExporting = false;
      exportBtn.disabled = false;
      exportProgress.hidden = true;
      hideProgressModal();
      drawCurrent();
      announceStatus('Exportación cancelada.');
      return true;
    }

    updateProgressModal('Finalizando codificación GPU Full HD...', 84);
    await encoder.flush();
    encoder.close();

    if (wc.container === 'h264' && encodedCount !== totalFrames) {
      throw new Error(`Recuento de fotogramas incompleto (${encodedCount}/${totalFrames}).`);
    }

    updateProgressModal('Uniendo voz exacta y masterizando MP4 Full HD 1080p con FFmpeg...', 88);
    exportProgress.value = 88;

    const sfxCues = spans
      .filter((sp) => Boolean(sp.scene.sfx))
      .map((sp) => ({ t: Number(sp.start.toFixed(4)), type: sp.scene.sfx }));

    const vidBlob = new Blob(outParts, { type: 'application/octet-stream' });
    const baseName = `${episode.id}-${exportFilenameSuffix()}`;

    const res = await fetch('/api/convert-mp4', {
      method: 'POST',
      headers: {
        'x-video-name': baseName,
        'x-container': wc.container,
        'x-episode-id': episode.id,
        'x-format-key': baseFormatKey(currentFormatKey),
        'x-include-bgm': audioToggle.checked ? '1' : '0',
        'x-bgm-volume': String(volumeInput.value || '0.6'),
        'x-total-duration': String(total),
        'x-sfx-cues': JSON.stringify(sfxCues)
      },
      body: vidBlob
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Fallo al masterizar MP4 Full HD.');
    }

    updateProgressModal('¡MP4 Full HD 1080p listo y 100% sincronizado! Descargando...', 100);
    exportProgress.value = 100;

    const a = document.createElement('a');
    a.href = data.downloadUrl;
    a.download = data.filename;
    a.click();

    setTimeout(hideProgressModal, 750);
    announceStatus(`¡Listo! Guardado en exportados/${data.filename} (${cfg.width}×${cfg.height} Full HD).`);
  } catch (err) {
    try { encoder.close(); } catch {}
    hideProgressModal();
    announceStatus(`Error en exportación Full HD: ${err.message}`);
  } finally {
    isExporting = false;
    exportBtn.disabled = false;
    exportProgress.hidden = true;
    elapsed = 0;
    drawCurrent();
  }
  return true;
}

async function startExport() {
  if (isExporting) return;

  // Ruta principal: render determinista cuadro a cuadro en Full HD 1080p + mezcla maestra WAV exacta en FFmpeg (0ms de atraso)
  if (serverReady && !customBlobTracks.has(trackKey())) {
    const handled = await exportDeterministicFullHD();
    if (handled) return;
  }

  // Respaldo MediaRecorder sincronizado al reloj de audio
  if (!window.MediaRecorder || typeof canvas.captureStream !== 'function') {
    announceStatus('Tu navegador no soporta grabación de lienzo.');
    return;
  }

  const mimeType = pickSupportedMime();
  if (!mimeType) {
    announceStatus('No se encontró un códec WebM compatible en este navegador.');
    return;
  }

  pausePlayback();
  elapsed = 0;
  lastSceneId = null;
  isExporting = true;
  exportCancelled = false;
  exportBtn.disabled = true;
  exportProgress.hidden = false;
  exportProgress.value = 0;

  const cfg = getFormatCfg();
  canvas.width = cfg.width;
  canvas.height = cfg.height;

  showProgressModal(
    serverReady ? 'Exportando Video Full HD (.mp4)' : 'Exportando Video Full HD (.webm)',
    `Grabando en ${cfg.width}×${cfg.height} sincronizado al audio...`,
    2,
    'Cancelar exportación'
  );

  await audioEngine.startDrone();
  if (voicePlayer.src) {
    voicePlayer.currentTime = 0;
  }
  const videoStream = canvas.captureStream(30);
  const audioTrack = audioEngine.getExportAudioTrack();
  if (audioTrack) {
    videoStream.addTrack(audioTrack);
  }

  recordedChunks = [];
  activeRecorder = new MediaRecorder(videoStream, {
    mimeType,
    videoBitsPerSecond: 9_000_000
  });

  activeRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  activeRecorder.onstop = async () => {
    if (exportCancelled) {
      isExporting = false;
      exportBtn.disabled = false;
      exportProgress.hidden = true;
      hideProgressModal();
      announceStatus('Exportación cancelada.');
      return;
    }

    const blob = new Blob(recordedChunks, { type: mimeType });
    const baseName = `${episode.id}-${exportFilenameSuffix()}`;

    if (serverReady) {
      try {
        updateProgressModal('Convirtiendo a MP4 Full HD (H.264 High + AAC) con FFmpeg...', 86);
        exportProgress.value = 86;
        const res = await fetch('/api/convert-mp4', {
          method: 'POST',
          headers: { 'x-video-name': baseName, 'x-container': 'webm' },
          body: blob
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Fallo al convertir a MP4.');
        }
        updateProgressModal('¡MP4 Full HD listo! Iniciando descarga...', 100);
        exportProgress.value = 100;

        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = data.filename;
        a.click();

        setTimeout(hideProgressModal, 700);
        announceStatus(`Video MP4 descargado y guardado en exportados/${data.filename}`);
      } catch (err) {
        hideProgressModal();
        announceStatus(`Error convirtiendo a MP4: ${err.message}`);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      hideProgressModal();
      announceStatus(`Video exportado como ${baseName}.webm`);
    }

    isExporting = false;
    exportBtn.disabled = false;
    exportProgress.hidden = true;
  };

  activeRecorder.start(250);
  announceStatus('Grabando video Full HD sincronizado al reloj de voz...');
  await startPlayback();

  const progressTimer = setInterval(() => {
    if (!isExporting || exportCancelled) {
      clearInterval(progressTimer);
      return;
    }
    const { total } = getTimelineMetrics(getFormatCfg());
    const recPct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
    const totalPct = serverReady ? Math.min(82, recPct * 0.82) : recPct;
    exportProgress.value = totalPct;
    updateProgressModal(
      `Grabando animación Full HD y audio (${formatSec(elapsed)} / ${formatSec(total)})...`,
      totalPct
    );
  }, 150);
}

function cancelActiveExport() {
  if (!isExporting) {
    hideProgressModal();
    return;
  }
  exportCancelled = true;
  pausePlayback();
  if (activeRecorder && activeRecorder.state === 'recording') {
    activeRecorder.stop();
  }
}

cancelModalBtn.addEventListener('click', () => {
  if (isExporting) {
    cancelActiveExport();
  } else {
    hideProgressModal();
  }
});

progressModal.addEventListener('cancel', (ev) => {
  if (isExporting) {
    ev.preventDefault();
    cancelActiveExport();
  }
});

function finishExport() {
  if (activeRecorder && activeRecorder.state === 'recording') {
    activeRecorder.stop();
  }
}

function announceStatus(msg) {
  statusLive.textContent = msg;
}

formatFullBtn.addEventListener('click', () => applyFormat('full'));
formatShortBtn.addEventListener('click', () => applyFormat('short'));
formatReelBtn?.addEventListener('click', () => applyFormat('reel'));

playBtn.addEventListener('click', () => {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
});

restartBtn.addEventListener('click', () => {
  pausePlayback();
  elapsed = 0;
  playAnchorElapsed = 0;
  lastSceneId = null;
  if (voicePlayer.src) voicePlayer.currentTime = 0;
  drawCurrent();
});

resetPosBtn.addEventListener('click', () => {
  interactive.overrides = {};
  drawCurrent();
  announceStatus('Posiciones de los personajes restablecidas al guion.');
});

scrubber.addEventListener('input', () => {
  elapsed = Number(scrubber.value);
  playAnchorElapsed = elapsed;
  playAnchorWallMs = performance.now();
  lastSceneId = null;
  if (voicePlayer.src) voicePlayer.currentTime = Math.min(elapsed, voicePlayer.duration || elapsed);
  drawCurrent();
});

audioToggle.addEventListener('change', () => {
  audioEngine.setEnabled(audioToggle.checked);
});

ttsToggle.addEventListener('change', () => {
  if (!ttsToggle.checked) stopTTS();
});

flashlightToggle.addEventListener('change', () => {
  interactive.pointer.flashlight = flashlightToggle.checked;
  if (!isPlaying && !isExporting) drawCurrent();
});

volumeInput.addEventListener('input', () => {
  audioEngine.setVolume(Number(volumeInput.value));
});

function distributeDurationsByWords(scenes, targetTotalSec) {
  const weights = scenes.map((s) => {
    const cleanLen = (s.caption || '').trim().length;
    return Math.max(12, cleanLen) / 14.5 + 0.45;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  scenes.forEach((s, idx) => {
    if (idx < scenes.length - 1) {
      const d = Number(((weights[idx] / weightSum) * targetTotalSec).toFixed(4));
      s.duration = Math.max(1.5, d);
      acc += s.duration;
    } else {
      s.duration = Number(Math.max(1.5, targetTotalSec - acc).toFixed(4));
    }
  });
}

voiceFileInput.addEventListener('change', () => {
  const file = voiceFileInput.files && voiceFileInput.files[0];
  if (!file) return;
  showProgressModal('Cargando audio', `Leyendo ${file.name}...`, 40);
  const objUrl = URL.createObjectURL(file);
  const tKey = trackKey();
  audioByTrack[tKey] = objUrl;
  customBlobTracks.add(tKey);
  voicePlayer.src = objUrl;
  syncVoiceBtn.disabled = false;
  voicePlayer.onloadedmetadata = () => {
    updateProgressModal(`Audio cargado (${voicePlayer.duration.toFixed(1)}s).`, 100);
    setTimeout(hideProgressModal, 450);
    voicePlayer.onloadedmetadata = null;
  };
  announceStatus(`Voz cargada para ${baseFormatKey()}: ${file.name}. Pulsa "Ajustar escenas al audio" para sincronizar.`);
});

syncVoiceBtn.addEventListener('click', () => {
  if (!voicePlayer.duration || Number.isNaN(voicePlayer.duration)) {
    announceStatus('Espera un momento a que cargue la duración del audio.');
    return;
  }
  showProgressModal('Sincronizando escenas', 'Alineando duración de cada escena al peso de locución...', 55);
  const baseScenes = episode.formats[baseFormatKey()].scenes;
  distributeDurationsByWords(baseScenes, voicePlayer.duration);
  elapsed = 0;
  playAnchorElapsed = 0;
  lastSceneId = null;
  syncUILists();
  drawCurrent();
  updateProgressModal(`Escenas sincronizadas (${voicePlayer.duration.toFixed(2)}s).`, 100);
  setTimeout(hideProgressModal, 450);
  announceStatus(`Duración sincronizada proporcionalmente al texto (${voicePlayer.duration.toFixed(2)}s).`);
});

applyJsonBtn.addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('El guion debe ser un arreglo JSON con al menos una escena.');
    }
    for (const s of parsed) {
      if (typeof s.duration !== 'number' || s.duration <= 0) {
        throw new Error('Cada escena necesita "duration" numérico > 0.');
      }
    }
    pausePlayback();
    episode.formats[baseFormatKey()].scenes = parsed;
    elapsed = 0;
    playAnchorElapsed = 0;
    lastSceneId = null;
    syncUILists();
    drawCurrent();
    announceStatus('Guion actualizado correctamente.');
  } catch (err) {
    announceStatus(`Error en JSON: ${err.message}`);
  }
});

exportBtn.addEventListener('click', startExport);

async function checkLocalServer() {
  if (window.location.protocol === 'file:') {
    serverBadge.textContent = 'Para usar clonación y MP4 Full HD en 1 clic, abre el estudio con ABRIR_ESTUDIO.bat.';
    recordVoiceBtn.disabled = true;
    sampleFileInput.disabled = true;
    exportBtn.textContent = 'Exportar Full HD (.webm)';
    return;
  }
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.ok) throw new Error('offline');
    serverReady = true;
    hasVoiceSample = Boolean(data.hasVoiceSample);
    serverBadge.classList.add('is-ready');
    serverBadge.textContent = hasVoiceSample
      ? `Servidor Full HD listo (${data.cuda ? 'GPU CUDA' : 'CPU'}) — Muestra de voz guardada.`
      : `Servidor Full HD listo (${data.cuda ? 'GPU CUDA' : 'CPU'}) — Graba o sube 10s de tu voz.`;
    cloneVoiceBtn.disabled = !hasVoiceSample;
    exportBtn.textContent = data.ffmpeg ? 'Exportar Full HD 1080p (.mp4)' : 'Exportar Full HD (.webm)';

    if (data.savedTracks && Object.keys(data.savedTracks).length > 0) {
      for (const [key, info] of Object.entries(data.savedTracks)) {
        audioByTrack[key] = info.audioUrl;
        customBlobTracks.delete(key);
        const [epId, fmtKey] = key.split(':');
        const targetEp = episodeCopies.find((e) => e.id === epId);
        const fmtCfg = targetEp?.formats?.[fmtKey];
        if (fmtCfg && Array.isArray(info.durations) && info.durations.length === fmtCfg.scenes.length) {
          fmtCfg.scenes.forEach((s, idx) => {
            s.duration = info.durations[idx];
          });
        } else if (fmtCfg && typeof info.totalDuration === 'number' && info.totalDuration > 0) {
          distributeDurationsByWords(fmtCfg.scenes, info.totalDuration);
        }
      }
      applyFormat(currentFormatKey);
    }
  } catch {
    serverBadge.textContent = 'Servidor de voz desconectado. Ejecuta ABRIR_ESTUDIO.bat.';
    recordVoiceBtn.disabled = true;
    sampleFileInput.disabled = true;
    exportBtn.textContent = 'Exportar Full HD (.webm)';
  }
}

async function uploadVoiceSample(blob, ext) {
  showProgressModal('Procesando muestra de voz', 'Limpiando y normalizando audio con FFmpeg...', 45);
  announceStatus('Guardando y preparando tu muestra de voz...');
  try {
    const res = await fetch('/api/save-voice', {
      method: 'POST',
      headers: { 'x-audio-ext': ext },
      body: blob
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo guardar la muestra.');
    }
    hasVoiceSample = true;
    cloneVoiceBtn.disabled = false;
    serverBadge.classList.add('is-ready');
    serverBadge.textContent = `Muestra lista (${data.duration}s). Ya puedes clonar tu voz.`;
    updateProgressModal(`¡Muestra de voz guardada (${data.duration}s)!`, 100);
    setTimeout(hideProgressModal, 550);
    announceStatus(`¡Muestra de voz guardada (${data.duration}s)! Ahora pulsa "Clonar mi voz para este video".`);
  } catch (err) {
    hideProgressModal();
    throw err;
  }
}

recordVoiceBtn.addEventListener('click', async () => {
  if (!serverReady) return;
  if (micRecorder && micRecorder.state === 'recording') {
    clearTimeout(micTimer);
    micRecorder.stop();
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    micRecorder = new MediaRecorder(micStream);
    let recCountdown = null;
    const recStart = Date.now();
    micRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    micRecorder.onstop = async () => {
      clearInterval(recCountdown);
      micStream.getTracks().forEach((t) => t.stop());
      recordVoiceBtn.textContent = 'Grabar mi voz (10s)';
      try {
        const blob = new Blob(chunks, { type: micRecorder.mimeType || 'audio/webm' });
        await uploadVoiceSample(blob, 'webm');
      } catch (err) {
        announceStatus(`Error guardando grabación: ${err.message}`);
      }
    };
    micRecorder.start();
    recordVoiceBtn.textContent = 'Detener grabación';
    showProgressModal('Grabando tu voz', 'Habla natural frente al micrófono (0 / 10s)...', 0, 'Ocultar');
    recCountdown = setInterval(() => {
      const sec = Math.min(10, (Date.now() - recStart) / 1000);
      updateProgressModal(`Habla natural frente al micrófono (${sec.toFixed(1)}s / 10s)...`, (sec / 10) * 100);
    }, 150);
    announceStatus('Grabando tu voz... habla normal durante 8-10 segundos.');
    micTimer = setTimeout(() => {
      if (micRecorder && micRecorder.state === 'recording') {
        micRecorder.stop();
      }
    }, 10000);
  } catch (err) {
    hideProgressModal();
    announceStatus(`No se pudo acceder al micrófono: ${err.message}`);
  }
});

sampleFileInput.addEventListener('change', async () => {
  const file = sampleFileInput.files && sampleFileInput.files[0];
  if (!file || !serverReady) return;
  const ext = (file.name.split('.').pop() || 'wav').toLowerCase();
  try {
    await uploadVoiceSample(file, ext);
  } catch (err) {
    announceStatus(`Error subiendo audio: ${err.message}`);
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

cloneVoiceBtn.addEventListener('click', async () => {
  if (!serverReady || !hasVoiceSample) return;
  pausePlayback();
  cloneVoiceBtn.disabled = true;
  cloneVoiceBtn.textContent = 'Clonando voz... (espera)';
  showProgressModal('Clonando tu voz en GPU', 'Iniciando generación de escenas...', 2, 'Ocultar');
  announceStatus('Generando narración con tu voz en la RTX 4050...');

  try {
    const targetFmt = baseFormatKey(currentFormatKey);
    const baseScenes = episode.formats[targetFmt].scenes;
    const lines = baseScenes.map((s) => s.caption || '');
    const startRes = await fetch('/api/clone-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodeId: episode.id,
        lines,
        pauseSec: 0.45,
        exaggeration: 0.55,
        formatKey: targetFmt
      })
    });
    const startData = await startRes.json();
    if (!startRes.ok || !startData.ok) {
      throw new Error(startData.error || 'No se pudo iniciar la clonación.');
    }

    let finalData = null;
    while (true) {
      await sleep(400);
      const jobRes = await fetch(`/api/job/${startData.jobId}`);
      const job = await jobRes.json();
      if (!jobRes.ok || !job.ok) {
        throw new Error(job.error || 'Error consultando el progreso.');
      }
      updateProgressModal(job.message || 'Procesando...', job.pct || 0);
      if (job.status === 'done') {
        finalData = job;
        break;
      }
      if (job.status === 'error') {
        throw new Error(job.error || 'Fallo al clonar voz.');
      }
    }

    if (Array.isArray(finalData.durations)) {
      baseScenes.forEach((s, idx) => {
        if (typeof finalData.durations[idx] === 'number') {
          s.duration = finalData.durations[idx];
        }
      });
    }

    const tKey = trackKey(targetFmt);
    audioByTrack[tKey] = finalData.audioUrl;
    customBlobTracks.delete(tKey);
    voicePlayer.src = finalData.audioUrl;
    syncVoiceBtn.disabled = false;
    elapsed = 0;
    playAnchorElapsed = 0;
    lastSceneId = null;
    syncUILists();
    drawCurrent();
    setTimeout(hideProgressModal, 600);
    announceStatus('¡Voz clonada y sincronizada al milisegundo! Lista tanto para YouTube Short como para Reel FB / TikTok.');
  } catch (err) {
    hideProgressModal();
    announceStatus(`Error al clonar voz: ${err.message}`);
  } finally {
    cloneVoiceBtn.disabled = !hasVoiceSample;
    cloneVoiceBtn.textContent = 'Clonar mi voz para este video';
  }
});

function refreshEpisodeSelect(selectedIdx = 0) {
  episodeSelect.innerHTML = '';
  episodeCopies.forEach((ep, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = ep.title;
    episodeSelect.appendChild(opt);
  });
  episodeSelect.value = String(selectedIdx);
}

refreshEpisodeSelect(0);

episodeSelect.addEventListener('change', () => {
  const idx = Number(episodeSelect.value);
  if (!episodeCopies[idx] || isExporting) return;
  pausePlayback();
  episode = episodeCopies[idx];
  applyFormat(currentFormatKey);
});

document.querySelectorAll('.btn-copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const targetId = btn.dataset.copyTarget;
    const el = document.getElementById(targetId);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
      const orig = btn.textContent;
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = orig; }, 1400);
      announceStatus('Texto copiado al portapapeles.');
    } catch {
      el.select();
      announceStatus('Selecciona el texto y pulsa Ctrl+C para copiar.');
    }
  });
});

function buildGeminiPrompt(topic) {
  return `Actúa como guionista y director de documentales animados 3D Cel-Shaded de misterio (especialmente misterios del Perú y el mundo) para YouTube, Facebook y TikTok, y devuelve ÚNICAMENTE un JSON válido (sin texto fuera del JSON, sin comentarios) para mi motor 3D WebGL Full HD.

TEMA DEL EPISODIO: "${topic}"

REQUISITOS ESTRICTOS:
1. Formato exacto del JSON:
{
  "id": "slug-corto-sin-espacios",
  "title": "EP: Título corto (5-6 min)",
  "formats": {
    "full": {
      "label": "YouTube Largo (16:9 · Full HD 1080p)",
      "width": 1920,
      "height": 1080,
      "fps": 60,
      "social": {
        "youtube": { "title": "Título viral SEO < 90 chars", "description": "Descripción documental + pregunta a la audiencia + hashtags (#misteriosdelperu #casosreales #documental — NUNCA uses #animacion)" },
        "facebook": { "title": "Gancho para Facebook", "description": "Descripción conversacional con pregunta final" },
        "tiktok": { "description": "Texto corto viral + hashtags (#misteriosdelperu #casosreales #documental #parati)" }
      },
      "scenes": [ ...36 escenas... ]
    },
    "short": {
      "label": "YouTube Short Impacto (9:16 · Full HD 1080×1920)",
      "width": 1080,
      "height": 1920,
      "fps": 60,
      "social": {
        "youtube": { "title": "Título Short impactante + #shorts #misterio", "description": "Resumen + Mira el documental completo en el canal + #casosreales #shorts" },
        "facebook": { "title": "Título viral para Facebook Reel 😱", "description": "Gancho + pregunta para comentarios + #misteriosdelperu #reels" },
        "tiktok": { "description": "Gancho explosivo + pregunta en comentarios 👇 #misteriosdelperu #documental #parati #fyp" }
      },
      "scenes": [ ...5 escenas de alto impacto... ]
    }
  }
}

2. Cada escena debe tener esta estructura 3D:
{
  "id": "s01",
  "duration": 9.0,
  "bg": "hayuMarcaNight | hayuMarcaSunset | hayuMarcaDay | titicacaLake | incaTemple | andeanTrail | expeditionCamp | labRoom | radarRoom | spotlight | darkRoom | void",
  "subBg": "default | lights (para titicacaLake)",
  "portalPower": 0.0,
  "portalPowerEnd": 0.85,
  "mood": "tense | mysterious | eerie | shock",
  "sfx": "sting | heartbeat | pulse | null",
  "camera": { "zoomStart": 1.04, "zoomEnd": 1.20, "orbitStart": -14, "orbitEnd": 14, "heightStart": 1.9, "heightEnd": 2.3, "shake": 1.0 },
  "titleCard": "TÍTULO CORTO EN MAYÚSCULAS",
  "caption": "Frase hablada en español natural (18 a 25 palabras, TODOS los años y números escritos en letras para buena pronunciación TTS).",
  "actors": [
    {
      "id": "prota",
      "role": "stickman | shadow",
      "outfit": "andean | guide | inca_priest | conquistador | archaeologist | explorer | forensic | detective",
      "hat": "fedora | none",
      "color": "#b91c1c",
      "scale": 1.0,
      "keyframes": [
        { "t": 0, "x": 0.34, "y": 0.74, "z": 0.2, "pose": "idle | walk | run | talk | point | point_up | confused | inspect | kneel | insert_disk | hold_torch | gasp | scared | cover_ears | climb | fallen | wave | shadow_lurk | vanish", "facing": 1, "expr": "neutral | curious | suspicious | shocked | sad | mysterious | empty_eyes", "prop": "none | solar_disk | torch | scanner | flashlight | compass | camera | clipboard | passport | knife", "speaking": true },
        { "t": 1, "x": 0.50, "y": 0.74, "z": 0.0, "pose": "point", "facing": 1, "expr": "shocked", "prop": "solar_disk", "speaking": true }
      ]
    }
  ],
  "overlayProps": [
    { "type": "peruMap | solarDiskZoom | seismicWave | rockScan | orbs | compass | radar | folder | clock | question | splitPortal | cta", "x": 0.78, "y": 0.28, "label": "TEXTO CORTO" }
  ]
}

3. Usa los nuevos atuendos 3D ("guide", "inca_priest", "conquistador", "archaeologist", "detective"), cámara orbital 3D ("orbitStart" / "orbitEnd", "heightStart" / "heightEnd") y efectos luminosos ("portalPower" / "portalPowerEnd"). Las primeras 2 escenas de "full" y la escena 1 de "short" deben abrir con ACCIÓN VISUAL EXPLOSIVA desde t=0. En "short", posiciona actores en y=0.68 y HUD props arriba en x=0.50, y=0.22-0.25.
Devuelve SOLO el JSON.`;
}

function importEpisodeFromText(rawText) {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !parsed.formats?.full?.scenes?.length || !parsed.formats?.short?.scenes?.length) {
    throw new Error('El JSON debe incluir formats.full.scenes y formats.short.scenes.');
  }
  parsed.id = (parsed.id || `custom-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
  parsed.title = parsed.title || parsed.id;

  const customList = loadCustomEpisodes().filter((e) => e.id !== parsed.id);
  customList.push(parsed);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customList));
  } catch {
    // ignore quota error
  }

  const existingIdx = episodeCopies.findIndex((e) => e.id === parsed.id);
  let targetIdx;
  if (existingIdx >= 0) {
    episodeCopies[existingIdx] = structuredClone(parsed);
    targetIdx = existingIdx;
  } else {
    episodeCopies.push(structuredClone(parsed));
    targetIdx = episodeCopies.length - 1;
  }

  refreshEpisodeSelect(targetIdx);
  episode = episodeCopies[targetIdx];
  applyFormat('full');
  announceStatus(`¡Episodio "${parsed.title}" importado en Full HD 1080p!`);
}

copyPromptBtn.addEventListener('click', async () => {
  const topic = (geminiTopicInput.value || '').trim() || 'El Barco Fantasma Mary Celeste (1872)';
  const prompt = buildGeminiPrompt(topic);
  try {
    await navigator.clipboard.writeText(prompt);
    announceStatus('Prompt Full HD copiado. Pégalo en tu pestaña de gemini.google.com, copia el JSON y pégalo aquí abajo.');
  } catch {
    importEpisodeJson.value = prompt;
    announceStatus('No se pudo copiar automático; dejé el prompt en la caja de texto para que lo copies.');
  }
});

importEpisodeBtn.addEventListener('click', () => {
  try {
    if (!importEpisodeJson.value.trim()) {
      throw new Error('Pega primero el JSON generado por Gemini.');
    }
    importEpisodeFromText(importEpisodeJson.value);
    importEpisodeJson.value = '';
  } catch (err) {
    announceStatus(`Error al importar JSON: ${err.message}`);
  }
});

generateApiBtn.addEventListener('click', async () => {
  const apiKey = (geminiApiKeyInput.value || '').trim();
  const topic = (geminiTopicInput.value || '').trim();
  if (!apiKey) {
    announceStatus('Ingresa tu API Key gratuita de Google AI Studio (aistudio.google.com).');
    return;
  }
  if (!topic) {
    announceStatus('Escribe primero el tema del misterio arriba.');
    return;
  }

  showProgressModal('Generando episodio con Gemini API', `Escribiendo guion y escenas para "${topic}"...`, 35, 'Ocultar');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildGeminiPrompt(topic) }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error en Gemini API.');
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    updateProgressModal('Importando episodio Full HD al estudio...', 90);
    importEpisodeFromText(text);
    updateProgressModal('¡Episodio Full HD creado!', 100);
    setTimeout(hideProgressModal, 550);
  } catch (err) {
    hideProgressModal();
    announceStatus(`Error con Gemini API: ${err.message}`);
  }
});

applyFormat('full');
checkLocalServer();
})();
