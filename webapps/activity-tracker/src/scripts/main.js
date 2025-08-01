/**
 * Main initialization and global functions for Activity Tracker
 * This file handles app initialization, global event handlers, and UI functions
 */

// Global tracker instance
let tracker;

/**
 * Show a specific section and update navigation
 * @param {string} sectionName - Name of section to show
 * @param {Event} event - Click event (optional)
 */
function showSection(sectionName, event) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(sectionName).classList.add('active');

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        const button = document.querySelector(`.nav-btn[onclick*="'${sectionName}'"]`);
        if (button) {
            button.classList.add('active');
        }
    }

    // Focus on activity input when showing tracker
    if (sectionName === 'tracker') {
        setTimeout(() => {
            const activityInput = document.getElementById('activity');
            if (activityInput) {
                activityInput.focus();
            }
        }, 100);
    }

    // Auto-generate report if switching to reports tab and it's empty
    if (sectionName === 'reports') {
        const reportResults = document.getElementById('reportResults');
        if (tracker && (!reportResults || !reportResults.innerHTML.trim())) {
            tracker.setWeeklyReport(); // This will now auto-generate
        }
    }
}

/**
 * Add current time to timestamp input
 */
function addCurrentTime() {
    if (tracker) {
        tracker.setCurrentTime();
    }
}

/**
 * Generate sound option elements for dropdowns
 * @param {Array} excludeSounds - Array of sound keys to exclude (e.g., tick sounds)
 * @param {string} selectedValue - Currently selected value
 * @returns {string} HTML string of option elements
 */
function generateSoundOptions(excludeSounds = [], selectedValue = '') {
    // Get all available sounds from SoundManager
    const allSounds = {
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
        'failsafe': 'Failsafe'
    };
    
    return Object.entries(allSounds)
        .filter(([key]) => !excludeSounds.includes(key))
        .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
        .map(([key, name]) => {
            const selected = key === selectedValue ? ' selected' : '';
            return `<option value="${key}"${selected}>${name}</option>`;
        })
        .join('');
}

/**
 * Generate report based on selected dates
 */
function generateReport() {
    if (tracker) {
        tracker.generateReport();
    }
}

/**
 * Set report to current week
 */
function setWeeklyReport() {
    if (tracker) {
        tracker.setWeeklyReport();
    }
}

/**
 * Navigate to previous week in reports
 */
function previousWeek() {
    if (tracker) {
        tracker.previousWeek();
    }
}

/**
 * Navigate to next week in reports
 */
function nextWeek() {
    if (tracker) {
        tracker.nextWeek();
    }
}

/**
 * Download current report
 */
function downloadReport() {
    if (tracker) {
        tracker.downloadReport();
    }
}

/**
 * Save settings
 */
function saveSettings() {
    if (tracker) {
        tracker.saveSettings();
    }
}

/**
 * Enable notifications
 */
function enableNotifications() {
    if (tracker) {
        tracker.enableNotifications();
    }
}

/**
 * Test notification
 */
function testNotification() {
    if (tracker) {
        tracker.testNotification();
    }
}

/**
 * Test notification sound
 */
function testNotificationSound() {
    if (tracker) {
        tracker.testNotificationSound();
    }
}

/**
 * Preview notification sound when selection changes
 */
function previewNotificationSound() {
    const soundType = document.getElementById('notificationSoundType').value;
    
    if (tracker && tracker.soundManager && !tracker.isNotificationSoundMuted()) {
        tracker.soundManager.playSound(soundType, false);
    }
}

/**
 * Show template guide modal
 */
function showTemplateGuide() {
    const modal = document.getElementById('templateGuideModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close template guide modal
 */
function closeTemplateGuide() {
    const modal = document.getElementById('templateGuideModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show About modal
 */
function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'block';
        // Update debug info when modal opens
        if (tracker) {
            tracker.updateAboutDebugInfo();
        }
    }
}

/**
 * Close About modal
 */
function closeAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show User Guide modal
 */
function showUserGuide() {
    const modal = document.getElementById('userGuideModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close User Guide modal
 */
function closeUserGuide() {
    const modal = document.getElementById('userGuideModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Set due date using quick-set buttons
 * @param {string} period - 'tomorrow', 'nextWeek', or 'nextMonth'
 */
function setDueDate(period) {
    const dueDateInput = document.getElementById('dueDate');
    if (!dueDateInput) return;

    const now = new Date();
    let targetDate;

    switch (period) {
        case 'tomorrow':
            targetDate = new Date(now);
            targetDate.setDate(now.getDate() + 1);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        case 'nextWeek':
            targetDate = new Date(now);
            targetDate.setDate(now.getDate() + 7);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        case 'nextMonth':
            targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() + 1);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        default:
            return;
    }

    dueDateInput.value = targetDate.toISOString().slice(0, 16);
}

/**
 * Set due date using quick-set buttons for edit modal
 * @param {string} period - 'tomorrow', 'nextWeek', or 'nextMonth'
 */
function setEditDueDate(period) {
    const dueDateInput = document.getElementById('editDueDate');
    if (!dueDateInput) return;

    const now = new Date();
    let targetDate;

    switch (period) {
        case 'tomorrow':
            targetDate = new Date(now);
            targetDate.setDate(now.getDate() + 1);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        case 'nextWeek':
            targetDate = new Date(now);
            targetDate.setDate(now.getDate() + 7);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        case 'nextMonth':
            targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() + 1);
            targetDate.setHours(9, 0, 0, 0); // Set to 9 AM
            break;
        default:
            return;
    }

    dueDateInput.value = targetDate.toISOString().slice(0, 16);
}

/**
 * Copy report content to clipboard
 */
function copyReportToClipboard() {
    const reportPreview = document.getElementById('reportPreview');
    const isRenderedView = document.getElementById('reportPreviewTabRendered').classList.contains('active');
    
    let textToCopy = '';
    
    if (isRenderedView) {
        // For rendered view, try to get clean text content
        const iframe = reportPreview.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
            textToCopy = iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent;
        } else {
            textToCopy = reportPreview.innerText || reportPreview.textContent;
        }
    } else {
        // For source view, get the raw content
        textToCopy = reportPreview.innerText || reportPreview.textContent;
    }
    
    if (textToCopy && textToCopy.trim()) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('Report copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Report copied to clipboard!', 'success');
        });
    } else {
        showNotification('No report content to copy', 'error');
    }
}

/**
 * Refresh notification status
 */
function refreshNotificationStatus() {
    if (tracker) {
        tracker.refreshNotificationStatus();
    }
}

/**
 * Clear all application data
 */
function clearAllData() {
    if (tracker) {
        tracker.clearAllData();
    }
}

/**
 * Close edit modal
 */
function closeEditModal() {
    if (tracker) {
        tracker.closeEditModal();
    }
}

/**
 * Close modal by ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show hashtag browser modal with cloud visualization
 */
function showHashtagBrowser() {
    const modal = document.getElementById('hashtagBrowserModal');
    if (!modal) return;
    
    // Generate hashtag cloud
    const hashtagFrequency = tracker.getHashtagFrequency();
    const cloudContainer = modal.querySelector('.hashtag-cloud');
    
    if (Object.keys(hashtagFrequency).length === 0) {
        cloudContainer.innerHTML = '<p>No hashtags found in your entries.</p>';
    } else {
        const maxFreq = Math.max(...Object.values(hashtagFrequency));
        const minFreq = Math.min(...Object.values(hashtagFrequency));
        const range = maxFreq - minFreq || 1;
        
        const hashtagElements = Object.entries(hashtagFrequency)
            .sort(([,a], [,b]) => b - a) // Sort by frequency desc
            .map(([tag, freq]) => {
                const normalized = (freq - minFreq) / range;
                const fontSize = 0.8 + (normalized * 1.2); // 0.8em to 2.0em
                const opacity = 0.6 + (normalized * 0.4); // 0.6 to 1.0
                
                return `<span class="hashtag-cloud-item" 
                              style="font-size: ${fontSize}em; opacity: ${opacity};"
                              onclick="tracker.searchByHashtag('${tag}'); closeModal('hashtagBrowserModal');"
                              title="${freq} occurrence${freq !== 1 ? 's' : ''}">#${tag}</span>`;
            })
            .join(' ');
        
        cloudContainer.innerHTML = hashtagElements;
    }
    
    modal.style.display = 'block';
}

/**
 * Close hashtag browser modal
 */
function closeHashtagBrowser() {
    closeModal('hashtagBrowserModal');
}

/**
 * Toggle todo mode for activity form
 */
function toggleTodoMode() {
    const btn = document.getElementById('todoToggleBtn');
    if (!btn) return;
    
    const isActive = btn.classList.contains('active');
    
    if (isActive) {
        btn.classList.remove('active');
        btn.textContent = 'Add as Todo';
    } else {
        btn.classList.add('active');
        btn.textContent = '✓ Todo Mode';
    }
}

/**
 * Check if todo mode is active
 */
function isTodoModeActive() {
    const btn = document.getElementById('todoToggleBtn');
    return btn ? btn.classList.contains('active') : false;
}

/**
 * Close Pomodoro activity modal
 */
function closePomodoroActivityModal() {
    const modal = document.getElementById('pomodoroActivityModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('pomodoroActivityForm').reset();
    }
}

/**
 * Show Pomodoro activity modal
 */
function showPomodoroActivityModal() {
    const modal = document.getElementById('pomodoroActivityModal');
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => {
            const activityInput = document.getElementById('pomodoroActivityName');
            if (activityInput) {
                activityInput.focus();
            }
        }, 100);
    }
}

/**
 * Toggle pause/resume for notifications
 */
function togglePause() {
    if (tracker) {
        tracker.togglePause();
    }
}

/**
 * Toggle Pomodoro mode from navigation button
 */
function togglePomodoro() {
    if (tracker && tracker.pomodoroManager) {
        tracker.pomodoroManager.togglePomodoroFromButton();
    }
}

/**
 * Toggle Pomodoro pause/resume from banner button
 */
function togglePomodoroPause() {
    if (tracker && tracker.pomodoroManager) {
        tracker.pomodoroManager.togglePause();
    }
}

/**
 * Test Pomodoro tick sounds (for debugging)
 */
function testPomodoroTick(soundType = 'soft') {
    if (tracker && tracker.pomodoroManager) {
        console.log(`Testing Pomodoro tick sound: ${soundType}`);
        tracker.pomodoroManager.settings.tickSound = soundType;
        tracker.pomodoroManager.playTickSound();
    } else {
        console.error('Tracker or Pomodoro Manager not available');
    }
}

/**
 * Saves the customized report templates from the settings page.
 */
function saveReportTemplates() {
    if (tracker) {
        tracker.saveReportTemplates();
    }
}

/**
 * Resets report templates to their default values.
 */
function resetReportTemplates() {
    if (tracker) {
        tracker.resetReportTemplates();
    }
}

/**
 * Export database as backup file
 */
function exportDatabase() {
    if (tracker) {
        tracker.exportDatabase();
    }
}

/**
 * Trigger file picker for database import
 */
function importDatabase() {
    const fileInput = document.getElementById('importFile');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * Handle import file selection
 */
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showNotification('Please select a valid JSON backup file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (tracker) {
            tracker.importDatabase(e.target.result);
        }
        // Clear the file input so the same file can be selected again if needed
        event.target.value = '';
    };
    reader.onerror = function() {
        showNotification('Error reading backup file.', 'error');
        event.target.value = '';
    };
    reader.readAsText(file);
}

/**
 * Open template manager overlay
 */
function openTemplateManager() {
    if (tracker) {
        tracker.openTemplateManager();
    }
}

/**
 * Close template manager overlay
 */
function closeTemplateManager() {
    if (tracker) {
        tracker.closeTemplateManager();
    }
}

/**
 * Add new template in manager
 */
function addNewTemplate() {
    if (tracker) {
        tracker.addNewTemplate();
    }
}

/**
 * Reset all templates to defaults
 */
function resetToDefaults() {
    if (tracker) {
        tracker.resetToDefaults();
    }
}

/**
 * Save current template in editor
 */
function saveCurrentTemplate() {
    if (tracker) {
        tracker.saveCurrentTemplate();
    }
}

/**
 * Delete current template in editor
 */
function deleteCurrentTemplate() {
    if (tracker) {
        tracker.deleteCurrentTemplate();
    }
}

/**
 * Duplicate current template in editor
 */
function duplicateCurrentTemplate() {
    if (tracker) {
        tracker.duplicateCurrentTemplate();
    }
}

/**
 * Refresh template preview
 */
function refreshTemplatePreview() {
    if (tracker) {
        tracker.refreshTemplatePreview();
    }
}

/**
 * Save all templates and close manager
 */
function saveAllTemplates() {
    if (tracker) {
        tracker.saveAllTemplates();
    }
}

/**
 * Switch preview tab in template manager
 */
function switchPreviewTab(tabType) {
    if (tracker) {
        tracker.switchPreviewTab(tabType);
    }
}

/**
 * Switch preview tab in reports section
 */
function switchReportPreviewTab(tabType) {
    if (tracker) {
        tracker.switchReportPreviewTab(tabType);
    }
}

/**
 * Switch template editor tab (Editor/Preview)
 */
function switchTemplateTab(tabType) {
    if (tracker) {
        tracker.switchTemplateTab(tabType);
    }
}

/**
 * Run comprehensive service worker diagnostic test
 */
async function runServiceWorkerTest() {
    if (!tracker) {
        showNotification('Tracker not initialized', 'error');
        return;
    }
    
    showNotification('Running Service Worker diagnostics...', 'info');
    
    try {
        const diagnostics = await tracker.runServiceWorkerDiagnostics();
        
        let message = 'Service Worker Diagnostics:\n\n';
        message += `Available: ${diagnostics.available}\n`;
        message += `Protocol: ${diagnostics.protocol}\n`;
        message += `Platform: ${diagnostics.platform}\n`;
        
        if (diagnostics.registration) {
            message += `Registration: Active\n`;
            message += `Scope: ${diagnostics.registration.scope}\n`;
        } else {
            message += `Registration: None\n`;
        }
        
        if (diagnostics.controller) {
            message += `Controller: Active (${diagnostics.controller.state})\n`;
        } else {
            message += `Controller: None\n`;
        }
        
        if (diagnostics.communication) {
            message += `Communication: ${diagnostics.communication}\n`;
        }
        
        if (diagnostics.swVersion) {
            message += `SW Version: ${diagnostics.swVersion}\n`;
        }
        
        if (diagnostics.error) {
            message += `Error: ${diagnostics.error}\n`;
        }
        
        // Show detailed results in console and user notification
        console.log('🔍 Service Worker Diagnostics:', diagnostics);
        alert(message);
        
        const status = diagnostics.available && diagnostics.registration ? 'success' : 'warning';
        const summary = diagnostics.available && diagnostics.registration ? 
            'Service Worker is working correctly' : 
            'Service Worker issues detected (see console)';
            
        showNotification(summary, status);
        
    } catch (error) {
        console.error('Diagnostic test failed:', error);
        showNotification('Diagnostic test failed: ' + error.message, 'error');
    }
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Activity Tracker...');
    
    // Create tracker instance
    tracker = new ActivityTracker();
    
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
        // Check if we're on a supported protocol
        if (window.location.protocol === 'file:') {
            console.log('🔍 Service Worker not registering: file:// protocol detected');
            console.log('ℹ️  App will function normally without Service Worker');
        } else {
            console.log('🔧 Registering Service Worker...');
            
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered with scope:', registration.scope);
                    
                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 Service Worker update found');
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('🔄 New Service Worker installed, refresh recommended');
                                    showNotification('App updated! Refresh for latest version.', 'info', 10000);
                                }
                            });
                        }
                    });
                    
                    if (tracker) {
                        tracker.updateDebugInfo();
                    }
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                    console.log('ℹ️  App will function normally without Service Worker');
                    
                    // Check for common macOS issues
                    if (navigator.platform.includes('Mac') && error.name === 'SecurityError') {
                        console.warn('🍎 macOS Security Error: This may be due to strict security settings');
                        console.warn('💡 Try serving over HTTP/HTTPS instead of file://');
                    }
                    
                    if (tracker) {
                        tracker.updateDebugInfo();
                    }
                });
        }

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
            console.log('💬 Message from SW:', event.data);
            
            if (event.data && event.data.type === 'add-entry') {
                if (tracker) {
                    tracker.addEntry(event.data.entry);
                    showNotification('Activity logged from notification!', 'success');
                }
            }
            
            if (event.data && event.data.type === 'navigate-to-tracker') {
                showSection('tracker');
            }
        });

        // Listen for service worker control changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service Worker controller changed');
            if (tracker) {
                tracker.updateDebugInfo();
            }
        });

    } else {
        console.log('❌ Service Worker not supported in this browser');
        console.log('ℹ️  App will function normally without Service Worker');
    }

    // Handle hash navigation (if coming from notification)
    if (window.location.hash === '#tracker') {
        showSection('tracker');
        // Clean up the hash
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    console.log('✅ Activity Tracker initialized successfully');
});

/**
 * Handle modal clicks (close when clicking outside)
 */
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        // Close the appropriate modal based on which one is open
        if (e.target.id === 'templateGuideModal') {
            closeTemplateGuide();
        } else if (e.target.id === 'aboutModal') {
            closeAbout();
        } else if (e.target.id === 'pomodoroActivityModal') {
            closePomodoroActivityModal();
        } else if (e.target.id === 'hashtagBrowserModal') {
            closeHashtagBrowser();
        } else if (e.target.id === 'userGuideModal') {
            closeUserGuide();
        } else {
            closeEditModal();
        }
    }
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Esc key closes modals
    if (e.key === 'Escape') {
        // Close whichever modal is currently open
        const templateGuideModal = document.getElementById('templateGuideModal');
        const aboutModal = document.getElementById('aboutModal');
        const editModal = document.getElementById('editModal');
        const pomodoroActivityModal = document.getElementById('pomodoroActivityModal');
        const hashtagBrowserModal = document.getElementById('hashtagBrowserModal');
        const userGuideModal = document.getElementById('userGuideModal');
        
        if (templateGuideModal && templateGuideModal.style.display === 'block') {
            closeTemplateGuide();
        } else if (aboutModal && aboutModal.style.display === 'block') {
            closeAbout();
        } else if (pomodoroActivityModal && pomodoroActivityModal.style.display === 'block') {
            closePomodoroActivityModal();
        } else if (hashtagBrowserModal && hashtagBrowserModal.style.display === 'block') {
            closeHashtagBrowser();
        } else if (userGuideModal && userGuideModal.style.display === 'block') {
            closeUserGuide();
        } else if (editModal && editModal.style.display === 'block') {
            closeEditModal();
        }
    }
    
    // Shift + Enter marks as todo and submits the activity form when focused
    if (e.shiftKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // Main activity form
        if (activeElement && (activeElement.id === 'activity' || activeElement.id === 'description')) {
            e.preventDefault();
            const todoBtn = document.getElementById('todoToggleBtn');
            if (todoBtn && !todoBtn.classList.contains('active')) {
                todoBtn.classList.add('active');
                todoBtn.textContent = '✓ Todo Mode';
            }
            const form = document.getElementById('activityForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        return;
    }
    
    // Ctrl/Cmd + Enter submits the activity form when focused
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // Main activity form
        if (activeElement && (activeElement.id === 'activity' || activeElement.id === 'description')) {
            const form = document.getElementById('activityForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Edit modal form
        if (activeElement && (activeElement.id === 'editActivity' || activeElement.id === 'editDescription' || activeElement.id === 'editTimestamp')) {
            const editForm = document.getElementById('editForm');
            if (editForm) {
                editForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Pomodoro activity modal form
        if (activeElement && (activeElement.id === 'pomodoroActivityName' || activeElement.id === 'pomodoroActivityDescription')) {
            const pomodoroForm = document.getElementById('pomodoroActivityForm');
            if (pomodoroForm) {
                pomodoroForm.dispatchEvent(new Event('submit'));
            }
        }
    }
});

/**
 * Handle visibility change to pause/resume notifications when tab is hidden
 */
document.addEventListener('visibilitychange', () => {
    if (tracker) {
        // Update debug info when tab becomes visible
        if (!document.hidden) {
            tracker.updateDebugInfo();
        }
    }
});

/**
 * Handle online/offline events
 */
window.addEventListener('online', () => {
    console.log('📶 Connection restored');
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    console.log('📶 Connection lost');
    showNotification('Working offline', 'info');
});

/**
 * Handle beforeunload for cleanup and unsaved data warning
 */
window.addEventListener('beforeunload', (e) => {
    // Clean up pause manager
    if (tracker && tracker.pauseManager) {
        tracker.pauseManager.destroy();
    }
    
    // Only show warning if there's unsaved form data
    const activityInput = document.getElementById('activity');
    if (activityInput && activityInput.value.trim()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved activity data. Are you sure you want to leave?';
        return e.returnValue;
    }
});

/**
 * Add PWA install prompt handling
 */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 PWA install prompt available');
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Save the event so it can be triggered later
    deferredPrompt = e;
    
    // Show custom install button/notification if desired
    showNotification('This app can be installed on your device!', 'info');
});

window.addEventListener('appinstalled', () => {
    console.log('💾 PWA was installed');
    showNotification('Activity Tracker installed successfully!', 'success');
    deferredPrompt = null;
});

/**
 * Error handling for uncaught errors
 */
window.addEventListener('error', (e) => {
    console.error('❌ Uncaught error:', e.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

/**
 * Performance monitoring
 */
window.addEventListener('load', () => {
    // Log performance timing
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`⚡ Page loaded in ${loadTime}ms`);
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showSection,
        addCurrentTime,
        generateReport,
        setWeeklyReport,
        previousWeek,
        nextWeek,
        downloadReport,
        saveSettings,
        enableNotifications,
        testNotification,
        testNotificationSound,
        refreshNotificationStatus,
        clearAllData,
        closeEditModal,
        togglePause,
        exportDatabase,
        importDatabase,
        handleImportFile,
        runServiceWorkerTest,
        previewNotificationSound,
        showTemplateGuide,
        closeTemplateGuide,
        showAbout,
        closeAbout,
        copyReportToClipboard
    };
}
