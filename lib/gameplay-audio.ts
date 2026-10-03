import { audioLevels, AUDIO_SETTINGS_EVENT } from './audio-settings';
import { publicAsset } from './characters';

//for tambah kse kuat suara
const SFX_BOOST = 3; 

export type GameplaySound = 'step' | 'dash' | 'tag' | 'caught' | 'prison' |
  'rescued' | 'rescue' | 'fort-enter' | 'fort-captured' | 'countdown' | 'ultimate' | 'victory' | 'defeat';

export const SAMPLE_FILES = {
  dash: 'audio/gameplay/boost.mp3', caught: 'audio/gameplay/captured.mp3',
  rescue: 'audio/gameplay/rescue-start.mp3', rescued: 'audio/gameplay/released.mp3',
  'fort-enter': 'audio/gameplay/enemy-base-enter.mp3',
  'fort-captured': 'audio/gameplay/objective-success-benteng.mp3',
  countdown: 'audio/gameplay/countdown.mp3', ultimate: 'audio/gameplay/ultimate.mp3',
  victory: 'audio/gameplay/victory.mp3', defeat: 'audio/gameplay/defeat.mp3',
} as const;
export const CAPTURE_FALLBACK = 'audio/gameplay/objective-success.mp3';
export const TAG_SAMPLE_FILES = [1, 2, 3, 4].map(n => `audio/gameplay/tag-0${n}.mp3`);
export const TAG_COUNTER_FILES = [1, 2, 3, 4, 5].map(n => `audio/gameplay/announcer/tag-counter-0${n}.mp3`);
export const TAG_STREAK_WINDOW_MS = 10_000;
export const TAG_ANNOUNCER_DELAY_SECONDS = .15;
export class TagStreakTracker {
  count = 0;
  lastTagTimestamp = -Infinity;
  reset() { this.count = 0; this.lastTagTimestamp = -Infinity; }
  expire(now: number) {
    if (this.count && now - this.lastTagTimestamp >= TAG_STREAK_WINDOW_MS) this.reset();
  }
  tag(now: number): 1 | 2 | 3 | 4 | 5 | undefined {
    this.expire(now);
    this.lastTagTimestamp = now;
    this.count++;
    return this.count <= 5 ? this.count as 1 | 2 | 3 | 4 | 5 : undefined;
  }
}

// Original procedural arcade effects: no network requests or music-mute coupling.
export class GameplayAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<GameplaySound, number>();
  private closed = false;
  private buffers = new Map<string, AudioBuffer>();
  private preload: Promise<void> | null = null;
  private loadingComplete = false;
  private abort = new AbortController();
  private sources = new Set<AudioBufferSourceNode>();
  private announcers = new Set<AudioBufferSourceNode>();
  private lastTagSample = '';
  private streak = new TagStreakTracker();

  private loadSamples() {
    if (this.preload) return this.preload;
    const ctx = this.context!;
    const paths = [...Object.values(SAMPLE_FILES), CAPTURE_FALLBACK, ...TAG_SAMPLE_FILES, ...TAG_COUNTER_FILES];
    this.preload = Promise.all(paths.map(async file => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const cancel = () => controller.abort();
      this.abort.signal.addEventListener('abort', cancel, { once: true });
      try {
        const response = await fetch(publicAsset(file), { signal: controller.signal });
        if (!response.ok) return;
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        if (!this.closed) this.buffers.set(file, buffer);
      } catch { /* Missing or invalid custom audio leaves procedural fallback intact. */ }
      finally { clearTimeout(timeout); this.abort.signal.removeEventListener('abort', cancel); }
    })).then(() => { this.loadingComplete = true; });
    return this.preload;
  }

  private sample(file: string, volume: number, delay = 0, announcer = false, fitSeconds?: number) {
    const ctx = this.context;
    const buffer = this.buffers.get(file);
    if (!ctx || ctx.state !== 'running' || !this.output || !buffer || this.closed) return false;
    let source: AudioBufferSourceNode | undefined;
    let gain: GainNode | undefined;
    try {
      source = ctx.createBufferSource(); gain = ctx.createGain();
      source.buffer = buffer;
      if (fitSeconds && fitSeconds > 0) source.playbackRate.value = buffer.duration / fitSeconds;
      // Existing master boosts procedural audio3x; compensate samples only.
      gain.gain.value = Math.max(0, Math.min(1, volume)) / SFX_BOOST;
      source.connect(gain); gain.connect(this.output);
      const playingSource = source, playingGain = gain;
      source.onended = () => {
        playingSource.disconnect(); playingGain.disconnect();
        this.sources.delete(playingSource); this.announcers.delete(playingSource);
      };
      source.start(ctx.currentTime + delay);
      this.sources.add(source);
      if (announcer) this.announcers.add(source);
      return true;
    } catch { source?.disconnect(); gain?.disconnect(); return false; }
  }

  resetTagStreak() {
    this.streak.reset();
    for (const source of this.announcers) { try { source.stop(); } catch { /* Already ended. */ } }
    this.announcers.clear();
  }
  expireTagStreak(now: number) {
    if (this.streak.count && now - this.streak.lastTagTimestamp >= TAG_STREAK_WINDOW_MS) this.resetTagStreak();
  }
  playerTag(now: number) {
    this.play('tag', 1, true);
    const tier = this.streak.tag(now);
    if (tier) this.playTagCounter(tier);
  }
  playTagCounter(level: 1 | 2 | 3 | 4 | 5) {
    // Replace an older voice, avoiding overlapping milestone dialogue.
    for (const source of this.announcers) { try { source.stop(); } catch { /* Already ended. */ } }
    this.announcers.clear();
    this.sample(TAG_COUNTER_FILES[level - 1], 1, TAG_ANNOUNCER_DELAY_SECONDS, true);
  }
  playCountdown(seconds: number) { return this.play('countdown', 1, false, seconds); }
 
//update
  private updateVolume = () => {
  if (this.output && this.context) {
    this.output.gain.setTargetAtTime(
      audioLevels().sfx * SFX_BOOST,
      this.context.currentTime,
      .02
    );
  }
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
        this.output.gain.value = audioLevels().sfx * SFX_BOOST; //edit baru
        window.addEventListener(AUDIO_SETTINGS_EVENT, this.updateVolume);
        this.output.connect(compressor);
        compressor.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        void this.loadSamples();
      }
      if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
    } catch { /* Audio is optional on unsupported browsers. */ }
  };

  play(sound: GameplaySound, volume = 1, confirmedTag = false, fitSeconds?: number): boolean {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.output || this.closed) return false;
    if (sound === 'countdown' && !this.loadingComplete) return false;
    const now = ctx.currentTime;
    const cooldown = sound === 'step' ? .13 : sound === 'prison' ? 3.5 : .18;
    if (!(sound === 'tag' && confirmedTag) && now - (this.last.get(sound) ?? -100) < cooldown) return false;
    this.last.set(sound, now);
    const level = Math.max(0, Math.min(1, volume));
    if (sound === 'tag') {
      const available = TAG_SAMPLE_FILES.filter(file => this.buffers.has(file));
      const choices = available.filter(file => file !== this.lastTagSample);
      const pool = choices.length ? choices : available;
      const file = pool[Math.floor(Math.random() * pool.length)];
      if (file && this.sample(file, level * .85)) { this.lastTagSample = file; return true; }
    } else if (sound !== 'step' && sound !== 'prison') {
      const gain = sound === 'dash' ? .85 : sound === 'rescue' || sound === 'fort-enter' ? .9 : sound === 'countdown' ? .95 : 1;
      if (this.sample(SAMPLE_FILES[sound], level * gain, 0, false, sound === 'countdown' ? fitSeconds : undefined)) return true;
      if (sound === 'fort-captured' && this.sample(CAPTURE_FALLBACK, level)) return true;
    }
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
        case 'countdown': [330, 440, 660].forEach((f, i) => tone(f, f, .18, .14, i * .7)); break;
        case 'ultimate': noise(.35, 400, 2400, .25); tone(180, 720, .45, .2); break;
        case 'victory': [440, 660, 880].forEach((f, i) => tone(f, f, .3, .18, i * .18)); break;
        case 'defeat': [440, 330, 220].forEach((f, i) => tone(f, f, .3, .18, i * .18)); break;
      }
    } catch { /* Never let unavailable sound interrupt gameplay. */ }
    return true;
  }

  close() {
    this.resetTagStreak();
    this.abort.abort();
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.sources.clear(); this.buffers.clear();
    window.removeEventListener(AUDIO_SETTINGS_EVENT, this.updateVolume);
    this.closed = true;
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
  }
}
