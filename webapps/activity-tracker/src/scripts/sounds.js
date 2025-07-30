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
            'corporate': 'Corporate Ding'
        };
        this.initAudioContext();
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.audioContext = null;
        }
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
            // Resume audio context if it's suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

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
                default:
                    this.playClassicBloop(currentTime);
            }
            
            console.log(`Notification sound played: ${soundType}`);
        } catch (error) {
            console.warn('Error playing notification sound:', error);
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
