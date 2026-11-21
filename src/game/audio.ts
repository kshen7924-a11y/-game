import { WeatherType } from './types';

export type HapticPriority = 'low' | 'medium' | 'high' | 'critical';

const HAPTIC_PRIORITY_RANK: Record<HapticPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

let lastHapticUntilMs = 0;
let lastHapticPriority: HapticPriority = 'low';

function estimatePatternMs(pattern: number | number[]): number {
  if (typeof pattern === 'number') return Math.max(0, pattern);
  return pattern.reduce((sum, v) => sum + Math.max(0, v), 0);
}

export function stopHaptic() {
  lastHapticUntilMs = 0;
  lastHapticPriority = 'low';
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
  } catch {
    // Ignore haptic errors on unsupported browsers
  }
}

export function triggerHaptic(
  pattern: number | number[],
  priority: HapticPriority = 'medium'
) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Prevent low-priority micro-ticks from overriding active critical/high-priority tactile bursts
    if (
      now < lastHapticUntilMs &&
      HAPTIC_PRIORITY_RANK[priority] < HAPTIC_PRIORITY_RANK[lastHapticPriority]
    ) {
      return;
    }

    navigator.vibrate(pattern);
    const durMs = Math.min(480, estimatePatternMs(pattern));
    lastHapticUntilMs = now + durMs;
    lastHapticPriority = priority;
  } catch {
    // Ignore haptic errors on unsupported browsers
  }
}

export type HapticPreset =
  | 'tick'
  | 'grabHand'
  | 'grabFoot'
  | 'grabIce'
  | 'grabFragile'
  | 'grabTremor'
  | 'chalk'
  | 'piton'
  | 'shakeOut'
  | 'dynoReady'
  | 'dynoLaunch'
  | 'heartbeat'
  | 'slip'
  | 'fall'
  | 'ropeCatch'
  | 'rockImpact'
  | 'summit';

export function triggerHapticPreset(preset: HapticPreset) {
  switch (preset) {
    case 'tick':
      triggerHaptic(6, 'low');
      break;
    case 'grabHand':
      triggerHaptic(11, 'medium');
      break;
    case 'grabFoot':
      triggerHaptic(14, 'medium');
      break;
    case 'grabIce':
      triggerHaptic([7, 14, 6], 'medium');
      break;
    case 'grabFragile':
      triggerHaptic([7, 16, 10], 'medium');
      break;
    case 'grabTremor':
      triggerHaptic([10, 16, 12], 'medium');
      break;
    case 'chalk':
      triggerHaptic([8, 26, 7], 'medium');
      break;
    case 'piton':
      // Synced to the two metallic piton hammer hits (~110ms apart)
      triggerHaptic([18, 86, 24], 'high');
      break;
    case 'shakeOut':
      triggerHaptic([8, 36, 6], 'low');
      break;
    case 'dynoReady':
      triggerHaptic([9, 18, 13], 'medium');
      break;
    case 'dynoLaunch':
      triggerHaptic([14, 22, 18], 'high');
      break;
    case 'heartbeat':
      triggerHaptic([10, 115, 7], 'low');
      break;
    case 'slip':
      triggerHaptic([22, 26, 18], 'high');
      break;
    case 'fall':
      triggerHaptic([32, 24, 34], 'critical');
      break;
    case 'ropeCatch':
      triggerHaptic([38, 28, 52], 'critical');
      break;
    case 'rockImpact':
      triggerHaptic([42, 26, 48], 'critical');
      break;
    case 'summit':
      triggerHaptic([22, 36, 24, 36, 58], 'critical');
      break;
  }
}

export interface GrabSoundOptions {
  isFoot?: boolean;
  isSnowy?: boolean;
  wet?: boolean;
}

export type BreathMode = 'normal' | 'recovery' | 'exertion' | 'gasp';
export type AmbientPalette = 'granite' | 'ridge' | 'slate' | 'glacial';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  // Ambient Layer 1: Broad alpine wind bed
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Ambient Layer 2A: Mid-high ridge howling wind (altitude pitch- & Q-modulated)
  private howlFilter: BiquadFilterNode | null = null;
  private howlGain: GainNode | null = null;
  private howlOsc: OscillatorNode | null = null;
  private howlOscGain: GainNode | null = null;
  private howlEchoSend: GainNode | null = null;

  // Ambient Layer 2B: High-altitude thin-air crest shriek (emerges as altM rises)
  private shriekFilter: BiquadFilterNode | null = null;
  private shriekGain: GainNode | null = null;

  // Ambient Layer 3: Rain / blowing snow hiss
  private weatherFilter: BiquadFilterNode | null = null;
  private weatherGain: GainNode | null = null;

  // Ambient Layer 4: Continuous distant alpine sub-rumble / glacier air pressure bed
  private alpineSubFilter: BiquadFilterNode | null = null;
  private alpineSubGain: GainNode | null = null;

  // Ambient Layer 5: Dual-tap rock canyon echo bus (timbre & delay scale with altM)
  private echoInput: GainNode | null = null;
  private echoDelayA: DelayNode | null = null;
  private echoDelayB: DelayNode | null = null;
  private echoDampA: BiquadFilterNode | null = null;
  private echoDampB: BiquadFilterNode | null = null;
  private echoFeedbackA: GainNode | null = null;
  private echoFeedbackB: GainNode | null = null;
  private echoWetGain: GainNode | null = null;

  private muted = false;
  private initialized = false;
  private lastBreathAt = -10;
  private lastAvalancheAt = -30;
  private lastRockEchoAt = -10;
  private currentAltM = 0;

  private get outputNode(): AudioNode | null {
    return this.masterGain ?? this.ctx?.destination ?? null;
  }

  private sendToEcho(node: AudioNode, sendAmount: number) {
    if (!this.ctx || !this.echoInput || sendAmount <= 0) return;
    const send = this.ctx.createGain();
    send.gain.value = sendAmount;
    node.connect(send);
    send.connect(this.echoInput);
  }

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

    // Master bus with gentle peak compression so wind, breathing, heartbeat & gear never clip
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.16;

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = this.muted ? 0 : 0.96;

    masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);
    this.masterGain = masterGain;
    this.compressor = compressor;

    this.noiseBuffer = this.createBrownNoiseBuffer(3);
    this.whiteNoiseBuffer = this.createWhiteNoiseBuffer(2);
    this.setupSoundscapes();
  }

  private createBrownNoiseBuffer(seconds: number): AudioBuffer | null {
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

  private createWhiteNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) stopHaptic();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.96, now, 0.06);
    }
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(mute ? 0 : 0.032, now, 0.14);
    }
    if (this.howlGain) {
      this.howlGain.gain.setTargetAtTime(mute ? 0 : 0.012, now, 0.14);
    }
    if (this.howlOscGain) {
      this.howlOscGain.gain.setTargetAtTime(mute ? 0 : 0.004, now, 0.14);
    }
    if (this.shriekGain && mute) {
      this.shriekGain.gain.setTargetAtTime(0, now, 0.12);
    }
    if (this.alpineSubGain && mute) {
      this.alpineSubGain.gain.setTargetAtTime(0, now, 0.14);
    }
    if (this.echoWetGain) {
      this.echoWetGain.gain.setTargetAtTime(mute ? 0 : 0.2, now, 0.12);
    }
    if (this.weatherGain && mute) {
      this.weatherGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private setupSoundscapes() {
    if (!this.ctx || !this.noiseBuffer || !this.outputNode) return;
    const out = this.outputNode;

    // 0. Dual-tap Rock Canyon Echo Bus (near wall + distant cliff bounce, modulated by altitude altM)
    const echoInput = this.ctx.createGain();
    echoInput.gain.value = 1.0;

    const echoHighpass = this.ctx.createBiquadFilter();
    echoHighpass.type = 'highpass';
    echoHighpass.frequency.value = 110;

    const echoDelayA = this.ctx.createDelay(1.2);
    echoDelayA.delayTime.value = 0.16;
    const echoDampA = this.ctx.createBiquadFilter();
    echoDampA.type = 'lowpass';
    echoDampA.frequency.value = 1650;
    const echoFeedbackA = this.ctx.createGain();
    echoFeedbackA.gain.value = 0.24;

    const echoDelayB = this.ctx.createDelay(1.2);
    echoDelayB.delayTime.value = 0.29;
    const echoDampB = this.ctx.createBiquadFilter();
    echoDampB.type = 'lowpass';
    echoDampB.frequency.value = 1220;
    const echoFeedbackB = this.ctx.createGain();
    echoFeedbackB.gain.value = 0.2;

    const echoWetGain = this.ctx.createGain();
    echoWetGain.gain.value = this.muted ? 0 : 0.18;

    echoInput.connect(echoHighpass);
    echoHighpass.connect(echoDelayA);
    echoHighpass.connect(echoDelayB);

    echoDelayA.connect(echoDampA);
    echoDampA.connect(echoFeedbackA);
    echoFeedbackA.connect(echoDelayA);
    echoDampA.connect(echoWetGain);

    // Cross-feed slightly from near wall into far cliff for realistic canyon flutter
    const crossFeed = this.ctx.createGain();
    crossFeed.gain.value = 0.22;
    echoDampA.connect(crossFeed);
    crossFeed.connect(echoDelayB);

    echoDelayB.connect(echoDampB);
    echoDampB.connect(echoFeedbackB);
    echoFeedbackB.connect(echoDelayB);
    echoDampB.connect(echoWetGain);

    echoWetGain.connect(out);

    this.echoInput = echoInput;
    this.echoDelayA = echoDelayA;
    this.echoDelayB = echoDelayB;
    this.echoDampA = echoDampA;
    this.echoDampB = echoDampB;
    this.echoFeedbackA = echoFeedbackA;
    this.echoFeedbackB = echoFeedbackB;
    this.echoWetGain = echoWetGain;

    // 1. Low-mid alpine wind bed
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = this.noiseBuffer;
    windNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 280;
    windFilter.Q.value = 1.4;

    const windGain = this.ctx.createGain();
    windGain.gain.value = this.muted ? 0 : 0.026;

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(out);
    windNoise.start();

    this.windFilter = windFilter;
    this.windGain = windGain;

    // 2A. Distant howling canyon/ridge wind (resonant high-Q bandpass + subtle harmonic whistle + slow LFO)
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
    lfo.frequency.value = 0.16;

    const lfoFilterDepth = this.ctx.createGain();
    lfoFilterDepth.gain.value = 62;
    lfo.connect(lfoFilterDepth);
    lfoFilterDepth.connect(howlFilter.frequency);

    const howlOsc = this.ctx.createOscillator();
    howlOsc.type = 'sine';
    howlOsc.frequency.value = 310;

    const lfoOscDepth = this.ctx.createGain();
    lfoOscDepth.gain.value = 46;
    lfo.connect(lfoOscDepth);
    lfoOscDepth.connect(howlOsc.frequency);

    const howlOscGain = this.ctx.createGain();
    howlOscGain.gain.value = this.muted ? 0 : 0.003;

    // Subtle canyon echo send from ridge howling wind
    const howlEchoSend = this.ctx.createGain();
    howlEchoSend.gain.value = 0.28;

    howlNoise.connect(howlFilter);
    howlFilter.connect(howlGain);
    howlGain.connect(out);
    howlGain.connect(howlEchoSend);
    howlEchoSend.connect(echoInput);

    howlOsc.connect(howlOscGain);
    howlOscGain.connect(out);

    howlNoise.start();
    howlOsc.start();
    lfo.start();

    this.howlFilter = howlFilter;
    this.howlGain = howlGain;
    this.howlOsc = howlOsc;
    this.howlOscGain = howlOscGain;
    this.howlEchoSend = howlEchoSend;

    // 2B. High-altitude thin-air crest shriek (whistling edge turbulence emerging above mid-elevation)
    if (this.whiteNoiseBuffer) {
      const shriekNoise = this.ctx.createBufferSource();
      shriekNoise.buffer = this.whiteNoiseBuffer;
      shriekNoise.loop = true;

      const shriekFilter = this.ctx.createBiquadFilter();
      shriekFilter.type = 'bandpass';
      shriekFilter.frequency.value = 1050;
      shriekFilter.Q.value = 11.5;

      const shriekLfo = this.ctx.createOscillator();
      shriekLfo.type = 'sine';
      shriekLfo.frequency.value = 0.11;
      const shriekLfoDepth = this.ctx.createGain();
      shriekLfoDepth.gain.value = 155;
      shriekLfo.connect(shriekLfoDepth);
      shriekLfoDepth.connect(shriekFilter.frequency);

      const shriekGain = this.ctx.createGain();
      shriekGain.gain.value = 0;

      shriekNoise.connect(shriekFilter);
      shriekFilter.connect(shriekGain);
      shriekGain.connect(out);
      shriekGain.connect(howlEchoSend);

      shriekNoise.start();
      shriekLfo.start();

      this.shriekFilter = shriekFilter;
      this.shriekGain = shriekGain;
    }

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
    weatherGain.connect(out);
    weatherNoise.start();

    this.weatherFilter = weatherFilter;
    this.weatherGain = weatherGain;

    // 4. Deep mountain sub-rumble / distant glacial abyss pressure bed
    const subNoise = this.ctx.createBufferSource();
    subNoise.buffer = this.noiseBuffer;
    subNoise.loop = true;

    const alpineSubFilter = this.ctx.createBiquadFilter();
    alpineSubFilter.type = 'lowpass';
    alpineSubFilter.frequency.value = 92;
    alpineSubFilter.Q.value = 1.2;

    const alpineSubGain = this.ctx.createGain();
    alpineSubGain.gain.value = this.muted ? 0 : 0.005;

    subNoise.connect(alpineSubFilter);
    alpineSubFilter.connect(alpineSubGain);
    alpineSubGain.connect(out);
    subNoise.start();

    this.alpineSubFilter = alpineSubFilter;
    this.alpineSubGain = alpineSubGain;
  }

  public updateWind(altitudeRatio: number, gust: number) {
    this.updateEnvironment(altitudeRatio, gust, 'clear', 0, altitudeRatio * 80);
  }

  public updateEnvironment(
    altitudeRatio: number,
    gust: number,
    weatherType: WeatherType,
    weatherIntensity: number,
    altM = 0,
    palette: AmbientPalette = 'granite'
  ) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    this.currentAltM = Math.max(0, altM);

    const clampedRatio = Math.max(0, Math.min(1.25, altitudeRatio));
    // Blend absolute elevation (altM up to 135m) with route elevation progress so short & tall walls both evolve audibly
    const absAltNorm = Math.max(0, Math.min(1, this.currentAltM / 120));
    const altCurve = Math.max(0, Math.min(1, absAltNorm * 0.58 + Math.min(1, clampedRatio) * 0.42));
    const gustMag = Math.abs(gust);
    const glacialBoost = palette === 'glacial' ? 0.16 : palette === 'slate' ? 0.07 : 0;
    const stormBoost = weatherType === 'snowstorm' ? weatherIntensity * 0.35 : 0;

    // 1. Broad alpine wind bed: rises from sheltered warm low breeze to roaring ridge airflow
    if (this.windFilter && this.windGain) {
      const freq = 205 + altCurve * 440 + gustMag * 220 + glacialBoost * 110;
      const qVal = 1.25 + altCurve * 0.95;
      const vol = 0.018 + altCurve * 0.038 + gustMag * 0.026 + stormBoost * 0.018;
      this.windFilter.frequency.setTargetAtTime(freq, now, 0.35);
      this.windFilter.Q.setTargetAtTime(qVal, now, 0.45);
      this.windGain.gain.setTargetAtTime(Math.min(0.088, vol), now, 0.35);
    }

    // 2A. Mid-high ridge howling wind: pitch, resonance Q & harmonic whistle climb steeply with altM
    if (this.howlFilter && this.howlGain && this.howlOsc && this.howlOscGain) {
      const howlPitch = 235 + altCurve * 490 + gustMag * 195 + glacialBoost * 95;
      const howlQ = 7.2 + altCurve * 7.4 + gustMag * 1.8;
      const howlStrength =
        0.005 +
        altCurve * 0.028 +
        gustMag * 0.02 +
        stormBoost * 0.024 +
        glacialBoost * 0.009;

      this.howlFilter.frequency.setTargetAtTime(howlPitch, now, 0.4);
      this.howlFilter.Q.setTargetAtTime(Math.min(17, howlQ), now, 0.45);
      this.howlGain.gain.setTargetAtTime(Math.min(0.072, howlStrength), now, 0.4);
      this.howlOsc.frequency.setTargetAtTime(howlPitch * (1.015 + altCurve * 0.025), now, 0.42);
      this.howlOscGain.gain.setTargetAtTime(
        Math.min(0.016, howlStrength * (0.2 + altCurve * 0.1)),
        now,
        0.4
      );
      if (this.howlEchoSend) {
        this.howlEchoSend.gain.setTargetAtTime(0.18 + altCurve * 0.36, now, 0.45);
      }
    }

    // 2B. High-altitude crest wind shriek (barely audible near base, keens across exposed high walls)
    if (this.shriekFilter && this.shriekGain) {
      const shriekPresence = Math.max(0, (altCurve - 0.22) / 0.78);
      const shriekPitch = 880 + altCurve * 920 + gustMag * 310 + glacialBoost * 180;
      const shriekQ = 9.5 + altCurve * 6.5;
      const shriekVol =
        shriekPresence * (0.005 + shriekPresence * 0.016 + gustMag * 0.01 + stormBoost * 0.014);
      this.shriekFilter.frequency.setTargetAtTime(shriekPitch, now, 0.45);
      this.shriekFilter.Q.setTargetAtTime(shriekQ, now, 0.5);
      this.shriekGain.gain.setTargetAtTime(Math.min(0.032, shriekVol), now, 0.45);
    }

    // 3. Weather hiss (rain vs blowing snow vs quiet valley)
    if (this.weatherFilter && this.weatherGain) {
      if (weatherType === 'rain') {
        this.weatherFilter.type = 'bandpass';
        this.weatherFilter.frequency.setTargetAtTime(2350 + gustMag * 520, now, 0.3);
        this.weatherGain.gain.setTargetAtTime(0.028 * weatherIntensity, now, 0.3);
      } else if (weatherType === 'snowstorm') {
        this.weatherFilter.type = 'highpass';
        this.weatherFilter.frequency.setTargetAtTime(1320 + altCurve * 560, now, 0.3);
        this.weatherGain.gain.setTargetAtTime(0.024 * weatherIntensity, now, 0.3);
      } else {
        this.weatherGain.gain.setTargetAtTime(0, now, 0.35);
      }
    }

    // 4. Deep mountain sub-rumble bed (expands subtly at high altitude and on glacial faces)
    if (this.alpineSubFilter && this.alpineSubGain) {
      const subCutoff = 76 + altCurve * 56 + gustMag * 28;
      const subVol = 0.004 + altCurve * 0.016 + glacialBoost * 0.009 + gustMag * 0.006;
      this.alpineSubFilter.frequency.setTargetAtTime(subCutoff, now, 0.5);
      this.alpineSubGain.gain.setTargetAtTime(Math.min(0.032, subVol), now, 0.5);
    }

    // 5. Rock Canyon Echo acoustics: wider gorge delay, brighter ice-rock bounce & longer decay as altM rises
    if (
      this.echoDelayA &&
      this.echoDelayB &&
      this.echoDampA &&
      this.echoDampB &&
      this.echoFeedbackA &&
      this.echoFeedbackB &&
      this.echoWetGain
    ) {
      const delayA = 0.14 + altCurve * 0.2; // 140ms sheltered wall -> 340ms wide high-altitude gorge
      const delayB = 0.24 + altCurve * 0.28; // 240ms -> 520ms far cliff bounce
      const dampA =
        (palette === 'glacial' ? 1850 : palette === 'slate' ? 1650 : 1420) + altCurve * 1150;
      const dampB =
        (palette === 'glacial' ? 1380 : 1080) + altCurve * 820;
      const fbA = 0.2 + altCurve * 0.21;
      const fbB = 0.16 + altCurve * 0.19;
      const wet = 0.14 + altCurve * 0.24 + glacialBoost * 0.06;

      this.echoDelayA.delayTime.setTargetAtTime(delayA, now, 0.8);
      this.echoDelayB.delayTime.setTargetAtTime(delayB, now, 0.8);
      this.echoDampA.frequency.setTargetAtTime(dampA, now, 0.6);
      this.echoDampB.frequency.setTargetAtTime(dampB, now, 0.6);
      this.echoFeedbackA.gain.setTargetAtTime(Math.min(0.46, fbA), now, 0.6);
      this.echoFeedbackB.gain.setTargetAtTime(Math.min(0.4, fbB), now, 0.6);
      this.echoWetGain.gain.setTargetAtTime(Math.min(0.44, wet), now, 0.55);
    }
  }

  /**
   * Distant alpine avalanche rolling rumble.
   * Scales timbre, snow-cascade brightness, duration and loudness dynamically with altitude (altM).
   */
  public playDistantAvalanche(altM: number, intensity = 0.55) {
    if (this.muted || !this.ctx || !this.noiseBuffer || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (now - this.lastAvalancheAt < 7.5) return;
    this.lastAvalancheAt = now;

    const out = this.outputNode;
    const altFactor = Math.max(0.12, Math.min(1, altM / 115));
    const lvl = Math.max(0.2, Math.min(1, intensity)) * (0.48 + altFactor * 0.58);
    const totalDur = 4.2 + altFactor * 2.2 + Math.random() * 0.9;
    const attackDur = 0.95 + Math.random() * 0.45;
    const secondSurgeAt = now + attackDur + 0.75 + Math.random() * 0.5;

    // 1. Deep rolling low-frequency snow-slab thunder
    const subSrc = this.ctx.createBufferSource();
    subSrc.buffer = this.noiseBuffer;
    subSrc.loop = true;

    const subLp = this.ctx.createBiquadFilter();
    subLp.type = 'lowpass';
    subLp.Q.value = 1.8;
    subLp.frequency.setValueAtTime(112 + altFactor * 42, now);
    subLp.frequency.linearRampToValueAtTime(145 + altFactor * 55, now + attackDur);
    subLp.frequency.exponentialRampToValueAtTime(48 + altFactor * 14, now + totalDur);

    const subGain = this.ctx.createGain();
    const subPeak = 0.085 * lvl;
    subGain.gain.setValueAtTime(0.0005, now);
    subGain.gain.linearRampToValueAtTime(subPeak, now + attackDur);
    subGain.gain.linearRampToValueAtTime(subPeak * 0.68, secondSurgeAt - 0.25);
    subGain.gain.linearRampToValueAtTime(subPeak * 0.88, secondSurgeAt);
    subGain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur);

    subSrc.connect(subLp);
    subLp.connect(subGain);
    subGain.connect(out);
    this.sendToEcho(subGain, 0.48 + altFactor * 0.24);
    subSrc.start(now, Math.random() * 1.5);
    subSrc.stop(now + totalDur + 0.08);

    // 2. Mid-low roaring avalanche body (distant tumbling mass)
    const bodySrc = this.ctx.createBufferSource();
    bodySrc.buffer = this.noiseBuffer;
    bodySrc.loop = true;

    const bodyBp = this.ctx.createBiquadFilter();
    bodyBp.type = 'bandpass';
    bodyBp.Q.value = 1.05;
    bodyBp.frequency.setValueAtTime(220 + altFactor * 140, now);
    bodyBp.frequency.exponentialRampToValueAtTime(115 + altFactor * 45, now + totalDur);

    const bodyGain = this.ctx.createGain();
    const bodyPeak = 0.052 * lvl;
    bodyGain.gain.setValueAtTime(0.0005, now);
    bodyGain.gain.linearRampToValueAtTime(bodyPeak, now + attackDur * 1.1);
    bodyGain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur * 0.96);

    bodySrc.connect(bodyBp);
    bodyBp.connect(bodyGain);
    bodyGain.connect(out);
    this.sendToEcho(bodyGain, 0.56);
    bodySrc.start(now, Math.random() * 1.5);
    bodySrc.stop(now + totalDur + 0.08);

    // 3. High-altitude distant powder-cloud cascade hiss (clearer at higher altM)
    if (this.whiteNoiseBuffer && altFactor > 0.2) {
      const hissSrc = this.ctx.createBufferSource();
      hissSrc.buffer = this.whiteNoiseBuffer;
      hissSrc.loop = true;

      const hissBp = this.ctx.createBiquadFilter();
      hissBp.type = 'bandpass';
      hissBp.Q.value = 1.4;
      hissBp.frequency.setValueAtTime(760 + altFactor * 680, now);
      hissBp.frequency.exponentialRampToValueAtTime(420 + altFactor * 240, now + totalDur);

      const hissGain = this.ctx.createGain();
      const hissPeak = 0.018 * lvl * altFactor;
      hissGain.gain.setValueAtTime(0.0005, now + 0.25);
      hissGain.gain.linearRampToValueAtTime(hissPeak, now + attackDur * 1.25);
      hissGain.gain.exponentialRampToValueAtTime(0.0005, now + totalDur * 0.92);

      hissSrc.connect(hissBp);
      hissBp.connect(hissGain);
      hissGain.connect(out);
      this.sendToEcho(hissGain, 0.42);
      hissSrc.start(now + 0.25, Math.random());
      hissSrc.stop(now + totalDur + 0.05);
    }

    // 4. Subtle distant fracture sub-pulse
    const throb = this.ctx.createOscillator();
    const throbGain = this.ctx.createGain();
    throb.type = 'sine';
    throb.frequency.setValueAtTime(52 + altFactor * 10, now + 0.15);
    throb.frequency.exponentialRampToValueAtTime(28, now + attackDur + 1.4);
    throbGain.gain.setValueAtTime(0.0005, now + 0.15);
    throbGain.gain.linearRampToValueAtTime(0.042 * lvl, now + attackDur * 0.7);
    throbGain.gain.exponentialRampToValueAtTime(0.0005, now + attackDur + 1.6);
    throb.connect(throbGain);
    throbGain.connect(out);
    throb.start(now + 0.15);
    throb.stop(now + attackDur + 1.7);
  }

  /**
   * Organic environmental rock-wall echo reflection (distant pebble clatter, glacier stress crack,
   * or hollow canyon gust bounce) routed heavily through the altitude-tuned rock canyon echo bus.
   */
  public playRockEchoAmbient(altM: number, palette: AmbientPalette = 'granite') {
    if (this.muted || !this.ctx || !this.outputNode || !this.echoInput) return;
    const now = this.ctx.currentTime;
    if (now - this.lastRockEchoAt < 4.5) return;
    this.lastRockEchoAt = now;

    const out = this.outputNode;
    const altFactor = Math.max(0, Math.min(1, altM / 120));
    const variantRoll = Math.random();

    if (palette === 'glacial' && variantRoll < 0.5) {
      // Distant glacier seam ice-groan & brittle crack echoing across frozen walls
      const crack = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();
      crack.type = 'triangle';
      const baseHz = 540 + altFactor * 420 + Math.random() * 180;
      crack.frequency.setValueAtTime(baseHz, now);
      crack.frequency.exponentialRampToValueAtTime(baseHz * 0.36, now + 0.14);

      const peak = 0.022 + altFactor * 0.018;
      cGain.gain.setValueAtTime(0.0005, now);
      cGain.gain.linearRampToValueAtTime(peak, now + 0.014);
      cGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.16);

      crack.connect(cGain);
      cGain.connect(out);
      this.sendToEcho(cGain, 0.85);
      crack.start(now);
      crack.stop(now + 0.18);
      return;
    }

    if (variantRoll < 0.65) {
      // 2-3 tiny dislodged pebbles bouncing down a distant rock chute with crisp cliffside echoes
      const hits = 2 + (Math.random() < 0.45 ? 1 : 0);
      for (let i = 0; i < hits; i++) {
        const t = now + i * (0.11 + Math.random() * 0.08);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = palette === 'slate' ? 'triangle' : 'sine';
        const pitch =
          (palette === 'slate' ? 880 : 620) + altFactor * 360 + Math.random() * 240 - i * 85;
        osc.frequency.setValueAtTime(Math.max(240, pitch), t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(140, pitch * 0.58), t + 0.045);

        const amp = (0.018 + altFactor * 0.016) * (1 - i * 0.24);
        g.gain.setValueAtTime(0.0005, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.055);

        osc.connect(g);
        g.connect(out);
        this.sendToEcho(g, 0.82);
        osc.start(t);
        osc.stop(t + 0.065);
      }
      return;
    }

    // Hollow canyon wind-chute reflection burst
    if (this.whiteNoiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 6.5 + altFactor * 4.5;
      const centerHz = 460 + altFactor * 520 + Math.random() * 140;
      bp.frequency.setValueAtTime(centerHz, now);
      bp.frequency.exponentialRampToValueAtTime(centerHz * 0.76, now + 0.55);

      const g = this.ctx.createGain();
      const peak = 0.016 + altFactor * 0.018;
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);

      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      this.sendToEcho(g, 0.9);
      src.start(now, Math.random());
      src.stop(now + 0.66);
    }
  }

  /**
   * Helper: synthesize one dual-formant vocal-tract breath phase (inhale or exhale).
   * Uses parallel throat (F1) + palatal (F2) bandpass filters + soft lowpass rolloff
   * so breath sounds warm and organic instead of harsh white noise.
   */
  private triggerBreathPhase(
    startTime: number,
    duration: number,
    f1Start: number,
    f1End: number,
    f2Start: number,
    f2End: number,
    peakGain: number,
    attackFrac: number,
    addVocalWarmth = 0
  ) {
    if (!this.ctx || !this.whiteNoiseBuffer || !this.outputNode) return;
    const out = this.outputNode;

    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;
    src.loop = true;

    // Gentle lowpass ceiling eliminates harsh digital hiss
    const warmthLp = this.ctx.createBiquadFilter();
    warmthLp.type = 'lowpass';
    warmthLp.frequency.value = 3100;

    // Formant 1 (pharynx / throat cavity)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 3.1;
    f1.frequency.setValueAtTime(f1Start, startTime);
    f1.frequency.exponentialRampToValueAtTime(Math.max(180, f1End), startTime + duration);

    const f1Gain = this.ctx.createGain();
    f1Gain.gain.value = 0.72;

    // Formant 2 (palate / lip airflow friction)
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 4.2;
    f2.frequency.setValueAtTime(f2Start, startTime);
    f2.frequency.exponentialRampToValueAtTime(Math.max(500, f2End), startTime + duration);

    const f2Gain = this.ctx.createGain();
    f2Gain.gain.value = 0.42;

    const env = this.ctx.createGain();
    const peakT = startTime + duration * attackFrac;
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, peakT);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(warmthLp);
    warmthLp.connect(f1);
    warmthLp.connect(f2);
    f1.connect(f1Gain);
    f2.connect(f2Gain);
    f1Gain.connect(env);
    f2Gain.connect(env);
    env.connect(out);

    const randomOffset = Math.random() * Math.max(0.1, this.whiteNoiseBuffer.duration - 0.5);
    src.start(startTime, randomOffset);
    src.stop(startTime + duration + 0.03);

    // Subtle chest/throat breathy resonance on heavy exertion or deep exhale
    if (addVocalWarmth > 0.001) {
      const vocal = this.ctx.createOscillator();
      const vocalFilter = this.ctx.createBiquadFilter();
      const vocalGain = this.ctx.createGain();

      vocal.type = 'triangle';
      const baseHz = 128 + Math.random() * 24;
      vocal.frequency.setValueAtTime(baseHz, startTime);
      vocal.frequency.exponentialRampToValueAtTime(baseHz * 0.82, startTime + duration);

      vocalFilter.type = 'bandpass';
      vocalFilter.frequency.value = f1Start * 0.65;
      vocalFilter.Q.value = 2.4;

      vocalGain.gain.setValueAtTime(0.0001, startTime);
      vocalGain.gain.linearRampToValueAtTime(addVocalWarmth, peakT);
      vocalGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      vocal.connect(vocalFilter);
      vocalFilter.connect(vocalGain);
      vocalGain.connect(out);

      vocal.start(startTime);
      vocal.stop(startTime + duration + 0.03);
    }
  }

  /**
   * Procedural climber breathing & panting synthesizer coupled to stamina/health fatigue.
   * @param intensity 0..1 fatigue/exertion level (higher = faster, deeper, breathier panting)
   * @param mode 'normal' (inhale+exhale cycle) | 'recovery' (long calming sigh) | 'exertion' (short effort breath) | 'gasp' (sharp slip/fall intake)
   */
  public playBreath(intensity = 0.4, mode: BreathMode = 'normal') {
    if (this.muted || !this.ctx || !this.whiteNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const minGap = mode === 'gasp' || mode === 'exertion' ? 0.24 : 0.65;
    if (now - this.lastBreathAt < minGap) return;
    this.lastBreathAt = now;

    const clamped = Math.max(0.08, Math.min(1, intensity));
    const jitter = 0.93 + Math.random() * 0.14; // organic variation so breaths never sound looped

    if (mode === 'gasp') {
      // Sharp startled inhale on sudden slip or fall
      this.triggerBreathPhase(
        now,
        0.22 * jitter,
        780 * jitter,
        1060 * jitter,
        1850 * jitter,
        2450 * jitter,
        0.13 + clamped * 0.06,
        0.26,
        0.016
      );
      return;
    }

    if (mode === 'exertion') {
      // Focused athletic effort exhale ("hss / huh") during dyno or high-strain move
      this.triggerBreathPhase(
        now,
        0.24 * jitter,
        640 * jitter,
        460 * jitter,
        1620 * jitter,
        1180 * jitter,
        0.095 + clamped * 0.055,
        0.22,
        0.014 * clamped
      );
      return;
    }

    if (mode === 'recovery') {
      // Slow, relieving breath while resting on a ledge or shaking out to recover stamina
      const inhaleDur = 0.46 * jitter;
      const exhaleDur = 0.72 * jitter;
      this.triggerBreathPhase(
        now,
        inhaleDur,
        680 * jitter,
        790 * jitter,
        1620 * jitter,
        1840 * jitter,
        0.048 + clamped * 0.032,
        0.42
      );
      this.triggerBreathPhase(
        now + inhaleDur + 0.12,
        exhaleDur,
        590 * jitter,
        430 * jitter,
        1380 * jitter,
        980 * jitter,
        0.068 + clamped * 0.042,
        0.25,
        0.008 * clamped
      );
      return;
    }

    // Standard climbing panting cycle: speed & depth scale continuously with fatigue
    const inhaleDur = (0.36 - clamped * 0.13) * jitter;
    const pauseDur = (0.11 - clamped * 0.055) * jitter;
    const exhaleDur = (0.46 - clamped * 0.16) * jitter;

    const inhaleVol = 0.034 + clamped * 0.072;
    const exhaleVol = 0.046 + clamped * 0.094;
    const vocalWarmth = clamped > 0.48 ? (clamped - 0.45) * 0.022 : 0;

    // Phase 1: Inhale (tighter, slightly brighter resonance)
    this.triggerBreathPhase(
      now,
      inhaleDur,
      (700 + clamped * 150) * jitter,
      (840 + clamped * 180) * jitter,
      (1700 + clamped * 260) * jitter,
      (2050 + clamped * 320) * jitter,
      inhaleVol,
      0.38
    );

    // Phase 2: Exhale (warmer, heavier chest release)
    this.triggerBreathPhase(
      now + inhaleDur + pauseDur,
      exhaleDur,
      (620 + clamped * 90) * jitter,
      (450 + clamped * 40) * jitter,
      (1480 + clamped * 180) * jitter,
      (1080 + clamped * 110) * jitter,
      exhaleVol,
      0.24,
      vocalWarmth
    );
  }

  /** Procedural muffled snow crunching: damped granular noise sweep + soft sub-thump */
  public playSnowCrunch(intensity = 1) {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
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
    gain.connect(out);
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
    thumpGain.connect(out);
    thump.start(now);
    thump.stop(now + 0.11);
  }

  public playLimbTick() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.032);

    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  public playDynoReady() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;
    [520, 740].forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t + 0.06);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  public playDyno() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    // Upward dynamic whoosh + push-off tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.19);

    if (this.whiteNoiseBuffer) {
      const air = this.ctx.createBufferSource();
      air.buffer = this.whiteNoiseBuffer;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(520, now);
      flt.frequency.exponentialRampToValueAtTime(1650, now + 0.16);
      flt.Q.value = 1.6;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.075, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      air.connect(flt);
      flt.connect(g);
      g.connect(out);
      air.start(now, Math.random());
      air.stop(now + 0.2);
    }
  }

  public playHeartbeat(intensity = 0.7) {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.25, Math.min(1, intensity));
    const secondOffset = 0.175 - clamped * 0.035;

    [0, secondOffset].forEach((offset, i) => {
      if (!this.ctx) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 66 + clamped * 6 : 53 + clamped * 4, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.115);

      const peak = (i === 0 ? 0.11 : 0.072) * (0.55 + clamped * 0.65);
      gain.gain.setValueAtTime(peak, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.125);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.135);
    });
  }

  public playSpringLaunch() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(118, now);
    kick.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    kickGain.gain.setValueAtTime(0.22, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    kick.connect(kickGain);
    kickGain.connect(out);
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
    sweepGain.connect(out);
    sweep.start(now + 0.02);
    sweep.stop(now + 0.22);
  }

  public playComboChime(combo: number) {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playIncidentWarning(kind: 'crosswind_gust' | 'icefall' | 'whiteout_squall') {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
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
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playRockImpact() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    osc.connect(gain);
    gain.connect(out);
    this.sendToEcho(gain, 0.55);
    osc.start(now);
    osc.stop(now + 0.28);

    // Crashing ice/stone shatter burst
    if (this.whiteNoiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(1250, now);
      flt.frequency.exponentialRampToValueAtTime(340, now + 0.22);
      flt.Q.value = 1.1;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(flt);
      flt.connect(g);
      g.connect(out);
      this.sendToEcho(g, 0.45);
      src.start(now, Math.random());
      src.stop(now + 0.26);
    }
  }

  public playTremorRumble(freqRad: number, intensity: number, isFoot = true) {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
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
    oscGain.connect(out);
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
    nGain.connect(out);
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
      wGain.connect(out);
      warn.start(now);
      warn.stop(now + 0.11);
    }
  }

  public playGrab(
    type: 'jug' | 'crimp' | 'crack' | 'ice' | 'fragile' | 'ledge' | 'spring' | 'swing' | 'tremor',
    options?: GrabSoundOptions
  ) {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    if (options?.isSnowy) {
      this.playSnowCrunch(options.isFoot ? 1.0 : 0.65);
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq =
      type === 'ice'
        ? 470
        : type === 'swing'
          ? 275
          : type === 'spring'
            ? 235
            : type === 'crimp'
              ? 220
              : type === 'crack'
                ? 155
                : type === 'ledge'
                  ? 130
                  : options?.isFoot
                    ? 142
                    : 178;
    osc.type = type === 'ice' || type === 'swing' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(
      type === 'spring' ? baseFreq * 1.25 : baseFreq * 0.46,
      now + 0.095
    );

    gain.gain.setValueAtTime(options?.isSnowy ? 0.085 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(out);
    this.sendToEcho(gain, type === 'ice' || type === 'tremor' ? 0.24 : 0.14);
    osc.start(now);
    osc.stop(now + 0.12);

    // Tactile surface contact transient: rock grit / rubber shoe bite / ice scratch / damp tick
    if (this.whiteNoiseBuffer) {
      const contactDur =
        type === 'fragile' || type === 'tremor' ? 0.075 : type === 'ice' ? 0.065 : 0.042;
      const src = this.ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;

      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value =
        type === 'ice'
          ? 3400
          : options?.wet
            ? 2100
            : type === 'tremor'
              ? 680
              : type === 'fragile'
                ? 960
                : options?.isFoot
                  ? 1150
                  : 1550;
      flt.Q.value = type === 'ice' ? 3.4 : 1.7;

      const g = this.ctx.createGain();
      const peak =
        type === 'tremor' || type === 'fragile'
          ? 0.115
          : type === 'ice' || options?.wet
            ? 0.085
            : 0.055;
      g.gain.setValueAtTime(peak, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + contactDur);

      src.connect(flt);
      flt.connect(g);
      g.connect(out);
      src.start(now, Math.random());
      src.stop(now + contactDur + 0.02);
    }
  }

  public playPitonHammer() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    // Two realistic metallic hammer strikes with inharmonic steel partials + crisp strike transient
    [0, 0.105].forEach((offset, idx) => {
      if (!this.ctx) return;
      const t = now + offset;
      const rootPitch = idx === 0 ? 1160 : 1380;
      const partials = [
        { mult: 1.0, amp: 0.13, dur: 0.28, type: 'triangle' as OscillatorType },
        { mult: 1.58, amp: 0.085, dur: 0.24, type: 'sine' as OscillatorType },
        { mult: 2.34, amp: 0.045, dur: 0.16, type: 'sine' as OscillatorType },
      ];

      partials.forEach((p) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = p.type;
        osc.frequency.setValueAtTime(rootPitch * p.mult, t);
        osc.frequency.exponentialRampToValueAtTime(rootPitch * p.mult * 0.94, t + p.dur);
        g.gain.setValueAtTime(p.amp, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + p.dur);
        osc.connect(g);
        g.connect(out);
        this.sendToEcho(g, 0.58);
        osc.start(t);
        osc.stop(t + p.dur + 0.02);
      });

      // Short metal-on-metal transient click
      if (this.whiteNoiseBuffer) {
        const click = this.ctx.createBufferSource();
        click.buffer = this.whiteNoiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2600;
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(0.11, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        click.connect(hp);
        hp.connect(cg);
        cg.connect(out);
        click.start(t, Math.random());
        click.stop(t + 0.04);
      }
    });
  }

  public playChalk() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    // Two light chalk-bag hand pats + fine powder puff
    [0, 0.055].forEach((offset, idx) => {
      if (!this.ctx || !this.whiteNoiseBuffer) return;
      const t = now + offset;
      const pat = this.ctx.createBufferSource();
      pat.buffer = this.whiteNoiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = idx === 0 ? 1150 : 2100;
      bp.Q.value = 1.1;
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(idx === 0 ? 0.11 : 0.14, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + (idx === 0 ? 0.055 : 0.18));
      pat.connect(bp);
      bp.connect(pg);
      pg.connect(out);
      pat.start(t, Math.random());
      pat.stop(t + 0.2);
    });
  }

  public playSlip() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    // 1. Gritty shoe/fingertip scrape across granite
    if (this.whiteNoiseBuffer) {
      const scrape = this.ctx.createBufferSource();
      scrape.buffer = this.whiteNoiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1950, now);
      bp.frequency.exponentialRampToValueAtTime(580, now + 0.19);
      bp.Q.value = 1.8;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.14, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      scrape.connect(bp);
      bp.connect(sg);
      sg.connect(out);
      scrape.start(now, Math.random());
      scrape.stop(now + 0.23);
    }

    // 2. Weightless downward tension drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.22);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(out);
    this.sendToEcho(gain, 0.28);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playRopeCatch() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
    const now = this.ctx.currentTime;

    // 1. Heavy harness arrest thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(46, now + 0.24);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.27);

    // 2. Taut climbing rope fiber stretch creak
    if (this.whiteNoiseBuffer) {
      const rope = this.ctx.createBufferSource();
      rope.buffer = this.whiteNoiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920, now);
      bp.frequency.exponentialRampToValueAtTime(420, now + 0.18);
      bp.Q.value = 3.2;
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(0.13, now);
      rg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      rope.connect(bp);
      bp.connect(rg);
      rg.connect(out);
      rope.start(now, Math.random());
      rope.stop(now + 0.22);
    }

    // 3. Subtle carabiner metallic clink
    const clink = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    clink.type = 'sine';
    clink.frequency.setValueAtTime(2280, now + 0.015);
    clink.frequency.exponentialRampToValueAtTime(1840, now + 0.09);
    cg.gain.setValueAtTime(0.05, now + 0.015);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    clink.connect(cg);
    cg.connect(out);
    clink.start(now + 0.015);
    clink.stop(now + 0.11);
  }

  public playSummitChord() {
    if (this.muted || !this.ctx || !this.outputNode) return;
    const out = this.outputNode;
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
      gain.connect(out);
      this.sendToEcho(gain, 0.42);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 2.5);
    });
  }
}

export const soundEngine = new SoundEngine();
