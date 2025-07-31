/**
 * Pomodoro Timer Manager
 * Handles structured work/break cycles with notifications and activity logging
 */

class PomodoroManager {
    constructor(activityTracker) {
        this.activityTracker = activityTracker;
        this.isActive = false;
        this.isRunning = false;
        this.currentPhase = 'work'; // 'work' or 'break'
        this.cycleCount = 0;
        this.timer = null;
        this.remainingTime = 0;
        this.startTime = null;
        
        // Settings (will be loaded from activity tracker settings)
        this.settings = {
            enabled: false,
            workDuration: 25, // minutes
            breakDuration: 5, // minutes
            longBreakDuration: 15, // minutes
            autoLog: true,
            longBreak: false
        };
        
        this.init();
    }
    
    init() {
        // Set up Pomodoro mode toggle
        const pomodoroEnabled = document.getElementById('pomodoroEnabled');
        if (pomodoroEnabled) {
            pomodoroEnabled.addEventListener('change', () => {
                this.togglePomodoroMode(pomodoroEnabled.checked);
            });
        }
        
        // Load settings from activity tracker
        this.loadSettings();
        
        console.log('🍅 Pomodoro Manager initialized');
    }
    
    loadSettings() {
        if (this.activityTracker && this.activityTracker.settings) {
            const settings = this.activityTracker.settings;
            this.settings = {
                enabled: settings.pomodoroEnabled || false,
                workDuration: parseInt(settings.pomodoroWorkDuration) || 25,
                breakDuration: parseInt(settings.pomodoroBreakDuration) || 5,
                longBreakDuration: parseInt(settings.pomodoroLongBreakDuration) || 15,
                autoLog: settings.pomodoroAutoLog !== false,
                longBreak: settings.pomodoroLongBreak || false
            };
            
            // Update UI
            this.updateUI();
        }
    }
    
    updateUI() {
        const pomodoroEnabled = document.getElementById('pomodoroEnabled');
        const pomodoroConfig = document.getElementById('pomodoroConfig');
        const workDuration = document.getElementById('pomodoroWorkDuration');
        const breakDuration = document.getElementById('pomodoroBreakDuration');
        const autoLog = document.getElementById('pomodoroAutoLog');
        const longBreak = document.getElementById('pomodoroLongBreak');
        
        if (pomodoroEnabled) {
            pomodoroEnabled.checked = this.settings.enabled;
        }
        
        if (pomodoroConfig) {
            pomodoroConfig.style.display = this.settings.enabled ? 'block' : 'none';
        }
        
        if (workDuration) {
            workDuration.value = this.settings.workDuration.toString();
        }
        
        if (breakDuration) {
            breakDuration.value = this.settings.breakDuration.toString();
        }
        
        if (autoLog) {
            autoLog.checked = this.settings.autoLog;
        }
        
        if (longBreak) {
            longBreak.checked = this.settings.longBreak;
        }
    }
    
    togglePomodoroMode(enabled) {
        this.settings.enabled = enabled;
        this.isActive = enabled;
        
        const pomodoroConfig = document.getElementById('pomodoroConfig');
        if (pomodoroConfig) {
            pomodoroConfig.style.display = enabled ? 'block' : 'none';
        }
        
        if (enabled) {
            this.startPomodoroMode();
        } else {
            this.stopPomodoroMode();
        }
        
        // Save settings
        if (this.activityTracker) {
            this.activityTracker.settings.pomodoroEnabled = enabled;
            this.activityTracker.saveSettings();
        }
        
        console.log(`🍅 Pomodoro mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    startPomodoroMode() {
        if (!this.isActive) return;
        
        this.currentPhase = 'work';
        this.cycleCount = 0;
        this.startWorkPeriod();
        
        if (this.settings.autoLog) {
            this.logActivity('Pomodoro work session started', 'Starting focused work period');
        }
        
        showNotification('🍅 Pomodoro mode started! Beginning work period.', 'success');
    }
    
    stopPomodoroMode() {
        this.isActive = false;
        this.isRunning = false;
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        if (this.settings.autoLog && this.currentPhase === 'work') {
            this.logActivity('Pomodoro session ended', 'Work session interrupted');
        }
        
        showNotification('🍅 Pomodoro mode stopped.', 'info');
    }
    
    startWorkPeriod() {
        if (!this.isActive) return;
        
        this.currentPhase = 'work';
        this.isRunning = true;
        this.remainingTime = this.settings.workDuration * 60 * 1000; // Convert to milliseconds
        this.startTime = Date.now();
        
        this.timer = setTimeout(() => {
            this.endWorkPeriod();
        }, this.remainingTime);
        
        console.log(`🍅 Starting ${this.settings.workDuration} minute work period`);
    }
    
    endWorkPeriod() {
        if (!this.isActive) return;
        
        this.cycleCount++;
        this.isRunning = false;
        
        // Log work activity
        if (this.settings.autoLog) {
            this.logActivity(
                `Pomodoro work period #${this.cycleCount} completed`,
                `Completed ${this.settings.workDuration} minute focused work session`
            );
        }
        
        // Play notification sound
        if (this.activityTracker) {
            this.activityTracker.playNotificationSound();
        }
        
        // Show notification with action
        this.showWorkCompleteNotification();
        
        // Start break period
        setTimeout(() => {
            this.startBreakPeriod();
        }, 1000);
    }
    
    startBreakPeriod() {
        if (!this.isActive) return;
        
        this.currentPhase = 'break';
        this.isRunning = true;
        
        // Determine break duration (long break every 4th cycle if enabled)
        const isLongBreak = this.settings.longBreak && (this.cycleCount % 4 === 0);
        const breakDuration = isLongBreak ? this.settings.longBreakDuration : this.settings.breakDuration;
        
        this.remainingTime = breakDuration * 60 * 1000;
        this.startTime = Date.now();
        
        this.timer = setTimeout(() => {
            this.endBreakPeriod();
        }, this.remainingTime);
        
        const breakType = isLongBreak ? 'long break' : 'break';
        console.log(`🍅 Starting ${breakDuration} minute ${breakType}`);
        
        // Show break notification
        this.showBreakStartNotification(breakType, breakDuration);
    }
    
    endBreakPeriod() {
        if (!this.isActive) return;
        
        this.isRunning = false;
        
        // Log break activity
        if (this.settings.autoLog) {
            const isLongBreak = this.settings.longBreak && (this.cycleCount % 4 === 0);
            const breakType = isLongBreak ? 'long break' : 'break';
            this.logActivity(
                `Pomodoro ${breakType} completed`,
                `Finished rest period, ready for next work session`
            );
        }
        
        // Play notification sound
        if (this.activityTracker) {
            this.activityTracker.playNotificationSound();
        }
        
        // Show back-to-work notification
        this.showBackToWorkNotification();
        
        // Start next work period
        setTimeout(() => {
            this.startWorkPeriod();
        }, 1000);
    }
    
    showWorkCompleteNotification() {
        const options = {
            body: `Work period #${this.cycleCount} complete! Time for a break.`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f56565"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
            tag: 'pomodoro-work-complete',
            requireInteraction: true,
            actions: [
                { action: 'start-break', title: 'Start Break', icon: '☕' },
                { action: 'continue-work', title: 'Continue Working', icon: '💪' }
            ]
        };
        
        if (this.activityTracker) {
            this.activityTracker.showNotificationWithServiceWorker('🍅 Pomodoro - Work Complete!', options);
        }
    }
    
    showBreakStartNotification(breakType, duration) {
        const options = {
            body: `Take a ${breakType} for ${duration} minutes. You've earned it!`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2348bb78"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zM20.71 4.63l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/></svg>',
            tag: 'pomodoro-break-start',
            requireInteraction: false
        };
        
        if (this.activityTracker) {
            this.activityTracker.showNotificationWithServiceWorker(`🍅 ${breakType.charAt(0).toUpperCase() + breakType.slice(1)} Time!`, options);
        }
    }
    
    showBackToWorkNotification() {
        const options = {
            body: 'Break time is over. Ready to get back to focused work?',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            tag: 'pomodoro-back-to-work',
            requireInteraction: true,
            actions: [
                { action: 'reply', type: 'text', title: 'Log Work Activity', placeholder: 'What will you work on next?' }
            ]
        };
        
        if (this.activityTracker) {
            this.activityTracker.showNotificationWithServiceWorker('🍅 Back to Work!', options);
        }
    }
    
    logActivity(activity, description) {
        if (!this.activityTracker || !this.settings.autoLog) return;
        
        const entry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            activity: activity,
            description: description || '',
            timestamp: new Date().toISOString(),
            created: new Date().toISOString(),
            source: 'pomodoro'
        };
        
        this.activityTracker.addEntry(entry);
        console.log('🍅 Auto-logged Pomodoro activity:', activity);
    }
    
    saveSettings() {
        if (!this.activityTracker) return;
        
        // Get current values from UI
        const workDuration = document.getElementById('pomodoroWorkDuration');
        const breakDuration = document.getElementById('pomodoroBreakDuration');
        const autoLog = document.getElementById('pomodoroAutoLog');
        const longBreak = document.getElementById('pomodoroLongBreak');
        
        if (workDuration) this.settings.workDuration = parseInt(workDuration.value);
        if (breakDuration) this.settings.breakDuration = parseInt(breakDuration.value);
        if (autoLog) this.settings.autoLog = autoLog.checked;
        if (longBreak) this.settings.longBreak = longBreak.checked;
        
        // Save to activity tracker settings
        this.activityTracker.settings.pomodoroWorkDuration = this.settings.workDuration;
        this.activityTracker.settings.pomodoroBreakDuration = this.settings.breakDuration;
        this.activityTracker.settings.pomodoroAutoLog = this.settings.autoLog;
        this.activityTracker.settings.pomodoroLongBreak = this.settings.longBreak;
        
        console.log('🍅 Pomodoro settings saved');
    }
    
    getCurrentStatus() {
        if (!this.isActive) return 'Disabled';
        if (!this.isRunning) return 'Paused';
        
        const timeLeft = Math.ceil(this.remainingTime / 60000);
        const phase = this.currentPhase === 'work' ? 'Working' : 'Break';
        return `${phase} - ${timeLeft}m left`;
    }
    
    destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.isActive = false;
        this.isRunning = false;
        console.log('🍅 Pomodoro Manager destroyed');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PomodoroManager = PomodoroManager;
}

console.log('🍅 Pomodoro Manager module loaded');