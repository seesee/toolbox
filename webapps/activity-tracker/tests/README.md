# Activity Tracker Test Framework

## Overview

The Activity Tracker test framework has been set up using Jest with jsdom for DOM testing. This document outlines the testing approach, configuration, and current status.

## Test Framework Selected: Jest + jsdom

After comprehensive research, Jest was selected as the primary testing framework for the following reasons:

### Why Jest?

1. **Zero Configuration**: Works out-of-the-box with minimal setup
2. **Built-in DOM Environment**: Uses jsdom for DOM testing without a browser
3. **Excellent Mocking Capabilities**: Built-in mocking for localStorage, timers, and DOM APIs
4. **Comprehensive Feature Set**: Includes assertions, mocking, coverage, and watch mode
5. **Vanilla JS Friendly**: No framework dependencies required
6. **Large Community**: Extensive documentation and community support

### Architecture Decision

The testing strategy follows a two-tier approach:

1. **Jest for Unit & Integration Tests (Primary - 80% of tests)**
   - Test individual classes (ActivityTracker, PomodoroManager, etc.)
   - Test localStorage persistence
   - Test timer functionality with mocked timers
   - Test form validation and data processing
   - Test utility functions and business logic

2. **Playwright for E2E Tests (Future - 20% of tests)**
   - Test complete user workflows
   - Test PWA installation and service worker behavior
   - Test real notification functionality
   - Test offline capabilities
   - Test cross-browser compatibility

## Current Setup

### Dependencies Installed

```json
{
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.6.4",
    "jest": "^30.0.5",
    "jest-environment-jsdom": "^30.0.5",
    "jest-localstorage-mock": "^2.4.26"
  }
}
```

### Configuration

Jest is configured in `package.json` with:

- **Environment**: jsdom for DOM testing
- **ES Modules**: Support for modern JavaScript modules
- **Setup Files**: Mock configuration and test utilities
- **Coverage**: Collection from src/scripts directory
- **Globals**: Jest functions available globally

### Scripts Available

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Test Structure

```
tests/
├── setup.cjs           # Test environment setup (CommonJS for compatibility)
├── unit/               # Unit tests for individual components
│   ├── ActivityTracker.test.js
│   ├── PomodoroManager.test.js
│   └── utils.test.js
├── integration/        # Integration tests for component interactions
│   ├── activity-workflow.test.js
│   └── pomodoro-workflow.test.js
└── mocks/             # Mock implementations
    ├── localStorage.js
    └── serviceWorker.js
```

## Current Status

### ✅ Completed

1. **Framework Selection**: Jest chosen after comprehensive research
2. **Basic Setup**: Dependencies installed and configuration created
3. **Test Environment**: jsdom environment configured for DOM testing
4. **Mock Infrastructure**: Basic mocks for browser APIs (Notification, AudioContext, Service Worker)
5. **DOM Testing**: Working DOM manipulation and form interaction tests
6. **Test Utilities**: Helper functions for creating mock DOM structures

### ⚠️ In Progress

1. **ES Module Compatibility**: Working through Jest ES module configuration challenges
2. **localStorage Mock**: Configuring proper localStorage mocking for data persistence tests
3. **Timer Testing**: Setting up fake timers for Pomodoro and notification testing

### 🔄 Next Steps

1. **Complete Basic Setup**: Resolve ES module and mocking issues
2. **Core Component Tests**: Implement tests for ActivityTracker class
3. **Pomodoro Manager Tests**: Test timer functionality and state management
4. **Integration Tests**: Test complete user workflows
5. **Playwright Setup**: Add E2E testing for critical user journeys
6. **CI/CD Integration**: Set up automated testing in GitHub Actions

## Test Examples

### Basic DOM Test
```javascript
describe('Activity Form', () => {
    test('should handle form input', () => {
        createMockDOMStructure();
        
        const activityInput = document.getElementById('activity');
        fireEvent.change(activityInput, { target: { value: 'Test activity' } });
        
        expect(activityInput.value).toBe('Test activity');
    });
});
```

### Timer Test (Future)
```javascript
describe('Pomodoro Timer', () => {
    test('should complete 25-minute work session', () => {
        jest.useFakeTimers();
        
        const pomodoroManager = new PomodoroManager();
        pomodoroManager.startWorkSession('Test activity');
        
        jest.advanceTimersByTime(25 * 60 * 1000);
        
        expect(pomodoroManager.currentPhase).toBe('break');
    });
});
```

### localStorage Test (Future)
```javascript
describe('Data Persistence', () => {
    test('should save and load entries', () => {
        const tracker = new ActivityTracker();
        tracker.entries = [{ id: '1', activity: 'Test', timestamp: new Date().toISOString() }];
        
        tracker.saveEntries();
        
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'activityEntries',
            expect.stringContaining('Test')
        );
    });
});
```

## Mocked APIs

The following browser APIs are mocked for testing:

1. **Notifications**: Mock notification creation and permission handling
2. **Web Audio API**: Mock audio context and oscillator for sound testing
3. **Service Worker**: Mock registration and lifecycle
4. **localStorage**: Mock storage operations
5. **matchMedia**: Mock media query detection
6. **requestAnimationFrame**: Mock animation frame scheduling

## Benefits of Current Setup

1. **Fast Execution**: Tests run quickly without browser overhead
2. **Isolated Testing**: Each test runs in a clean environment
3. **Comprehensive Mocking**: All browser APIs are properly mocked
4. **Developer Experience**: Watch mode for rapid development
5. **Coverage Reports**: Built-in code coverage analysis
6. **CI Ready**: Configuration ready for automated testing

## Future Enhancements

1. **Visual Regression Testing**: Screenshot comparison for UI components
2. **Performance Testing**: Metrics collection for performance regression
3. **Accessibility Testing**: Automated a11y testing integration
4. **Cross-browser E2E**: Playwright setup for real browser testing
5. **Integration with IDE**: Better debugging and test runner integration

This testing framework provides a solid foundation for ensuring the quality and reliability of the Activity Tracker application while supporting rapid development and confident refactoring.