/**
 * Web Audio API Music Synthesizer & SFX Engine
 * Generates 3 authentic multi-channel electronic / synthwave tracks
 * with zero external dependencies and real-time audio visualization analysis.
 */

import { MusicTrack } from '../types/music';

export const TRACKS: MusicTrack[] = [
  {
    id: 'track-cyberpulse',
    title: 'Cyberpulse Drift',
    artist: 'Neural Waveform // SynthAI',
    genre: 'Synthwave / Outrun',
    aiModel: 'Gemini Sonic Synth v2.4',
    bpm: 120,
    duration: 160,
    primaryColor: '#06b6d4', // Cyan
    secondaryColor: '#3b82f6', // Blue
    glowShadow: 'rgba(6, 182, 212, 0.4)',
    description: 'Rolling 16th-note analog basslines, 808 rhythms, and euphoric arpeggiated neon leads.',
    scale: 'A Minor Pentatonic',
    key: 'A min'
  },
  {
    id: 'track-neuralviper',
    title: 'Neural Viper Grid',
    artist: 'CyberCore Generative Unit',
    genre: 'Darksynth / Cyberpunk',
    aiModel: 'OmniBeat Matrix 9000',
    bpm: 138,
    duration: 174,
    primaryColor: '#22c55e', // Emerald / Neon Green
    secondaryColor: '#10b981', // Lime
    glowShadow: 'rgba(34, 197, 94, 0.4)',
    description: 'High-octane industrial saw bass, rapid drum syncopations, and arcade acid synth stabs.',
    scale: 'D Minor Cyberpunk',
    key: 'D min'
  },
  {
    id: 'track-starlight',
    title: 'Starlight Matrix',
    artist: 'DreamPulse AI Studio',
    genre: 'Chillwave / Cyber Lo-Fi',
    aiModel: 'Lyria Ambient Transformer',
    bpm: 94,
    duration: 190,
    primaryColor: '#ec4899', // Pink / Magenta
    secondaryColor: '#a855f7', // Purple
    glowShadow: 'rgba(236, 72, 153, 0.4)',
    description: 'Lush detuned harmonic pads, soothing sub-bass, and crystal chime melodies.',
    scale: 'F Minor / Ab Maj',
    key: 'F min'
  }
];

// Note frequencies (Hz)
const NOTE_FREQS: Record<string, number> = {
  // A minor chords & scale
  'A1': 55.00, 'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00,
  'A2': 110.00, 'B2': 123.47, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00,
  'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
  'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
  'A5': 880.00,
  // Additional notes for D min / F min
  'Bb1': 58.27, 'Bb2': 116.54, 'Bb3': 233.08, 'Bb4': 466.16,
  'Eb2': 77.78, 'Eb3': 155.56, 'Eb4': 311.13, 'Ab2': 103.83, 'Ab3': 207.65, 'Ab4': 415.30
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private isPlaying = false;
  private currentTrackIndex = 0;
  private playbackStartTime = 0;
  private seekOffset = 0;
  private volume = 0.75;
  private isMuted = false;
  private sfxEnabled = true;

  private schedulerTimer: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private stepIntervalSec = 0.125; // 16th note default

  // Listeners
  private onStateChangeCallbacks: Array<(state: { isPlaying: boolean; trackIndex: number; currentTime: number; duration: number }) => void> = [];

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async startMusic() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playbackStartTime = this.ctx.currentTime - this.seekOffset;
    this.currentStep = Math.floor(this.seekOffset / this.getStepDuration());
    this.nextNoteTime = this.ctx.currentTime;

    this.runScheduler();
    this.notifyState();
  }

  public pauseMusic() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.ctx) {
      this.seekOffset = (this.ctx.currentTime - this.playbackStartTime) % this.getCurrentTrack().duration;
    }
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.notifyState();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pauseMusic();
    } else {
      this.startMusic();
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % TRACKS.length;
    this.resetPlaybackPosition();
  }

  public prevTrack() {
    if (this.getCurrentTime() > 3) {
      this.seek(0);
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    this.resetPlaybackPosition();
  }

  public selectTrack(index: number) {
    if (index >= 0 && index < TRACKS.length) {
      this.currentTrackIndex = index;
      this.resetPlaybackPosition();
    }
  }

  private resetPlaybackPosition() {
    this.seekOffset = 0;
    this.currentStep = 0;
    if (this.ctx) {
      this.playbackStartTime = this.ctx.currentTime;
      this.nextNoteTime = this.ctx.currentTime;
    }
    this.notifyState();
  }

  public seek(seconds: number) {
    const track = this.getCurrentTrack();
    const clamped = Math.max(0, Math.min(seconds, track.duration));
    this.seekOffset = clamped;
    this.currentStep = Math.floor(clamped / this.getStepDuration());
    if (this.ctx) {
      this.playbackStartTime = this.ctx.currentTime - clamped;
      this.nextNoteTime = this.ctx.currentTime;
    }
    this.notifyState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public getCurrentTrack(): MusicTrack {
    return TRACKS[this.currentTrackIndex];
  }

  public getTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.seekOffset;
    }
    const current = (this.ctx.currentTime - this.playbackStartTime) % this.getCurrentTrack().duration;
    return Math.max(0, current);
  }

  public subscribe(cb: (state: { isPlaying: boolean; trackIndex: number; currentTime: number; duration: number }) => void) {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyState() {
    const state = {
      isPlaying: this.isPlaying,
      trackIndex: this.currentTrackIndex,
      currentTime: this.getCurrentTime(),
      duration: this.getCurrentTrack().duration
    };
    for (const cb of this.onStateChangeCallbacks) {
      cb(state);
    }
  }

  private getStepDuration(): number {
    const track = this.getCurrentTrack();
    // 16th note duration = (60 / bpm) / 4
    return (60 / track.bpm) / 4;
  }

  // Look-ahead synthesizer scheduler
  private runScheduler() {
    if (!this.isPlaying || !this.ctx) return;

    const scheduleAheadTime = 0.15; // Schedule 150ms into the future
    const stepDuration = this.getStepDuration();

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += stepDuration;
      this.currentStep++;

      // Check track wrap
      const totalSteps = Math.floor(this.getCurrentTrack().duration / stepDuration);
      if (this.currentStep >= totalSteps) {
        this.nextTrack();
        return;
      }
    }

    this.schedulerTimer = window.setTimeout(() => this.runScheduler(), 35);
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const track = this.getCurrentTrack();
    const trackId = track.id;

    if (trackId === 'track-cyberpulse') {
      this.playCyberpulseStep(step, time);
    } else if (trackId === 'track-neuralviper') {
      this.playNeuralViperStep(step, time);
    } else {
      this.playStarlightStep(step, time);
    }
  }

  /* -------------------------------------------------------------
     TRACK 1: CYBERPULSE DRIFT (Synthwave / Outrun, 120 BPM)
  ------------------------------------------------------------- */
  private playCyberpulseStep(step: number, time: number) {
    const barStep = step % 64; // 4-bar loop (16 steps per bar)
    const currentBar = Math.floor(barStep / 16);

    // 1. Kick on beats 1 and 3 (step 0, 8, 16, 24...)
    if (step % 8 === 0) {
      this.synthKick(time, 130, 45, 0.28, 0.8);
    }

    // 2. Snare on beats 2 and 4 (step 4, 12, 20...)
    if (step % 8 === 4) {
      this.synthSnare(time, 0.22, 0.7);
    }

    // 3. Hi-hat on every 2nd 16th note (step 2, 4, 6, 8, 10...)
    if (step % 2 === 0) {
      const accent = step % 4 === 2 ? 0.35 : 0.2;
      this.synthHiHat(time, false, accent);
    }
    // Open hat occasionally
    if (step % 16 === 14) {
      this.synthHiHat(time, true, 0.4);
    }

    // 4. Bassline: Rolling 16th note synthwave bass
    const bassChords = ['A1', 'F1', 'G1', 'E2'];
    const currentRoot = bassChords[currentBar] || 'A1';
    const octaveRoot = currentRoot.replace('1', '2');
    const isOctaveHit = step % 4 === 2 || step % 4 === 3;
    const bassNote = isOctaveHit ? octaveRoot : currentRoot;
    this.synthBassSaw(time, NOTE_FREQS[bassNote] || 55, 0.12, 0.65, 450);

    // 5. Arpeggio / Lead
    // A minor arpeggio patterns: A3, C4, E4, A4, G4, E4, C4, B3...
    const arpA = ['A3', 'C4', 'E4', 'A4', 'G4', 'E4', 'C4', 'E4'];
    const arpF = ['F3', 'A3', 'C4', 'F4', 'E4', 'C4', 'A3', 'C4'];
    const arpG = ['G3', 'B3', 'D4', 'G4', 'F4', 'D4', 'B3', 'D4'];
    const arpE = ['E3', 'G3', 'B3', 'E4', 'D4', 'B3', 'G3', 'B3'];
    const arpTable = [arpA, arpF, arpG, arpE];
    const currentArp = arpTable[currentBar] || arpA;
    const arpNote = currentArp[step % 8];

    if (step % 2 === 0 && arpNote) {
      this.synthPluck(time, NOTE_FREQS[arpNote] || 440, 0.18, 0.45);
    }
  }

  /* -------------------------------------------------------------
     TRACK 2: NEURAL VIPER GRID (Darksynth / Cyberpunk, 138 BPM)
  ------------------------------------------------------------- */
  private playNeuralViperStep(step: number, time: number) {
    const barStep = step % 64;
    const currentBar = Math.floor(barStep / 16);

    // 1. Driving four-on-the-floor kick (steps 0, 4, 8, 12...)
    if (step % 4 === 0) {
      this.synthKick(time, 150, 40, 0.22, 0.9);
    }

    // 2. Heavy Clapped Snare on beats 2 and 4
    if (step % 8 === 4) {
      this.synthSnare(time, 0.25, 0.85);
      this.synthClap(time, 0.15, 0.5);
    }

    // 3. Fast Cyber Hi-Hats on every step with velocity variation
    const hatVelocity = (step % 4 === 2) ? 0.35 : (step % 2 === 1 ? 0.18 : 0.25);
    this.synthHiHat(time, step % 8 === 6, hatVelocity);

    // 4. Industrial Distorted Saw Bass (D minor chord sequence: Dm, Bb, C, A)
    const darkRoots = ['D2', 'Bb1', 'C2', 'A1'];
    const root = darkRoots[currentBar] || 'D2';
    // Syncopated bass rhythm
    const isBassActive = [0, 1, 3, 4, 6, 7, 9, 10, 12, 14].includes(step % 16);
    if (isBassActive) {
      const noteFreq = NOTE_FREQS[root] || 73.42;
      this.synthBassSaw(time, noteFreq, 0.1, 0.75, 950);
    }

    // 5. Acid / Arp synth riff
    const leadPatterns = [
      ['D4', 'F4', 'A4', 'D5', 'C5', 'A4', 'F4', 'A4'],
      ['Bb3', 'D4', 'F4', 'Bb4', 'A4', 'F4', 'D4', 'F4'],
      ['C4', 'E4', 'G4', 'C5', 'Bb4', 'G4', 'E4', 'G4'],
      ['A3', 'C#4', 'E4', 'A4', 'G4', 'E4', 'C#4', 'E4']
    ];
    const activeLead = leadPatterns[currentBar] || leadPatterns[0];
    const leadNote = activeLead[step % 8];
    if (step % 2 === 1 && leadNote && NOTE_FREQS[leadNote]) {
      this.synthLeadSquare(time, NOTE_FREQS[leadNote], 0.14, 0.42);
    }
  }

  /* -------------------------------------------------------------
     TRACK 3: STARLIGHT MATRIX (Chillwave / Lo-Fi Dream, 94 BPM)
  ------------------------------------------------------------- */
  private playStarlightStep(step: number, time: number) {
    const barStep = step % 64;
    const currentBar = Math.floor(barStep / 16);

    // 1. Laid back boom kick (step 0, and syncopated step 10)
    if (step % 16 === 0 || step % 16 === 10) {
      this.synthKick(time, 110, 36, 0.35, 0.75);
    }

    // 2. Soft Rim / Snare on 8 (half-time beat 3)
    if (step % 16 === 8) {
      this.synthSnare(time, 0.18, 0.55);
    }

    // 3. Relaxed Shakers / Hats
    if (step % 2 === 0) {
      this.synthHiHat(time, false, 0.16);
    }

    // 4. Warm Sub Bass (F min progression: F1, Db2, Eb2, C2)
    const roots = ['F1', 'Bb1', 'Eb2', 'C2'];
    const currentRoot = roots[currentBar] || 'F1';
    if (step % 8 === 0) {
      this.synthSubBass(time, NOTE_FREQS[currentRoot] || 43.65, 0.55, 0.7);
    }

    // 5. Electric bell chime / chords
    const bellNotes = ['C4', 'F4', 'Ab4', 'C5', 'Eb5', 'Ab4', 'F4', 'C4'];
    if (step % 4 === 0) {
      const idx = (step / 4) % bellNotes.length;
      const noteName = bellNotes[idx];
      if (noteName && NOTE_FREQS[noteName]) {
        this.synthChime(time, NOTE_FREQS[noteName], 0.4, 0.38);
      }
    }
  }

  /* -------------------------------------------------------------
     SYNTHESIZER SOUND GENERATORS
  ------------------------------------------------------------- */

  // 1. 808-style Kick
  private synthKick(time: number, startFreq: number, endFreq: number, decay: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + decay);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + decay);
  }

  // 2. Noise Snare
  private synthSnare(time: number, decay: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;

    // White noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * decay);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    // Body tone (triangle oscillator for body punch)
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.frequency.exponentialRampToValueAtTime(80, time + decay * 0.5);

    toneGain.gain.setValueAtTime(gainVal * 0.6, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + decay * 0.5);

    toneOsc.connect(toneGain);
    toneGain.connect(this.musicGain);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + decay);
    toneOsc.start(time);
    toneOsc.stop(time + decay * 0.5);
  }

  // 3. Hi-Hat
  private synthHiHat(time: number, isOpen: boolean, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const decay = isOpen ? 0.18 : 0.04;
    const bufferSize = Math.floor(this.ctx.sampleRate * decay);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + decay);
  }

  // 4. Snare Clap
  private synthClap(time: number, decay: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * decay);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.Q.setValueAtTime(3, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + decay);
  }

  // 5. Sawtooth Bass
  private synthBassSaw(time: number, freq: number, duration: number, gainVal: number, cutoff: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.4, time + duration);
    filter.Q.setValueAtTime(4, time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // 6. Sub Bass (Sine)
  private synthSubBass(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // 7. Pluck Synth
  private synthPluck(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // 8. Lead Square (Acid style)
  private synthLeadSquare(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(6, time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // 9. Ambient Chime
  private synthChime(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.01, time); // slight shimmer detune

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  /* -------------------------------------------------------------
     GAME SOUND EFFECTS (SFX)
  ------------------------------------------------------------- */

  public playEatSound(isBonus = false) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    if (isBonus) {
      // Golden arpeggiated sparkle
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.35, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.12);
      });
    } else {
      // Snappy double chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  public playGameOverSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.45);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playTurnSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.03);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playClickSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const audioEngine = new AudioEngine();
