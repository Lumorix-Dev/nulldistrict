/**
 * AudioManager — procedural audio via Web Audio API (no asset files required).
 * All sounds are synthesised at runtime using oscillators, noise generators,
 * and ADSR-style gain envelopes.
 */

type OscType = OscillatorType;

export class AudioManager {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _enabled = true;
  private _volume = 0.7;

  private _ambientOscillators: OscillatorNode[] = [];
  private _ambientGainNode: GainNode | null = null;
  private _currentTheme: string | null = null;

  private _musicVolume = 0.5; // fraction 0–1; default maps to 0.15 ambient gain
  private _sfxVolume = 1.0;   // stored multiplier; applied to future SFX calls

  // ── Context ──────────────────────────────────────────────────────────────

  /** Lazy-init AudioContext. Returns null if unavailable (no user gesture yet, or unsupported). */
  private ctx(): AudioContext | null {
    if (!this._ctx) {
      try {
        this._ctx = new AudioContext();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.setValueAtTime(
          this._enabled ? this._volume : 0,
          this._ctx.currentTime
        );
        this._masterGain.connect(this._ctx.destination);
      } catch {
        return null;
      }
    }
    if (this._ctx.state === "suspended") {
      void this._ctx.resume();
    }
    return this._ctx;
  }

  // ── Oscillator helper ────────────────────────────────────────────────────

  private createOscillator(
    freq: number,
    type: OscType,
    duration: number,
    gainVal: number,
    startTime?: number
  ): void {
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    const t = startTime ?? c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // ── Noise burst helper ───────────────────────────────────────────────────

  private createNoiseBurst(
    duration: number,
    gainVal: number,
    lowpass?: number,
    startTime?: number
  ): void {
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    const t = startTime ?? c.currentTime;
    const bufLen = Math.ceil(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(g);

    if (lowpass !== undefined) {
      const filt = c.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(lowpass, t);
      g.connect(filt);
      filt.connect(this._masterGain);
    } else {
      g.connect(this._masterGain);
    }

    src.start(t);
    src.stop(t + duration + 0.01);
  }

  // ── Arpeggio helper ──────────────────────────────────────────────────────

  private playFreqSequence(
    freqs: number[],
    duration: number,
    gap: number,
    gainVal: number
  ): void {
    const c = this.ctx();
    if (!c) return;
    freqs.forEach((f, i) => {
      this.createOscillator(f, "sine", duration, gainVal, c.currentTime + i * gap);
    });
  }

  // ── String → frequency mapping ───────────────────────────────────────────

  private hashFreq(s: string, min: number, max: number): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    }
    return min + (h / 0xffff) * (max - min);
  }

  // ── Sound effects ─────────────────────────────────────────────────────────

  playFootstep(surface: "stone" | "metal" | "dirt"): void {
    if (!this._enabled) return;
    const freqMap: Record<"stone" | "metal" | "dirt", number> = {
      stone: 300,
      metal: 800,
      dirt: 150,
    };
    this.createNoiseBurst(0.06, 0.18, freqMap[surface]);
  }

  playJump(): void {
    if (!this._enabled) return;
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.12);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playLand(intensity: number): void {
    if (!this._enabled) return;
    const i = Math.max(0, Math.min(1, intensity));
    this.createNoiseBurst(0.08, 0.25 * i, 200);
    this.createOscillator(60, "sine", 0.12, 0.3 * i);
  }

  playBlockPlace(blockType: string): void {
    if (!this._enabled) return;
    const freq = this.hashFreq(blockType, 600, 1400);
    this.createOscillator(freq, "square", 0.04, 0.12);
    this.createNoiseBurst(0.03, 0.1, freq * 1.5);
  }

  playBlockBreak(blockType: string): void {
    if (!this._enabled) return;
    const freq = this.hashFreq(blockType, 80, 200);
    this.createNoiseBurst(0.15, 0.22, 800);
    this.createOscillator(freq, "sine", 0.18, 0.18);
  }

  /** Ascending arpeggio: C5 → E5 → G5 → C6, staggered 50ms each. */
  playKeyPickup(): void {
    if (!this._enabled) return;
    this.playFreqSequence([523, 659, 784, 1047], 0.12, 0.05, 0.18);
  }

  playDoorUnlock(): void {
    if (!this._enabled) return;
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    this.createNoiseBurst(0.06, 0.25, 300);
    const t = c.currentTime + 0.08;
    ([440, 554, 659] as number[]).forEach((f, i) => {
      this.createOscillator(f, "triangle", 0.4, 0.12, t + i * 0.04);
    });
  }

  /** on=true: click + buzz; on=false: click only. */
  playLeverFlip(on: boolean): void {
    if (!this._enabled) return;
    this.createNoiseBurst(0.04, 0.2, 600);
    if (on) {
      const c = this.ctx();
      if (!c || !this._masterGain) return;
      const t = c.currentTime + 0.03;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g);
      g.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    }
  }

  playPressurePlate(): void {
    if (!this._enabled) return;
    this.createNoiseBurst(0.03, 0.15, 250);
    this.createOscillator(80, "sine", 0.06, 0.1);
  }

  /** Triumphant ascending 4-note fanfare. */
  playCodeAccepted(): void {
    if (!this._enabled) return;
    this.playFreqSequence([523, 659, 784, 1047], 0.18, 0.08, 0.22);
  }

  /** Descending 2-note "wrong" buzz. */
  playCodeRejected(): void {
    if (!this._enabled) return;
    const c = this.ctx();
    const masterGain = this._masterGain;
    if (!c || !masterGain) return;
    const t = c.currentTime;
    ([330, 220] as number[]).forEach((f, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, t + i * 0.12);
      g.gain.setValueAtTime(0.15, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.1);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.11);
    });
  }

  /** Full victory fanfare: 7 rising notes with harmonic overtones + noise tail. */
  playPuzzleComplete(): void {
    if (!this._enabled) return;
    const c = this.ctx();
    const masterGain = this._masterGain;
    if (!c || !masterGain) return;
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    const t = c.currentTime;
    notes.forEach((f, i) => {
      const start = t + i * 0.1;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, start);
      g.gain.setValueAtTime(0.2, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.36);

      const osc2 = c.createOscillator();
      const g2 = c.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(f * 2, start);
      g2.gain.setValueAtTime(0.07, start);
      g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(start);
      osc2.stop(start + 0.31);
    });
    // Noise shimmer tail
    this.createNoiseBurst(0.4, 0.05, 3000, t + 0.5);
  }

  /** Soft high ding. */
  playNotification(): void {
    if (!this._enabled) return;
    this.createOscillator(880, "sine", 0.15, 0.08);
  }

  /** Swishing pitch-up sweep — entering a portal. */
  playPortalEnter(): void {
    if (!this._enabled) return;
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    const t = c.currentTime;
    this.createNoiseBurst(0.4, 0.12, 2500, t);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.4);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.43);
  }

  /** Subtle drone note whose pitch is derived from a colour hex value. */
  playAmbientPulse(color: number): void {
    if (!this._enabled) return;
    const freq = 60 + ((color & 0xffffff) / 0xffffff) * 240;
    this.createOscillator(freq, "sine", 0.5, 0.05);
  }

  // ── Ambient loop ──────────────────────────────────────────────────────────

  startAmbientLoop(theme: "cyberpunk" | "void" | "crystal"): void {
    this.stopAmbientLoop();
    if (!this._enabled) return;
    const c = this.ctx();
    if (!c || !this._masterGain) return;
    this._currentTheme = theme;

    const ambGain = c.createGain();
    ambGain.gain.setValueAtTime(0, c.currentTime);
    ambGain.gain.linearRampToValueAtTime(this._enabled ? this._musicVolume * 0.3 : 0, c.currentTime + 2);
    ambGain.connect(this._masterGain);
    this._ambientGainNode = ambGain;

    type OscCfg = { freq: number; type: OscType; detune: number };
    const configs: Record<"cyberpunk" | "void" | "crystal", OscCfg[]> = {
      cyberpunk: [
        { freq: 55,  type: "sawtooth",  detune: 0  },
        { freq: 110, type: "sawtooth",  detune: 8  },
        { freq: 165, type: "square",    detune: -4 },
      ],
      void: [
        { freq: 40, type: "sine",     detune: 0  },
        { freq: 80, type: "sine",     detune: 3  },
        { freq: 60, type: "triangle", detune: -3 },
      ],
      crystal: [
        { freq: 261, type: "triangle", detune: 0  },
        { freq: 329, type: "triangle", detune: 5  },
        { freq: 392, type: "sine",     detune: -3 },
        { freq: 523, type: "sine",     detune: 2  },
      ],
    };
    const lfoRates: Record<"cyberpunk" | "void" | "crystal", number> = {
      cyberpunk: 0.5,
      void:      0.08,
      crystal:   0.25,
    };

    for (const cfg of configs[theme]) {
      const osc = c.createOscillator();
      const oscGain = c.createGain();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();

      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.freq, c.currentTime);
      osc.detune.setValueAtTime(cfg.detune, c.currentTime);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(lfoRates[theme], c.currentTime);
      lfoGain.gain.setValueAtTime(cfg.freq * 0.02, c.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      oscGain.gain.setValueAtTime(0.3, c.currentTime);
      osc.connect(oscGain);
      oscGain.connect(ambGain);

      lfo.start();
      osc.start();
      this._ambientOscillators.push(osc, lfo);
    }
  }

  stopAmbientLoop(): void {
    const c = this._ctx;
    if (!c) return;
    if (this._ambientGainNode) {
      const g = this._ambientGainNode;
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
      const oscs = [...this._ambientOscillators];
      setTimeout(() => {
        for (const o of oscs) {
          try { o.stop(); } catch { /* already stopped */ }
        }
      }, 1700);
    }
    this._ambientOscillators = [];
    this._ambientGainNode = null;
    this._currentTheme = null;
  }

  // ── Master controls ───────────────────────────────────────────────────────

  get musicVolume(): number { return this._musicVolume; }
  get sfxVolume(): number { return this._sfxVolume; }
  get masterVolume(): number { return this._volume; }
  get enabled(): boolean { return this._enabled; }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain && this._ctx) {
      this._masterGain.gain.setValueAtTime(
        this._enabled ? this._volume : 0,
        this._ctx.currentTime
      );
    }
  }

  /** Adjust background music / ambient-loop volume (0–1). */
  setMusicVolume(vol: number): void {
    this._musicVolume = Math.max(0, Math.min(1, vol));
    if (this._ambientGainNode && this._ctx) {
      this._ambientGainNode.gain.cancelScheduledValues(this._ctx.currentTime);
      this._ambientGainNode.gain.setValueAtTime(
        this._enabled ? this._musicVolume * 0.3 : 0,
        this._ctx.currentTime
      );
    }
  }

  /** Store SFX volume multiplier (0–1). Applied as a scaling factor on future sounds. */
  setSfxVolume(vol: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
  }

  /** Mute or unmute all audio. Convenience wrapper around setEnabled. */
  setMuted(muted: boolean): void {
    this.setEnabled(!muted);
  }

  setEnabled(v: boolean): void {
    this._enabled = v;
    if (this._masterGain && this._ctx) {
      this._masterGain.gain.setValueAtTime(
        v ? this._volume : 0,
        this._ctx.currentTime
      );
    }
  }
}

export const audioManager = new AudioManager();
