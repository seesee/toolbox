/**
 * Enhanced notification system with stacking support
 */
class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.nextId = 1;
        this.init();
    }

    init() {
        this.container = document.getElementById('notificationStack');
        if (!this.container) {
            console.warn('Notification stack container not found');
        }
    }

    /**
     * Show a notification with stacking support
     * @param {string} message - The notification message
     * @param {string} type - Type: success, error, warning, info
     * @param {number} duration - Duration in milliseconds (0 for permanent)
     */
    show(message, type = 'info', duration = 5000) {
        if (!this.container) {
            // Fallback to console if container not available
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const id = this.nextId++;
        const notification = this.createNotification(id, message, type, duration);
        
        // Add to container at the top
        this.container.insertBefore(notification, this.container.firstChild);
        this.notifications.set(id, notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create notification DOM element
     */
    createNotification(id, message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.setAttribute('data-notification-id', id);
        notification.innerHTML = message;

        // Click to dismiss
        notification.addEventListener('click', () => {
            this.remove(id);
        });

        return notification;
    }

    /**
     * Remove notification by ID
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.add('removing');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300); // Match animation duration
    }

    /**
     * Remove all notifications
     */
    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    /**
     * Get notification count
     */
    getCount() {
        return this.notifications.size;
    }
}

// Global notification manager instance
let notificationManager;

/**
 * Global showNotification function (replaces existing one)
 * @param {string} message - The notification message
 * @param {string} type - Type: success, error, warning, info
 * @param {number} duration - Duration in milliseconds (0 for permanent)
 */
function showNotification(message, type = 'info', duration = 5000) {
    if (!notificationManager) {
        notificationManager = new NotificationManager();
    }
    return notificationManager.show(message, type, duration);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!notificationManager) {
        notificationManager = new NotificationManager();
    }
});