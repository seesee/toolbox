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
        runServiceWorkerTest
    };
}
