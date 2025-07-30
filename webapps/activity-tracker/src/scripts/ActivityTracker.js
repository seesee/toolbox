/**
 * Main ActivityTracker class
 * Handles all functionality for tracking activities, notifications, and reports
 */
class ActivityTracker {
    constructor() {
        // Initialize entries array from localStorage
        let entries = [];
        try {
            const storedEntries = JSON.parse(localStorage.getItem('activityEntries'));
            if (Array.isArray(storedEntries)) {
                entries = storedEntries.filter(entry => 
                    entry && typeof entry === 'object' && entry.timestamp
                );
            }
        } catch (e) {
            console.error("Error parsing activity entries from localStorage", e);
            localStorage.removeItem('activityEntries');
        }
        this.entries = entries;

        // Initialize settings with defaults
        this.settings = {
            notificationInterval: 60,
            startTime: '08:00',
            endTime: '18:00',
            workingDays: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false
            },
            pauseDuration: 60,
            notificationsPausedUntil: null,
            muteNotificationSound: false,
            ...JSON.parse(localStorage.getItem('activitySettings') || '{}')
        };

        // Initialize state variables
        this.notificationTimer = null;
        this.currentReportEntries = [];
        this.currentWeekStart = null;
        this.audioContext = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadSettings();
        this.displayEntries();
        this.updateNotificationStatus();
        this.updateDebugInfo();
        this.updatePauseButtonState();
        this.startNotificationTimer();
        this.setDefaultReportDates();
        this.initAudioContext();
        
        // Event listeners
        this.attachEventListeners();
        
        // Set current time by default
        this.setCurrentTime();
        document.getElementById('activity').focus();

        // Check for local file protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from local file - notifications may have limitations');
        }
    }

    /**
     * Attach event listeners to forms
     */
    attachEventListeners() {
        document.getElementById('activityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEntry();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateEntry();
        });
    }

    /**
     * Initialize Web Audio API for notification sounds
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
     * Play notification sound
     */
    playNotificationSound() {
        if (!this.audioContext || this.settings.muteNotificationSound) {
            return;
        }

        try {
            // Resume audio context if it's suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create a pleasant "bloop" sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure the sound - a pleasant rising tone
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            // Configure volume envelope for a smooth "bloop"
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            // Play the sound
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
            console.log('Notification sound played');
        } catch (error) {
            console.warn('Error playing notification sound:', error);
        }
    }

    /**
     * Test notification sound
     */
    testNotificationSound() {
        this.playNotificationSound();
        showNotification('Test sound played!', 'success');
    }

    /**
     * Add a new activity entry
     * @param {Object} entry - Optional pre-formed entry object
     */
    addEntry(entry) {
        let newEntry = entry;
        if (!newEntry) {
            const activity = document.getElementById('activity').value;
            const description = document.getElementById('description').value;
            const timestamp = document.getElementById('timestamp').value;

            newEntry = {
                id: generateId(),
                activity,
                description,
                timestamp: new Date(timestamp).toISOString(),
                created: new Date().toISOString()
            };
        }

        this.entries.unshift(newEntry);
        this.saveEntries();
        this.displayEntries();

        if (!entry) {
            document.getElementById('activityForm').reset();
            this.setCurrentTime();
        }
        
        showNotification('Entry added successfully!', 'success');
    }

    /**
     * Update an existing entry
     */
    updateEntry() {
        const id = document.getElementById('editId').value;
        const activity = document.getElementById('editActivity').value;
        const description = document.getElementById('editDescription').value;
        const timestamp = document.getElementById('editTimestamp').value;

        const entryIndex = this.entries.findIndex(entry => entry.id === id);
        if (entryIndex !== -1) {
            this.entries[entryIndex] = {
                ...this.entries[entryIndex],
                activity,
                description,
                timestamp: new Date(timestamp).toISOString()
            };
            
            this.saveEntries();
            this.displayEntries();
            this.closeEditModal();
            showNotification('Entry updated successfully!', 'success');
        }
    }

    /**
     * Delete an entry
     * @param {string} id - Entry ID to delete
     */
    deleteEntry(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.entries = this.entries.filter(entry => entry.id !== id);
            this.saveEntries();
            this.displayEntries();
            showNotification('Entry deleted successfully!', 'success');
        }
    }

    /**
     * Edit an entry (open modal)
     * @param {string} id - Entry ID to edit
     */
    editEntry(id) {
        const entry = this.entries.find(entry => entry.id === id);
        if (entry) {
            document.getElementById('editId').value = entry.id;
            document.getElementById('editActivity').value = entry.activity;
            document.getElementById('editDescription').value = entry.description || '';
            document.getElementById('editTimestamp').value = 
                new Date(entry.timestamp).toISOString().slice(0, 16);
            
            document.getElementById('editModal').classList.add('active');
        }
    }

    /**
     * Close the edit modal
     */
    closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
    }

    /**
     * Display entries in the UI
     */
    displayEntries() {
        const container = document.getElementById('entriesList');
        const recentEntries = this.entries.slice(0, 20); // Show last 20 entries

        if (recentEntries.length === 0) {
            container.innerHTML = '<p>No entries yet. Add your first activity above!</p>';
            return;
        }

        container.innerHTML = recentEntries.map(entry => `
            <div class="entry-item">
                <div class="entry-content">
                    <div class="entry-time">${formatDateTime(entry.timestamp)}</div>
                    <div class="entry-activity">${escapeHtml(entry.activity)}</div>
                    ${entry.description ? `<div class="entry-description">${escapeHtml(entry.description)}</div>` : ''}
                </div>
                <div class="entry-actions">
                    <button class="btn btn-secondary" onclick="tracker.editEntry('${entry.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="tracker.deleteEntry('${entry.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Save entries to localStorage
     */
    saveEntries() {
        localStorage.setItem('activityEntries', JSON.stringify(this.entries));
    }

    /**
     * Save settings
     */
    saveSettings() {
        this.settings = {
            ...this.settings,
            notificationInterval: parseInt(document.getElementById('notificationInterval').value),
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            pauseDuration: parseInt(document.getElementById('pauseDuration').value),
            muteNotificationSound: document.getElementById('muteNotificationSound').checked,
            workingDays: {
                monday: document.getElementById('monday').checked,
                tuesday: document.getElementById('tuesday').checked,
                wednesday: document.getElementById('wednesday').checked,
                thursday: document.getElementById('thursday').checked,
                friday: document.getElementById('friday').checked,
                saturday: document.getElementById('saturday').checked,
                sunday: document.getElementById('sunday').checked
            }
        };

        localStorage.setItem('activitySettings', JSON.stringify(this.settings));
        this.startNotificationTimer();
        showNotification('Settings saved successfully!', 'success');
    }

    /**
     * Load settings into the UI
     */
    loadSettings() {
        document.getElementById('notificationInterval').value = this.settings.notificationInterval;
        document.getElementById('startTime').value = this.settings.startTime;
        document.getElementById('endTime').value = this.settings.endTime;
        document.getElementById('pauseDuration').value = this.settings.pauseDuration;
        document.getElementById('muteNotificationSound').checked = this.settings.muteNotificationSound;
        
        Object.entries(this.settings.workingDays).forEach(([day, checked]) => {
            document.getElementById(day).checked = checked;
        });
    }

    /**
     * Enable notifications
     */
    async enableNotifications() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            alert('This browser does not support notifications or service workers.');
            this.updateDebugInfo();
            return;
        }

        try {
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            
            setTimeout(() => {
                this.updateNotificationStatus();
                this.updateDebugInfo();
            }, 500);
            
            if (permission === 'granted') {
                showNotification('Notifications enabled successfully!', 'success');
                this.startNotificationTimer();
                
                setTimeout(() => {
                    this.testNotification(true);
                }, 1000);
            } else if (permission === 'denied') {
                showNotification('Notifications were denied. Please check your browser settings and try again.', 'error');
            } else {
                showNotification('Notification permission was not granted. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showNotification('Error requesting notification permission: ' + error.message, 'error');
            this.updateDebugInfo();
        }
    }

    /**
     * Show notification using service worker
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     */
    async showNotificationWithServiceWorker(title, options) {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
    }

    /**
     * Test notification
     * @param {boolean} isAutoTest - Whether this is an automatic test
     */
    testNotification(isAutoTest = false) {
        console.log('Testing notification, permission:', Notification.permission);
        this.updateDebugInfo();
        
        // Play sound regardless of notification permission
        this.playNotificationSound();
        
        if (Notification.permission !== 'granted') {
            if (!isAutoTest) {
                showNotification('Please enable notifications first! Current permission: ' + Notification.permission, 'error');
            }
            return;
        }

        try {
            const options = {
                body: 'This is a test notification. If you can see this, notifications are working correctly!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                tag: 'test-notification',
                requireInteraction: false,
                actions: [
                    { action: 'reply', type: 'text', title: 'Log Activity', placeholder: 'e.g. coding' }
                ]
            };
            this.showNotificationWithServiceWorker('Activity Tracker Test', options);

            if (!isAutoTest) {
                showNotification('Test notification sent successfully!', 'success');
            }
            console.log('Test notification created successfully');
        } catch (error) {
            console.error('Error creating test notification:', error);
            showNotification('Error creating test notification: ' + error.message, 'error');
            this.updateDebugInfo();
        }
    }

    /**
     * Refresh notification status
     */
    refreshNotificationStatus() {
        this.updateNotificationStatus();
        this.updateDebugInfo();
        showNotification('Notification status refreshed', 'success');
    }

    /**
     * Update notification status display
     */
    updateNotificationStatus() {
        const statusEl = document.getElementById('notificationStatus');
        const indicatorEl = document.getElementById('statusIndicator');
        const textEl = document.getElementById('statusText');

        console.log('Updating notification status, permission:', Notification.permission);

        if (!('Notification' in window)) {
            statusEl.className = 'notification-status notification-disabled';
            indicatorEl.className = 'status-indicator status-inactive';
            textEl.textContent = 'Notifications not supported in this browser';
        } else {
            switch (Notification.permission) {
                case 'granted':
                    statusEl.className = 'notification-status notification-enabled';
                    indicatorEl.className = 'status-indicator status-active';
                    textEl.textContent = 'Notifications are enabled and working';
                    break;
                case 'denied':
                    statusEl.className = 'notification-status notification-disabled';
                    indicatorEl.className = 'status-indicator status-inactive';
                    textEl.textContent = 'Notifications are blocked - please enable them in browser settings';
                    break;
                case 'default':
                default:
                    statusEl.className = 'notification-status notification-warning';
                    indicatorEl.className = 'status-indicator status-inactive';
                    textEl.textContent = 'Notifications are disabled - click "Enable Notifications" to activate';
                    break;
            }
        }

        if (window.location.protocol === 'file:') {
            statusEl.className = 'notification-status notification-warning';
            textEl.textContent += ' (Note: Running from local file may limit notification functionality)';
        }
    }

    /**
     * Update debug information display
     */
    updateDebugInfo() {
        const debugEl = document.getElementById('debugText');
        const info = [];
        
        info.push(`Browser: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
        info.push(`Protocol: ${window.location.protocol}`);
        info.push(`Notification API: ${'Notification' in window ? 'Available' : 'Not Available'}`);
        
        if ('Notification' in window) {
            info.push(`Permission: ${Notification.permission}`);
            info.push(`Max Actions: ${Notification.maxActions || 'Unknown'}`);
        }
        
        info.push(`Service Worker: ${'serviceWorker' in navigator ? 'Available' : 'Not Available'}`);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            info.push(`SW State: ${navigator.serviceWorker.controller.state}`);
        }
        info.push(`Web Audio API: ${this.audioContext ? 'Available' : 'Not Available'}`);
        info.push(`Sound Muted: ${this.settings.muteNotificationSound ? 'Yes' : 'No'}`);
        info.push(`Last Updated: ${new Date().toLocaleTimeString('en-GB')}`);
        
        debugEl.innerHTML = info.join('<br>');
    }

    /**
     * Start notification timer
     */
    startNotificationTimer() {
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
        }

        this.notificationTimer = setInterval(() => {
            this.checkForNotification();
        }, 60000); // Check every minute
    }

    /**
     * Check if a notification should be sent
     */
    checkForNotification() {
        // Check if notifications are paused
        if (this.settings.notificationsPausedUntil) {
            const now = new Date().getTime();
            if (now < this.settings.notificationsPausedUntil) {
                console.log('Notifications are paused.');
                return;
            } else {
                this.unpauseNotifications(false);
            }
        }
        
        if (Notification.permission !== 'granted') {
            console.log('Skipping notification check - permission not granted');
            return;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

        // Check if it's a working day
        if (!this.settings.workingDays[dayName]) {
            console.log('Skipping notification - not a working day');
            return;
        }

        // Check if it's within working hours
        const [startHour, startMin] = this.settings.startTime.split(':').map(Number);
        const [endHour, endMin] = this.settings.endTime.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime < startTime || currentTime > endTime) {
            console.log('Skipping notification - outside working hours');
            return;
        }

        // Check if enough time has passed since last notification
        const lastNotification = localStorage.getItem('lastNotificationTime');
        const timeSinceLastNotification = now.getTime() - (lastNotification || 0);
        const intervalMs = this.settings.notificationInterval * 60 * 1000;

        if (intervalMs > 0 && timeSinceLastNotification >= intervalMs) {
            console.log('Sending scheduled notification');
            this.showActivityReminder();
            localStorage.setItem('lastNotificationTime', now.getTime().toString());
        }
    }

    /**
     * Show activity reminder notification
     */
    showActivityReminder() {
        // Play sound for activity reminder
        this.playNotificationSound();
        
        try {
            const options = {
                body: 'What are you working on right now?',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                tag: 'activity-reminder',
                requireInteraction: true,
                actions: [
                    { action: 'reply', type: 'text', title: 'Log Activity', placeholder: 'e.g. coding' }
                ]
            };
            this.showNotificationWithServiceWorker('Activity Tracker Reminder', options);
        } catch (error) {
            console.error('Error showing activity reminder:', error);
        }
    }

    /**
     * Set current time in the timestamp input
     */
    setCurrentTime() {
        const timestamp = document.getElementById('timestamp');
        if (timestamp) {
            timestamp.value = getCurrentTimeForInput();
        }
    }

    /**
     * Toggle pause/resume notifications
     * @param {boolean} showNotification - Whether to show notification
     */
    togglePause(showNotification = true) {
        if (this.settings.notificationsPausedUntil) {
            this.unpauseNotifications(showNotification);
        } else {
            const duration = this.settings.pauseDuration;
            if (duration === -1) {
                this.settings.notificationsPausedUntil = Infinity;
            } else {
                this.settings.notificationsPausedUntil = new Date().getTime() + duration * 60 * 1000;
            }
            
            if (showNotification) {
                showNotification('Notifications paused', 'info');
            }
            this.updatePauseButtonState();
            this.saveSettings();
        }
    }

    /**
     * Unpause notifications
     * @param {boolean} showNotification - Whether to show notification
     */
    unpauseNotifications(showNotification = true) {
        this.settings.notificationsPausedUntil = null;
        if (showNotification) {
            showNotification('Notifications resumed', 'success');
        }
        this.updatePauseButtonState();
        this.saveSettings();
    }

    /**
     * Update pause button state
     */
    updatePauseButtonState() {
        const pauseButton = document.getElementById('pauseButton');
        if (this.settings.notificationsPausedUntil) {
            pauseButton.textContent = 'Resume Alerts';
            pauseButton.style.background = '#e53e3e';
        } else {
            pauseButton.textContent = 'Pause Alerts';
            pauseButton.style.background = '';
        }
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem('activityEntries');
            localStorage.removeItem('activitySettings');
            localStorage.removeItem('lastNotificationTime');
            this.entries = [];
            this.currentReportEntries = [];
            this.displayEntries();
            document.getElementById('reportResults').innerHTML = '';
            showNotification('All data cleared successfully!', 'success');
        }
    }

    /**
     * Set default report dates (current week)
     */
    setDefaultReportDates() {
        this.setWeeklyReport();
    }
}
