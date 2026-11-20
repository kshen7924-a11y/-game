import { WeatherType } from './types';

export function triggerHaptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore haptic errors on unsupported browsers
  }
}

export interface GrabSoundOptions {
  isFoot?: boolean;
  isSnowy?: boolean;
  wet?: boolean;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Ambient Layer 1: Broad alpine wind bed
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Ambient Layer 2: Distant howling wind (altitude pitch-modulated)
  private howlFilter: BiquadFilterNode | null = null;
  private howlGain: GainNode | null = null;
  private howlOsc: OscillatorNode | null = null;
  private howlOscGain: GainNode | null = null;

  // Ambient Layer 3: Rain / blowing snow hiss
  private weatherFilter: BiquadFilterNode | null = null;
  private weatherGain: GainNode | null = null;

  private muted = false;
  private initialized = false;

  public init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.initialized = true;
    this.noiseBuffer = this.createNoiseBuffer(3);
    this.setupSoundscapes();
  }

  private createNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.028 * white) / 1.028;
      lastOut = data[i];
      data[i] *= 2.5;
    }
    return buffer;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(mute ? 0 : 0.032, now, 0.14);
    }
    if (this.howlGain) {
      this.howlGain.gain.setTargetAtTime(mute ? 0 : 0.012, now, 0.14);
    }
    if (this.howlOscGain) {
      this.howlOscGain.gain.setTargetAtTime(mute ? 0 : 0.004, now, 0.14);
    }
    if (this.weatherGain && mute) {
      this.weatherGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private setupSoundscapes() {
    if (!this.ctx || !this.noiseBuffer) return;

    // 1. Low-mid alpine wind bed
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = this.noiseBuffer;
    windNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 320;
    windFilter.Q.value = 1.5;

    const windGain = this.ctx.createGain();
    windGain.gain.value = this.muted ? 0 : 0.03;

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ctx.destination);
    windNoise.start();

    this.windFilter = windFilter;
    this.windGain = windGain;

    // 2. Distant howling canyon/ridge wind (resonant high-Q bandpass + subtle harmonic whistle + slow LFO)
    const howlNoise = this.ctx.createBufferSource();
    howlNoise.buffer = this.noiseBuffer;
    howlNoise.loop = true;

    const howlFilter = this.ctx.createBiquadFilter();
    howlFilter.type = 'bandpass';
    howlFilter.frequency.value = 310;
    howlFilter.Q.value = 9.0;

    const howlGain = this.ctx.createGain();
    howlGain.gain.value = this.muted ? 0 : 0.01;

    // Slow organic wind swell LFO modulating howl filter & whistle pitch
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.17;

    const lfoFilterDepth = this.ctx.createGain();
    lfoFilterDepth.gain.value = 55;
    lfo.connect(lfoFilterDepth);
    lfoFilterDepth.connect(howlFilter.frequency);

    const howlOsc = this.ctx.createOscillator();
    howlOsc.type = 'sine';
    howlOsc.frequency.value = 310;

    const lfoOscDepth = this.ctx.createGain();
    lfoOscDepth.gain.value = 42;
    lfo.connect(lfoOscDepth);
    lfoOscDepth.connect(howlOsc.frequency);

    const howlOscGain = this.ctx.createGain();
    howlOscGain.gain.value = this.muted ? 0 : 0.003;

    howlNoise.connect(howlFilter);
    howlFilter.connect(howlGain);
    howlGain.connect(this.ctx.destination);

    howlOsc.connect(howlOscGain);
    howlOscGain.connect(this.ctx.destination);

    howlNoise.start();
    howlOsc.start();
    lfo.start();

    this.howlFilter = howlFilter;
    this.howlGain = howlGain;
    this.howlOsc = howlOsc;
    this.howlOscGain = howlOscGain;

    // 3. Weather layer (rain patter / blowing snow grit)
    const weatherNoise = this.ctx.createBufferSource();
    weatherNoise.buffer = this.noiseBuffer;
    weatherNoise.loop = true;

    const weatherFilter = this.ctx.createBiquadFilter();
    weatherFilter.type = 'bandpass';
    weatherFilter.frequency.value = 2200;
    weatherFilter.Q.value = 0.9;

    const weatherGain = this.ctx.createGain();
    weatherGain.gain.value = 0;

    weatherNoise.connect(weatherFilter);
    weatherFilter.connect(weatherGain);
    weatherGain.connect(this.ctx.destination);
    weatherNoise.start();

    this.weatherFilter = weatherFilter;
    this.weatherGain = weatherGain;
  }

  public updateWind(altitudeRatio: number, gust: number) {
    this.updateEnvironment(altitudeRatio, gust, 'clear', 0);
  }

  public updateEnvironment(
    altitudeRatio: number,
    gust: number,
    weatherType: WeatherType,
    weatherIntensity: number
  ) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const clampedAlt = Math.max(0, Math.min(1.2, altitudeRatio));
    const gustMag = Math.abs(gust);

    if (this.windFilter && this.windGain) {
      const freq = 240 + clampedAlt * 410 + gustMag * 230;
      const vol = 0.022 + clampedAlt * 0.036 + gustMag * 0.028;
      this.windFilter.frequency.setTargetAtTime(freq, now, 0.35);
      this.windGain.gain.setTargetAtTime(vol, now, 0.35);
    }

    // Distant howling wind pitch rises eerily with altitude and wind gusts
    if (this.howlFilter && this.howlGain && this.howlOsc && this.howlOscGain) {
      const howlPitch = 250 + clampedAlt * 440 + gustMag * 180;
      const howlStrength =
        0.006 +
        clampedAlt * 0.024 +
        gustMag * 0.018 +
        (weatherType === 'snowstorm' ? 0.015 * weatherIntensity : 0);

      this.howlFilter.frequency.setTargetAtTime(howlPitch, now, 0.4);
      this.howlGain.gain.setTargetAtTime(Math.min(0.065, howlStrength), now, 0.4);
      this.howlOsc.frequency.setTargetAtTime(howlPitch * 1.02, now, 0.4);
      this.howlOscGain.gain.setTargetAtTime(
        Math.min(0.014, howlStrength * 0.24),
        now,
        0.4
      );
    }

    // Weather hiss (rain vs blowing snow vs quiet valley)
    if (this.weatherFilter && this.weatherGain) {
      if (weatherType === 'rain') {
        this.weatherFilter.type = 'bandpass';
        this.weatherFilter.frequency.setTargetAtTime(2400 + gustMag * 500, now, 0.3);
        this.weatherGain.gain.setTargetAtTime(0.028 * weatherIntensity, now, 0.3);
      } else if (weatherType === 'snowstorm') {
        this.weatherFilter.type = 'highpass';
        this.weatherFilter.frequency.setTargetAtTime(1350 + clampedAlt * 450, now, 0.3);
        this.weatherGain.gain.setTargetAtTime(0.022 * weatherIntensity, now, 0.3);
      } else {
        this.weatherGain.gain.setTargetAtTime(0, now, 0.35);
      }
    }
  }

  /** Procedural muffled snow crunching: damped granular noise sweep + soft sub-thump */
  public playSnowCrunch(intensity = 1) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.19;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Coarse compressed snow grain pulses
    for (let i = 0; i < len; i++) {
      const progress = i / len;
      const env = Math.sin(progress * Math.PI) * (1 - progress * 0.45);
      const grainGate = Math.sin(progress * Math.PI * 7) > -0.2 ? 1 : 0.35;
      data[i] = (Math.random() * 2 - 1) * env * grainGate;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1050, now);
    bandpass.frequency.exponentialRampToValueAtTime(340, now + dur);
    bandpass.Q.value = 1.25;

    const muffle = this.ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.setValueAtTime(1450, now);
    muffle.frequency.exponentialRampToValueAtTime(480, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(bandpass);
    bandpass.connect(muffle);
    muffle.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);

    // Soft muffled boot compression thump
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(92, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    thumpGain.gain.setValueAtTime(0.08 * intensity, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    thump.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);
    thump.start(now);
    thump.stop(now + 0.11);
  }

  public playLimbTick() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.035);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playDyno() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(430, now + 0.14);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHeartbeat() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.16].forEach((offset, i) => {
      if (!this.ctx) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 64 : 52, t);
      osc.frequency.exponentialRampToValueAtTime(34, t + 0.11);

      gain.gain.setValueAtTime(i === 0 ? 0.13 : 0.085, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  public playSpringLaunch() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(118, now);
    kick.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    kickGain.gain.setValueAtTime(0.22, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    kick.connect(kickGain);
    kickGain.connect(this.ctx.destination);
    kick.start(now);
    kick.stop(now + 0.17);

    const sweep = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(220, now + 0.02);
    sweep.frequency.exponentialRampToValueAtTime(640, now + 0.19);
    sweepGain.gain.setValueAtTime(0.11, now + 0.02);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    sweep.connect(sweepGain);
    sweepGain.connect(this.ctx.destination);
    sweep.start(now + 0.02);
    sweep.stop(now + 0.22);
  }

  public playComboChime(combo: number) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pentatonic = [392, 440, 523.25, 587.33, 659.25, 783.99];
    const freq = pentatonic[Math.min(pentatonic.length - 1, Math.max(0, combo - 2))];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + 0.12);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playIncidentWarning(kind: 'crosswind_gust' | 'icefall' | 'whiteout_squall') {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs =
      kind === 'icefall' ? [680, 460] : kind === 'crosswind_gust' ? [340, 480] : [260, 210];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = kind === 'icefall' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.86, t + 0.13);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playRockImpact() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.24);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playTremorRumble(freqRad: number, intensity: number, isFoot = true) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.15, Math.min(1, intensity));
    const dur = 0.16 + clamped * 0.08;

    // 1. Resonant seismic low-frequency wobble modulated by hold tremor frequency
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    const basePitch = (isFoot ? 66 : 82) + clamped * 28;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(basePitch, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch * 0.72, now + dur);

    // Modulate pitch rapidly to evoke loose stone rattling in its socket
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(Math.max(12, Math.min(34, freqRad * 0.95)), now);
    lfoGain.gain.setValueAtTime(14 + clamped * 22, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.11 + clamped * 0.08, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + dur + 0.02);
    lfo.stop(now + dur + 0.02);

    // 2. Gritty loose-pebble rock rattle burst
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    const pulseRate = Math.max(8, freqRad * 0.65);
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const env = Math.sin(p * Math.PI) * (1 - p * 0.35);
      const stutter = 0.45 + 0.55 * Math.abs(Math.sin(p * Math.PI * pulseRate));
      ch[i] = (Math.random() * 2 - 1) * env * stutter;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(780 + clamped * 560, now);
    flt.Q.value = 2.6;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.08 + clamped * 0.07, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(flt);
    flt.connect(nGain);
    nGain.connect(this.ctx.destination);
    src.start(now);

    // 3. High-tension harmonic chime when tremor approaches shake-off threshold
    if (clamped > 0.55) {
      const warn = this.ctx.createOscillator();
      const wGain = this.ctx.createGain();
      warn.type = 'sine';
      warn.frequency.setValueAtTime(420 + clamped * 190, now);
      warn.frequency.exponentialRampToValueAtTime(310 + clamped * 120, now + 0.09);
      wGain.gain.setValueAtTime((clamped - 0.5) * 0.09, now);
      wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      warn.connect(wGain);
      wGain.connect(this.ctx.destination);
      warn.start(now);
      warn.stop(now + 0.11);
    }
  }

  public playGrab(
    type: 'jug' | 'crimp' | 'crack' | 'ice' | 'fragile' | 'ledge' | 'spring' | 'swing' | 'tremor',
    options?: GrabSoundOptions
  ) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (options?.isSnowy) {
      this.playSnowCrunch(options.isFoot ? 1.0 : 0.65);
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq =
      type === 'ice'
        ? 460
        : type === 'swing'
          ? 275
          : type === 'spring'
            ? 235
            : type === 'crimp'
              ? 215
              : type === 'ledge'
                ? 135
                : options?.isFoot
                  ? 145
                  : 175;
    osc.type = type === 'ice' || type === 'swing' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(
      type === 'spring' ? baseFreq * 1.25 : baseFreq * 0.48,
      now + 0.095
    );

    gain.gain.setValueAtTime(options?.isSnowy ? 0.09 : 0.145, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // Subtle gritty rock crackle on fragile/tremor holds or wet splash tick on damp holds
    if (type === 'fragile' || type === 'tremor' || options?.wet) {
      const crackLen = Math.floor(this.ctx.sampleRate * 0.06);
      const buf = this.ctx.createBuffer(1, crackLen, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < crackLen; i++) {
        ch[i] = (Math.random() * 2 - 1) * (1 - i / crackLen);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = options?.wet ? 1900 : type === 'tremor' ? 620 : 880;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(type === 'tremor' ? 0.12 : 0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      src.connect(flt);
      flt.connect(g);
      g.connect(this.ctx.destination);
      src.start(now);
    }
  }

  public playPitonHammer() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    [0, 0.11].forEach((offset, idx) => {
      if (!this.ctx) return;
      const t = now + offset;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      const pitch = idx === 0 ? 1180 : 1340;
      osc1.frequency.setValueAtTime(pitch, t);
      osc2.frequency.setValueAtTime(pitch * 1.62, t);
      osc1.frequency.exponentialRampToValueAtTime(pitch * 0.85, t + 0.25);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.3);
      osc2.stop(t + 0.3);
    });
  }

  public playChalk() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playSlip() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playRopeCatch() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.22);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playSummitChord() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);

      gain.gain.setValueAtTime(0.001, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.11, now + i * 0.14 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 2.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 2.5);
    });
  }
}

export const soundEngine = new SoundEngine();
