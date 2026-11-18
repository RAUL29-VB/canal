/**
 * Motor de audio procedimental de misterio (Web Audio API) + mezcla de voz en off.
 */
window.StickmanStudio = window.StickmanStudio || {};
window.StickmanStudio.MysteryAudioEngine = class MysteryAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.streamDest = null;
    this.droneOsc = null;
    this.droneGain = null;
    this.voiceElement = null;
    this.voiceSource = null;
    this.volume = 0.6;
    this.enabled = true;
  }

  ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? this.volume : 0;

    this.streamDest = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.streamDest);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? this.volume : 0, this.ctx.currentTime, 0.05);
    }
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx && this.enabled) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  attachVoiceElement(audioEl) {
    this.voiceElement = audioEl;
    if (this.ctx && !this.voiceSource && audioEl) {
      this.voiceSource = this.ctx.createMediaElementSource(audioEl);
      this.voiceSource.connect(this.masterGain);
    }
  }

  async startDrone() {
    this.ensureContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (this.voiceElement && !this.voiceSource) {
      this.voiceSource = this.ctx.createMediaElementSource(this.voiceElement);
      this.voiceSource.connect(this.masterGain);
    }
    if (this.droneOsc) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    osc2.type = 'triangle';
    osc2.frequency.value = 55.6;

    filter.type = 'lowpass';
    filter.frequency.value = 180;

    gain.gain.value = 0.08;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    this.droneOsc = [osc1, osc2];
    this.droneGain = gain;
  }

  stopDrone() {
    if (this.droneOsc) {
      this.droneOsc.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // ignore already stopped
        }
      });
      this.droneOsc = null;
      this.droneGain = null;
    }
  }

  triggerSceneSFX(sfxType) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    if (sfxType === 'sting') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 1.1);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.25);
    } else if (sfxType === 'heartbeat') {
      [0, 0.28].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(68, now + offset);
        osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.18);
        gain.gain.setValueAtTime(0.24, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.22);
      });
    } else if (sfxType === 'pulse') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.6);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.7);
    }
  }

  getExportAudioTrack() {
    this.ensureContext();
    return this.streamDest.stream.getAudioTracks()[0] || null;
  }
}
