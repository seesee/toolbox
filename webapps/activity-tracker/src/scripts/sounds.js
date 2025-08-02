/**
 * Sound management for Activity Tracker
 * Handles different notification sound types and synthesis
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.soundTypes = {
            'classic': 'Classic Bloop',
            'gentle': 'Gentle Chime',
            'urgent': 'Urgent Ping',
            'digital': 'Digital Beep',
            'nature': 'Nature Drop',
            'mechanical': 'Mechanical Click',
            'spacey': 'Spacey Wobble',
            'corporate': 'Corporate Ding',
            'retro': 'Retro Arcade',
            'piano': 'Piano Note',
            'bell': 'Temple Bell',
            'whistle': 'Train Whistle',
            'bubble': 'Bubble Pop',
            'glass': 'Glass Tap',
            'wood': 'Wood Block',
            'metal': 'Metal Ting',
            'ethereal': 'Ethereal Hum',
            'cosmic': 'Cosmic Blip',
            'ocean': 'Ocean Wave',
            'forest': 'Forest Chirp',
            'failsafe': 'Failsafe',
            // Pomodoro tick sounds
            'soft-tick': 'Soft Tick',
            'classic-tick': 'Classic Tick',
            'digital-tick': 'Digital Tick'
        };
        this.initAudioContext();
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // For iOS, we need to unlock the audio context with user interaction
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                this.unlockAudioContextForIOS();
            }
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.audioContext = null;
        }
    }

    /**
     * Unlock AudioContext for iOS - must be called from user interaction
     */
    unlockAudioContextForIOS() {
        if (!this.audioContext || this.audioContext.state !== 'suspended') {
            return;
        }

        // Create a short silent buffer to unlock the context
        const unlockAudio = () => {
            if (this.audioContext.state === 'suspended') {
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
                
                this.audioContext.resume().then(() => {
                    console.log('iOS AudioContext unlocked successfully');
                }).catch(error => {
                    console.warn('Failed to unlock iOS AudioContext:', error);
                });
            }
        };

        // Add event listeners for user interactions to unlock audio
        const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
        const unlock = () => {
            unlockAudio();
            // Remove listeners after first interaction
            events.forEach(event => document.removeEventListener(event, unlock, true));
        };
        
        events.forEach(event => document.addEventListener(event, unlock, true));
    }

    /**
     * Get available sound types
     * @returns {Object} Sound types object
     */
    getSoundTypes() {
        return this.soundTypes;
    }

    /**
     * Play notification sound of specified type
     * @param {string} soundType - Type of sound to play
     * @param {boolean} muted - Whether sound is muted
     */
    playSound(soundType = 'classic', muted = false) {
        if (!this.audioContext || muted) {
            return;
        }

        try {
            // Resume audio context if it's suspended (critical for iOS)
            if (this.audioContext.state === 'suspended') {
                // For iOS, we need to handle the promise properly
                const resumePromise = this.audioContext.resume();
                if (resumePromise && resumePromise.then) {
                    resumePromise.then(() => {
                        console.log('AudioContext resumed successfully');
                        this.playSoundInternal(soundType);
                    }).catch(error => {
                        console.warn('Failed to resume AudioContext:', error);
                        // Try to reinitialize on iOS if resume fails
                        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                            this.initAudioContext();
                            if (this.audioContext && this.audioContext.state !== 'suspended') {
                                this.playSoundInternal(soundType);
                            }
                        }
                    });
                    return;
                } else {
                    this.audioContext.resume();
                }
            }
            
            this.playSoundInternal(soundType);
        } catch (error) {
            console.warn('Error playing notification sound:', error);
        }
    }

    /**
     * Internal method to actually play the sound after AudioContext is ready
     */
    playSoundInternal(soundType) {
        try {

            const currentTime = this.audioContext.currentTime;
            
            switch (soundType) {
                case 'classic':
                    this.playClassicBloop(currentTime);
                    break;
                case 'gentle':
                    this.playGentleChime(currentTime);
                    break;
                case 'urgent':
                    this.playUrgentPing(currentTime);
                    break;
                case 'digital':
                    this.playDigitalBeep(currentTime);
                    break;
                case 'nature':
                    this.playNatureDrop(currentTime);
                    break;
                case 'mechanical':
                    this.playMechanicalClick(currentTime);
                    break;
                case 'spacey':
                    this.playSpaceyWobble(currentTime);
                    break;
                case 'corporate':
                    this.playCorporateDing(currentTime);
                    break;
                case 'retro':
                    this.playRetroArcade(currentTime);
                    break;
                case 'piano':
                    this.playPianoNote(currentTime);
                    break;
                case 'bell':
                    this.playTempleBell(currentTime);
                    break;
                case 'whistle':
                    this.playTrainWhistle(currentTime);
                    break;
                case 'bubble':
                    this.playBubblePop(currentTime);
                    break;
                case 'glass':
                    this.playGlassTap(currentTime);
                    break;
                case 'wood':
                    this.playWoodBlock(currentTime);
                    break;
                case 'metal':
                    this.playMetalTing(currentTime);
                    break;
                case 'ethereal':
                    this.playEtherealHum(currentTime);
                    break;
                case 'cosmic':
                    this.playCosmicBlip(currentTime);
                    break;
                case 'ocean':
                    this.playOceanWave(currentTime);
                    break;
                case 'forest':
                    this.playForestChirp(currentTime);
                    break;
                case 'failsafe':
                    this.playFailsafe(currentTime);
                    break;
                case 'soft-tick':
                    this.playSoftTick(currentTime);
                    break;
                case 'classic-tick':
                    this.playClassicTick(currentTime);
                    break;
                case 'digital-tick':
                    this.playDigitalTick(currentTime);
                    break;
                default:
                    this.playClassicBloop(currentTime);
            }
            
            console.log(`Notification sound played: ${soundType}`);
        } catch (error) {
            console.warn('Error in playSoundInternal:', error);
        }
    }

    /**
     * Classic bloop sound (original)
     */
    playClassicBloop(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
    }

    /**
     * Gentle chime sound
     */
    playGentleChime(currentTime) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator1.frequency.setValueAtTime(523.25, currentTime); // C5
        oscillator2.frequency.setValueAtTime(659.25, currentTime); // E5
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.0);
        
        oscillator1.start(currentTime);
        oscillator2.start(currentTime);
        oscillator1.stop(currentTime + 1.0);
        oscillator2.stop(currentTime + 1.0);
    }

    /**
     * Urgent ping sound
     */
    playUrgentPing(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(800, currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.15);
    }

    /**
     * Digital beep sound
     */
    playDigitalBeep(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.06);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.06);
    }

    /**
     * Nature drop sound
     */
    playNatureDrop(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, currentTime + 0.8);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, currentTime + 0.8);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.8);
    }

    /**
     * Mechanical click sound
     */
    playMechanicalClick(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, currentTime);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(100, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.005);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.05);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.05);
    }

    /**
     * Spacey wobble sound
     */
    playSpaceyWobble(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const gainNode = this.audioContext.createGain();
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, currentTime);
        
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(6, currentTime);
        lfoGain.gain.setValueAtTime(50, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.2);
        
        lfo.start(currentTime);
        oscillator.start(currentTime);
        lfo.stop(currentTime + 1.2);
        oscillator.stop(currentTime + 1.2);
    }

    /**
     * Corporate ding sound
     */
    playCorporateDing(currentTime) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator1.frequency.setValueAtTime(880, currentTime); // A5
        oscillator2.frequency.setValueAtTime(1108.73, currentTime); // C#6
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
        
        oscillator1.start(currentTime);
        oscillator2.start(currentTime);
        oscillator1.stop(currentTime + 0.5);
        oscillator2.stop(currentTime + 0.5);
    }

    /**
     * Retro arcade sound
     */
    playRetroArcade(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, currentTime);
        oscillator.frequency.setValueAtTime(330, currentTime + 0.1);
        oscillator.frequency.setValueAtTime(440, currentTime + 0.2);
        oscillator.frequency.setValueAtTime(550, currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.4);
    }

    /**
     * Piano note sound
     */
    playPianoNote(currentTime) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';
        oscillator1.frequency.setValueAtTime(523.25, currentTime); // C5
        oscillator2.frequency.setValueAtTime(523.25, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.5);
        
        oscillator1.start(currentTime);
        oscillator2.start(currentTime);
        oscillator1.stop(currentTime + 1.5);
        oscillator2.stop(currentTime + 1.5);
    }

    /**
     * Temple bell sound
     */
    playTempleBell(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 2.0);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, currentTime);
        filter.Q.setValueAtTime(5, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 2.0);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 2.0);
    }

    /**
     * Train whistle sound
     */
    playTrainWhistle(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, currentTime);
        oscillator.frequency.setValueAtTime(660, currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.8);
    }

    /**
     * Bubble pop sound
     */
    playBubblePop(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.1);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, currentTime);
        filter.Q.setValueAtTime(3, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.1);
    }

    /**
     * Glass tap sound
     */
    playGlassTap(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(2000, currentTime);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, currentTime);
        filter.Q.setValueAtTime(2, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
    }

    /**
     * Wood block sound
     */
    playWoodBlock(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, currentTime);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, currentTime);
        filter.Q.setValueAtTime(5, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.08);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.08);
    }

    /**
     * Metal ting sound
     */
    playMetalTing(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1500, currentTime);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, currentTime);
        filter.Q.setValueAtTime(3, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.6);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.6);
    }

    /**
     * Ethereal hum sound
     */
    playEtherealHum(currentTime) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator1.frequency);
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator1.frequency.setValueAtTime(220, currentTime);
        oscillator2.frequency.setValueAtTime(330, currentTime);
        
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.5, currentTime);
        lfoGain.gain.setValueAtTime(10, currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, currentTime);
        filter.Q.setValueAtTime(1, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 2.0);
        
        lfo.start(currentTime);
        oscillator1.start(currentTime);
        oscillator2.start(currentTime);
        lfo.stop(currentTime + 2.0);
        oscillator1.stop(currentTime + 2.0);
        oscillator2.stop(currentTime + 2.0);
    }

    /**
     * Cosmic blip sound
     */
    playCosmicBlip(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, currentTime);
        
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(20, currentTime);
        lfoGain.gain.setValueAtTime(200, currentTime);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, currentTime);
        filter.Q.setValueAtTime(2, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
        
        lfo.start(currentTime);
        oscillator.start(currentTime);
        lfo.stop(currentTime + 0.4);
        oscillator.stop(currentTime + 0.4);
    }

    /**
     * Ocean wave sound
     */
    playOceanWave(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, currentTime + 1.5);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, currentTime + 1.5);
        filter.Q.setValueAtTime(2, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 1.0);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.5);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 1.5);
    }

    /**
     * Forest chirp sound
     */
    playForestChirp(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1800, currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.3);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, currentTime);
        filter.Q.setValueAtTime(3, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
    }

    /**
     * Failsafe sound - A magical, multi-layered easter egg sound
     * This creates an ascending cascade of crystalline tones with harmonic layers
     */
    playFailsafe(currentTime) {
        // Create multiple oscillators for a rich, magical sound
        const oscillators = [];
        const gainNodes = [];
        const filters = [];
        
        // Magic frequencies based on the golden ratio and harmonious intervals
        const baseFreq = 130.81; // C3 (one octave lower than C4)
        const magicFreqs = [
            baseFreq,           // C3 - Root
            baseFreq * 1.25,    // E3 - Major third
            baseFreq * 1.5,     // G3 - Perfect fifth
            baseFreq * 2,       // C4 - Octave
            baseFreq * 2.5,     // E4 - Major tenth
            baseFreq * 3,       // G4 - Perfect twelfth
            baseFreq * 4,       // C5 - Double octave
            baseFreq * 5.04,    // E5 - Major seventeenth (golden ratio influenced)
        ];
        
        // Create the main magical chord progression
        magicFreqs.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillators.push(oscillator);
            gainNodes.push(gainNode);
            filters.push(filter);
            
            // Connect the audio chain
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Use a mix of sine and triangle waves for ethereal quality
            oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(freq, currentTime);
            
            // Create ascending frequency sweeps for magical effect
            oscillator.frequency.exponentialRampToValueAtTime(freq * 1.618, currentTime + 0.8); // Golden ratio sweep
            oscillator.frequency.exponentialRampToValueAtTime(freq * 2, currentTime + 1.6);
            oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, currentTime + 2.4);
            
            // Configure filters for crystalline quality
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq * 2, currentTime);
            filter.frequency.exponentialRampToValueAtTime(freq * 8, currentTime + 1.2);
            filter.Q.setValueAtTime(3 + index * 0.5, currentTime);
            
            // Staggered gain envelopes for cascading effect
            const delay = index * 0.1; // Each note enters slightly after the previous
            const volume = 0.08 / (index + 1); // Decreasing volume for higher frequencies
            
            gainNode.gain.setValueAtTime(0, currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(volume, currentTime + delay + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, currentTime + delay + 1.0);
            gainNode.gain.linearRampToValueAtTime(volume * 0.3, currentTime + delay + 2.0);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + delay + 3.0);
            
            oscillator.start(currentTime + delay);
            oscillator.stop(currentTime + delay + 3.0);
        });
        
        // Add powerful bass/sub-bass foundation for extra impact
        const bassFreqs = [
            baseFreq / 4,       // C2 - Sub-bass octave (32.7 Hz)
            baseFreq / 2,       // C3 - Bass octave (65.4 Hz)
            baseFreq / 2 * 1.5, // G2 - Bass fifth (98.1 Hz)
        ];
        
        bassFreqs.forEach((freq, index) => {
            const bassOsc = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            const bassFilter = this.audioContext.createBiquadFilter();
            
            // Connect bass chain
            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(this.audioContext.destination);
            
            // Use different waveforms for rich bass texture
            const waveforms = ['sawtooth', 'square', 'triangle'];
            bassOsc.type = waveforms[index];
            bassOsc.frequency.setValueAtTime(freq, currentTime);
            
            // Add subtle bass frequency modulation for warmth, then extended dramatic drop
            bassOsc.frequency.exponentialRampToValueAtTime(freq * 1.05, currentTime + 1.0);
            bassOsc.frequency.exponentialRampToValueAtTime(freq * 0.95, currentTime + 1.5);
            // Begin the dramatic frequency drop midway through the sound
            bassOsc.frequency.linearRampToValueAtTime(freq * 0.8, currentTime + 2.0); // Start dropping at midpoint
            bassOsc.frequency.linearRampToValueAtTime(freq * 0.6, currentTime + 2.8); // Continue drop
            bassOsc.frequency.linearRampToValueAtTime(freq * 0.4, currentTime + 3.2); // Final drop to 40% of original
            
            // Configure bass filter for punch and clarity
            bassFilter.type = 'lowpass';
            bassFilter.frequency.setValueAtTime(200 + (index * 100), currentTime);
            bassFilter.frequency.exponentialRampToValueAtTime(300 + (index * 150), currentTime + 0.5);
            bassFilter.frequency.exponentialRampToValueAtTime(150 + (index * 75), currentTime + 2.5);
            bassFilter.Q.setValueAtTime(2, currentTime);
            
            // Bass envelope - punchy attack, sustained body
            const bassDelay = index * 0.05; // Slight stagger for thickness
            const bassVolume = index === 0 ? 0.15 : 0.08; // Sub-bass louder
            
            bassGain.gain.setValueAtTime(0, currentTime + bassDelay);
            bassGain.gain.linearRampToValueAtTime(bassVolume, currentTime + bassDelay + 0.1); // Quick attack
            bassGain.gain.exponentialRampToValueAtTime(bassVolume * 0.8, currentTime + bassDelay + 0.8);
            bassGain.gain.linearRampToValueAtTime(bassVolume * 0.4, currentTime + bassDelay + 2.2);
            bassGain.gain.exponentialRampToValueAtTime(0.001, currentTime + bassDelay + 3.2);
            
            bassOsc.start(currentTime + bassDelay);
            bassOsc.stop(currentTime + bassDelay + 3.2);
        });
        
        // Add sub-bass rumble for extra depth
        const subBassOsc = this.audioContext.createOscillator();
        const subBassGain = this.audioContext.createGain();
        const subBassFilter = this.audioContext.createBiquadFilter();
        
        subBassOsc.connect(subBassFilter);
        subBassFilter.connect(subBassGain);
        subBassGain.connect(this.audioContext.destination);
        
        // Very low frequency for felt impact with dramatic glissando drop
        subBassOsc.type = 'sine';
        subBassOsc.frequency.setValueAtTime(baseFreq / 4, currentTime); // C2 (32.7 Hz) - more audible start
        subBassOsc.frequency.exponentialRampToValueAtTime(baseFreq / 3, currentTime + 1.5); // Up to ~43 Hz
        subBassOsc.frequency.linearRampToValueAtTime(baseFreq / 4, currentTime + 2.0); // Back to 32.7 Hz
        // Dramatic glissando drop - much more audible range
        subBassOsc.frequency.linearRampToValueAtTime(baseFreq / 8, currentTime + 2.5); // Drop to 16 Hz
        subBassOsc.frequency.linearRampToValueAtTime(baseFreq / 12, currentTime + 3.2); // Slide to ~11 Hz
        subBassOsc.frequency.linearRampToValueAtTime(baseFreq / 16, currentTime + 3.5); // Final drop to ~8 Hz
        
        // Sub-bass filter for controlled rumble
        subBassFilter.type = 'lowpass';
        subBassFilter.frequency.setValueAtTime(60, currentTime);
        subBassFilter.frequency.exponentialRampToValueAtTime(80, currentTime + 1.0);
        subBassFilter.frequency.exponentialRampToValueAtTime(40, currentTime + 2.5);
        subBassFilter.Q.setValueAtTime(1.5, currentTime);
        
        // Sub-bass envelope - dramatic presence with swooping finale
        subBassGain.gain.setValueAtTime(0, currentTime);
        subBassGain.gain.linearRampToValueAtTime(0.18, currentTime + 0.3); // Stronger attack
        subBassGain.gain.exponentialRampToValueAtTime(0.12, currentTime + 1.5); // Maintain strong presence
        subBassGain.gain.linearRampToValueAtTime(0.10, currentTime + 2.0); // Keep audible for drop
        subBassGain.gain.linearRampToValueAtTime(0.15, currentTime + 2.5); // Boost during the drop
        subBassGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 3.5); // Final fade
        
        subBassOsc.start(currentTime);
        subBassOsc.stop(currentTime + 3.5);
        
        // Add magical shimmer with high-frequency sparkles
        for (let i = 0; i < 5; i++) {
            const shimmerOsc = this.audioContext.createOscillator();
            const shimmerGain = this.audioContext.createGain();
            const shimmerFilter = this.audioContext.createBiquadFilter();
            
            shimmerOsc.connect(shimmerFilter);
            shimmerFilter.connect(shimmerGain);
            shimmerGain.connect(this.audioContext.destination);
            
            // Lower frequencies for sparkle effect
            const shimmerFreq = 800 + Math.random() * 1200;
            shimmerOsc.type = 'sine';
            shimmerOsc.frequency.setValueAtTime(shimmerFreq, currentTime);
            shimmerOsc.frequency.exponentialRampToValueAtTime(shimmerFreq * 2, currentTime + 0.3);
            
            shimmerFilter.type = 'highpass';
            shimmerFilter.frequency.setValueAtTime(1500, currentTime);
            shimmerFilter.Q.setValueAtTime(10, currentTime);
            
            const shimmerDelay = i * 0.4;
            shimmerGain.gain.setValueAtTime(0, currentTime + shimmerDelay);
            shimmerGain.gain.linearRampToValueAtTime(0.03, currentTime + shimmerDelay + 0.05);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, currentTime + shimmerDelay + 0.3);
            
            shimmerOsc.start(currentTime + shimmerDelay);
            shimmerOsc.stop(currentTime + shimmerDelay + 0.3);
        }
        
        // Add subtle reverb effect with delay
        const delayNode = this.audioContext.createDelay(0.3);
        const delayGain = this.audioContext.createGain();
        const delayFilter = this.audioContext.createBiquadFilter();
        
        // Create a simple reverb feedback loop
        delayNode.delayTime.setValueAtTime(0.15, currentTime);
        delayGain.gain.setValueAtTime(0.2, currentTime);
        delayFilter.type = 'lowpass';
        delayFilter.frequency.setValueAtTime(8000, currentTime);
        
        // Connect delay chain
        delayNode.connect(delayFilter);
        delayFilter.connect(delayGain);
        delayGain.connect(delayNode); // Feedback
        delayGain.connect(this.audioContext.destination);
        
        // Connect some oscillators to the delay for reverb effect
        if (gainNodes.length > 0) {
            gainNodes[0].connect(delayNode);
            if (gainNodes.length > 2) {
                gainNodes[2].connect(delayNode);
            }
        }
        
        // Also connect the sub-bass to reverb for extra depth
        subBassGain.connect(delayNode);
        
        console.log('✨ Failsafe sound: Magic activated with epic bass! ✨');
    }

    // === POMODORO TICK SOUNDS ===

    /**
     * Soft tick sound - gentle but crisp digital-style click
     */
    playSoftTick(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Triangle wave like digital but lower pitch for softness
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1800, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900, currentTime + 0.005);
        
        // Band-pass filter like digital but lower Q for gentleness
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, currentTime);
        filter.Q.setValueAtTime(4, currentTime);
        
        // Sharp but softer envelope like digital
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.035, currentTime + 0.0005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.02);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.02);
    }

    /**
     * Classic tick sound - crisp digital-style click with classic feel
     */
    playClassicTick(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Triangle wave like digital but slightly higher pitch for classic feel
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(2000, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.005);
        
        // Band-pass filter like digital but mid-range for classic sound
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1350, currentTime);
        filter.Q.setValueAtTime(5, currentTime);
        
        // Sharp digital-style envelope with slightly more volume
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.045, currentTime + 0.0005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.02);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.02);
    }

    /**
     * Digital tick sound - crisp electronic click
     */
    playDigitalTick(currentTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Triangle wave for cleaner digital sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(2200, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1100, currentTime + 0.005);
        
        // Band-pass filter for focused click
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, currentTime);
        filter.Q.setValueAtTime(6, currentTime);
        
        // Ultra-sharp digital click envelope
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.05, currentTime + 0.0005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.02);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.02);
    }

    /**
     * Test a specific sound type
     * @param {string} soundType - Sound type to test
     * @param {boolean} muted - Whether sound is muted
     */
    testSound(soundType, muted = false) {
        this.playSound(soundType, muted);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SoundManager = SoundManager;
}

console.log('🔊 Sound Manager module loaded');
