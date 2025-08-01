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
        this.totalSessions = 0;
        this.timer = null;
        this.tickTimer = null;
        this.remainingTime = 0;
        this.startTime = null;
        
        // Settings (will be loaded from activity tracker settings)
        this.settings = {
            enabled: false,
            workDuration: 25, // minutes
            breakDuration: 5, // minutes
            longBreakDuration: 15, // minutes
            longBreakInterval: 4, // sessions before long break
            tickSound: 'none', // 'none', 'soft', 'classic', 'digital'
            tickInterval: 0, // seconds between ticks (0 = off)
            shortBreakSound: 'gentle',
            longBreakSound: 'bell',
            resumeSound: 'digital',
            autoStart: false,
            autoLog: true,
            logBreaks: false,
            longBreak: true
        };
        
        this.statusUpdateInterval = null;
        
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
        
        // Set up auto-save for all Pomodoro settings
        this.setupAutoSaveListeners();
        
        // Pomodoro control is now handled by the main navigation button
        
        // Load settings from activity tracker
        this.loadSettings();
        
        console.log('🍅 Pomodoro Manager initialized with comprehensive features');
    }
    
    /**
     * Setup auto-save listeners for all Pomodoro settings
     */
    setupAutoSaveListeners() {
        const settingsIds = [
            'pomodoroWorkDuration',
            'pomodoroBreakDuration', 
            'pomodoroLongBreakDuration',
            'pomodoroLongBreakInterval',
            'pomodoroTickSound',
            'pomodoroTickInterval',
            'pomodoroShortBreakSound',
            'pomodoroLongBreakSound',
            'pomodoroResumeSound',
            'pomodoroAutoStart',
            'pomodoroAutoLog',
            'pomodoroLogBreaks',
            'pomodoroLongBreak'
        ];
        
        settingsIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'change';
                element.addEventListener(eventType, () => {
                    console.log(`🍅 Auto-saving Pomodoro setting: ${id}`);
                    this.saveSettings();
                    this.loadSettings(); // Refresh settings immediately
                });
            }
        });
        
        console.log('🍅 Auto-save listeners setup for Pomodoro settings');
    }
    
    loadSettings() {
        if (this.activityTracker && this.activityTracker.settings) {
            const settings = this.activityTracker.settings;
            this.settings = {
                enabled: settings.pomodoroEnabled || false,
                workDuration: parseInt(settings.pomodoroWorkDuration) || 25,
                breakDuration: parseInt(settings.pomodoroBreakDuration) || 5,
                longBreakDuration: parseInt(settings.pomodoroLongBreakDuration) || 15,
                longBreakInterval: parseInt(settings.pomodoroLongBreakInterval) || 4,
                tickSound: settings.pomodoroTickSound || 'none',
                tickInterval: parseInt(settings.pomodoroTickInterval) || 0,
                shortBreakSound: settings.pomodoroShortBreakSound || 'gentle',
                longBreakSound: settings.pomodoroLongBreakSound || 'bell',
                resumeSound: settings.pomodoroResumeSound || 'digital',
                autoStart: settings.pomodoroAutoStart || false,
                autoLog: settings.pomodoroAutoLog !== false,
                logBreaks: settings.pomodoroLogBreaks || false,
                longBreak: settings.pomodoroLongBreak !== false
            };
            
            // Restore session state if it exists
            this.cycleCount = parseInt(settings.pomodoroCycleCount) || 0;
            this.totalSessions = parseInt(settings.pomodoroTotalSessions) || 0;
            
            // Restore active session state
            const wasActive = settings.pomodoroIsActive || false;
            const wasRunning = settings.pomodoroIsRunning || false;
            const savedPhase = settings.pomodoroCurrentPhase || 'work';
            const savedStartTime = settings.pomodoroStartTime;
            const savedRemainingTime = settings.pomodoroRemainingTime;
            
            // If there was an active session, try to restore it
            if (wasActive && wasRunning && savedStartTime && savedRemainingTime) {
                this.restoreActiveSession(savedPhase, savedStartTime, savedRemainingTime);
            } else if (wasActive && !wasRunning) {
                // Pomodoro was enabled but not running
                this.isActive = true;
            }
            
            // Update UI
            this.updateUI();
        }
    }
    
    updateUI() {
        const pomodoroEnabled = document.getElementById('pomodoroEnabled');
        const pomodoroConfig = document.getElementById('pomodoroConfig');
        const workDuration = document.getElementById('pomodoroWorkDuration');
        const breakDuration = document.getElementById('pomodoroBreakDuration');
        const longBreakDuration = document.getElementById('pomodoroLongBreakDuration');
        const longBreakInterval = document.getElementById('pomodoroLongBreakInterval');
        const tickSound = document.getElementById('pomodoroTickSound');
        const tickInterval = document.getElementById('pomodoroTickInterval');
        const shortBreakSound = document.getElementById('pomodoroShortBreakSound');
        const longBreakSound = document.getElementById('pomodoroLongBreakSound');
        const resumeSound = document.getElementById('pomodoroResumeSound');
        const autoStart = document.getElementById('pomodoroAutoStart');
        const autoLog = document.getElementById('pomodoroAutoLog');
        const logBreaks = document.getElementById('pomodoroLogBreaks');
        const longBreak = document.getElementById('pomodoroLongBreak');
        const statusDisplay = document.getElementById('pomodoroStatus');
        
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
        
        if (longBreakDuration) {
            longBreakDuration.value = this.settings.longBreakDuration.toString();
        }
        
        if (longBreakInterval) {
            longBreakInterval.value = this.settings.longBreakInterval.toString();
        }
        
        if (tickSound) {
            tickSound.value = this.settings.tickSound;
        }
        
        if (tickInterval) {
            tickInterval.value = this.settings.tickInterval.toString();
        }
        
        if (shortBreakSound) {
            shortBreakSound.value = this.settings.shortBreakSound;
        }
        
        if (longBreakSound) {
            longBreakSound.value = this.settings.longBreakSound;
        }
        
        if (resumeSound) {
            resumeSound.value = this.settings.resumeSound;
        }
        
        if (autoStart) {
            autoStart.checked = this.settings.autoStart;
        }
        
        if (autoLog) {
            autoLog.checked = this.settings.autoLog;
        }
        
        if (logBreaks) {
            logBreaks.checked = this.settings.logBreaks;
        }
        
        if (longBreak) {
            longBreak.checked = this.settings.longBreak;
        }
        
        // Update main Pomodoro button in nav
        this.updatePomodoroButton();
        
        if (statusDisplay) {
            this.updateStatusDisplay();
        }
    }
    
    togglePomodoroMode(enabled) {
        this.settings.enabled = enabled;
        this.isActive = enabled;
        
        const pomodoroConfig = document.getElementById('pomodoroConfig');
        if (pomodoroConfig) {
            pomodoroConfig.style.display = enabled ? 'block' : 'none';
        }
        
        // Update button visibility immediately
        this.updatePomodoroButton();
        
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
        
        this.stopTickSounds();
        this.stopStatusUpdates();
        
        if (this.settings.autoLog && this.currentPhase === 'work') {
            this.logActivity('Pomodoro session ended', 'Work session interrupted');
        }
        
        // Clear session state from storage
        if (this.activityTracker && this.activityTracker.settings) {
            this.activityTracker.settings.pomodoroIsActive = false;
            this.activityTracker.settings.pomodoroIsRunning = false;
            this.activityTracker.settings.pomodoroCurrentPhase = null;
            this.activityTracker.settings.pomodoroStartTime = null;
            this.activityTracker.settings.pomodoroRemainingTime = null;
            this.activityTracker.saveSettings();
        }
        
        this.updateUI();
        showNotification('🍅 Pomodoro mode stopped.', 'info');
    }
    
    startWorkPeriod() {
        if (!this.isActive) return;
        
        // If auto-log is enabled, prompt for activity description first
        if (this.settings.autoLog && this.cycleCount === 0) {
            // First session - show modal to get activity description
            this.pendingWorkSession = true;
            this.showWorkActivityModal();
            return;
        }
        
        this.actuallyStartWorkPeriod();
    }
    
    actuallyStartWorkPeriod() {
        if (!this.isActive) return;
        
        this.currentPhase = 'work';
        this.isRunning = true;
        this.remainingTime = this.settings.workDuration * 60 * 1000; // Convert to milliseconds
        this.startTime = Date.now();
        
        this.timer = setTimeout(() => {
            this.endWorkPeriod();
        }, this.remainingTime);
        
        // Start tick sounds if enabled
        this.startTickSounds();
        
        // Start status updates
        this.startStatusUpdates();
        
        // Save session state
        this.saveSessionProgress();
        
        // Update UI
        this.updateUI();
        
        console.log(`🍅 Starting ${this.settings.workDuration} minute work period (Session ${this.cycleCount + 1})`);
    }
    
    endWorkPeriod() {
        if (!this.isActive) return;
        
        this.cycleCount++;
        this.totalSessions++;
        this.isRunning = false;
        
        // Stop tick sounds
        this.stopTickSounds();
        
        // Save session progress
        this.saveSessionProgress();
        
        // Log work activity with custom description if available
        if (this.settings.autoLog) {
            if (this.currentWorkActivity) {
                this.logActivity(
                    this.currentWorkActivity.name,
                    this.currentWorkActivity.description || `Completed ${this.settings.workDuration} minute Pomodoro work session`
                );
            } else {
                this.logActivity(
                    `Pomodoro work period #${this.cycleCount} completed`,
                    `Completed ${this.settings.workDuration} minute focused work session`
                );
            }
        }
        
        // Play notification sound
        if (this.activityTracker) {
            this.activityTracker.playNotificationSound();
        }
        
        // Show notification with action
        this.showWorkCompleteNotification();
        
        // Update UI
        this.updateUI();
        
        // Start break period
        setTimeout(() => {
            this.startBreakPeriod();
        }, 1000);
    }
    
    startBreakPeriod() {
        if (!this.isActive) return;
        
        this.currentPhase = 'break';
        this.isRunning = true;
        
        // Determine break duration (long break based on configurable interval)
        // Only give long break after completing the specified number of sessions (not at start)
        const isLongBreak = this.settings.longBreak && this.cycleCount > 0 && (this.cycleCount % this.settings.longBreakInterval === 0);
        const breakDuration = isLongBreak ? this.settings.longBreakDuration : this.settings.breakDuration;
        
        this.remainingTime = breakDuration * 60 * 1000;
        this.startTime = Date.now();
        
        this.timer = setTimeout(() => {
            this.endBreakPeriod();
        }, this.remainingTime);
        
        // Start status updates
        this.startStatusUpdates();
        
        // Save session state
        this.saveSessionProgress();
        
        // Update UI
        this.updateUI();
        
        const breakType = isLongBreak ? 'long break' : 'break';
        console.log(`🍅 Starting ${breakDuration} minute ${breakType} (after ${this.cycleCount} sessions)`);
        
        // Play appropriate announce sound
        const announceSound = isLongBreak ? this.settings.longBreakSound : this.settings.shortBreakSound;
        if (this.activityTracker && this.activityTracker.soundManager) {
            const isMuted = this.activityTracker.isPomodoroSoundMuted();
            this.activityTracker.soundManager.playSound(announceSound, isMuted);
        }
        
        // Show break notification
        this.showBreakStartNotification(breakType, breakDuration);
    }
    
    endBreakPeriod() {
        if (!this.isActive) return;
        
        this.isRunning = false;
        
        // Log break activity (only if logBreaks is enabled)
        if (this.settings.logBreaks) {
            const isLongBreak = this.settings.longBreak && this.cycleCount > 0 && (this.cycleCount % this.settings.longBreakInterval === 0);
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
        
        // Play resume work announce sound
        if (this.activityTracker && this.activityTracker.soundManager) {
            const isMuted = this.activityTracker.isPomodoroSoundMuted();
            this.activityTracker.soundManager.playSound(this.settings.resumeSound, isMuted);
        }
        
        // Show back-to-work notification
        this.showBackToWorkNotification();
        
        // Update UI
        this.updateUI();
        
        // Start next work period (or wait for manual start if auto-start is disabled)
        if (this.settings.autoStart) {
            setTimeout(() => {
                this.startWorkPeriod();
            }, 1000);
        } else {
            // User must manually start next session
            showNotification('🍅 Break finished! Click the Pomodoro button to continue.', 'info', 10000);
        }
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
        const longBreakDuration = document.getElementById('pomodoroLongBreakDuration');
        const longBreakInterval = document.getElementById('pomodoroLongBreakInterval');
        const tickSound = document.getElementById('pomodoroTickSound');
        const tickInterval = document.getElementById('pomodoroTickInterval');
        const shortBreakSound = document.getElementById('pomodoroShortBreakSound');
        const longBreakSound = document.getElementById('pomodoroLongBreakSound');
        const resumeSound = document.getElementById('pomodoroResumeSound');
        const autoStart = document.getElementById('pomodoroAutoStart');
        const autoLog = document.getElementById('pomodoroAutoLog');
        const logBreaks = document.getElementById('pomodoroLogBreaks');
        const longBreak = document.getElementById('pomodoroLongBreak');
        
        if (workDuration) this.settings.workDuration = parseInt(workDuration.value);
        if (breakDuration) this.settings.breakDuration = parseInt(breakDuration.value);
        if (longBreakDuration) this.settings.longBreakDuration = parseInt(longBreakDuration.value);
        if (longBreakInterval) this.settings.longBreakInterval = parseInt(longBreakInterval.value);
        if (tickSound) this.settings.tickSound = tickSound.value;
        if (tickInterval) this.settings.tickInterval = parseInt(tickInterval.value);
        if (shortBreakSound) this.settings.shortBreakSound = shortBreakSound.value;
        if (longBreakSound) this.settings.longBreakSound = longBreakSound.value;
        if (resumeSound) this.settings.resumeSound = resumeSound.value;
        if (autoStart) this.settings.autoStart = autoStart.checked;
        if (autoLog) this.settings.autoLog = autoLog.checked;
        if (logBreaks) this.settings.logBreaks = logBreaks.checked;
        if (longBreak) this.settings.longBreak = longBreak.checked;
        
        // Save to activity tracker settings
        this.activityTracker.settings.pomodoroWorkDuration = this.settings.workDuration;
        this.activityTracker.settings.pomodoroBreakDuration = this.settings.breakDuration;
        this.activityTracker.settings.pomodoroLongBreakDuration = this.settings.longBreakDuration;
        this.activityTracker.settings.pomodoroLongBreakInterval = this.settings.longBreakInterval;
        this.activityTracker.settings.pomodoroTickSound = this.settings.tickSound;
        this.activityTracker.settings.pomodoroTickInterval = this.settings.tickInterval;
        this.activityTracker.settings.pomodoroShortBreakSound = this.settings.shortBreakSound;
        this.activityTracker.settings.pomodoroLongBreakSound = this.settings.longBreakSound;
        this.activityTracker.settings.pomodoroResumeSound = this.settings.resumeSound;
        this.activityTracker.settings.pomodoroAutoStart = this.settings.autoStart;
        this.activityTracker.settings.pomodoroAutoLog = this.settings.autoLog;
        this.activityTracker.settings.pomodoroLogBreaks = this.settings.logBreaks;
        this.activityTracker.settings.pomodoroLongBreak = this.settings.longBreak;
        
        console.log('🍅 Pomodoro settings saved');
    }
    
    getCurrentStatus() {
        if (!this.isActive) return 'Disabled';
        if (!this.isRunning) return 'Paused';
        
        const timeLeft = Math.ceil((this.remainingTime - (Date.now() - this.startTime)) / 60000);
        const phase = this.currentPhase === 'work' ? 'Working' : 'Break';
        const sessionInfo = this.currentPhase === 'work' ? ` (Session ${this.cycleCount + 1})` : '';
        return `${phase}${sessionInfo} - ${Math.max(0, timeLeft)}m left`;
    }
    
    // === NEW COMPREHENSIVE FEATURES ===
    
    /**
     * Start tick sounds during work periods
     */
    startTickSounds() {
        console.log(`🍅 StartTickSounds called - Active: ${this.isActive}, Phase: ${this.currentPhase}, TickSound: ${this.settings.tickSound}, Interval: ${this.settings.tickInterval}`);
        
        if (!this.isActive || this.currentPhase !== 'work' || this.settings.tickSound === 'none' || this.settings.tickInterval === 0) {
            console.log('🍅 Tick sounds not started - conditions not met');
            return;
        }
        
        console.log(`🍅 Starting tick sounds with ${this.settings.tickInterval}s interval`);
        
        const playTick = () => {
            if (!this.isActive || !this.isRunning || this.currentPhase !== 'work') {
                console.log('🍅 Tick cancelled - session ended or not in work phase');
                return;
            }
            
            this.playTickSound();
            
            // Schedule next tick
            this.tickTimer = setTimeout(playTick, this.settings.tickInterval * 1000);
        };
        
        // Start first tick after initial delay
        this.tickTimer = setTimeout(playTick, this.settings.tickInterval * 1000);
    }
    
    /**
     * Stop tick sounds
     */
    stopTickSounds() {
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
    }
    
    /**
     * Play appropriate tick sound
     */
    playTickSound() {
        if (!this.activityTracker || !this.activityTracker.soundManager) {
            console.warn('🍅 Tick sound: No sound manager available');
            return;
        }
        
        if (this.settings.tickSound === 'none') {
            return; // No sound
        }
        
        // Check if sounds are muted
        const isMuted = this.activityTracker.isPomodoroSoundMuted();
        if (isMuted) {
            return; // Pomodoro sounds are muted
        }
        
        let soundType = 'soft-tick'; // Default fallback
        switch (this.settings.tickSound) {
            case 'soft':
                soundType = 'soft-tick';
                break;
            case 'classic':
                soundType = 'classic-tick';
                break;
            case 'digital':
                soundType = 'digital-tick';
                break;
        }
        
        console.log(`🍅 Playing tick sound: ${soundType} (interval: ${this.settings.tickInterval}s)`);
        this.activityTracker.soundManager.playSound(soundType, false);
    }
    
    /**
     * Abandon current session and restart at same session number
     */
    abandonCurrentSession() {
        if (!this.isActive || !this.isRunning) {
            return;
        }
        
        const currentSession = this.currentPhase === 'work' ? this.cycleCount + 1 : this.cycleCount;
        
        // Stop current timers
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.stopTickSounds();
        
        // Log abandonment
        if (this.settings.autoLog) {
            this.logActivity(
                `Pomodoro session ${currentSession} abandoned`,
                `Session interrupted, restarting at session ${currentSession}`
            );
        }
        
        // Reset to beginning of current session
        if (this.currentPhase === 'work') {
            // If we were in work phase, restart this work session
            // Don't increment cycleCount
        } else {
            // If we were in break phase, go back to the work session
            this.cycleCount = Math.max(0, this.cycleCount - 1);
        }
        
        this.isRunning = false;
        this.currentPhase = 'work';
        
        // Save progress
        this.saveSessionProgress();
        
        // Show notification
        showNotification(`🍅 Session abandoned. Restarting at session ${currentSession}`, 'warning');
        
        // Update UI
        this.updateUI();
        
        // Restart work period after short delay
        setTimeout(() => {
            this.startWorkPeriod();
        }, 2000);
        
        console.log(`🍅 Session ${currentSession} abandoned, restarting`);
    }
    
    /**
     * Save session progress and state to localStorage
     */
    saveSessionProgress() {
        if (this.activityTracker && this.activityTracker.settings) {
            this.activityTracker.settings.pomodoroCycleCount = this.cycleCount;
            this.activityTracker.settings.pomodoroTotalSessions = this.totalSessions;
            
            // Save current session state
            this.activityTracker.settings.pomodoroIsActive = this.isActive;
            this.activityTracker.settings.pomodoroIsRunning = this.isRunning;
            this.activityTracker.settings.pomodoroCurrentPhase = this.currentPhase;
            this.activityTracker.settings.pomodoroStartTime = this.startTime;
            this.activityTracker.settings.pomodoroRemainingTime = this.remainingTime;
            
            // Save directly to localStorage to avoid circular dependency
            localStorage.setItem('activityTrackerSettings', JSON.stringify(this.activityTracker.settings));
        }
    }
    
    /**
     * Update status display in UI
     */
    updateStatusDisplay() {
        const statusDisplay = document.getElementById('pomodoroStatus');
        if (!statusDisplay) return;
        
        if (!this.isActive) {
            statusDisplay.textContent = 'Pomodoro mode disabled';
            statusDisplay.className = 'pomodoro-status disabled';
            return;
        }
        
        if (!this.isRunning) {
            const nextSession = this.cycleCount + 1;
            const nextBreakType = this.settings.longBreak && (nextSession % this.settings.longBreakInterval === 0) ? 'long break' : 'break';
            statusDisplay.textContent = `Ready to start session ${nextSession} (${this.settings.workDuration}min work, then ${nextBreakType})`;
            statusDisplay.className = 'pomodoro-status ready';
            return;
        }
        
        const timeLeft = Math.ceil((this.remainingTime - (Date.now() - this.startTime)) / 60000);
        const timeLeftSafe = Math.max(0, timeLeft);
        
        if (this.currentPhase === 'work') {
            const currentSession = this.cycleCount + 1;
            let nextBreakInfo = '';
            
            if (this.settings.longBreak) {
                const sessionsRemaining = this.settings.longBreakInterval - (currentSession % this.settings.longBreakInterval);
                if (sessionsRemaining === this.settings.longBreakInterval) {
                    // We're at a multiple of the interval (e.g., session 4, 8, 12...)
                    nextBreakInfo = 'Long break next!';
                } else {
                    nextBreakInfo = `${sessionsRemaining} more session${sessionsRemaining === 1 ? '' : 's'} until long break`;
                }
            } else {
                nextBreakInfo = 'Short breaks only';
            }
            
            statusDisplay.textContent = `Work Session ${currentSession} - ${timeLeftSafe}m left | ${nextBreakInfo}`;
            statusDisplay.className = 'pomodoro-status working';
        } else {
            const isLongBreak = this.settings.longBreak && this.cycleCount > 0 && (this.cycleCount % this.settings.longBreakInterval === 0);
            const breakType = isLongBreak ? 'Long Break' : 'Short Break';
            statusDisplay.textContent = `${breakType} - ${timeLeftSafe}m left | ${this.cycleCount} sessions completed`;
            statusDisplay.className = 'pomodoro-status breaking';
        }
    }
    
    /**
     * Update the main Pomodoro button in navigation
     */
    updatePomodoroButton() {
        const pomodoroBtn = document.getElementById('pomodoroButton');
        if (!pomodoroBtn) return;
        
        if (!this.settings.enabled) {
            pomodoroBtn.style.display = 'none';
            return;
        }
        
        pomodoroBtn.style.display = 'inline-block';
        
        if (!this.isActive) {
            pomodoroBtn.textContent = '🍅 Start Pomodoro';
            pomodoroBtn.className = 'nav-btn pomodoro-btn';
            pomodoroBtn.title = 'Start a new Pomodoro session';
        } else if (this.isRunning) {
            if (this.currentPhase === 'work') {
                const currentSession = this.cycleCount + 1;
                pomodoroBtn.textContent = `🍅 Abandon Session ${currentSession}`;
                pomodoroBtn.className = 'nav-btn pomodoro-btn active';
                pomodoroBtn.title = 'Abandon current work session and restart';
            } else {
                pomodoroBtn.textContent = '🍅 On Break';
                pomodoroBtn.className = 'nav-btn pomodoro-btn breaking';
                pomodoroBtn.title = 'Currently on break - click to abandon and restart';
            }
        } else {
            const nextSession = this.cycleCount + 1;
            pomodoroBtn.textContent = `🍅 Start Session ${nextSession}`;
            pomodoroBtn.className = 'nav-btn pomodoro-btn';
            pomodoroBtn.title = `Start work session ${nextSession}`;
        }
    }
    
    /**
     * Toggle Pomodoro (called from nav button)
     */
    togglePomodoroFromButton() {
        if (!this.isActive) {
            // Start Pomodoro mode
            this.togglePomodoroMode(true);
        } else if (this.isRunning) {
            // Abandon current session
            this.abandonCurrentSession();
        } else {
            // Start next session
            this.startWorkPeriod();
        }
    }
    
    /**
     * Start periodic status updates
     */
    startStatusUpdates() {
        this.stopStatusUpdates(); // Clear any existing interval
        
        this.statusUpdateInterval = setInterval(() => {
            if (this.isActive && this.isRunning) {
                this.updateStatusDisplay();
                this.updatePomodoroButton();
            }
        }, 1000); // Update every second
    }
    
    /**
     * Stop periodic status updates
     */
    stopStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }
    
    /**
     * Restore active session after page refresh
     */
    restoreActiveSession(savedPhase, savedStartTime, savedRemainingTime) {
        const now = Date.now();
        const elapsedTime = now - savedStartTime;
        const timeLeft = savedRemainingTime - elapsedTime;
        
        console.log(`🍅 Restoring Pomodoro session: ${savedPhase}, ${Math.ceil(timeLeft/1000)}s remaining`);
        
        // If session expired while page was closed, handle appropriately
        if (timeLeft <= 0) {
            if (savedPhase === 'work') {
                // Work period expired, should have moved to break
                console.log('🍅 Work period expired during refresh, starting break');
                this.isActive = true;
                this.isRunning = false;
                this.currentPhase = 'work';
                // Let user manually start break or next session
                showNotification('🍅 Work session completed while page was closed. Ready for break!', 'info');
            } else {
                // Break period expired, should have moved to work
                console.log('🍅 Break period expired during refresh, ready for work');
                this.isActive = true;
                this.isRunning = false;
                this.currentPhase = 'break';
                // Let user manually start next work session
                showNotification('🍅 Break completed while page was closed. Ready for next work session!', 'info');
            }
        } else {
            // Session is still active, restore it
            this.isActive = true;
            this.isRunning = true;
            this.currentPhase = savedPhase;
            this.startTime = now; // Reset start time to now
            this.remainingTime = timeLeft;
            
            // Restart the timer with remaining time
            this.timer = setTimeout(() => {
                if (this.currentPhase === 'work') {
                    this.endWorkPeriod();
                } else {
                    this.endBreakPeriod();
                }
            }, timeLeft);
            
            // Restart tick sounds and status updates if needed
            if (this.currentPhase === 'work') {
                this.startTickSounds();
            }
            this.startStatusUpdates();
            
            const minutes = Math.ceil(timeLeft / 60000);
            showNotification(`🍅 Pomodoro session restored! ${minutes} minutes remaining in ${savedPhase} period.`, 'success');
        }
        
        this.updateUI();
    }
    
    /**
     * Reset Pomodoro session counter (for complete restart)
     */
    resetSessionCounter() {
        this.cycleCount = 0;
        this.totalSessions = 0;
        this.saveSessionProgress();
        this.updateUI();
        
        if (this.settings.autoLog) {
            this.logActivity('Pomodoro session counter reset', 'Starting fresh Pomodoro cycle');
        }
        
        showNotification('🍅 Pomodoro session counter reset', 'info');
    }
    
    /**
     * Show work activity modal to prompt for session description
     */
    showWorkActivityModal() {
        if (typeof showPomodoroActivityModal === 'function') {
            showPomodoroActivityModal();
            
            // Set up form handler if not already done
            const form = document.getElementById('pomodoroActivityForm');
            if (form && !form.pomodoroHandlerAdded) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleWorkActivitySubmit();
                });
                form.pomodoroHandlerAdded = true;
            }
        }
    }
    
    /**
     * Handle work activity form submission
     */
    handleWorkActivitySubmit() {
        const activityName = document.getElementById('pomodoroActivityName');
        const activityDescription = document.getElementById('pomodoroActivityDescription');
        
        if (activityName && activityName.value.trim()) {
            // Store the activity for logging when session completes
            this.currentWorkActivity = {
                name: activityName.value.trim(),
                description: activityDescription ? activityDescription.value.trim() : ''
            };
            
            // Close modal
            if (typeof closePomodoroActivityModal === 'function') {
                closePomodoroActivityModal();
            }
            
            // Start the work period
            this.pendingWorkSession = false;
            this.actuallyStartWorkPeriod();
            
            console.log('🍅 Work session started with activity:', this.currentWorkActivity.name);
        }
    }
    
    destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.stopTickSounds();
        this.stopStatusUpdates();
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