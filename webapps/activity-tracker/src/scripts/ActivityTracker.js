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
                ).map(entry => {
                    // Migrate existing entries to new schema
                    if (typeof entry.isTodo === 'undefined') {
                        entry.isTodo = false;
                    }
                    if (!entry.tags) {
                        entry.tags = [];
                    }
                    if (!entry.dueDate) {
                        entry.dueDate = null;
                    }
                    if (!entry.startedAt) {
                        entry.startedAt = null;
                    }
                    return entry;
                });
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
            autoStartAlerts: false,
            soundMuteMode: 'none', // 'none', 'all', 'pomodoro', 'notifications'
            notificationSoundType: "classic",
            darkModePreference: 'light', // 'light', 'dark', 'system'
            paginationSize: 20,
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
        this.migrateExistingEntries();
        this.initMarkdownRenderer();
        this.initReportTemplates();
        this.loadReportTemplatesIntoEditor();
        this.initTemplatePreviewGrid();
        this.displayEntries();
        this.displayTodos();
        this.updateNotificationStatus();
        this.updateDebugInfo();
        this.updatePauseButtonState();
        
        // Only start notifications if auto-start is enabled
        if (this.settings.autoStartAlerts) {
            this.startNotificationTimer();
        }
        this.setWeeklyReport();
        this.initSoundManager();
        this.initPauseManager();
        this.initPomodoroManager();
        
        // Event listeners
        this.attachEventListeners();
        this.initSearch();
        
        // Set current time by default
        this.setCurrentTime();
        document.getElementById('activity').focus();

        // Check for local file protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from local file - notifications may have limitations');
        }
    }

    /**
     * Migrate existing entries to add hashtags and update schema
     */
    migrateExistingEntries() {
        let needsSave = false;
        
        this.entries.forEach(entry => {
            if (!entry.tags || entry.tags.length === 0) {
                entry.tags = this.extractHashtags(entry.activity + ' ' + (entry.description || ''));
                needsSave = true;
            }
        });
        
        if (needsSave) {
            this.saveEntries();
            console.log('Migrated existing entries with hashtags');
        }
    }

    /**
     * Get current report templates, combining defaults with custom templates from localStorage.
     */
    getReportTemplates() {
        // Start with default templates
        const allTemplates = { ...(window.ReportTemplates || {}) };
        
        // Load and merge custom templates
        const customTemplatesData = localStorage.getItem('customReportTemplates');
        if (customTemplatesData) {
            try {
                const customTemplates = JSON.parse(customTemplatesData);
                Object.assign(allTemplates, customTemplates);
                console.log('Loaded custom templates:', Object.keys(customTemplates));
            } catch (e) {
                console.error("Error parsing custom report templates from localStorage", e);
            }
        }
        
        return allTemplates;
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
            'soundMuteMode',
            'notificationSoundType',
            'darkModePreference',
            'autoStartAlerts',
            'paginationSize',
            'pomodoroEnabled',
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
            'pomodoroLongBreak',
            'pomodoroPauseAllowed',
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
        this.settings.soundMuteMode = document.getElementById('soundMuteMode').value;
        this.settings.notificationSoundType = document.getElementById('notificationSoundType').value;
        this.settings.darkModePreference = document.getElementById('darkModePreference').value;
        this.settings.autoStartAlerts = document.getElementById('autoStartAlerts')?.checked || false;
        this.settings.paginationSize = parseInt(document.getElementById('paginationSize').value);
        this.settings.pomodoroAutoStart = document.getElementById('pomodoroAutoStart')?.checked || false;
        this.settings.pomodoroAutoLog = document.getElementById('pomodoroAutoLog')?.checked !== false;
        this.settings.pomodoroLogBreaks = document.getElementById('pomodoroLogBreaks')?.checked || false;

        // Update working days
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
            this.settings.workingDays[day] = document.getElementById(day).checked;
        });

        // Apply theme immediately
        this.applyTheme();

        // Update pagination settings if pagination size changed
        if (document.getElementById('paginationSize')) {
            this.updatePaginationSettings();
        }

        // Save to localStorage
        this.saveSettings();

        // Restart notification timer if interval changed
        if (this.settings.notificationsEnabled) {
            this.startNotificationTimer();
        }

        // Update about section to reflect changes
        this.updateDebugInfo();

        // Save Pomodoro settings if manager exists
        if (this.pomodoroManager) {
            this.pomodoroManager.saveSettings();
            this.pomodoroManager.loadSettings();
        }
        
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
     * Check if notification sounds are muted
     */
    isNotificationSoundMuted() {
        return this.settings.soundMuteMode === 'all' || this.settings.soundMuteMode === 'notifications';
    }

    /**
     * Check if Pomodoro sounds are muted
     */
    isPomodoroSoundMuted() {
        return this.settings.soundMuteMode === 'all' || this.settings.soundMuteMode === 'pomodoro';
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        if (this.soundManager) {
            this.soundManager.playSound(this.settings.notificationSoundType, this.isNotificationSoundMuted());
        }
    }

    /**
     * Test notification sound
     */
    testNotificationSound() {
        if (this.soundManager) {
            this.soundManager.playSound(this.settings.notificationSoundType, this.isNotificationSoundMuted());
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
            const isTodo = isTodoModeActive();
            const dueDate = document.getElementById('dueDate')?.value || null;

            newEntry = {
                id: generateId(),
                activity,
                description,
                timestamp: new Date(timestamp).toISOString(),
                created: new Date().toISOString(),
                isTodo: isTodo,
                tags: this.extractHashtags(activity + ' ' + (description || '')),
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                startedAt: isTodo ? new Date(timestamp).toISOString() : null
            };
        }

        this.entries.unshift(newEntry);
        this.saveEntries();
        this.displayEntries();
        this.displayTodos();

        if (!entry) {
            document.getElementById('activityForm').reset();
            // Reset todo mode button
            const todoBtn = document.getElementById('todoToggleBtn');
            if (todoBtn) {
                todoBtn.classList.remove('active');
                todoBtn.textContent = 'Add as Todo';
            }
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
        const isTodo = document.getElementById('editTodoCheckbox').checked;
        const dueDate = document.getElementById('editDueDate').value;

        const entryIndex = this.entries.findIndex(entry => entry.id === id);
        if (entryIndex !== -1) {
            const existingEntry = this.entries[entryIndex];
            
            this.entries[entryIndex] = {
                ...existingEntry,
                activity,
                description,
                timestamp: new Date(timestamp).toISOString(),
                isTodo,
                tags: this.extractHashtags(activity + ' ' + (description || '')),
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                // Preserve startedAt if it exists, or set it if becoming a todo
                startedAt: isTodo ? (existingEntry.startedAt || new Date(timestamp).toISOString()) : existingEntry.startedAt
            };
            
            this.saveEntries();
            this.displayEntries();
            this.displayTodos();
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
            this.displayTodos();
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
            document.getElementById('editTodoCheckbox').checked = entry.isTodo || false;
            document.getElementById('editDueDate').value = 
                entry.dueDate ? new Date(entry.dueDate).toISOString().slice(0, 16) : '';
            
            document.getElementById('editModal').style.display = 'block';
        }
    }

    /**
     * Close the edit modal
     */
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    /**
     * Display entries in the UI
     */
    displayEntries() {
        const container = document.getElementById('entriesList');
        
        // Initialize entries pagination if it doesn't exist
        if (!this.entriesPagination) {
            this.entriesPagination = {
                currentPage: 1,
                itemsPerPage: this.settings.paginationSize || 20
            };
        }
        
        // Update pagination size if settings changed
        this.entriesPagination.itemsPerPage = this.settings.paginationSize || 20;
        
        // Calculate pagination
        const startIndex = (this.entriesPagination.currentPage - 1) * this.entriesPagination.itemsPerPage;
        const endIndex = startIndex + this.entriesPagination.itemsPerPage;
        const paginatedEntries = this.entries.slice(startIndex, endIndex);

        if (paginatedEntries.length === 0) {
            container.innerHTML = '<p>No entries yet. Add your first activity above!</p>';
            return;
        }

        container.innerHTML = paginatedEntries.map(entry => {
            const now = new Date();
            const isOverdue = entry.isTodo && entry.dueDate && new Date(entry.dueDate) < now;
            const isTodo = entry.isTodo;
            
            let itemClass = 'entry-item';
            if (isTodo) {
                itemClass += isOverdue ? ' entry-todo entry-overdue' : ' entry-todo';
            }
            
            const tagsHtml = entry.tags && entry.tags.length > 0 
                ? `<div class="entry-tags">${entry.tags.map(tag => `<span class="entry-tag" onclick="tracker.searchByHashtag('${tag}')">#${tag}</span>`).join('')}</div>`
                : '';

            const dueDateHtml = entry.dueDate 
                ? `<div class="entry-due-date">Due: ${formatDateTime(entry.dueDate)}</div>`
                : '';

            const todoIndicator = entry.isTodo ? '<span class="entry-todo-indicator">📋 Todo</span>' : '';

            return `
                <div class="${itemClass}">
                    <div class="entry-content">
                        <div class="entry-time">${formatDateTime(entry.timestamp)} ${todoIndicator}</div>
                        <div class="entry-activity">${escapeHtml(entry.activity)}</div>
                        ${entry.description ? `<div class="entry-description">${this.renderDescriptionMarkdown(entry.description)}</div>` : ''}
                        ${tagsHtml}
                        ${dueDateHtml}
                    </div>
                    <div class="entry-actions">
                        ${entry.isTodo ? `<button class="btn btn-success btn-small" onclick="tracker.completeEntry('${entry.id}')" title="Mark as completed">Mark Complete</button>` : ''}
                        <button class="btn btn-secondary btn-small" onclick="tracker.editEntry('${entry.id}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="tracker.deleteEntry('${entry.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update pagination controls
        this.updateEntriesPagination(this.entries.length);
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
            soundMuteMode: document.getElementById('soundMuteMode').value,
            notificationSoundType: document.getElementById('notificationSoundType').value,
            darkModePreference: document.getElementById('darkModePreference').value,
            autoStartAlerts: document.getElementById('autoStartAlerts')?.checked || false,
            paginationSize: parseInt(document.getElementById('paginationSize').value),
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
            pomodoroAutoStart: document.getElementById('pomodoroAutoStart')?.checked || false,
            pomodoroAutoLog: document.getElementById('pomodoroAutoLog')?.checked !== false,
            pomodoroLogBreaks: document.getElementById('pomodoroLogBreaks')?.checked || false,
            pomodoroLongBreak: document.getElementById('pomodoroLongBreak')?.checked || false,
            pomodoroPauseAllowed: document.getElementById('pomodoroPauseAllowed')?.checked !== false
        };

        localStorage.setItem('activitySettings', JSON.stringify(this.settings));
        this.applyTheme();
        this.startNotificationTimer();
        
        // Update Pomodoro manager if it exists
        if (this.pomodoroManager) {
            this.pomodoroManager.saveSettings();
            this.pomodoroManager.loadSettings();
        }
        
        // Also save any pending template changes
        if (this.templateManagerState && this.templateManagerState.hasUnsavedChanges) {
            this.saveTemplatesQuietly();
        }
        
        // Update pagination settings and refresh displays
        this.updatePaginationSettings();
        
        showNotification('Settings saved successfully!', 'success');
    }

    /**
     * Update pagination settings and refresh displays
     */
    updatePaginationSettings() {
        const newSize = this.settings.paginationSize || 20;
        
        // Update entries pagination
        if (this.entriesPagination) {
            this.entriesPagination.itemsPerPage = newSize;
            this.entriesPagination.currentPage = 1; // Reset to first page
        }
        
        // Update todo pagination
        if (this.todoPagination) {
            this.todoPagination.itemsPerPage = newSize;
            this.todoPagination.currentPage = 1; // Reset to first page
        }
        
        // Update search pagination
        if (this.searchState && this.searchState.searchPagination) {
            this.searchState.searchPagination.itemsPerPage = newSize;
            this.searchState.searchPagination.currentPage = 1; // Reset to first page
        }
        
        // Refresh displays
        this.displayEntries();
        this.displayTodos();
        
        // Refresh search results if there's an active search
        if (this.searchState && this.searchState.currentQuery) {
            this.performSearch(this.searchState.currentQuery);
        }
    }

    /**
     * Load settings into the UI
     */
    loadSettings() {
        document.getElementById('notificationInterval').value = this.settings.notificationInterval;
        document.getElementById('startTime').value = this.settings.startTime;
        document.getElementById('endTime').value = this.settings.endTime;
        document.getElementById('pauseDuration').value = this.settings.pauseDuration;
        document.getElementById('soundMuteMode').value = this.settings.soundMuteMode;
        document.getElementById('darkModePreference').value = this.settings.darkModePreference;
        document.getElementById('autoStartAlerts').checked = this.settings.autoStartAlerts;
        document.getElementById('paginationSize').value = this.settings.paginationSize;
        
        // Populate sound dropdowns with all available sounds
        this.populateSoundDropdowns();
        
        Object.entries(this.settings.workingDays).forEach(([day, checked]) => {
            document.getElementById(day).checked = checked;
        });

        this.applyTheme();
    }
    
    /**
     * Populate all sound dropdowns with available sounds
     */
    populateSoundDropdowns() {
        const soundDropdowns = [
            { id: 'notificationSoundType', selectedValue: this.settings.notificationSoundType },
            { id: 'pomodoroShortBreakSound', selectedValue: this.settings.pomodoroShortBreakSound || 'gentle' },
            { id: 'pomodoroLongBreakSound', selectedValue: this.settings.pomodoroLongBreakSound || 'bell' },
            { id: 'pomodoroResumeSound', selectedValue: this.settings.pomodoroResumeSound || 'digital' }
        ];
        
        soundDropdowns.forEach(({ id, selectedValue }) => {
            const dropdown = document.getElementById(id);
            if (dropdown && typeof generateSoundOptions === 'function') {
                dropdown.innerHTML = generateSoundOptions([], selectedValue);
            }
        });
    }

    /**
     * Apply the current theme (light/dark)
     */
    applyTheme() {
        let shouldUseDarkMode = false;
        
        switch (this.settings.darkModePreference) {
            case 'dark':
                shouldUseDarkMode = true;
                break;
            case 'light':
                shouldUseDarkMode = false;
                break;
            case 'system':
                // Check system preference
                shouldUseDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                break;
            default:
                shouldUseDarkMode = false;
        }
        
        if (shouldUseDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Listen for system preference changes if using system mode
        if (this.settings.darkModePreference === 'system') {
            if (!this.systemThemeListener) {
                this.systemThemeListener = (e) => {
                    if (this.settings.darkModePreference === 'system') {
                        this.applyTheme();
                    }
                };
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemThemeListener);
            }
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
     * Show reminder countdown banner
     */
    showReminderBanner() {
        const banner = document.getElementById('statusBanner');
        const reminderSection = document.getElementById('reminderStatusSection');
        if (banner && reminderSection && this.settings.notificationsEnabled) {
            banner.style.display = 'block';
            reminderSection.style.display = 'flex';
        }
    }

    /**
     * Hide reminder countdown banner
     */
    hideReminderBanner() {
        const reminderSection = document.getElementById('reminderStatusSection');
        if (reminderSection) {
            reminderSection.style.display = 'none';
        }
        
        // Hide the entire banner if no sections are visible
        const pomodoroSection = document.getElementById('pomodoroStatusSection');
        const banner = document.getElementById('statusBanner');
        if (banner && pomodoroSection && 
            reminderSection.style.display === 'none' && 
            pomodoroSection.style.display === 'none') {
            banner.style.display = 'none';
        }
    }

    /**
     * Start notification countdown display
     */
    startNotificationCountdown() {
        if (this.notificationCountdownTimer) {
            clearInterval(this.notificationCountdownTimer);
        }

        // Update immediately
        this.updateNotificationCountdown();

        // Update every second
        this.notificationCountdownTimer = setInterval(() => {
            this.updateNotificationCountdown();
        }, 1000);
    }

    /**
     * Update reminder countdown display
     */
    updateNotificationCountdown() {
        const timeRemainingEl = document.getElementById('reminderTimeRemaining');
        if (!timeRemainingEl || !this.settings.notificationsEnabled) {
            return;
        }

        // Calculate time until next notification
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const intervalMinutes = this.settings.notificationInterval;

        // Find next notification time
        let nextNotificationMinutes = Math.ceil(currentMinutes / intervalMinutes) * intervalMinutes;
        
        // If we've passed the last interval of the day, next notification is at start of tomorrow
        if (nextNotificationMinutes >= 24 * 60) {
            nextNotificationMinutes = 0; // Start of next day
        }

        // Calculate time remaining
        let timeRemainingMinutes;
        if (nextNotificationMinutes === 0) {
            // Next notification is tomorrow
            timeRemainingMinutes = (24 * 60) - currentMinutes;
        } else {
            timeRemainingMinutes = nextNotificationMinutes - currentMinutes;
        }

        // Convert to hours, minutes, seconds
        const hours = Math.floor(timeRemainingMinutes / 60);
        const minutes = timeRemainingMinutes % 60;
        const seconds = 60 - now.getSeconds(); // Seconds until next minute

        // Format time display
        let timeText;
        if (hours > 0) {
            timeText = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            timeText = `${minutes}m ${seconds}s`;
        } else {
            timeText = `${seconds}s`;
        }

        timeRemainingEl.textContent = timeText;
    }

    /**
     * Update about information display
     */
    updateDebugInfo() {
        const debugEl = document.getElementById('debugText');
        if (!debugEl) {
            // Element doesn't exist (removed from UI), skip debug info update
            console.log('Debug info element not found, skipping update');
            return;
        }
        
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
        info.push(`Sound Settings: ${this.settings.soundMuteMode === 'none' ? 'All enabled' : this.settings.soundMuteMode}`);
        info.push(`Sound Type: ${this.settings.notificationSoundType}`);
        info.push(`Last Updated: ${new Date().toLocaleTimeString('en-GB')}`);
        
        debugEl.innerHTML = info.join('<br>');
    }

    /**
     * Update debug info specifically for the About modal
     */
    async updateAboutDebugInfo() {
        const debugEl = document.getElementById('aboutDebugInfo');
        if (!debugEl) return;
        
        const info = [];
        
        // Application version
        info.push(`<strong>Version:</strong> ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'Unknown'}`);
        info.push('');
        
        info.push(`<strong>Browser:</strong> ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
        info.push(`<strong>Platform:</strong> ${navigator.platform || 'Unknown'}`);
        info.push(`<strong>Protocol:</strong> ${window.location.protocol}`);
        info.push('');
        
        info.push(`<strong>Notification API:</strong> ${'Notification' in window ? 'Available' : 'Not Available'}`);
        if ('Notification' in window) {
            info.push(`<strong>Permission:</strong> ${Notification.permission}`);
            info.push(`<strong>Max Actions:</strong> ${Notification.maxActions || 'Unknown'}`);
        }
        info.push('');
        
        // Enhanced Service Worker diagnostics
        if ('serviceWorker' in navigator) {
            info.push(`<strong>Service Worker:</strong> Available`);
            
            if (navigator.serviceWorker.controller) {
                info.push(`<strong>SW State:</strong> ${navigator.serviceWorker.controller.state}`);
                info.push(`<strong>SW URL:</strong> ${navigator.serviceWorker.controller.scriptURL.split('/').pop()}`);
            } else {
                info.push(`<strong>SW State:</strong> No controller`);
            }
            
            // Check registration status with proper await
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    info.push(`<strong>SW Scope:</strong> ${registration.scope}`);
                } else {
                    info.push(`<strong>SW Scope:</strong> No registration`);
                }
            } catch (error) {
                console.warn('SW registration check failed:', error);
                info.push(`<strong>SW Scope:</strong> Check failed`);
            }
        } else {
            info.push(`<strong>Service Worker:</strong> Not Available`);
            if (window.location.protocol === 'file:') {
                info.push(`<strong>SW Reason:</strong> file:// protocol (expected)`);
            }
        }
        info.push('');
        
        info.push(`<strong>Audio Support:</strong> ${this.soundManager && this.soundManager.audioContext ? 'Yes' : 'No'}`);
        info.push(`<strong>Sound Settings:</strong> ${this.settings.soundMuteMode === 'none' ? 'All enabled' : this.settings.soundMuteMode}`);
        info.push(`<strong>Sound Type:</strong> ${this.settings.notificationSoundType}`);
        info.push(`<strong>Last Updated:</strong> ${new Date().toLocaleTimeString('en-GB')}`);
        
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
        
        if (this.notificationCountdownTimer) {
            clearInterval(this.notificationCountdownTimer);
        }

        this.notificationTimer = setInterval(() => {
            this.checkForNotification();
        }, 60000); // Check every minute
        
        // Start countdown display timer (updates every second)
        this.startNotificationCountdown();
        this.showReminderBanner();
    }

    /**
     * Stop notification timer
     */
    stopNotificationTimer() {
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
            this.notificationTimer = null;
        }
        
        if (this.notificationCountdownTimer) {
            clearInterval(this.notificationCountdownTimer);
            this.notificationCountdownTimer = null;
        }
        
        this.hideReminderBanner();
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
     * Toggle start/stop notifications
     * @param {boolean} showNotif - Whether to show notification
     */
    togglePause(showNotif = true) {
        if (this.settings.notificationsEnabled) {
            // Stop notifications
            this.settings.notificationsEnabled = false;
            this.stopNotificationTimer();
            if (showNotif) {
                showNotification('Reminders stopped', 'info');
            }
        } else {
            // Start notifications
            this.settings.notificationsEnabled = true;
            this.startNotificationTimer();
            if (showNotif) {
                showNotification('Reminders started', 'success');
            }
        }
        
        this.updatePauseButtonState();
        this.saveSettings();
        this.updateNotificationStatus();
        this.updateDebugInfo();
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
        
        // Update template dropdown in reports using proper method
        if (this.initReportTemplates) {
            const currentValue = document.getElementById('reportTemplate')?.value;
            this.initReportTemplates();
            // Restore selection if the template still exists
            const reportTemplate = document.getElementById('reportTemplate');
            if (reportTemplate && currentValue) {
                reportTemplate.value = currentValue;
            }
        }

        this.closeTemplateManager();
        showNotification('All templates saved successfully!', 'success');
    }

    /**
     * Save templates quietly (without notifications or closing manager)
     */
    saveTemplatesQuietly() {
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
        this.templateManagerState.hasUnsavedChanges = false;
        
        // Update template dropdown in reports using proper method
        if (this.initReportTemplates) {
            const currentValue = document.getElementById('reportTemplate')?.value;
            this.initReportTemplates();
            // Restore selection if the template still exists
            const reportTemplate = document.getElementById('reportTemplate');
            if (reportTemplate && currentValue) {
                reportTemplate.value = currentValue;
            }
        }
        
        console.log('Templates saved quietly to localStorage');
    }

    /**
     * Extract hashtags from text (case insensitive)
     * @param {string} text - Text to extract hashtags from
     * @returns {string[]} Array of hashtags without the # symbol
     */
    extractHashtags(text) {
        if (!text || typeof text !== 'string') return [];
        
        const hashtagRegex = /#(\w+)/g;
        const hashtags = [];
        let match;
        
        while ((match = hashtagRegex.exec(text)) !== null) {
            const tag = match[1].toLowerCase();
            if (!hashtags.includes(tag)) {
                hashtags.push(tag);
            }
        }
        
        return hashtags;
    }

    /**
     * Mark an entry as completed (for todos)
     * @param {string} entryId - ID of the entry to complete
     */
    completeEntry(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry || !entry.isTodo) return;

        // Move timestamp to startedAt and set new completion timestamp
        entry.startedAt = entry.timestamp;
        entry.timestamp = new Date().toISOString();
        entry.isTodo = false; // Completed todos become regular activities

        this.saveEntries();
        this.displayEntries();
        this.displayTodos();
        showNotification('Todo completed!', 'success');
    }

    /**
     * Toggle todo status of an entry
     * @param {string} entryId - ID of the entry to toggle
     */
    toggleTodoStatus(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry) return;

        if (entry.isTodo) {
            // Complete the todo
            this.completeEntry(entryId);
        } else {
            // Make it a todo again
            entry.isTodo = true;
            entry.startedAt = entry.timestamp;
            // Don't change the timestamp when making something a todo again
            
            this.saveEntries();
            this.displayEntries();
            this.displayTodos();
            showNotification('Entry marked as todo!', 'success');
        }
    }

    /**
     * Display todos in the todo section
     */
    displayTodos() {
        const todoList = document.getElementById('todoList');
        const todoStats = document.getElementById('todoStats');
        
        if (!todoList || !todoStats) return;

        // Initialize pagination state if not exists
        if (!this.todoPagination) {
            this.todoPagination = {
                currentPage: 1,
                itemsPerPage: this.settings.paginationSize || 20,
                filter: 'all',
                sort: 'created-desc'
            };
        }

        const todos = this.getFilteredTodos();
        const totalTodos = todos.length;
        
        // Update stats
        todoStats.innerHTML = `<span id="todoCount">${totalTodos} todo${totalTodos !== 1 ? 's' : ''}</span>`;

        if (totalTodos === 0) {
            todoList.innerHTML = '<p class="empty-state">No todos found. Add activities as todos to see them here!</p>';
            document.getElementById('todoPagination').style.display = 'none';
            return;
        }

        // Apply pagination
        const startIndex = (this.todoPagination.currentPage - 1) * this.todoPagination.itemsPerPage;
        const endIndex = startIndex + this.todoPagination.itemsPerPage;
        const paginatedTodos = todos.slice(startIndex, endIndex);

        // Render todos
        todoList.innerHTML = paginatedTodos.map(todo => this.renderTodoItem(todo)).join('');

        // Update pagination controls
        this.updateTodoPagination(totalTodos);
    }

    /**
     * Get filtered and sorted todos
     */
    getFilteredTodos() {
        let todos = this.entries.filter(entry => entry.isTodo);

        // Apply filter
        switch (this.todoPagination.filter) {
            case 'due-today':
                todos = todos.filter(todo => {
                    if (!todo.dueDate) return false;
                    const today = new Date().toDateString();
                    return new Date(todo.dueDate).toDateString() === today;
                });
                break;
            case 'overdue':
                todos = todos.filter(todo => {
                    if (!todo.dueDate) return false;
                    return new Date(todo.dueDate) < new Date();
                });
                break;
            case 'no-due-date':
                todos = todos.filter(todo => !todo.dueDate);
                break;
        }

        // Apply sort
        switch (this.todoPagination.sort) {
            case 'created-asc':
                todos.sort((a, b) => new Date(a.created) - new Date(b.created));
                break;
            case 'created-desc':
                todos.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'due-asc':
                todos.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'due-desc':
                todos.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(b.dueDate) - new Date(a.dueDate);
                });
                break;
            case 'activity-asc':
                todos.sort((a, b) => a.activity.localeCompare(b.activity));
                break;
            case 'activity-desc':
                todos.sort((a, b) => b.activity.localeCompare(a.activity));
                break;
        }

        return todos;
    }

    /**
     * Render a single todo item
     */
    renderTodoItem(todo) {
        const now = new Date();
        const isOverdue = todo.dueDate && new Date(todo.dueDate) < now;
        const isDueToday = todo.dueDate && new Date(todo.dueDate).toDateString() === now.toDateString();
        
        const itemClass = isOverdue ? 'todo-item todo-overdue' : 'todo-item todo-incomplete';
        
        const tagsHtml = todo.tags && todo.tags.length > 0 
            ? `<div class="todo-tags">${todo.tags.map(tag => `<span class="todo-tag" onclick="tracker.searchByHashtag('${tag}')">#${tag}</span>`).join('')}</div>`
            : '';

        const dueDateHtml = todo.dueDate 
            ? `<span class="todo-due-date">Due: ${formatDateTime(todo.dueDate)}</span>`
            : '';

        const metaItems = [
            `Created: ${formatDateTime(todo.created)}`,
            dueDateHtml
        ].filter(Boolean);

        return `
            <div class="${itemClass}">
                <div class="todo-header">
                    <div class="todo-content">
                        <div class="todo-activity">${escapeHtml(todo.activity)}</div>
                        ${todo.description ? `<div class="todo-description">${this.renderDescriptionMarkdown(todo.description)}</div>` : ''}
                        ${tagsHtml}
                        <div class="todo-meta">${metaItems.join(' • ')}</div>
                    </div>
                    <div class="todo-actions">
                        <button class="btn btn-success btn-small" onclick="tracker.completeEntry('${todo.id}')" title="Mark as completed">Mark Complete</button>
                        <button class="btn btn-secondary btn-small" onclick="tracker.editEntry('${todo.id}')" title="Edit todo">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="tracker.deleteEntry('${todo.id}')" title="Delete todo">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update todo pagination controls
     */
    updateTodoPagination(totalItems) {
        const pagination = document.getElementById('todoPagination');
        const prevBtn = document.getElementById('todoPrevBtn');
        const nextBtn = document.getElementById('todoNextBtn');
        const pageInfo = document.getElementById('todoPageInfo');

        if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;

        const totalPages = Math.ceil(totalItems / this.todoPagination.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        pageInfo.textContent = `Page ${this.todoPagination.currentPage} of ${totalPages}`;
        
        prevBtn.disabled = this.todoPagination.currentPage <= 1;
        nextBtn.disabled = this.todoPagination.currentPage >= totalPages;
    }

    /**
     * Update entries pagination controls
     */
    updateEntriesPagination(totalItems) {
        const pagination = document.getElementById('entriesPagination');
        const prevBtn = document.getElementById('entriesPrevBtn');
        const nextBtn = document.getElementById('entriesNextBtn');
        const pageInfo = document.getElementById('entriesPageInfo');
        
        if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;
        
        const totalPages = Math.ceil(totalItems / this.entriesPagination.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        pageInfo.textContent = `Page ${this.entriesPagination.currentPage} of ${totalPages}`;
        
        prevBtn.disabled = this.entriesPagination.currentPage <= 1;
        nextBtn.disabled = this.entriesPagination.currentPage >= totalPages;
    }

    /**
     * Navigate to previous entries page
     */
    previousEntriesPage() {
        if (this.entriesPagination.currentPage > 1) {
            this.entriesPagination.currentPage--;
            this.displayEntries();
        }
    }

    /**
     * Navigate to next entries page
     */
    nextEntriesPage() {
        const totalPages = Math.ceil(this.entries.length / this.entriesPagination.itemsPerPage);
        if (this.entriesPagination.currentPage < totalPages) {
            this.entriesPagination.currentPage++;
            this.displayEntries();
        }
    }

    /**
     * Filter todos
     */
    filterTodos() {
        const filterSelect = document.getElementById('todoFilter');
        if (filterSelect) {
            this.todoPagination.filter = filterSelect.value;
            this.todoPagination.currentPage = 1; // Reset to first page
            this.displayTodos();
        }
    }

    /**
     * Sort todos
     */
    sortTodos() {
        const sortSelect = document.getElementById('todoSort');
        if (sortSelect) {
            this.todoPagination.sort = sortSelect.value;
            this.todoPagination.currentPage = 1; // Reset to first page
            this.displayTodos();
        }
    }

    /**
     * Navigate to previous todo page
     */
    previousTodoPage() {
        if (this.todoPagination.currentPage > 1) {
            this.todoPagination.currentPage--;
            this.displayTodos();
        }
    }

    /**
     * Navigate to next todo page
     */
    nextTodoPage() {
        const totalTodos = this.getFilteredTodos().length;
        const totalPages = Math.ceil(totalTodos / this.todoPagination.itemsPerPage);
        
        if (this.todoPagination.currentPage < totalPages) {
            this.todoPagination.currentPage++;
            this.displayTodos();
        }
    }

    /**
     * Initialize search functionality
     */
    initSearch() {
        const searchInput = document.getElementById('globalSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) return;

        // Initialize search state
        this.searchState = {
            currentQuery: '',
            selectedIndex: -1,
            suggestions: [],
            searchPagination: {
                currentPage: 1,
                itemsPerPage: this.settings.paginationSize || 20,
                filter: 'all',
                sort: 'relevance'
            }
        };

        let searchTimeout;

        // Real-time search as you type
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                this.hideSearchSuggestions();
                return;
            }

            // Debounce search for better performance
            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 150);
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            const suggestions = this.searchState.suggestions;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.searchState.selectedIndex = Math.min(
                    this.searchState.selectedIndex + 1, 
                    suggestions.length - 1
                );
                this.updateSearchSuggestionSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.searchState.selectedIndex = Math.max(this.searchState.selectedIndex - 1, -1);
                this.updateSearchSuggestionSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.searchState.selectedIndex >= 0) {
                    this.selectSearchSuggestion(this.searchState.selectedIndex);
                } else if (searchInput.value.trim()) {
                    this.showFullSearchResults(searchInput.value.trim());
                }
            } else if (e.key === 'Escape') {
                this.hideSearchSuggestions();
                searchInput.blur();
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideSearchSuggestions();
            }
        });
    }

    /**
     * Perform search and show suggestions
     */
    performSearch(query) {
        this.searchState.currentQuery = query;
        const results = this.searchEntries(query, 10); // Limit suggestions to 10
        this.searchState.suggestions = results;
        this.showSearchSuggestions(results);
    }

    /**
     * Search through entries
     */
    searchEntries(query, limit = null) {
        const searchTerms = query.toLowerCase().split(' ');
        const results = [];

        this.entries.forEach(entry => {
            let score = 0;
            const searchableText = (
                entry.activity + ' ' + 
                (entry.description || '') + ' ' +
                (entry.tags ? entry.tags.join(' ') : '')
            ).toLowerCase();

            // Calculate relevance score
            searchTerms.forEach(term => {
                if (entry.activity.toLowerCase().includes(term)) {
                    score += 10; // Activity title matches are most important
                }
                if (entry.description && entry.description.toLowerCase().includes(term)) {
                    score += 5; // Description matches
                }
                if (entry.tags && entry.tags.some(tag => tag.includes(term))) {
                    score += 8; // Hashtag matches are important
                }
                if (searchableText.includes(term)) {
                    score += 1; // General match
                }
            });

            if (score > 0) {
                results.push({ ...entry, searchScore: score });
            }
        });

        // Sort by relevance score
        results.sort((a, b) => b.searchScore - a.searchScore);

        return limit ? results.slice(0, limit) : results;
    }

    /**
     * Show search suggestions dropdown
     */
    showSearchSuggestions(results) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-suggestion">No results found</div>';
        } else {
            searchResults.innerHTML = results.map((result, index) => {
                const tagsHtml = result.tags && result.tags.length > 0 
                    ? result.tags.map(tag => `<span class="search-hashtag">#${tag}</span>`).join('')
                    : '';

                const todoIndicator = result.isTodo ? '📋 ' : '';
                const typeIndicator = result.isTodo ? 'Todo' : 'Activity';

                return `
                    <div class="search-suggestion" data-index="${index}" onclick="tracker.selectSearchSuggestion(${index})">
                        <div class="search-suggestion-activity">${todoIndicator}${escapeHtml(result.activity)}</div>
                        <div class="search-suggestion-meta">${typeIndicator} • ${formatDateTime(result.timestamp)} ${tagsHtml}</div>
                    </div>
                `;
            }).join('');
        }

        searchResults.style.display = 'block';
        this.searchState.selectedIndex = -1;
    }

    /**
     * Hide search suggestions
     */
    hideSearchSuggestions() {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        this.searchState.selectedIndex = -1;
    }

    /**
     * Update search suggestion selection
     */
    updateSearchSuggestionSelection() {
        const suggestions = document.querySelectorAll('.search-suggestion');
        suggestions.forEach((suggestion, index) => {
            if (index === this.searchState.selectedIndex) {
                suggestion.classList.add('selected');
            } else {
                suggestion.classList.remove('selected');
            }
        });
    }

    /**
     * Select a search suggestion
     */
    selectSearchSuggestion(index) {
        const result = this.searchState.suggestions[index];
        if (result) {
            this.editEntry(result.id); // Open the entry for editing
            this.hideSearchSuggestions();
            document.getElementById('globalSearch').value = '';
        }
    }

    /**
     * Show full search results in dedicated section
     */
    showFullSearchResults(query) {
        const allResults = this.searchEntries(query);
        this.searchState.searchPagination.filter = 'all';
        this.searchState.searchPagination.sort = 'relevance';
        this.searchState.searchPagination.currentPage = 1;
        
        // Switch to search section
        showSection('search');
        
        // Update search info
        const searchQuery = document.getElementById('searchQuery');
        const searchCount = document.getElementById('searchCount');
        
        if (searchQuery) searchQuery.textContent = `Search: "${query}"`;
        if (searchCount) searchCount.textContent = `${allResults.length} result${allResults.length !== 1 ? 's' : ''}`;
        
        // Display results
        this.displaySearchResults(allResults);
        this.hideSearchSuggestions();
        document.getElementById('globalSearch').value = '';
    }

    /**
     * Display paginated search results
     */
    displaySearchResults(results) {
        const resultsList = document.getElementById('searchResultsList');
        const pagination = this.searchState.searchPagination;
        
        if (!resultsList) return;

        if (results.length === 0) {
            resultsList.innerHTML = '<p class="empty-state">No results found. Try different search terms.</p>';
            document.getElementById('searchPagination').style.display = 'none';
            return;
        }

        // Apply pagination
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        const paginatedResults = results.slice(startIndex, endIndex);

        // Render results
        resultsList.innerHTML = paginatedResults.map(result => this.renderSearchResult(result)).join('');

        // Update pagination
        this.updateSearchPagination(results.length);
    }

    /**
     * Render a single search result
     */
    renderSearchResult(result) {
        const now = new Date();
        const isOverdue = result.isTodo && result.dueDate && new Date(result.dueDate) < now;
        
        let itemClass = 'search-result-item';
        if (result.isTodo) {
            itemClass += ' result-todo';
        } else {
            itemClass += ' result-completed';
        }
        
        const tagsHtml = result.tags && result.tags.length > 0 
            ? `<div class="search-result-tags">${result.tags.map(tag => `<span class="search-result-tag" onclick="tracker.searchByHashtag('${tag}')">#${tag}</span>`).join('')}</div>`
            : '';

        const dueDateHtml = result.dueDate 
            ? `<span class="search-due-date">Due: ${formatDateTime(result.dueDate)}</span>`
            : '';

        const metaItems = [
            result.isTodo ? 'Todo' : 'Activity',
            `Created: ${formatDateTime(result.created)}`,
            dueDateHtml
        ].filter(Boolean);

        return `
            <div class="${itemClass}">
                <div class="search-result-header">
                    <div class="search-result-content">
                        <div class="search-result-activity">${escapeHtml(result.activity)}</div>
                        ${result.description ? `<div class="search-result-description">${this.renderDescriptionMarkdown(result.description)}</div>` : ''}
                        ${tagsHtml}
                        <div class="search-result-meta">${metaItems.join(' • ')}</div>
                    </div>
                    <div class="search-result-actions">
                        ${result.isTodo ? `<button class="btn btn-success btn-small" onclick="tracker.completeEntry('${result.id}')" title="Mark as completed">Mark Complete</button>` : ''}
                        <button class="btn btn-secondary btn-small" onclick="tracker.editEntry('${result.id}')" title="Edit">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="tracker.deleteEntry('${result.id}')" title="Delete">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update search pagination controls
     */
    updateSearchPagination(totalItems) {
        const pagination = document.getElementById('searchPagination');
        const prevBtn = document.getElementById('searchPrevBtn');
        const nextBtn = document.getElementById('searchNextBtn');
        const pageInfo = document.getElementById('searchPageInfo');

        if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;

        const totalPages = Math.ceil(totalItems / this.searchState.searchPagination.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        pageInfo.textContent = `Page ${this.searchState.searchPagination.currentPage} of ${totalPages}`;
        
        prevBtn.disabled = this.searchState.searchPagination.currentPage <= 1;
        nextBtn.disabled = this.searchState.searchPagination.currentPage >= totalPages;
    }

    /**
     * Sort search results
     */
    sortSearchResults() {
        const sortSelect = document.getElementById('searchSort');
        if (sortSelect && this.searchState.currentQuery) {
            this.searchState.searchPagination.sort = sortSelect.value;
            this.searchState.searchPagination.currentPage = 1;
            this.showFullSearchResults(this.searchState.currentQuery);
        }
    }

    /**
     * Filter search results
     */
    filterSearchResults() {
        const filterSelect = document.getElementById('searchFilter');
        if (filterSelect && this.searchState.currentQuery) {
            this.searchState.searchPagination.filter = filterSelect.value;
            this.searchState.searchPagination.currentPage = 1;
            this.showFullSearchResults(this.searchState.currentQuery);
        }
    }

    /**
     * Navigate to previous search page
     */
    previousSearchPage() {
        if (this.searchState.searchPagination.currentPage > 1) {
            this.searchState.searchPagination.currentPage--;
            if (this.searchState.currentQuery) {
                this.showFullSearchResults(this.searchState.currentQuery);
            }
        }
    }

    /**
     * Navigate to next search page
     */
    nextSearchPage() {
        const results = this.searchEntries(this.searchState.currentQuery);
        const totalPages = Math.ceil(results.length / this.searchState.searchPagination.itemsPerPage);
        
        if (this.searchState.searchPagination.currentPage < totalPages) {
            this.searchState.searchPagination.currentPage++;
            if (this.searchState.currentQuery) {
                this.showFullSearchResults(this.searchState.currentQuery);
            }
        }
    }

    /**
     * Search by hashtag
     * @param {string} hashtag - The hashtag to search for
     */
    searchByHashtag(hashtag) {
        const query = `#${hashtag}`;
        this.showFullSearchResults(query);
    }

    /**
     * Get hashtag frequency for cloud visualization
     * @returns {Object} Object with hashtag as key and frequency as value
     */
    getHashtagFrequency() {
        const frequency = {};
        
        this.entries.forEach(entry => {
            if (entry.tags && entry.tags.length > 0) {
                entry.tags.forEach(tag => {
                    frequency[tag] = (frequency[tag] || 0) + 1;
                });
            }
        });
        
        return frequency;
    }
}
