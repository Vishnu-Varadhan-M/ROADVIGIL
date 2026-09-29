/**
 * DriveGuard AI — Automotive Audio & Haptic Intervention Service
 * 
 * Synthesizes automotive safety alerts via Web Audio API, Web Speech Synthesis,
 * and navigator.vibrate for multi-sensory intervention.
 */

import { InterventionStage } from '../types';

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private lastStagePlayed: InterventionStage = 'STAGE_0_NORMAL';
  private lastAlertTimestamp: number = 0;
  private voiceEnabled: boolean = true;

  constructor() {
    // Lazy init on first user interaction
  }

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public stopAll() {
    this.activeOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(0, this.audioCtx ? this.audioCtx.currentTime : 0);
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    });
    this.activeOscillators = [];
  }

  /**
   * Play intervention sound corresponding to current stage.
   */
  public triggerIntervention(stage: InterventionStage, causeMessage?: string) {
    if (this.isMuted || stage === 'STAGE_0_NORMAL') {
      this.lastStagePlayed = stage;
      return;
    }

    const now = Date.now();
    // Throttle repeat triggers of the same stage
    const minIntervalMs = stage === 'STAGE_3_CRITICAL_ALERT' || stage === 'STAGE_4_OWNER_ALERT' ? 2500 : 4000;
    if (this.lastStagePlayed === stage && (now - this.lastAlertTimestamp) < minIntervalMs) {
      return;
    }

    this.lastStagePlayed = stage;
    this.lastAlertTimestamp = now;
    this.initAudio();

    if (!this.audioCtx) return;

    switch (stage) {
      case 'STAGE_1_EARLY_FATIGUE':
        this.playStage1Chime();
        this.vibrate([150]);
        break;

      case 'STAGE_2_DRIVER_WARNING':
        this.playStage2Warning();
        this.vibrate([200, 100, 200]);
        if (this.voiceEnabled) {
          this.speak('Warning: Please refocus on the road.');
        }
        break;

      case 'STAGE_3_CRITICAL_ALERT':
        this.playStage3CriticalAlarm();
        this.vibrate([400, 150, 400, 150, 600]);
        if (this.voiceEnabled) {
          this.speak('Critical alert! Take a break now!');
        }
        break;

      case 'STAGE_4_OWNER_ALERT':
        this.playStage4FleetEscalation();
        this.vibrate([500, 200, 500, 200, 800]);
        if (this.voiceEnabled) {
          this.speak('Emergency alert. Fleet dispatch notified.');
        }
        break;
    }
  }

  /**
   * Stage 1: Soft double chime (523Hz -> 659Hz)
   */
  private playStage1Chime() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
    gain2.gain.setValueAtTime(0.001, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.14, now + 0.20);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.56);
  }

  /**
   * Stage 2: Urgent two-tone automotive pulse (880Hz / 660Hz)
   */
  private playStage2Warning() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    [0, 0.22, 0.44].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.19);
    });
  }

  /**
   * Stage 3: Intense emergency warning warble (alternating 980Hz and 1300Hz)
   */
  private playStage3CriticalAlarm() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    // Fast siren modulation
    for (let i = 0; i < 6; i++) {
      const step = now + i * 0.18;
      osc.frequency.setValueAtTime(i % 2 === 0 ? 1046.5 : 830.6, step);
    }

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
    gain.gain.setValueAtTime(0.35, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    // Apply lowpass to remove harsh digital clipping
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  /**
   * Stage 4: Fleet Escalation Klaxon
   */
  private playStage4FleetEscalation() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    [0, 0.35, 0.70].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now + offset);
      osc.frequency.exponentialRampToValueAtTime(1200, now + offset + 0.25);

      gain.gain.setValueAtTime(0.01, now + offset);
      gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.30);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.31);
    });
  }

  private speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Voice synthesis error handling
    }
  }

  private vibrate(pattern: number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration not permitted or supported
      }
    }
  }
}

export const soundService = new SoundService();
