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
    private static bloomGain: GainNode | null = null;
    private static birdGain: GainNode | null = null;
    
    private static windFilter: BiquadFilterNode | null = null;
    private static birdTimer: ReturnType<typeof setTimeout> | null = null;
    private static lastPressAt = 0;

    // BGM — uses <audio> element for better autoplay support (MEI-based)
    private static bgmEl: HTMLAudioElement | null = null;
    private static bgmCache = new Map<string, HTMLAudioElement>(); // Preloaded audio elements
    private static isBgmPlaying = false;
    private static currentBgmUrl: string | null = null;
    // 当前 bgmEl 对应的「规范 URL」（即 loadBGM 收到的相对路径）。
    // 用它当 currentBgmUrl，避免 bgmEl.src 被浏览器解析成绝对地址后
    // 与播放列表/卡片里的相对路径对不上，导致自动切歌与卡片同步双双失效。
    private static loadedBgmUrl: string | null = null;
    private static bgmVolumeTarget = 0.5;
    private static bgmSwitchToken = 0;
    private static bgmFadeRAF: number | null = null;
    private static bgmAutoplayBlocked = false;
    private static bgmPlaylist: string[] = []; // ordered playlist URLs
    private static bgmShuffle = false;
    private static bgmAutoNextTriggered = false; // prevent double trigger
    private static bgmWatchTimer: ReturnType<typeof setInterval> | null = null;

    // 交互音效去重：记录最近一次"点击类"音效时间，全局监听据此避免与组件内调用重复发声
    static lastPlayAt = 0;
    private static touch() { this.lastPlayAt = (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
    static recentlyPlayed(ms = 160) {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        return now - this.lastPlayAt < ms;
    }

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

    /** Call this on user gesture to unlock AudioContext and resume BGM if blocked */
    static ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        // If BGM was blocked by autoplay policy, try again now (user gesture unlocks it)
        if (this.bgmEl && this.bgmAutoplayBlocked) {
            this.bgmEl.currentTime = 0;
            const p = this.bgmEl.play();
            if (p !== undefined) {
                p.then(() => {
                    this.isBgmPlaying = true;
                    this.bgmAutoplayBlocked = false;
                    this.currentBgmUrl = this.loadedBgmUrl ?? this.bgmEl!.src;
                    this.fadeBGMIN();
                    this.emitBGMChange();
                    this.startBGMWatch();
                    console.log('[BGM] Resumed after user gesture:', this.currentBgmUrl);
                }).catch(() => {
                    this.bgmAutoplayBlocked = true;
                });
            }
        }
        // Also handle case where BGM isn't playing at all
        if (this.bgmEl && !this.isBGMActuallyPlaying() && !this.bgmAutoplayBlocked) {
            const p = this.bgmEl.play();
            if (p !== undefined) {
                p.then(() => {
                    this.isBgmPlaying = true;
                    this.bgmAutoplayBlocked = false;
                    this.currentBgmUrl = this.loadedBgmUrl ?? this.bgmEl!.src;
                    this.fadeBGMIN();
                    this.emitBGMChange();
                    this.startBGMWatch();
                }).catch(() => {
                    this.bgmAutoplayBlocked = true;
                });
            }
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
            this.loadedBgmUrl = url;
            return;
        }

        // Create <audio> element
        const audio = new Audio();
        audio.loop = false;
        audio.volume = 0;
        audio.preload = 'auto';
        audio.src = url;
        audio.load();

        // Auto-advance: use both 'ended' and 'timeupdate' for reliability
        this.attachAutoNext(audio);

        // Cache it
        this.bgmCache.set(url, audio);
        this.bgmEl = audio;
        this.loadedBgmUrl = url;
    }

    /** Preload a BGM track without setting it as current */
    static preloadBGM(url: string) {
        if (this.bgmCache.has(url)) return;
        const audio = new Audio();
        audio.loop = false;
        audio.volume = 0;
        audio.preload = 'auto';
        audio.src = url;
        audio.load();
        this.attachAutoNext(audio);
        this.bgmCache.set(url, audio);
    }

    /** Attach auto-next listeners to an audio element */
    private static attachAutoNext(audio: HTMLAudioElement) {
        // Primary: 'ended' event
        audio.addEventListener('ended', () => {
            if (!this.bgmAutoNextTriggered) {
                this.bgmAutoNextTriggered = true;
                this.playNext();
            }
        });
        // Backup: 'timeupdate' — detect when song is about to end (last 0.3s)
        audio.addEventListener('timeupdate', () => {
            if (audio.duration && audio.duration > 0 && audio.currentTime >= audio.duration - 0.3) {
                if (!this.bgmAutoNextTriggered) {
                    this.bgmAutoNextTriggered = true;
                    this.playNext();
                }
            }
        });
    }

    static playBGM(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.bgmEl) { resolve(false); return; }
            if (this.isBgmPlaying) { resolve(true); return; }

            this.bgmEl.volume = 0;
            const playPromise = this.bgmEl.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isBgmPlaying = true;
                    this.bgmAutoplayBlocked = false;
                    this.currentBgmUrl = this.loadedBgmUrl ?? this.bgmEl!.src;
                    this.fadeBGMIN();
                    this.emitBGMChange();
                    this.startBGMWatch();
                    resolve(true);
                }).catch(() => {
                    this.bgmAutoplayBlocked = true;
                    resolve(false);
                });
            } else {
                this.isBgmPlaying = true;
                this.currentBgmUrl = this.loadedBgmUrl ?? this.bgmEl.src;
                this.fadeBGMIN();
                this.emitBGMChange();
                this.startBGMWatch();
                resolve(true);
            }
        });
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
        this.stopBGMWatch();
        if (!this.bgmEl || !this.isBgmPlaying) return;
        
        this.fadeBGMOUT().then(() => {
            this.bgmEl!.pause();
            this.bgmEl!.currentTime = 0;
            this.isBgmPlaying = false;
            this.currentBgmUrl = null;
        });
    }

    static stopAllNow() {
        this.stopBGMWatch();
        if (this.bgmFadeRAF) {
            cancelAnimationFrame(this.bgmFadeRAF);
            this.bgmFadeRAF = null;
        }
        this.bgmSwitchToken++;
        this.bgmCache.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            audio.load();
        });
        this.bgmCache.clear();
        this.bgmEl = null;
        this.isBgmPlaying = false;
        this.currentBgmUrl = null;
        this.bgmAutoplayBlocked = false;
        if (this.rainGain) this.rainGain.gain.value = 0;
        if (this.windGain) this.windGain.gain.value = 0;
        if (this.waterGain) this.waterGain.gain.value = 0;
        if (this.bloomGain) this.bloomGain.gain.value = 0;
        if (this.birdGain) this.birdGain.gain.value = 0;
        if (this.birdTimer) {
            clearTimeout(this.birdTimer);
            this.birdTimer = null;
        }
    }

    static async switchBGM(url: string) {
        if (this.currentBgmUrl === url && this.isBgmPlaying) return;

        const switchToken = ++this.bgmSwitchToken;
        this.bgmAutoNextTriggered = false;

        // Stop current — skip fade if already ended
        if (this.bgmEl) {
            if (this.isBgmPlaying && !this.bgmEl.ended) {
                await this.fadeBGMOUT();
                if (switchToken !== this.bgmSwitchToken) return;
            }
            this.bgmEl.pause();
            this.bgmEl.currentTime = 0;
        }
        this.isBgmPlaying = false;

        // Get from cache or load
        await this.loadBGM(url);
        if (switchToken !== this.bgmSwitchToken) return;

        // Reset playback position (critical for cached elements that ended previously)
        this.bgmEl!.currentTime = 0;

        const playPromise = this.bgmEl!.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (switchToken !== this.bgmSwitchToken) return;
                this.isBgmPlaying = true;
                this.bgmAutoplayBlocked = false;
                this.currentBgmUrl = url;
                this.fadeBGMIN();
                this.emitBGMChange();
                this.startBGMWatch();
                console.log('[BGM] Now playing:', url);
            }).catch((e) => {
                this.bgmAutoplayBlocked = true;
                // Still update URL so UI knows what's "current"
                this.currentBgmUrl = url;
                this.emitBGMChange();
                console.warn('[BGM] Autoplay blocked, will resume on next user gesture:', url, e);
            });
        } else {
            this.isBgmPlaying = true;
            this.currentBgmUrl = url;
            this.fadeBGMIN();
            this.emitBGMChange();
            this.startBGMWatch();
        }
    }

    static getBGMProgress(): number {
        if (!this.bgmEl || !this.isBgmPlaying || !this.bgmEl.duration) return 0;
        // Auto-advance: detect song end via polling (most reliable fallback)
        if (this.bgmEl.ended || (this.bgmEl.duration > 0 && this.bgmEl.currentTime >= this.bgmEl.duration - 0.1)) {
            if (!this.bgmAutoNextTriggered) {
                this.bgmAutoNextTriggered = true;
                this.playNext();
            }
            return 1;
        }
        return this.bgmEl.currentTime / this.bgmEl.duration;
    }

    static getCurrentBGMUrl(): string | null {
        return this.currentBgmUrl;
    }

    /** Set the playlist and enable auto-next on track end */
    static setPlaylist(urls: string[], shuffle = false) {
        this.bgmPlaylist = [...urls];
        this.bgmShuffle = shuffle;
    }

    /** Start internal watcher that auto-advances when song ends */
    private static startBGMWatch() {
        this.stopBGMWatch();
        this.bgmAutoNextTriggered = false;
        this.bgmWatchTimer = setInterval(() => {
            if (!this.bgmEl || !this.isBgmPlaying) return;
            if (this.bgmEl.ended || (this.bgmEl.duration > 0 && this.bgmEl.currentTime >= this.bgmEl.duration - 0.2)) {
                if (!this.bgmAutoNextTriggered) {
                    this.bgmAutoNextTriggered = true;
                    console.log('[BGM] Song ended, auto-advancing to next track');
                    this.isBgmPlaying = false; // Mark as not playing before switch
                    this.playNext();
                }
            }
        }, 500);
    }

    private static stopBGMWatch() {
        if (this.bgmWatchTimer) {
            clearInterval(this.bgmWatchTimer);
            this.bgmWatchTimer = null;
        }
    }

    /** Emit a global event so UI components can sync */
    private static emitBGMChange() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wander:bgm-changed', { detail: { url: this.currentBgmUrl } }));
        }
    }

    /** Play the next track in the playlist */
    static playNext() {
        if (!this.bgmPlaylist.length) return;
        // currentBgmUrl 不在列表里（idx = -1）时，(-1+1)%len = 0 自然回到首曲，
        // 不再因找不到当前曲目而卡住。
        const idx = this.currentBgmUrl ? this.bgmPlaylist.indexOf(this.currentBgmUrl) : -1;
        let nextIdx: number;
        if (this.bgmShuffle) {
            nextIdx = Math.floor(Math.random() * this.bgmPlaylist.length);
        } else {
            nextIdx = (idx + 1) % this.bgmPlaylist.length;
        }
        this.switchBGM(this.bgmPlaylist[nextIdx]);
    }

    /** Play the previous track in the playlist */
    static playPrev() {
        if (!this.bgmPlaylist.length || !this.currentBgmUrl) return;
        const idx = this.bgmPlaylist.indexOf(this.currentBgmUrl);
        const prevIdx = (idx - 1 + this.bgmPlaylist.length) % this.bgmPlaylist.length;
        this.switchBGM(this.bgmPlaylist[prevIdx]);
    }

    static isBGMAutoplayBlocked(): boolean {
        return this.bgmAutoplayBlocked;
    }

    static isBGMActuallyPlaying(): boolean {
        return this.isBgmPlaying && this.bgmEl !== null && !this.bgmEl.paused;
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

        // --- BLOOM AIR ---
        // Gentle high-air bed: not a literal bird/forest loop, more like warm air moving through leaves.
        this.bloomGain = this.ctx.createGain();
        this.bloomGain.gain.value = 0.018;
        const bloomHigh = this.ctx.createBiquadFilter();
        bloomHigh.type = 'highpass';
        bloomHigh.frequency.value = 1800;
        const bloomLow = this.ctx.createBiquadFilter();
        bloomLow.type = 'lowpass';
        bloomLow.frequency.value = 5200;
        this.bloomGain.connect(bloomHigh);
        bloomHigh.connect(bloomLow);
        bloomLow.connect(this.masterGain);

        const bloomSource = this.ctx.createBufferSource();
        bloomSource.buffer = this.noiseBuffer;
        bloomSource.loop = true;
        bloomSource.connect(this.bloomGain);
        bloomSource.start();

        // --- DISTANT LIFE ---
        // Sparse procedural calls, kept very low so they read as place, not as an audio gimmick.
        this.birdGain = this.ctx.createGain();
        this.birdGain.gain.value = 0.025;
        this.birdGain.connect(this.masterGain);
        this.scheduleDistantLife();
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

        if (this.bloomGain) {
            const targetBloom = weather === 'stormy' ? 0.006 : weather === 'rainy' ? 0.01 : 0.018;
            this.bloomGain.gain.cancelScheduledValues(t);
            this.bloomGain.gain.linearRampToValueAtTime(targetBloom, t + 2.5);
        }

        if (this.birdGain) {
            const targetBirds = weather === 'stormy' || weather === 'rainy' ? 0.006 : 0.024;
            this.birdGain.gain.cancelScheduledValues(t);
            this.birdGain.gain.linearRampToValueAtTime(targetBirds, t + 2.5);
        }
    }

    private static makeNoiseBurst(duration: number, decay = 0.12) {
        if (!this.ctx) return null;
        const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.exp(-i / (bufferSize * decay));
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    private static connectWithPan(input: AudioNode, output: AudioNode, pan = 0) {
        if (!this.ctx) return;
        if (typeof StereoPannerNode !== 'undefined') {
            const panner = new StereoPannerNode(this.ctx, { pan });
            input.connect(panner);
            panner.connect(output);
        } else {
            input.connect(output);
        }
    }

    private static scheduleDistantLife() {
        if (!this.ctx || !this.birdGain) return;
        const nextIn = 7000 + Math.random() * 15000;
        this.birdTimer = setTimeout(() => {
            if (!this.ctx || !this.birdGain) return;
            if (Math.random() < 0.62) this.playDistantGull();
            else this.playSpringChirp();
            this.scheduleDistantLife();
        }, nextIn);
    }

    private static playSpringChirp() {
        if (!this.ctx || !this.birdGain) return;
        const t = this.ctx.currentTime;
        const pan = (Math.random() - 0.5) * 1.2;
        const base = 1450 + Math.random() * 420;
        const repeats = Math.random() < 0.45 ? 2 : 1;

        for (let i = 0; i < repeats; i++) {
            const offset = i * (0.09 + Math.random() * 0.04);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(base, t + offset);
            osc.frequency.exponentialRampToValueAtTime(base * (1.28 + Math.random() * 0.18), t + offset + 0.035);
            filter.type = 'bandpass';
            filter.frequency.value = base * 1.2;
            filter.Q.value = 7;
            gain.gain.setValueAtTime(0.0001, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.025, t + offset + 0.018);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.11);
            osc.connect(filter);
            filter.connect(gain);
            this.connectWithPan(gain, this.birdGain, pan);
            osc.start(t + offset);
            osc.stop(t + offset + 0.13);
        }
    }

    private static playDistantGull() {
        if (!this.ctx || !this.birdGain) return;
        const t = this.ctx.currentTime;
        const pan = (Math.random() - 0.5) * 1.4;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(760 + Math.random() * 120, t);
        osc.frequency.linearRampToValueAtTime(1180 + Math.random() * 160, t + 0.24);
        osc.frequency.linearRampToValueAtTime(700 + Math.random() * 120, t + 0.72);
        filter.type = 'bandpass';
        filter.frequency.value = 980;
        filter.Q.value = 3.5;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.026, t + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.92);
        osc.connect(filter);
        filter.connect(gain);
        this.connectWithPan(gain, this.birdGain, pan);
        osc.start(t);
        osc.stop(t + 1.0);
    }

    private static haptic(pattern: number | number[]) {
        if (typeof navigator === 'undefined') return;
        (navigator as any).vibrate?.(pattern);
    }

    private static connectDelaySend(input: AudioNode, amount: number) {
        if (!this.ctx || !this.delayNode || amount <= 0) return;
        const send = this.ctx.createGain();
        send.gain.value = amount;
        input.connect(send);
        send.connect(this.delayNode);
    }

    private static playDarkButtonTransient(kind: 'click' | 'tap' | 'confirm' | 'close' | 'toggle') {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const settings = {
            click: { dur: 0.07, freq: 740, q: 4.2, vol: 0.064, body: 118, bodyVol: 0.034, tick: 1320, delay: 0.10 },
            tap: { dur: 0.045, freq: 1120, q: 4.8, vol: 0.04, body: 0, bodyVol: 0, tick: 1740, delay: 0.03 },
            confirm: { dur: 0.11, freq: 560, q: 3.4, vol: 0.072, body: 92, bodyVol: 0.056, tick: 1460, delay: 0.16 },
            close: { dur: 0.06, freq: 420, q: 3.6, vol: 0.044, body: 78, bodyVol: 0.028, tick: 760, delay: 0.06 },
            toggle: { dur: 0.055, freq: 900, q: 5.2, vol: 0.05, body: 104, bodyVol: 0.024, tick: 1880, delay: 0.05 },
        }[kind];

        const noise = this.makeNoiseBurst(settings.dur, 0.09);
        if (noise) {
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(settings.freq, t);
            filter.frequency.exponentialRampToValueAtTime(settings.freq * 0.78, t + settings.dur);
            filter.Q.setValueAtTime(settings.q, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(settings.vol, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + settings.dur);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            this.connectDelaySend(gain, settings.delay);
            noise.start(t);
            noise.stop(t + settings.dur + 0.02);
        }

        if (settings.body > 0) {
            const body = this.ctx.createOscillator();
            const bodyGain = this.ctx.createGain();
            body.type = 'sine';
            body.frequency.setValueAtTime(settings.body, t);
            body.frequency.exponentialRampToValueAtTime(settings.body * 0.62, t + 0.11);
            bodyGain.gain.setValueAtTime(0.0001, t);
            bodyGain.gain.exponentialRampToValueAtTime(settings.bodyVol, t + 0.012);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
            body.connect(bodyGain);
            bodyGain.connect(this.masterGain);
            body.start(t);
            body.stop(t + 0.18);
        }

        const tick = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tick.type = kind === 'confirm' ? 'sine' : 'triangle';
        tick.frequency.setValueAtTime(settings.tick, t + 0.008);
        tick.frequency.exponentialRampToValueAtTime(settings.tick * (kind === 'close' ? 0.72 : 1.18), t + 0.052);
        tickGain.gain.setValueAtTime(0.0001, t + 0.004);
        tickGain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.016 : 0.024, t + 0.014);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        tick.connect(tickGain);
        tickGain.connect(this.masterGain);
        this.connectDelaySend(tickGain, kind === 'confirm' ? 0.08 : 0.025);
        tick.start(t + 0.004);
        tick.stop(t + 0.09);
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

    static playClick() {
        this.init();
        if (!this.ctx) return;
        this.haptic(8);
        this.touch();
        this.playDarkButtonTransient('click');
    }

    /** Press — immediate tactile downbeat before the browser click event resolves */
    static playPress() {
        this.init();
        if (!this.ctx || !this.masterGain) return;
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (now - this.lastPressAt < 55) return;
        this.lastPressAt = now;
        this.haptic(5);

        const t = this.ctx.currentTime;
        const body = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        body.type = 'sine';
        body.frequency.setValueAtTime(92, t);
        body.frequency.exponentialRampToValueAtTime(54, t + 0.07);
        bodyGain.gain.setValueAtTime(0.0001, t);
        bodyGain.gain.exponentialRampToValueAtTime(0.018, t + 0.01);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        body.connect(bodyGain);
        bodyGain.connect(this.masterGain);
        body.start(t);
        body.stop(t + 0.1);

        const pressure = this.makeNoiseBurst(0.035, 0.1);
        if (pressure) {
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            filter.type = 'bandpass';
            filter.frequency.value = 260;
            filter.Q.value = 1.2;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.012, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
            pressure.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            pressure.start(t);
            pressure.stop(t + 0.055);
        }
    }

    /** Soft tap — lighter wood click for tab switches, minor actions */
    static playTap() {
        this.init();
        if (!this.ctx) return;
        this.haptic(4);
        this.touch();
        this.playDarkButtonTransient('tap');
    }

    /** Confirm — warm low thud for major actions (start, login, save) */
    static playConfirm() {
        this.init();
        if (!this.ctx) return;
        this.haptic([10, 24, 8]);
        this.touch();
        this.playDarkButtonTransient('confirm');
    }

    /** Toggle — crisp snap for on/off switches */
    static playToggle() {
        this.init();
        if (!this.ctx) return;
        this.haptic(7);
        this.touch();
        this.playDarkButtonTransient('toggle');
    }

    /** Close — soft reverse tap for closing panels/modals */
    static playClose() {
        this.init();
        if (!this.ctx) return;
        this.haptic(5);
        this.touch();
        this.playDarkButtonTransient('close');
    }

    static playPop() {
        this.init();
        if (!this.ctx) return;
        this.touch();
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
        this.touch();
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

    /** Hover — 极轻的高频 tick，用于鼠标悬停交互。不计入 lastPlayAt（不抑制点击音） */
    static playHover() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(620, t);
        o.frequency.exponentialRampToValueAtTime(760, t + 0.04);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.012, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

        o.connect(g);
        if (this.masterGain) g.connect(this.masterGain);
        o.start(t);
        o.stop(t + 0.08);
    }
}
