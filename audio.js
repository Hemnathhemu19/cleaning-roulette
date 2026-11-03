// Web Audio API Synthesizer for high-fidelity, zero-dependency game sound effects
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (!this.initialized) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                this.initialized = true;
            } catch (e) {
                console.warn('Web Audio not supported:', e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(val) {
        this.enabled = val;
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playTick(pitchRatio = 1) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        osc.type = 'triangle';
        const baseFreq = 700 * pitchRatio;
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.035);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.035);
    }

    playWhoosh() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
        filter.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.12);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + 0.3);
    }

    playFanfare() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        // Upbeat victory chords: C4, E4, G4, C5 arpeggio with celebratory bell chime
        const notes = [
            { f: 523.25, t: 0.00, d: 0.15 }, // C5
            { f: 659.25, t: 0.12, d: 0.15 }, // E5
            { f: 783.99, t: 0.24, d: 0.18 }, // G5
            { f: 1046.50, t: 0.38, d: 0.65 } // C6 (sustained victory)
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.t);

            gain.gain.setValueAtTime(0.001, this.ctx.currentTime + n.t);
            gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + n.t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.t + n.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + n.t);
            osc.stop(this.ctx.currentTime + n.t + n.d);
        });

        // Add a soft shimmer / sparkle chord
        setTimeout(() => {
            if (!this.enabled || !this.ctx) return;
            [1318.5, 1567.98, 2093].forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.8);
            });
        }, 380);
    }

    playEvilSelection() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        // Playful dramatic "Gotcha!" sting for "YOU HAVE BEEN SELECTED!"
        const chords = [
            { f: 311.13, t: 0.0, d: 0.18 },  // Eb4
            { f: 349.23, t: 0.14, d: 0.18 }, // F4
            { f: 466.16, t: 0.28, d: 0.55 }, // Bb4
            { f: 440.00, t: 0.40, d: 0.70 }  // A4 (playful dramatic unresolved dissonance)
        ];

        chords.forEach(c => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(c.f, this.ctx.currentTime + c.t);

            gain.gain.setValueAtTime(0.001, this.ctx.currentTime + c.t);
            gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + c.t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + c.t + c.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + c.t);
            osc.stop(this.ctx.currentTime + c.t + c.d);
        });
    }

    playTaskComplete() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}

window.soundEngine = new SoundEngine();
