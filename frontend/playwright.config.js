/**
 * Playwright Configuration for Bloom Budget Tracker E2E Tests
 *
 * Configures test execution, browser settings, and web server startup.
 * Tests run against local dev servers (frontend :3000, backend :5000).
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Directory containing test files
    testDir: './e2e',

    // Run tests in parallel for speed (but be careful with rate limits)
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry failed tests to handle flakiness (CI: 2 retries, local: 1 retry)
    // This helps with timing-sensitive tests like mobile menu interactions
    retries: process.env.CI ? 2 : 1,

    // Limit parallel workers to avoid rate limiting on auth endpoints
    // CI uses 1 worker; local uses 2 workers for balance of speed and stability
    workers: process.env.CI ? 1 : 2,

    // Global setup - authenticates once and saves state for all tests
    globalSetup: './e2e/global-setup.js',

    // Reporter configuration
    reporter: [
        ['list'],
        ['html', { open: 'never' }],
        // JSON reporter for CI integration
        ...(process.env.CI ? [['json', { outputFile: 'e2e-results.json' }]] : []),
    ],

    // Shared settings for all tests
    use: {
        // Base URL for navigation
        baseURL: 'http://localhost:3000',

        // Collect trace on first retry for debugging failures
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video recording on retry
        video: 'on-first-retry',

        // Viewport size (mobile-first design)
        viewport: { width: 1280, height: 720 },

        // Timeout for actions like click, fill (increased from 10s to 15s for slow API)
        actionTimeout: 15000,
    },

    // Global timeout for each test (increased from 30s to 45s for mobile tests)
    timeout: 45000,

    // Configure projects for different browsers
    projects: [
        // Tests that don't need authentication (runs first)
        {
            name: 'setup',
            testMatch: /unauthenticated\.spec\.js/,
            use: { ...devices['Desktop Chrome'] },
        },
        // Balance-related tests run serially in TWO stages to avoid shared user data conflicts
        // These tests modify user-level balance fields that affect each other
        // Stage 1: balance-mode tests
        {
            name: 'balance-mode-tests',
            testMatch: /balance-mode\.spec\.js/,
            use: { ...devices['Desktop Chrome'] },
            fullyParallel: false,
            dependencies: ['setup'],
        },
        // Stage 2: balance-accumulation tests (depends on balance-mode to ensure serial)
        {
            name: 'balance-accumulation-tests',
            testMatch: /balance-accumulation\.spec\.js/,
            use: { ...devices['Desktop Chrome'] },
            fullyParallel: false,
            dependencies: ['balance-mode-tests'],
        },
        // Main test suite - auth cookies restored via fixtures.js
        // (storageState removed - doesn't support HttpOnly cookies)
        {
            name: 'chromium',
            testIgnore: [/unauthenticated\.spec\.js/, /balance-(mode|accumulation)\.spec\.js/],
            use: {
                ...devices['Desktop Chrome'],
            },
            dependencies: ['setup'],
        },
        // Mobile viewport for responsive testing (skip in CI to save time)
        // Balance tests excluded from mobile - they only test backend balance logic,
        // not UI responsiveness, and running them twice would slow down the suite
        ...(process.env.CI
            ? []
            : [
                  {
                      name: 'mobile',
                      testIgnore: [
                          /unauthenticated\.spec\.js/,
                          /balance-(mode|accumulation)\.spec\.js/,
                      ],
                      use: {
                          ...devices['iPhone 13'],
                      },
                      dependencies: ['setup'],
                  },
              ]),
    ],

    // Web server configuration - starts both frontend and backend
    webServer: [
        {
            // Backend Flask server
            // On Windows, use .venv; on CI (Linux), python is in PATH
            command:
                process.platform === 'win32'
                    ? 'cd .. && .venv\\Scripts\\python run.py'
                    : 'cd .. && python run.py',
            url: 'http://localhost:5000/api/v1/currencies',
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
            env: {
                FLASK_ENV: 'development',
            },
        },
        {
            // Frontend Vite dev server
            command: 'npm run dev',
            url: 'http://localhost:3000',
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
            env: {
                // Override any .env.local settings to ensure localhost for tests
                VITE_API_URL: 'http://localhost:5000/api/v1',
            },
        },
    ],

    // Output directory for test artifacts
    outputDir: 'e2e-results',

    // Expect configuration
    expect: {
        // Timeout for expect assertions (increased from 5s to 8s for mobile)
        timeout: 8000,
    },
});
