/**
 * Pause Manager for Activity Tracker
 * Handles pause countdown, visual draining effect, and pause state management
 */

class PauseManager {
    constructor(activityTracker) {
        this.tracker = activityTracker;
        this.countdownInterval = null;
        this.pauseButton = null;
        this.originalButtonText = 'Pause Reminders';
        this.init();
    }

    /**
     * Initialize the pause manager
     */
    init() {
        this.pauseButton = document.getElementById('pauseButton');
        if (this.pauseButton) {
            this.updatePauseButtonDisplay();
            this.setupPauseButtonHandlers();
        }
    }
    
    /**
     * Setup pause button event handlers for right-click pause menu
     */
    setupPauseButtonHandlers() {
        // Add right-click context menu for pause durations
        this.pauseButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showPauseMenu(e);
        });
        
        // Add long-press support for mobile
        let pressTimer;
        this.pauseButton.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                e.preventDefault();
                this.showPauseMenu(e);
            }, 500);
        });
        
        this.pauseButton.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
    }
    
    /**
     * Show pause duration menu
     */
    showPauseMenu(event) {
        // If already paused, just resume
        if (this.isPaused()) {
            this.resume();
            return;
        }
        
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'pause-context-menu';
        menu.style.cssText = `
            position: fixed;
            z-index: 10000;
            background: var(--bg-color, #fff);
            border: 1px solid var(--border-color, #ccc);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 8px 0;
            min-width: 150px;
            font-size: 14px;
        `;
        
        const options = [
            { label: '5 minutes', duration: 5 },
            { label: '15 minutes', duration: 15 },
            { label: '30 minutes', duration: 30 },
            { label: '1 hour', duration: 60 },
            { label: '2 hours', duration: 120 },
            { label: 'Until manually resumed', duration: -1 }
        ];
        
        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            menuItem.textContent = option.label;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = 'var(--hover-color, #f0f0f0)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = '';
            });
            
            menuItem.addEventListener('click', () => {
                this.startPause(option.duration);
                menu.remove();
            });
            
            menu.appendChild(menuItem);
        });
        
        // Position menu
        const rect = this.pauseButton.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        
        // Add to page
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    /**
     * Start pause with countdown
     * @param {number} durationMinutes - Duration in minutes (-1 for forever)
     */
    startPause(durationMinutes) {
        // Clear any existing countdown
        this.stopCountdown();

        if (durationMinutes === -1) {
            // Forever pause
            this.tracker.settings.notificationsPausedUntil = Infinity;
            this.updatePauseButtonForever();
            showNotification('Reminders paused indefinitely', 'info');
        } else {
            // Timed pause
            this.tracker.settings.notificationsPausedUntil = new Date().getTime() + durationMinutes * 60 * 1000;
            this.startCountdown();
            const unit = durationMinutes === 1 ? 'minute' : 'minutes';
            showNotification(`Reminders paused for ${durationMinutes} ${unit}`, 'info');
        }

        this.tracker.saveSettings();
    }

    /**
     * Resume notifications
     */
    resume() {
        this.stopCountdown();
        this.tracker.settings.notificationsPausedUntil = null;
        this.updatePauseButtonNormal();
        this.tracker.saveSettings();
        showNotification('Reminders resumed', 'success');
    }

    /**
     * Start the countdown timer
     */
    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Update immediately
        this.updateCountdownDisplay();

        // Update every second
        this.countdownInterval = setInterval(() => {
            this.updateCountdownDisplay();
        }, 1000);
    }

    /**
     * Stop the countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Update the countdown display and draining effect
     */
    updateCountdownDisplay() {
        if (!this.pauseButton || !this.tracker.settings.notificationsPausedUntil) {
            this.updatePauseButtonNormal();
            return;
        }

        const now = new Date().getTime();
        const pausedUntil = this.tracker.settings.notificationsPausedUntil;

        if (pausedUntil === Infinity) {
            this.updatePauseButtonForever();
            return;
        }

        const timeRemaining = pausedUntil - now;

        if (timeRemaining <= 0) {
            // Time's up, auto-resume
            this.resume();
            showNotification('Notifications automatically resumed', 'success');
            return;
        }

        // Calculate time components
        const totalSeconds = Math.floor(timeRemaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Format countdown text
        let countdownText;
        if (hours > 0) {
            countdownText = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            countdownText = `${minutes}m ${seconds}s`;
        } else {
            countdownText = `${seconds}s`;
        }

        // Update button text
        this.pauseButton.textContent = `Resume (${countdownText})`;
        this.pauseButton.title = 'Click to resume reminders now. Right-click for pause duration options.';

        // Calculate drain percentage (how much time has passed)
        const totalDuration = this.tracker.settings.pauseDuration * 60 * 1000;
        const timeElapsed = totalDuration - timeRemaining;
        const drainPercentage = Math.max(0, Math.min(100, (timeElapsed / totalDuration) * 100));

        // Apply draining visual effect
        this.applyDrainingEffect(drainPercentage);
    }

    /**
     * Apply visual draining effect to button
     * @param {number} percentage - Percentage drained (0-100)
     */
    applyDrainingEffect(percentage) {
        // Create a gradient that "drains" from right to left (starts full on right, drains to left)
        const drained = `rgba(229, 62, 62, 0.3)`; // Light red for drained area
        const full = `#e53e3e`; // Full red for remaining area

        // Calculate where the drain line should be (percentage is how much has been consumed)
        // We want to start full from the right and drain to the left
        this.pauseButton.style.background = `linear-gradient(to left, ${drained} 0%, ${drained} ${percentage}%, ${full} ${percentage}%, ${full} 100%)`;
        this.pauseButton.style.transition = 'background 1s ease-out';
        
        // Add a subtle pulse effect when nearly drained
        if (percentage > 90) {
            this.pauseButton.style.animation = 'pulse 1s infinite';
        } else {
            this.pauseButton.style.animation = 'none';
        }
    }

    /**
     * Update button for forever pause
     */
    updatePauseButtonForever() {
        this.pauseButton.textContent = 'Resume (Paused Forever)';
        this.pauseButton.title = 'Click to resume reminders. Right-click for pause duration options.';
        this.pauseButton.style.background = '#e53e3e';
        this.pauseButton.style.animation = 'none';
        this.pauseButton.style.transition = '';
    }

    /**
     * Update button for normal (not paused) state
     */
    updatePauseButtonNormal() {
        // Check if notifications are enabled to determine button text
        // When not temporarily paused, show appropriate text based on notification state
        const buttonText = this.tracker.settings.notificationsEnabled ? 'Pause Reminders' : 'Start Reminders';
        this.pauseButton.textContent = buttonText;
        this.pauseButton.title = 'Click to toggle reminders on/off. Right-click for pause duration options.';
        this.pauseButton.style.background = '';
        this.pauseButton.style.animation = 'none';
        this.pauseButton.style.transition = '';
    }

    /**
     * Update the pause button display based on current state
     */
    updatePauseButtonDisplay() {
        if (!this.pauseButton) return;

        if (this.tracker.settings.notificationsPausedUntil) {
            if (this.tracker.settings.notificationsPausedUntil === Infinity) {
                this.updatePauseButtonForever();
            } else {
                this.startCountdown();
            }
        } else {
            this.updatePauseButtonNormal();
        }
    }

    /**
     * Check if notifications are currently paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        if (!this.tracker.settings.notificationsPausedUntil) {
            return false;
        }

        if (this.tracker.settings.notificationsPausedUntil === Infinity) {
            return true;
        }

        const now = new Date().getTime();
        return now < this.tracker.settings.notificationsPausedUntil;
    }

    /**
     * Get remaining pause time in milliseconds
     * @returns {number} Remaining time in ms, or -1 for forever, or 0 if not paused
     */
    getRemainingTime() {
        if (!this.tracker.settings.notificationsPausedUntil) {
            return 0;
        }

        if (this.tracker.settings.notificationsPausedUntil === Infinity) {
            return -1;
        }

        const now = new Date().getTime();
        const remaining = this.tracker.settings.notificationsPausedUntil - now;
        return Math.max(0, remaining);
    }

    /**
     * Cleanup when destroying the pause manager
     */
    destroy() {
        this.stopCountdown();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PauseManager = PauseManager;
}

console.log('⏸️ Pause Manager module loaded');
