// Procedural Zen Audio System
// Powered by Web Audio API

export class AudioSystem {
    private static ctx: AudioContext | null = null;
    private static masterGain: GainNode | null = null;
    private static delayNode: DelayNode | null = null;
    private static delayFeedback: GainNode | null = null;
    
    // Environmental Nodes
    private static noiseBuffer: AudioBuffer | null = null;
    
    private static rainGain: GainNode | null = null;
    private static windGain: GainNode | null = null;
    private static waterGain: GainNode | null = null;
    
    private static windFilter: BiquadFilterNode | null = null;

    // BGM Nodes
    private static bgmGain: GainNode | null = null;
    private static bgmSource: AudioBufferSourceNode | null = null;
    private static bgmBuffer: AudioBuffer | null = null;
    private static isBgmPlaying = false;

    static init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.setupEffectsChain();
                this.setupEnvAudio();
            } catch (e) {
                console.error("Audio init failed", e);
            }
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    static setMasterVolume(volume: number) {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.linearRampToValueAtTime(volume, t + 0.5);
    }

    static setBGMVolume(volume: number) {
        if (!this.ctx || !this.bgmGain) return;
        const t = this.ctx.currentTime;
        this.bgmGain.gain.cancelScheduledValues(t);
        this.bgmGain.gain.linearRampToValueAtTime(volume, t + 0.5);
    }

    static async loadBGM(url: string) {
        this.init();
        if (!this.ctx) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("Failed to load BGM", e);
        }
    }

    static playBGM() {
        this.init();
        if (!this.ctx || !this.bgmBuffer || this.isBgmPlaying) return;
        
        if (!this.bgmGain) {
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0;
            this.bgmGain.connect(this.masterGain!);
        }

        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = this.bgmBuffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGain);
        this.bgmSource.start();
        this.isBgmPlaying = true;
        
        // Fade in
        const t = this.ctx.currentTime;
        this.bgmGain.gain.linearRampToValueAtTime(0.5, t + 4.0);
    }

    private static setupEffectsChain() {
        if (!this.ctx) return;
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);

        // Ping-pong or standard Delay for spaciousness
        this.delayNode = this.ctx.createDelay(3.0);
        this.delayNode.delayTime.value = 0.75;
        
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.4; // Delay decay

        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2000;

        // Routing
        this.delayNode.connect(delayFilter);
        delayFilter.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        
        this.delayNode.connect(this.masterGain);
    }

    private static setupEnvAudio() {
        if (!this.ctx || !this.masterGain) return;
        
        // Generate pure white noise buffer once
        const bufferSize = this.ctx.sampleRate * 5; // 5 seconds
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // --- RAIN ---
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0;
        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 800;
        this.rainGain.connect(rainFilter);
        rainFilter.connect(this.masterGain);

        const rainSource = this.ctx.createBufferSource();
        rainSource.buffer = this.noiseBuffer;
        rainSource.loop = true;
        rainSource.connect(this.rainGain);
        rainSource.start();

        // --- WIND ---
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.05; // Base wind always present
        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 400;
        this.windFilter.Q.value = 1.0;
        this.windGain.connect(this.windFilter);
        this.windFilter.connect(this.masterGain);

        const windSource = this.ctx.createBufferSource();
        windSource.buffer = this.noiseBuffer;
        windSource.loop = true;
        windSource.connect(this.windGain);
        windSource.start();

        // Animate Wind Filter (Howling)
        this.animateWind();

        // --- WATER (Springs) ---
        this.waterGain = this.ctx.createGain();
        this.waterGain.gain.value = 0;
        const waterFilter = this.ctx.createBiquadFilter();
        waterFilter.type = 'bandpass';
        waterFilter.frequency.value = 1200;
        waterFilter.Q.value = 0.5;
        this.waterGain.connect(waterFilter);
        waterFilter.connect(this.masterGain);

        const waterSource = this.ctx.createBufferSource();
        waterSource.buffer = this.noiseBuffer;
        waterSource.loop = true;
        waterSource.connect(this.waterGain);
        waterSource.start();
    }

    private static animateWind() {
        if (!this.ctx || !this.windFilter) return;
        // Slowly sweep the bandpass frequency to create howling wind
        const targetFreq = 300 + Math.random() * 400;
        const time = 2 + Math.random() * 3;
        this.windFilter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + time);
        
        setTimeout(() => this.animateWind(), time * 1000);
    }

    // Dynamic Ecology Soundscape Mixer
    static updateEcologyState(springCount: number, windmillCount: number, weather: string) {
        if (!this.ctx || !this.rainGain || !this.windGain || !this.waterGain) return;
        
        const t = this.ctx.currentTime;
        
        // Rain
        if (weather === 'rainy') {
            this.rainGain.gain.cancelScheduledValues(t);
            this.rainGain.gain.linearRampToValueAtTime(0.08, t + 1.0);
        } else {
            this.rainGain.gain.cancelScheduledValues(t);
            this.rainGain.gain.linearRampToValueAtTime(0, t + 1.0);
        }

        // Wind (Increases with windmills and rain)
        let targetWind = 0.05 + (windmillCount * 0.02);
        if (weather === 'rainy') targetWind += 0.05;
        targetWind = Math.min(0.2, targetWind);
        this.windGain.gain.cancelScheduledValues(t);
        this.windGain.gain.linearRampToValueAtTime(targetWind, t + 2.0);

        // Water (Increases with Springs)
        let targetWater = Math.min(0.15, springCount * 0.03);
        this.waterGain.gain.cancelScheduledValues(t);
        this.waterGain.gain.linearRampToValueAtTime(targetWater, t + 2.0);
    }

    private static playSynthNote(freq: number, peakVol: number, attack: number, release: number) {
        if (!this.ctx || !this.masterGain || !this.delayNode) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine'; // Very soft, pure tone
        osc.frequency.value = freq;
        
        // Very slow envelope for Zen feel
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(peakVol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, t + attack + release);
        
        osc.connect(gain);
        
        // Route to dry (Master) and wet (Delay)
        gain.connect(this.masterGain);
        gain.connect(this.delayNode);
        
        osc.start(t);
        osc.stop(t + attack + release + 1.0);
    }

    // Play a beautiful C Major 7th Chord for Synergy (C, E, G, B)
    static playSynergyChord() {
        this.init();
        if (!this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
        notes.forEach((freq, i) => {
            // Stagger the notes slightly like a harp strum
            setTimeout(() => {
                this.playSynthNote(freq, 0.2, 0.5, 4.0);
            }, i * 150);
        });
    }

    // Classic UI Pop
    static playPop() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(400, t);
        o.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.15);
        
        o.connect(g);
        if (this.masterGain) g.connect(this.masterGain);
        
        o.start();
        o.stop(t + 0.15);
    }
    
    // Classic UI Dig
    static playDig() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(100, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.1);
        
        o.connect(g);
        if (this.masterGain) g.connect(this.masterGain);
        
        o.start();
        o.stop(t + 0.1);
    }
}
