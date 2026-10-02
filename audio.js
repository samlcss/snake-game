// audio.js - Web Audio API Synthesizer for Neo Snake
// 100% procedural, zero external dependencies, zero latency, guaranteed reliability.

class SoundController {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('neo_snake_muted') === 'true';
        this.bgmMuted = localStorage.getItem('neo_snake_bgm_muted') === 'true';
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.masterVolume = 0.3;
        this.bgmVolume = 0.15;
    }

    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('neo_snake_muted', this.muted);
        if (this.muted && this.bgmPlaying) {
            this.stopBgm();
        }
        return this.muted;
    }

    toggleBgm() {
        this.bgmMuted = !this.bgmMuted;
        localStorage.setItem('neo_snake_bgm_muted', this.bgmMuted);
        if (this.bgmMuted) {
            this.stopBgm();
        } else {
            this.startBgm();
        }
        return !this.bgmMuted;
    }

    // Play a subtle tactical turn click/whoosh
    playTurn() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Standard food eaten sound (bright, harmonic arcade chime)
    playEat(comboCount = 1) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Calculate pitch based on combo multiplier
        const baseFreq = 440 * Math.pow(1.08, Math.min(comboCount - 1, 10)); // A4 + pitch step
        const highFreq = baseFreq * 1.5; // Harmonic 5th

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.12);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(highFreq, now + 0.03);
        osc2.frequency.exponentialRampToValueAtTime(highFreq * 1.5, now + 0.12);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.02);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
    }

    // Golden / Bonus food sound (magical ascending triple arpeggio)
    playGolden() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const noteTime = now + (idx * 0.06);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);

            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.9, noteTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(noteTime);
            osc.stop(noteTime + 0.22);
        });
    }

    // High combo celebration fanfare
    playCombo() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5 major
        const now = this.ctx.currentTime;

        chord.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);

            gain.gain.setValueAtTime(this.masterVolume * 0.4, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.3);
        });
    }

    // Game Over sound (descending power-down distortion and impact rumble)
    playGameOver() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Tone oscillator (glide down)
        const osc = this.ctx.createOscillator();
        const toneGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.55);

        toneGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(toneGain);
        toneGain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);

        // Noise buffer for impact rumble
        try {
            const bufferSize = this.ctx.sampleRate * 0.35;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(this.masterVolume * 0.9, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            noise.start(now);
        } catch (e) {
            console.error('Audio noise generation error:', e);
        }
    }

    // Start / Restart game sound (upward power-up sweep)
    playStart() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const t = now + idx * 0.05;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.01, t);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.6, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.18);
        });
    }

    // Synthesized Ambient Retro Chiptune Loop
    startBgm() {
        if (this.bgmMuted || this.muted || this.bgmPlaying) return;
        this.init();
        if (!this.ctx) return;

        this.bgmPlaying = true;
        let step = 0;
        // Synthwave bassline notes (Hz) in A minor: A1, C2, E2, G2, D2, F2
        const bassLine = [
            110, 110, 130.81, 110, 164.81, 110, 146.83, 130.81,
            110, 110, 196.00, 164.81, 146.83, 130.81, 123.47, 98.00
        ];

        const tick = () => {
            if (!this.bgmPlaying || this.bgmMuted || this.muted) return;

            const now = this.ctx.currentTime;
            const freq = bassLine[step % bassLine.length];

            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            filter.Q.setValueAtTime(3, now);

            gain.gain.setValueAtTime(this.bgmVolume * 0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);

            step++;
            this.bgmTimer = setTimeout(tick, 150); // ~100 BPM 16th notes
        };

        tick();
    }

    stopBgm() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

// Global instance
window.soundCtrl = new SoundController();
