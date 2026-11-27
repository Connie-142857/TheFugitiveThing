// Lightweight Web Audio API Synthesizer for Medieval Manuscript SFX & Ambient Drone
// Zero external asset dependencies; respects user audio/music/SFX settings.

export type SoundCueType = 'click' | 'phase' | 'reward' | 'levelUp' | 'alert' | 'matchStart';

class ManuscriptAudioService {
  private ctx: AudioContext | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playSfx(type: SoundCueType, volume: number = 0.6): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const safeVol = Math.max(0.01, Math.min(1, volume)) * 0.18;

    const playTone = (freq: number, startOffset: number, dur: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      toneGain.gain.setValueAtTime(0.0001, now + startOffset);
      toneGain.gain.exponentialRampToValueAtTime(safeVol, now + startOffset + 0.02);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + dur);
      osc.connect(toneGain);
      toneGain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + dur + 0.02);
    };

    switch (type) {
      case 'click':
        playTone(520, 0, 0.06, 'triangle');
        break;
      case 'phase':
        playTone(392, 0, 0.25, 'sine');
        playTone(587.33, 0.12, 0.35, 'sine');
        break;
      case 'matchStart':
        playTone(293.66, 0, 0.2, 'triangle');
        playTone(440, 0.12, 0.2, 'triangle');
        playTone(587.33, 0.24, 0.45, 'triangle');
        break;
      case 'reward':
        playTone(659.25, 0, 0.15, 'sine');
        playTone(880, 0.1, 0.28, 'sine');
        break;
      case 'levelUp':
        playTone(440, 0, 0.14, 'triangle');
        playTone(554.37, 0.1, 0.14, 'triangle');
        playTone(659.25, 0.2, 0.16, 'triangle');
        playTone(880, 0.32, 0.45, 'triangle');
        break;
      case 'alert':
        playTone(311.13, 0, 0.18, 'sawtooth');
        playTone(261.63, 0.14, 0.24, 'sawtooth');
        break;
    }
  }

  public setAmbientMusic(enabled: boolean, volume: number = 0.35): void {
    if (!enabled) {
      this.stopAmbientMusic();
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;

    const targetVol = Math.max(0.001, Math.min(1, volume)) * 0.035;
    if (this.droneOsc && this.droneGain) {
      this.droneGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.2);
      return;
    }

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime); // A2 soft chamber drone
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(targetVol, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.droneOsc = osc;
      this.droneGain = gain;
    } catch {
      // Ignore autoplay blocks until next user interaction
    }
  }

  public stopAmbientMusic(): void {
    try {
      if (this.droneOsc) {
        this.droneOsc.stop();
        this.droneOsc.disconnect();
      }
      if (this.droneGain) {
        this.droneGain.disconnect();
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      this.droneOsc = null;
      this.droneGain = null;
    }
  }
}

export const audioService = new ManuscriptAudioService();
