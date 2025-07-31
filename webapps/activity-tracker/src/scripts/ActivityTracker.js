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
            notificationsEnabled: true,
            muteNotificationSound: false,
            notificationSoundType: "classic",
            darkMode: false,
            ...JSON.parse(localStorage.getItem('activitySettings') || '{}')
        };

        // Initialize state variables
        this.notificationTimer = null;
        this.currentReportEntries = [];
        this.currentWeekStart = null;
        this.soundManager = null;
        this.pauseManager = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadSettings();
        this.initMarkdownRenderer();
        this.initReportTemplates();
        this.loadReportTemplatesIntoEditor();
        this.initTemplatePreviewGrid();
        this.displayEntries();
        this.updateNotificationStatus();
        this.updateDebugInfo();
        this.updatePauseButtonState();
        this.startNotificationTimer();
        this.setWeeklyReport();
        this.initSoundManager();
        this.initPauseManager();
        this.initPomodoroManager();
        
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
     * Get current report templates, from localStorage or defaults.
     */
    getReportTemplates() {
        const storedTemplates = localStorage.getItem('reportTemplates');
        if (storedTemplates) {
            try {
                return JSON.parse(storedTemplates);
            } catch (e) {
                console.error("Error parsing custom report templates from localStorage", e);
                // Fallback to default if parsing fails
                return window.ReportTemplates || {};
            }
        }
        return window.ReportTemplates || {};
    }

    /**
     * Load the report templates into the editor in the settings page.
     */
    loadReportTemplatesIntoEditor() {
        const editorContainer = document.getElementById('report-templates-editor');
        if (!editorContainer) return;

        const templates = this.getReportTemplates();
        editorContainer.innerHTML = Object.keys(templates).map(key => `
            <div class="template-group">
                <label for="template-${key}">${templates[key].name}</label>
                <textarea id="template-${key}" data-key="${key}">${escapeHtml(templates[key].template)}</textarea>
            </div>
        `).join('');
    }

    /**
     * Save the report templates from the editor to localStorage.
     */
    saveReportTemplates() {
        const editorContainer = document.getElementById('report-templates-editor');
        if (!editorContainer) return;

        const customTemplates = this.getReportTemplates();
        const textareas = editorContainer.querySelectorAll('textarea');

        textareas.forEach(textarea => {
            const key = textarea.dataset.key;
            if (customTemplates[key]) {
                customTemplates[key].template = textarea.value;
            }
        });

        localStorage.setItem('reportTemplates', JSON.stringify(customTemplates));
        showNotification('Report templates saved successfully!', 'success');
        
        // Refresh report section to reflect changes
        this.initReportTemplates();
        if (this.currentReportData) {
            this.previewReport();
        }
    }

    /**
     * Reset report templates to their default values.
     */
    resetReportTemplates() {
        if (confirm('Are you sure you want to reset all report templates to their default values?')) {
            localStorage.removeItem('reportTemplates');
            this.loadReportTemplatesIntoEditor();
            this.initReportTemplates();
            if (this.currentReportData) {
                this.previewReport();
            }
            showNotification('Report templates have been reset to default.', 'success');
        }
    }

    /**
     * Initialize markdown renderer
     */
    initMarkdownRenderer() {
        try {
            this.markdownRenderer = new MarkdownRenderer();
        } catch (error) {
            console.warn('Markdown Renderer initialization failed:', error);
        }
    }

    /**
     * Initialize pause manager
     */
    initPauseManager() {
        try {
            this.pauseManager = new PauseManager(this);
        } catch (error) {
            console.warn('Pause Manager initialization failed:', error);
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

        // Auto-save settings when changed
        this.attachSettingsListeners();
    }

    /**
     * Attach event listeners to settings inputs for auto-save
     */
    attachSettingsListeners() {
        const settingsInputs = [
            'notificationInterval',
            'startTime', 
            'endTime',
            'pauseDuration',
            'muteNotificationSound',
            'notificationSoundType',
            'darkMode',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
        ];

        settingsInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                let eventType;
                if (element.type === 'checkbox' || element.tagName.toLowerCase() === 'select') {
                    eventType = 'change';
                } else {
                    eventType = 'input';
                }
                element.addEventListener(eventType, () => {
                    this.autoSaveSettings();
                });
            }
        });
    }

    /**
     * Auto-save settings when inputs change
     */
    autoSaveSettings() {
        // Update settings from UI
        this.settings.notificationInterval = parseInt(document.getElementById('notificationInterval').value);
        this.settings.startTime = document.getElementById('startTime').value;
        this.settings.endTime = document.getElementById('endTime').value;
        this.settings.pauseDuration = parseInt(document.getElementById('pauseDuration').value);
        this.settings.muteNotificationSound = document.getElementById('muteNotificationSound').checked;
        this.settings.notificationSoundType = document.getElementById('notificationSoundType').value;
        this.settings.darkMode = document.getElementById('darkMode').checked;

        // Update working days
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
            this.settings.workingDays[day] = document.getElementById(day).checked;
        });

        // Apply theme immediately
        this.applyTheme();

        // Save to localStorage
        this.saveSettings();

        // Restart notification timer if interval changed
        if (this.settings.notificationsEnabled) {
            this.startNotificationTimer();
        }

        // Update about section to reflect changes
        this.updateDebugInfo();

        // Show brief confirmation
        showNotification('Settings saved automatically', 'success', 1500);
    }

    /**
     * Initialize Web Audio API for notification sounds
     */
    initSoundManager() {
        try {
            this.soundManager = new SoundManager();
        } catch (error) {
            console.warn('Sound Manager failed to initialise:', error);
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        if (this.soundManager) {
            this.soundManager.playSound(this.settings.notificationSoundType, this.settings.muteNotificationSound);
        }
    }

    /**
     * Test notification sound
     */
    testNotificationSound() {
        if (this.soundManager) {
            this.soundManager.playSound(this.settings.notificationSoundType, this.settings.muteNotificationSound);
        }
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
            document.getElementById('activity').focus();
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
                    ${entry.description ? `<div class="entry-description">${this.renderDescriptionMarkdown(entry.description)}</div>` : ''}
                </div>
                <div class="entry-actions">
                    <button class="btn btn-secondary" onclick="tracker.editEntry('${entry.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="tracker.deleteEntry('${entry.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render description text as markdown
     * @param {string} description - Description text
     * @returns {string} HTML string
     */
    renderDescriptionMarkdown(description) {
        // Initialize markdown renderer if not already done
        if (!this.markdownRenderer && typeof MarkdownRenderer !== 'undefined') {
            this.initMarkdownRenderer();
        }

        if (this.markdownRenderer && description) {
            return this.markdownRenderer.renderInlineWithClasses(description);
        }
        return escapeHtml(description);
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
            notificationSoundType: document.getElementById('notificationSoundType').value,
            darkMode: document.getElementById('darkMode').checked,
            workingDays: {
                monday: document.getElementById('monday').checked,
                tuesday: document.getElementById('tuesday').checked,
                wednesday: document.getElementById('wednesday').checked,
                thursday: document.getElementById('thursday').checked,
                friday: document.getElementById('friday').checked,
                saturday: document.getElementById('saturday').checked,
                sunday: document.getElementById('sunday').checked
            },
            // Pomodoro settings
            pomodoroEnabled: document.getElementById('pomodoroEnabled')?.checked || false,
            pomodoroWorkDuration: parseInt(document.getElementById('pomodoroWorkDuration')?.value) || 25,
            pomodoroBreakDuration: parseInt(document.getElementById('pomodoroBreakDuration')?.value) || 5,
            pomodoroAutoLog: document.getElementById('pomodoroAutoLog')?.checked !== false,
            pomodoroLongBreak: document.getElementById('pomodoroLongBreak')?.checked || false
        };

        localStorage.setItem('activitySettings', JSON.stringify(this.settings));
        this.applyTheme();
        this.startNotificationTimer();
        
        // Update Pomodoro manager if it exists
        if (this.pomodoroManager) {
            this.pomodoroManager.loadSettings();
        }
        
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
        document.getElementById('notificationSoundType').value = this.settings.notificationSoundType;
        document.getElementById('darkMode').checked = this.settings.darkMode;
        
        Object.entries(this.settings.workingDays).forEach(([day, checked]) => {
            document.getElementById(day).checked = checked;
        });

        this.applyTheme();
    }

    /**
     * Apply the current theme (light/dark)
     */
    applyTheme() {
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    /**
     * Toggle notifications on/off
     */
    async enableNotifications() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            alert('This browser does not support notifications or service workers.');
            this.updateDebugInfo();
            return;
        }

        // If notifications are currently enabled, disable them
        if (this.settings.notificationsEnabled && Notification.permission === 'granted') {
            this.settings.notificationsEnabled = false;
            this.saveSettings();
            this.stopNotificationTimer();
            showNotification('Notifications disabled', 'success');
            this.updateNotificationStatus();
            this.updateDebugInfo();
            return;
        }

        // If notifications are disabled, enable them
        try {
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            
            if (permission === 'granted') {
                this.settings.notificationsEnabled = true;
                this.saveSettings();
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
            
            setTimeout(() => {
                this.updateNotificationStatus();
                this.updateDebugInfo();
            }, 500);
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showNotification('Error requesting notification permission: ' + error.message, 'error');
            this.updateDebugInfo();
        }
    }

    /**
     * Show notification with fallback support
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     */
    async showNotificationWithServiceWorker(title, options) {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return;
        }

        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        try {
            // Try service worker approach first
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, options);
                console.log('✅ Notification shown via Service Worker');
                return;
            }
        } catch (error) {
            console.warn('Service Worker notification failed, falling back to direct notification:', error);
        }

        // Fallback: Use direct Notification API (limited functionality)
        try {
            // Remove service worker specific options for fallback
            const fallbackOptions = {
                body: options.body,
                icon: options.icon,
                tag: options.tag,
                requireInteraction: options.requireInteraction
                // Note: actions are not supported in direct notifications
            };

            const notification = new Notification(title, fallbackOptions);
            
            // Handle click events for fallback notifications
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            console.log('✅ Notification shown via direct API (limited features)');
            
            // Auto-close after some time if not set to require interaction
            if (!options.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }

        } catch (directError) {
            console.error('Both Service Worker and direct notification failed:', directError);
            
            // Last resort: show in-app notification
            showNotification('Activity reminder: ' + (options.body || 'Time to log your activity!'), 'info', 8000);
        }
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
                body: 'This is a test notification. Try entering an activity in the text field below!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                tag: 'test-notification',
                requireInteraction: true,
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
        const enableBtn = document.querySelector('button[onclick="enableNotifications()"]');

        console.log('Updating notification status, permission:', Notification.permission, 'enabled:', this.settings.notificationsEnabled);

        if (!('Notification' in window)) {
            statusEl.className = 'notification-status notification-disabled';
            indicatorEl.className = 'status-indicator status-inactive';
            textEl.textContent = 'Notifications not supported in this browser';
            if (enableBtn) enableBtn.textContent = 'Not Supported';
        } else {
            switch (Notification.permission) {
                case 'granted':
                    if (this.settings.notificationsEnabled) {
                        statusEl.className = 'notification-status notification-enabled';
                        indicatorEl.className = 'status-indicator status-active';
                        textEl.textContent = 'Notifications are enabled and working';
                        if (enableBtn) enableBtn.textContent = 'Disable Notifications';
                    } else {
                        statusEl.className = 'notification-status notification-warning';
                        indicatorEl.className = 'status-indicator status-inactive';
                        textEl.textContent = 'Notifications are disabled by user';
                        if (enableBtn) enableBtn.textContent = 'Enable Notifications';
                    }
                    break;
                case 'denied':
                    statusEl.className = 'notification-status notification-disabled';
                    indicatorEl.className = 'status-indicator status-inactive';
                    textEl.textContent = 'Notifications are blocked - please enable them in browser settings';
                    if (enableBtn) enableBtn.textContent = 'Enable Notifications';
                    break;
                case 'default':
                default:
                    statusEl.className = 'notification-status notification-warning';
                    indicatorEl.className = 'status-indicator status-inactive';
                    textEl.textContent = 'Notifications are disabled - click "Enable Notifications" to activate';
                    if (enableBtn) enableBtn.textContent = 'Enable Notifications';
                    break;
            }
        }

        if (window.location.protocol === 'file:') {
            statusEl.className = 'notification-status notification-warning';
            textEl.textContent += ' (Note: Running from local file may limit notification functionality)';
        }
    }

    /**
     * Update about information display
     */
    updateDebugInfo() {
        const debugEl = document.getElementById('debugText');
        const info = [];
        
        // Application version
        info.push(`Version: ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'Unknown'}`);
        info.push('');
        
        info.push(`Browser: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
        info.push(`Platform: ${navigator.platform || 'Unknown'}`);
        info.push(`Protocol: ${window.location.protocol}`);
        info.push(`Notification API: ${'Notification' in window ? 'Available' : 'Not Available'}`);
        
        if ('Notification' in window) {
            info.push(`Permission: ${Notification.permission}`);
            info.push(`Max Actions: ${Notification.maxActions || 'Unknown'}`);
        }
        
        // Enhanced Service Worker diagnostics
        if ('serviceWorker' in navigator) {
            info.push(`Service Worker: Available`);
            
            if (navigator.serviceWorker.controller) {
                info.push(`SW State: ${navigator.serviceWorker.controller.state}`);
                info.push(`SW URL: ${navigator.serviceWorker.controller.scriptURL.split('/').pop()}`);
            } else {
                info.push(`SW State: No controller`);
            }
            
            // Check registration status
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    const scopeInfo = document.getElementById('debugText');
                    if (scopeInfo && scopeInfo.innerHTML.includes('SW Scope: Checking...')) {
                        scopeInfo.innerHTML = scopeInfo.innerHTML.replace('SW Scope: Checking...', `SW Scope: ${registration.scope}`);
                    }
                }
            }).catch(error => {
                console.warn('SW registration check failed:', error);
            });
            
            info.push(`SW Scope: Checking...`);
        } else {
            info.push(`Service Worker: Not Available`);
            if (window.location.protocol === 'file:') {
                info.push(`SW Reason: file:// protocol (expected)`);
            }
        }
        
        info.push(`Audio Support: ${this.soundManager && this.soundManager.audioContext ? 'Yes' : 'No'}`);
        info.push(`Sound Muted: ${this.settings.muteNotificationSound ? 'Yes' : 'No'}`);
        info.push(`Sound Type: ${this.settings.notificationSoundType}`);
        info.push(`Last Updated: ${new Date().toLocaleTimeString('en-GB')}`);
        
        debugEl.innerHTML = info.join('<br>');
    }

    /**
     * Comprehensive service worker diagnostics
     */
    async runServiceWorkerDiagnostics() {
        const diagnostics = {
            available: 'serviceWorker' in navigator,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            registration: null,
            controller: null,
            error: null
        };

        if (!diagnostics.available) {
            diagnostics.error = 'Service Worker API not available';
            return diagnostics;
        }

        try {
            // Check current registration
            diagnostics.registration = await navigator.serviceWorker.getRegistration();
            diagnostics.controller = navigator.serviceWorker.controller;

            // Test communication if controller exists
            if (diagnostics.controller) {
                try {
                    const messageChannel = new MessageChannel();
                    const response = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('SW communication timeout')), 5000);
                        
                        messageChannel.port1.onmessage = (event) => {
                            clearTimeout(timeout);
                            resolve(event.data);
                        };
                        
                        diagnostics.controller.postMessage(
                            { type: 'GET_VERSION' }, 
                            [messageChannel.port2]
                        );
                    });
                    
                    diagnostics.communication = 'Working';
                    diagnostics.swVersion = response.version;
                } catch (commError) {
                    diagnostics.communication = `Failed: ${commError.message}`;
                }
            }

        } catch (error) {
            diagnostics.error = error.message;
        }

        return diagnostics;
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
     * Stop notification timer
     */
    stopNotificationTimer() {
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
            this.notificationTimer = null;
        }
    }

    /**
     * Check if a notification should be sent
     */
    checkForNotification() {
        // Check if notifications are disabled by user
        if (!this.settings.notificationsEnabled) {
            console.log('Skipping notification check - notifications disabled by user');
            return;
        }

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
        this.setCurrentTime();
        
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
     * Initialize Pomodoro Manager
     */
    initPomodoroManager() {
        if (typeof PomodoroManager !== 'undefined') {
            this.pomodoroManager = new PomodoroManager(this);
            console.log('🍅 Pomodoro Manager initialized');
        } else {
            console.warn('PomodoroManager class not found');
        }
    }

    /**
     * Toggle pause/resume notifications
     * @param {boolean} showNotif - Whether to show notification
     */
    togglePause(showNotif = true) {
        if (this.settings.notificationsPausedUntil) {
            if (this.pauseManager) {
                this.pauseManager.resume();
            } else {
                this.unpauseNotifications(showNotif);
            }
        } else {
            if (this.pauseManager) {
                this.pauseManager.startPause(this.settings.pauseDuration);
            } else {
                // Fallback to old method
                const duration = this.settings.pauseDuration;
                if (duration === -1) {
                    this.settings.notificationsPausedUntil = Infinity;
                } else {
                    this.settings.notificationsPausedUntil = new Date().getTime() + duration * 60 * 1000;
                }
                this.updatePauseButtonState();
                this.saveSettings();
            }
        }
            
        if (showNotif) {
            const message = this.settings.notificationsPausedUntil ? 'Notifications paused' : 'Notifications resumed';
            const type = this.settings.notificationsPausedUntil ? 'info' : 'success';
            showNotification(message, type);
        }
    }

    /**
     * Unpause notifications
     * @param {boolean} showNotification - Whether to show notification
     */
    unpauseNotifications(showNotif = true) {
        this.settings.notificationsPausedUntil = null;
        if (showNotif) {
            showNotification('Notifications resumed', 'success');
        }
        this.updatePauseButtonState();
        this.saveSettings();
    }

    /**
     * Update pause button state
     */
    updatePauseButtonState() {
        if (this.pauseManager) {
            this.pauseManager.updatePauseButtonDisplay();
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
            document.getElementById('reportPreview').innerHTML = '';
            showNotification('All data cleared successfully!', 'success');
        }
    }

    /**
     * Export database as JSON backup file
     */
    exportDatabase() {
        try {
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                entries: this.entries,
                settings: this.settings
            };

            const jsonData = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Database exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting database:', error);
            showNotification('Error exporting database: ' + error.message, 'error');
        }
    }

    /**
     * Import database from JSON backup file
     */
    importDatabase(fileData) {
        try {
            const backupData = JSON.parse(fileData);
            
            // Validate backup data structure
            if (!backupData.entries || !Array.isArray(backupData.entries)) {
                throw new Error('Invalid backup file: missing or invalid entries data');
            }

            // Confirm import action
            const entriesCount = backupData.entries.length;
            const backupDate = backupData.timestamp ? new Date(backupData.timestamp).toLocaleDateString('en-GB') : 'unknown date';
            
            if (!confirm(`Import ${entriesCount} entries from backup created on ${backupDate}? This will replace all current data.`)) {
                return;
            }

            // Validate entries format
            const validEntries = backupData.entries.filter(entry => 
                entry && typeof entry === 'object' && entry.timestamp
            );

            if (validEntries.length !== backupData.entries.length) {
                console.warn(`Filtered out ${backupData.entries.length - validEntries.length} invalid entries`);
            }

            // Import data
            this.entries = validEntries;
            localStorage.setItem('activityEntries', JSON.stringify(this.entries));

            // Import settings if available
            if (backupData.settings && typeof backupData.settings === 'object') {
                this.settings = { ...this.settings, ...backupData.settings };
                localStorage.setItem('activitySettings', JSON.stringify(this.settings));
                this.loadSettings(); // Reload settings UI
            }

            // Update display
            this.displayEntries();
            this.currentReportEntries = [];
            document.getElementById('reportPreview').innerHTML = '';

            showNotification(`Database imported successfully! Restored ${validEntries.length} entries.`, 'success');
        } catch (error) {
            console.error('Error importing database:', error);
            showNotification('Error importing database: ' + error.message, 'error');
        }
    }

    /**
     * Initialize template preview grid in settings - removed as no longer needed
     */
    initTemplatePreviewGrid() {
        // No longer needed - template preview grid removed from settings
    }

    /**
     * Open template manager overlay
     */
    openTemplateManager() {
        this.templateManagerState = {
            templates: { ...this.getReportTemplates() },
            currentTemplateId: null,
            hasUnsavedChanges: false,
            originalTemplates: { ...this.getReportTemplates() }
        };

        const overlay = document.getElementById('templateManagerOverlay');
        if (overlay) {
            overlay.classList.add('active');
            this.populateTemplateList();
            this.clearTemplateEditor();
        }
    }

    /**
     * Close template manager overlay
     */
    closeTemplateManager() {
        if (this.templateManagerState && this.templateManagerState.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
                return;
            }
        }

        const overlay = document.getElementById('templateManagerOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        this.templateManagerState = null;
    }

    /**
     * Populate template list in manager
     */
    populateTemplateList() {
        const templateList = document.getElementById('templateList');
        if (!templateList || !this.templateManagerState) return;

        const templates = this.templateManagerState.templates;
        const defaultTemplate = this.settings.defaultTemplate || 'detailed-html';
        
        templateList.innerHTML = '';
        
        Object.keys(templates).forEach(templateId => {
            const template = templates[templateId];
            const isDefault = templateId === defaultTemplate;
            const isActive = templateId === this.templateManagerState.currentTemplateId;
            
            const item = document.createElement('div');
            item.className = `template-list-item ${isActive ? 'active' : ''} ${isDefault ? 'default' : ''}`;
            item.onclick = () => this.selectTemplate(templateId);
            
            item.innerHTML = `
                <div class="template-list-item-name">${template.name}</div>
                <div class="template-list-item-desc">${template.description}</div>
                <div class="template-list-item-type">${template.type}</div>
            `;
            
            templateList.appendChild(item);
        });
    }

    /**
     * Select template for editing
     */
    selectTemplate(templateId) {
        if (this.templateManagerState && this.templateManagerState.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Continue without saving?')) {
                return;
            }
        }

        this.templateManagerState.currentTemplateId = templateId;
        this.templateManagerState.hasUnsavedChanges = false;
        
        this.populateTemplateList();
        this.loadTemplateIntoEditor(templateId);
        this.refreshTemplatePreview();
    }

    /**
     * Load template into editor form
     */
    loadTemplateIntoEditor(templateId) {
        const template = this.templateManagerState.templates[templateId];
        if (!template) return;

        document.getElementById('templateEditorTitle').textContent = `Editing: ${template.name}`;
        document.getElementById('templateEditorActions').style.display = 'flex';
        document.getElementById('templateEditorTabs').style.display = 'flex';
        
        // Show editor tab by default
        this.switchTemplateTab('editor');

        document.getElementById('templateName').value = template.name;
        document.getElementById('templateDescription').value = template.description;
        document.getElementById('templateType').value = template.type;
        document.getElementById('templateContent').value = template.template;
        
        const defaultTemplate = this.settings.defaultTemplate || 'detailed-html';
        document.getElementById('templateIsDefault').checked = templateId === defaultTemplate;

        // Add change listeners
        ['templateName', 'templateDescription', 'templateType', 'templateContent', 'templateIsDefault'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.templateManagerState.hasUnsavedChanges = true;
                });
            }
        });
    }

    /**
     * Clear template editor
     */
    clearTemplateEditor() {
        document.getElementById('templateEditorTitle').textContent = 'Select a template to edit';
        document.getElementById('templateEditorActions').style.display = 'none';
        document.getElementById('templateEditorTabs').style.display = 'none';
        document.getElementById('templateEditorForm').style.display = 'none';
        document.getElementById('templatePreviewPanel').style.display = 'none';
        document.getElementById('templatePreviewContent').innerHTML = '<p class="template-preview-placeholder">Select a template to see preview</p>';
    }

    /**
     * Add new template
     */
    addNewTemplate() {
        const templateId = 'custom-' + Date.now();
        const newTemplate = {
            name: 'New Template',
            description: 'Custom template',
            type: 'html',
            template: '# {{report.startDate}} - {{report.endDate}}\n\n{{#each entry = entries}}\n- {{entry.activity}}\n{{/each}}'
        };

        this.templateManagerState.templates[templateId] = newTemplate;
        this.templateManagerState.hasUnsavedChanges = true;
        
        this.populateTemplateList();
        this.selectTemplate(templateId);
    }

    /**
     * Save current template
     */
    saveCurrentTemplate() {
        if (!this.templateManagerState || !this.templateManagerState.currentTemplateId) return;

        const templateId = this.templateManagerState.currentTemplateId;
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const type = document.getElementById('templateType').value;
        const content = document.getElementById('templateContent').value;
        const isDefault = document.getElementById('templateIsDefault').checked;

        if (!name || !content) {
            showNotification('Template name and content are required', 'error');
            return;
        }

        // Update template
        this.templateManagerState.templates[templateId] = {
            name,
            description,
            type,
            template: content
        };

        // Update default template setting
        if (isDefault) {
            this.settings.defaultTemplate = templateId;
        } else if (this.settings.defaultTemplate === templateId) {
            this.settings.defaultTemplate = 'detailed-html';
        }

        this.templateManagerState.hasUnsavedChanges = false;
        
        this.populateTemplateList();
        this.refreshTemplatePreview();
        
        showNotification('Template saved', 'success');
    }

    /**
     * Delete current template
     */
    deleteCurrentTemplate() {
        if (!this.templateManagerState || !this.templateManagerState.currentTemplateId) return;

        const templateId = this.templateManagerState.currentTemplateId;
        const template = this.templateManagerState.templates[templateId];
        
        if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
            return;
        }

        // Don't allow deleting default templates
        if (window.ReportTemplates && window.ReportTemplates[templateId]) {
            showNotification('Cannot delete default templates', 'error');
            return;
        }

        delete this.templateManagerState.templates[templateId];
        
        // Clear default if this was it
        if (this.settings.defaultTemplate === templateId) {
            this.settings.defaultTemplate = 'detailed-html';
        }

        this.templateManagerState.hasUnsavedChanges = true;
        this.templateManagerState.currentTemplateId = null;
        
        this.populateTemplateList();
        this.clearTemplateEditor();
        
        showNotification('Template deleted', 'success');
    }

    /**
     * Duplicate current template
     */
    duplicateCurrentTemplate() {
        if (!this.templateManagerState || !this.templateManagerState.currentTemplateId) return;

        const originalId = this.templateManagerState.currentTemplateId;
        const original = this.templateManagerState.templates[originalId];
        const newId = 'custom-' + Date.now();
        
        const duplicate = {
            name: original.name + ' (Copy)',
            description: original.description,
            type: original.type,
            template: original.template
        };

        this.templateManagerState.templates[newId] = duplicate;
        this.templateManagerState.hasUnsavedChanges = true;
        
        this.populateTemplateList();
        this.selectTemplate(newId);
        
        showNotification('Template duplicated', 'success');
    }

    /**
     * Reset all templates to defaults
     */
    resetToDefaults() {
        if (!confirm('Reset all templates to defaults? This will delete all custom templates.')) {
            return;
        }

        this.templateManagerState.templates = { ...window.ReportTemplates };
        this.settings.defaultTemplate = 'detailed-html';
        this.templateManagerState.hasUnsavedChanges = true;
        this.templateManagerState.currentTemplateId = null;
        
        this.populateTemplateList();
        this.clearTemplateEditor();
        
        showNotification('Templates reset to defaults', 'success');
    }

    /**
     * Generate test data for template preview
     */
    generateTestData() {
        const now = new Date();
        const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endDate = now;
        
        // Create test entries across multiple days
        const day1 = new Date(startDate);
        const day2 = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        const day3 = new Date(startDate.getTime() + 48 * 60 * 60 * 1000);
        
        const day1Entries = [
            {
                id: '1',
                timestamp: day1.toISOString(),
                activity: 'Planning project roadmap',
                description: 'Defined key milestones and deliverables for Q3',
                duration: 45,
                endTime: new Date(day1.getTime() + 45 * 60 * 1000).toISOString()
            },
            {
                id: '2', 
                timestamp: new Date(day1.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                activity: 'Team standup meeting',
                description: 'Discussed progress and blocked items',
                duration: 30,
                endTime: new Date(day1.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
            }
        ];

        const day2Entries = [
            {
                id: '3',
                timestamp: day2.toISOString(),
                activity: 'Code review',
                description: 'Reviewed pull requests for **authentication module**',
                duration: 60,
                endTime: new Date(day2.getTime() + 60 * 60 * 1000).toISOString()
            }
        ];

        const day3Entries = [
            {
                id: '4',
                timestamp: day3.toISOString(),
                activity: 'Documentation update',
                description: 'Updated API documentation with new endpoints',
                duration: 90,
                endTime: new Date(day3.getTime() + 90 * 60 * 1000).toISOString()
            }
        ];

        const allEntries = [...day1Entries, ...day2Entries, ...day3Entries];
        const totalDuration = allEntries.reduce((sum, entry) => sum + entry.duration, 0);

        return {
            report: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                totalEntries: allEntries.length,
                totalDuration: totalDuration,
                activeDays: 3
            },
            entries: allEntries,
            days: [
                {
                    date: day1.toDateString(),
                    entries: day1Entries,
                    totalDuration: day1Entries.reduce((sum, entry) => sum + entry.duration, 0)
                },
                {
                    date: day2.toDateString(),
                    entries: day2Entries,
                    totalDuration: day2Entries.reduce((sum, entry) => sum + entry.duration, 0)
                },
                {
                    date: day3.toDateString(),
                    entries: day3Entries,
                    totalDuration: day3Entries.reduce((sum, entry) => sum + entry.duration, 0)
                }
            ]
        };
    }

    /**
     * Refresh template preview with test data
     */
    refreshTemplatePreview() {
        if (!this.templateManagerState || !this.templateManagerState.currentTemplateId) return;

        const templateId = this.templateManagerState.currentTemplateId;
        const template = this.templateManagerState.templates[templateId];
        const previewElement = document.getElementById('templatePreviewContent');
        
        if (!template || !previewElement) return;

        // Get current template content from editor (if modified)
        const templateContent = document.getElementById('templateContent');
        const currentTemplate = {
            ...template,
            template: templateContent ? templateContent.value : template.template
        };

        // Check which tab is active
        const renderedTab = document.getElementById('previewTabRendered');
        const isRenderedView = renderedTab && renderedTab.classList.contains('active');

        try {
            const testData = this.generateTestData();
            
            // Use the same templating engine as the reports section
            if (!this.templatingEngine) {
                this.templatingEngine = new TemplatingEngine();
            }
            
            const renderedContent = this.templatingEngine.render(currentTemplate.template, testData);
            
            if (isRenderedView) {
                // For HTML templates, render as HTML with styling
                if (currentTemplate.type === 'html') {
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = '400px';
                    iframe.style.border = 'none';
                    iframe.style.borderRadius = '4px';
                    
                    previewElement.innerHTML = '';
                    previewElement.appendChild(iframe);
                    
                    // Write content to iframe to preserve styling
                    iframe.contentDocument.open();
                    iframe.contentDocument.write(renderedContent);
                    iframe.contentDocument.close();
                    return;
                }
                
                // For markdown templates, render markdown
                if (currentTemplate.type === 'markdown' && this.markdownRenderer) {
                    const htmlContent = this.markdownRenderer.render(renderedContent);
                    previewElement.innerHTML = `<div class="markdown-preview">${htmlContent}</div>`;
                    return;
                }
                
                // For other formats, show as formatted text
                previewElement.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${this.escapeHtml(renderedContent)}</pre>`;
            } else {
                // Show source view
                previewElement.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${this.escapeHtml(renderedContent)}</pre>`;
            }
            
        } catch (error) {
            previewElement.innerHTML = `<div style="color: #e53e3e; padding: 20px; text-align: center;">
                <strong>Error generating preview:</strong><br>
                <code style="background: #fed7d7; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${error.message}</code>
            </div>`;
        }
    }

    /**
     * Escape HTML characters (keep this utility method)
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Switch preview tab in template manager
     */
    switchPreviewTab(tabType) {
        // Update tab appearance
        document.getElementById('previewTabRendered').classList.toggle('active', tabType === 'rendered');
        document.getElementById('previewTabSource').classList.toggle('active', tabType === 'source');
        
        // Refresh preview with new view mode
        this.refreshTemplatePreview();
    }

    /**
     * Switch preview tab in reports section
     */
    switchReportPreviewTab(tabType) {
        // Update tab appearance
        document.getElementById('reportPreviewTabRendered').classList.toggle('active', tabType === 'rendered');
        document.getElementById('reportPreviewTabSource').classList.toggle('active', tabType === 'source');
        
        // Refresh the current report preview
        this.previewReport();
    }

    /**
     * Switch template editor tab (Editor/Preview)
     */
    switchTemplateTab(tabType) {
        // Update tab appearance
        document.getElementById('tabEditor').classList.toggle('active', tabType === 'editor');
        document.getElementById('tabPreview').classList.toggle('active', tabType === 'preview');
        
        // Show/hide appropriate panels
        document.getElementById('templateEditorForm').style.display = tabType === 'editor' ? 'flex' : 'none';
        document.getElementById('templatePreviewPanel').style.display = tabType === 'preview' ? 'flex' : 'none';
        
        // Refresh preview when switching to preview tab
        if (tabType === 'preview') {
            this.refreshTemplatePreview();
        }
    }

    /**
     * Save all templates and close manager
     */
    saveAllTemplates() {
        if (!this.templateManagerState) return;

        // Save current template if editing
        if (this.templateManagerState.currentTemplateId) {
            this.saveCurrentTemplate();
        }

        // Save templates to localStorage
        const customTemplates = {};
        Object.keys(this.templateManagerState.templates).forEach(templateId => {
            // Only save custom templates (not default ones)
            if (!window.ReportTemplates || !window.ReportTemplates[templateId]) {
                customTemplates[templateId] = this.templateManagerState.templates[templateId];
            }
        });

        localStorage.setItem('customReportTemplates', JSON.stringify(customTemplates));
        localStorage.setItem('activitySettings', JSON.stringify(this.settings));

        // Update template preview grid
        this.initTemplatePreviewGrid();
        
        // Update template dropdown in reports
        const reportTemplate = document.getElementById('reportTemplate');
        if (reportTemplate) {
            const currentValue = reportTemplate.value;
            reportTemplate.innerHTML = '';
            
            Object.keys(this.templateManagerState.templates).forEach(templateId => {
                const template = this.templateManagerState.templates[templateId];
                const option = document.createElement('option');
                option.value = templateId;
                option.textContent = template.name;
                reportTemplate.appendChild(option);
            });
            
            // Restore selection or set default
            reportTemplate.value = currentValue || this.settings.defaultTemplate || 'detailed-html';
        }

        this.closeTemplateManager();
        showNotification('All templates saved successfully!', 'success');
    }
}
