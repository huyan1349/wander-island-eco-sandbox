// Procedural Zen Audio System
// Powered by Web Audio API + HTML Audio Element for BGM

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

    // BGM — uses <audio> element for better autoplay support (MEI-based)
    private static bgmEl: HTMLAudioElement | null = null;
    private static bgmCache = new Map<string, HTMLAudioElement>(); // Preloaded audio elements
    private static isBgmPlaying = false;
    private static currentBgmUrl: string | null = null;
    private static bgmVolumeTarget = 0.5;
    private static bgmSwitchToken = 0;
    private static bgmFadeRAF: number | null = null;
    private static bgmAutoplayBlocked = false;

    static init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.setupEffectsChain();
                this.setupEnvAudio();
            } catch (e) {
                console.error("Audio init failed", e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    /** Call this on user gesture to unlock AudioContext */
    static ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        // Also try to play BGM if it was blocked
        if (this.bgmAutoplayBlocked && this.bgmEl) {
            this.bgmEl.play().then(() => {
                this.bgmAutoplayBlocked = false;
                this.fadeBGMIN();
            }).catch(() => {});
        }
    }

    static setMasterVolume(volume: number) {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.linearRampToValueAtTime(volume, t + 0.5);
    }

    static setBGMVolume(volume: number) {
        this.bgmVolumeTarget = volume;
        if (this.bgmEl) {
            this.bgmEl.volume = Math.min(1, volume);
        }
    }

    static async loadBGM(url: string) {
        // Check cache first
        if (this.bgmCache.has(url)) {
            this.bgmEl = this.bgmCache.get(url)!;
            return;
        }

        // Create <audio> element
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0;
        audio.preload = 'auto';
        audio.src = url;
        audio.load();

        // Cache it
        this.bgmCache.set(url, audio);
        this.bgmEl = audio;
    }

    /** Preload a BGM track without setting it as current */
    static preloadBGM(url: string) {
        if (this.bgmCache.has(url)) return;
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0;
        audio.preload = 'auto';
        audio.src = url;
        audio.load();
        this.bgmCache.set(url, audio);
    }

    static playBGM() {
        if (!this.bgmEl || this.isBgmPlaying) return;

        this.bgmEl.volume = 0;
        const playPromise = this.bgmEl.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Autoplay allowed!
                this.isBgmPlaying = true;
                this.bgmAutoplayBlocked = false;
                this.currentBgmUrl = this.bgmEl!.src;
                this.fadeBGMIN();
            }).catch(() => {
                // Autoplay blocked — will retry on user gesture
                this.bgmAutoplayBlocked = true;
            });
        } else {
            // Older browsers — assume playing
            this.isBgmPlaying = true;
            this.currentBgmUrl = this.bgmEl.src;
            this.fadeBGMIN();
        }
    }

    private static fadeBGMIN() {
        if (this.bgmFadeRAF) cancelAnimationFrame(this.bgmFadeRAF);
        const target = this.bgmVolumeTarget;
        const step = () => {
            if (!this.bgmEl) return;
            const current = this.bgmEl.volume;
            if (current < target - 0.01) {
                this.bgmEl.volume = Math.min(target, current + 0.01);
                this.bgmFadeRAF = requestAnimationFrame(step);
            } else {
                this.bgmEl.volume = target;
                this.bgmFadeRAF = null;
            }
        };
        this.bgmFadeRAF = requestAnimationFrame(step);
    }

    private static fadeBGMOUT(): Promise<void> {
        return new Promise((resolve) => {
            if (this.bgmFadeRAF) cancelAnimationFrame(this.bgmFadeRAF);
            const step = () => {
                if (!this.bgmEl) { resolve(); return; }
                const current = this.bgmEl.volume;
                if (current > 0.01) {
                    this.bgmEl.volume = Math.max(0, current - 0.015);
                    this.bgmFadeRAF = requestAnimationFrame(step);
                } else {
                    this.bgmEl.volume = 0;
                    this.bgmFadeRAF = null;
                    resolve();
                }
            };
            this.bgmFadeRAF = requestAnimationFrame(step);
        });
    }

    static stopBGM() {
        if (!this.bgmEl || !this.isBgmPlaying) return;
        
        this.fadeBGMOUT().then(() => {
            this.bgmEl!.pause();
            this.bgmEl!.currentTime = 0;
            this.isBgmPlaying = false;
            this.currentBgmUrl = null;
        });
    }

    static async switchBGM(url: string) {
        if (this.currentBgmUrl === url && this.isBgmPlaying) return;

        const switchToken = ++this.bgmSwitchToken;

        // Fade out current
        if (this.isBgmPlaying && this.bgmEl) {
            await this.fadeBGMOUT();
            if (switchToken !== this.bgmSwitchToken) return;
            this.bgmEl.pause();
        }

        // Get from cache or load
        await this.loadBGM(url);
        if (switchToken !== this.bgmSwitchToken) return;

        const playPromise = this.bgmEl!.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (switchToken !== this.bgmSwitchToken) return;
                this.isBgmPlaying = true;
                this.bgmAutoplayBlocked = false;
                this.currentBgmUrl = url;
                this.fadeBGMIN();
            }).catch(() => {
                this.bgmAutoplayBlocked = true;
            });
        } else {
            this.isBgmPlaying = true;
            this.currentBgmUrl = url;
            this.fadeBGMIN();
        }
    }

    static getBGMProgress(): number {
        if (!this.bgmEl || !this.isBgmPlaying || !this.bgmEl.duration) return 0;
        return this.bgmEl.currentTime / this.bgmEl.duration;
    }

    static getCurrentBGMUrl(): string | null {
        return this.currentBgmUrl;
    }

    static isBGMAutoplayBlocked(): boolean {
        return this.bgmAutoplayBlocked;
    }

    private static setupEffectsChain() {
        if (!this.ctx) return;
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);

        this.delayNode = this.ctx.createDelay(3.0);
        this.delayNode.delayTime.value = 0.75;
        
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.4;

        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2000;

        this.delayNode.connect(delayFilter);
        delayFilter.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        
        this.delayNode.connect(this.masterGain);
    }

    private static setupEnvAudio() {
        if (!this.ctx || !this.masterGain) return;
        
        const bufferSize = this.ctx.sampleRate * 5;
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
        this.windGain.gain.value = 0.05;
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

        this.animateWind();

        // --- WATER ---
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
        const targetFreq = 300 + Math.random() * 400;
        const time = 2 + Math.random() * 3;
        this.windFilter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + time);
        setTimeout(() => this.animateWind(), time * 1000);
    }

    static updateEcologyState(springCount: number, windmillCount: number, weather: string) {
        if (!this.ctx || !this.rainGain || !this.windGain || !this.waterGain) return;
        
        const t = this.ctx.currentTime;
        
        if (weather === 'rainy') {
            this.rainGain.gain.cancelScheduledValues(t);
            this.rainGain.gain.linearRampToValueAtTime(0.08, t + 1.0);
        } else {
            this.rainGain.gain.cancelScheduledValues(t);
            this.rainGain.gain.linearRampToValueAtTime(0, t + 1.0);
        }

        let targetWind = 0.05 + (windmillCount * 0.02);
        if (weather === 'rainy') targetWind += 0.05;
        targetWind = Math.min(0.2, targetWind);
        this.windGain.gain.cancelScheduledValues(t);
        this.windGain.gain.linearRampToValueAtTime(targetWind, t + 2.0);

        let targetWater = Math.min(0.15, springCount * 0.03);
        this.waterGain.gain.cancelScheduledValues(t);
        this.waterGain.gain.linearRampToValueAtTime(targetWater, t + 2.0);
    }

    private static playSynthNote(freq: number, peakVol: number, attack: number, release: number) {
        if (!this.ctx || !this.masterGain || !this.delayNode) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(peakVol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, t + attack + release);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.delayNode);
        
        osc.start(t);
        osc.stop(t + attack + release + 1.0);
    }

    static playSynergyChord() {
        this.init();
        if (!this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 493.88];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSynthNote(freq, 0.2, 0.5, 4.0);
            }, i * 150);
        });
    }

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
