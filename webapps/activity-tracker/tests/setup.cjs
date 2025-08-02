/**
 * Jest Test Setup File (CommonJS)
 * Configures global test environment for Activity Tracker tests
 */

require('@testing-library/jest-dom');

// Mock browser APIs that aren't available in jsdom
global.Notification = class MockNotification {
    constructor(title, options) {
        this.title = title;
        this.options = options;
        MockNotification.instances.push(this);
    }
    
    static instances = [];
    static permission = 'granted';
    static requestPermission = jest.fn().mockResolvedValue('granted');
    
    static reset() {
        MockNotification.instances = [];
    }
    
    close() {}
};

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
    constructor() {
        this.destination = {};
        this.currentTime = 0;
    }
    
    createOscillator() {
        return {
            type: 'sine',
            frequency: { value: 440 },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn()
        };
    }
    
    createGain() {
        return {
            gain: { value: 1 },
            connect: jest.fn()
        };
    }
    
    close() {
        return Promise.resolve();
    }
};

// Mock Service Worker
global.navigator.serviceWorker = {
    register: jest.fn().mockResolvedValue({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    }),
    ready: Promise.resolve({
        active: { state: 'activated' },
        addEventListener: jest.fn()
    }),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock window.matchMedia for dark mode detection
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock performance.now()
Object.defineProperty(global.performance, 'now', {
    writable: true,
    value: jest.fn(() => Date.now())
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    global.Notification.reset();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Reset console methods
    console.error = jest.fn();
    console.warn = jest.fn();
});

afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // Clean up any timers only if fake timers are being used
    try {
        if (jest.isMockFunction(setTimeout)) {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        }
    } catch (e) {
        // Ignore timer cleanup errors
    }
});

// Global test utilities
global.createMockDOMStructure = () => {
    document.body.innerHTML = `
        <div id="app">
            <nav class="nav-bar">
                <button id="pauseButton" class="nav-btn">Pause Reminders</button>
                <button id="pomodoroButton" class="nav-btn">Start Pomodoro</button>
            </nav>
            
            <form id="activityForm">
                <input type="text" id="activity" placeholder="Activity" required />
                <input type="datetime-local" id="timestamp" />
                <select id="category">
                    <option value="">Select category</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                </select>
                <button type="submit">Add Activity</button>
            </form>
            
            <div id="activityList"></div>
            <div id="todoList"></div>
            
            <!-- Edit Modal -->
            <div id="editModal" class="modal">
                <div class="modal-content edit-modal-content">
                    <div class="modal-header">
                        <h3>Edit Entry</h3>
                        <button class="btn-close" onclick="closeEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <input type="hidden" id="editId">
                            <div class="form-group">
                                <label for="editActivity">Activity</label>
                                <input type="text" id="editActivity" required>
                            </div>
                            <div class="form-group">
                                <label for="editDescription">Description</label>
                                <textarea id="editDescription" rows="3"></textarea>
                            </div>
                            <div class="form-group form-group-row">
                                <div class="form-group">
                                    <label for="editTimestamp">Time</label>
                                    <input type="datetime-local" id="editTimestamp" required>
                                    <div class="todo-quick-set">
                                        <button type="button" id="editTodoButton" class="btn-quick-set" onclick="toggleEditTodo()">
                                            <span id="editTodoButtonText">Mark as Todo</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editDueDate">Due Date (optional)</label>
                                    <input type="datetime-local" id="editDueDate">
                                    <div class="due-date-quick-sets">
                                        <button type="button" class="btn-quick-set" onclick="setEditDueDate('tomorrow')">Tomorrow</button>
                                        <button type="button" class="btn-quick-set" onclick="setEditDueDate('nextWeek')">Next Week</button>
                                        <button type="button" class="btn-quick-set" onclick="setEditDueDate('nextMonth')">Next Month</button>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-actions">
                                <button type="submit" class="btn btn-primary">Update Entry</button>
                                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Pomodoro Modal -->
            <div id="pomodoroModal" class="modal">
                <div class="modal-content">
                    <form id="pomodoroForm">
                        <input type="text" id="pomodoroActivityName" placeholder="Activity name" required />
                        <button type="submit">Start Session</button>
                        <button type="button">Cancel</button>
                    </form>
                </div>
            </div>
            
            <!-- Pomodoro Timer Display -->
            <div id="pomodoroTimer" style="display: none;">
                <div id="pomodoroTimeRemaining">25:00</div>
                <div id="pomodoroPhase">Work</div>
                <button id="pomodoroPauseBtn">Pause</button>
                <button id="pomodoroStopBtn">Stop</button>
            </div>
            
            <!-- Settings -->
            <div id="settings">
                <select id="notificationInterval">
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                </select>
                <select id="warnOnActivityDelete">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
                <select id="warnOnSessionReset">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
        </div>
    `;
};

// Global test helpers
global.waitFor = (condition, timeout = 1000) => {
    return new Promise((resolve, reject) => {
        const interval = 10;
        let elapsed = 0;
        
        const check = () => {
            if (condition()) {
                resolve();
            } else if (elapsed >= timeout) {
                reject(new Error(`Condition not met within ${timeout}ms`));
            } else {
                elapsed += interval;
                setTimeout(check, interval);
            }
        };
        
        check();
    });
};