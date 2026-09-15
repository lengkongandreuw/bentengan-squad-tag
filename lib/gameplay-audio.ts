import { audioLevels, AUDIO_SETTINGS_EVENT } from './audio-settings';
export type GameplaySound = 'step' | 'dash' | 'tag' | 'caught' | 'prison' |
  'rescued' | 'rescue' | 'fort-enter' | 'fort-captured';

// Original procedural arcade effects: no network requests or music-mute coupling.
export class GameplayAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<GameplaySound, number>();
  private closed = false;
  private updateVolume = () => {
    if (this.output && this.context) this.output.gain.setTargetAtTime(audioLevels().sfx, this.context.currentTime, .02);
  };
  unlock = async () => {
    if (this.closed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 5;
        this.output = this.context.createGain();
        this.output.gain.value = audioLevels().sfx;
        window.addEventListener(AUDIO_SETTINGS_EVENT, this.updateVolume);
        this.output.connect(compressor);
        compressor.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
    } catch { /* Audio is optional on unsupported browsers. */ }
  };

  play(sound: GameplaySound, volume = 1) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.output || this.closed) return;
    const now = ctx.currentTime;
    const cooldown = sound === 'step' ? .13 : sound === 'prison' ? 3.5 : .18;
    if (now - (this.last.get(sound) ?? -100) < cooldown) return;
    this.last.set(sound, now);
    const level = Math.max(0, Math.min(1, volume));
    const tone = (hz: number, end: number, duration: number, gain: number, delay = 0, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      const start = now + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(hz, start);
      osc.frequency.exponentialRampToValueAtTime(end, start + duration);
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.linearRampToValueAtTime(gain * level, start + .008);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(envelope); envelope.connect(this.output!);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
      osc.start(start); osc.stop(start + duration);
    };
    const noise = (duration: number, hz: number, end: number, gain: number) => {
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const envelope = ctx.createGain();
      source.buffer = this.noise;
      filter.type = 'bandpass'; filter.Q.value = .7;
      filter.frequency.setValueAtTime(hz, now);
      filter.frequency.exponentialRampToValueAtTime(end, now + duration);
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.linearRampToValueAtTime(gain * level, now + .01);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter); filter.connect(envelope); envelope.connect(this.output!);
      source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
      source.start(now); source.stop(now + duration);
    };
    try {
      switch (sound) {
        case 'step': noise(.075, 600 + Math.random() * 300, 140, .18); tone(105, 65, .07, .1); break;
        case 'dash': noise(.3, 550, 3400, .36); tone(170, 65, .19, .12); break;
        case 'tag': noise(.10, 2000, 400, .28); tone(600, 1100, .13, .22); tone(1400, 950, .15, .12, .08); break;
        case 'caught': noise(.2, 1600, 180, .25); tone(360, 90, .4, .24, 0, 'triangle'); break;
        case 'prison': tone(640, 620, .45, .075); tone(935, 910, .35, .04, .12); break;
        case 'rescue': [440, 660, 880].forEach((f, i) => tone(f, f, .18, .16, i * .08, 'triangle')); break;
        case 'rescued': [520, 780, 1040, 1560].forEach((f, i) => tone(f, f, .24, .17, i * .09)); break;
        case 'fort-enter': tone(220, 440, .22, .18); tone(660, 660, .18, .13, .16); break;
        case 'fort-captured': [392, 494, 587, 784].forEach((f, i) => tone(f, f, .4, .2, i * .13, 'triangle')); break;
      }
    } catch { /* Never let unavailable sound interrupt gameplay. */ }
  }

  close() {
    window.removeEventListener(AUDIO_SETTINGS_EVENT, this.updateVolume);
    this.closed = true;
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
  }
}
