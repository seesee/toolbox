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
 * Toggle pause/resume for notifications
 */
function togglePause() {
    if (tracker) {
        tracker.togglePause();
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
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Activity Tracker...');
    
    // Create tracker instance
    tracker = new ActivityTracker();
    
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                if (tracker) {
                    tracker.updateDebugInfo();
                }
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
                if (tracker) {
                    tracker.updateDebugInfo();
                }
            });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
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
        closeEditModal();
    }
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Esc key closes modals
    if (e.key === 'Escape') {
        closeEditModal();
    }
    
    // Ctrl/Cmd + Enter submits the activity form when focused
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.id === 'activity' || activeElement.id === 'description')) {
            const form = document.getElementById('activityForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
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
 * Handle beforeunload to warn about unsaved data
 */
window.addEventListener('beforeunload', (e) => {
    // Only show warning if there's unsaved form data
    const activityInput = document.getElementById('activity');
    if (activityInput && activityInput.value.trim()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved activity data. Are you sure you want to leave?';
        return e.returnValue;
    }
});

/**
 * Handle page unload cleanup
 */
window.addEventListener('unload', () => {
    if (tracker && tracker.pauseManager) {
        tracker.pauseManager.destroy();
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
        handleImportFile
    };
}
