/**
 * Playwright Configuration for Bloom Budget Tracker E2E Tests
 *
 * Configures test execution, browser settings, and web server startup.
 * Tests run against local dev servers (frontend :3000, backend :5000).
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    // Directory containing test files
    testDir: "./e2e",

    // Run tests in parallel for speed (but be careful with rate limits)
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry failed tests on CI only
    retries: process.env.CI ? 2 : 0,

    // Limit parallel workers to avoid rate limiting on auth endpoints
    // CI uses 1 worker; local uses 2 workers for balance of speed and stability
    workers: process.env.CI ? 1 : 2,

    // Global setup - authenticates once and saves state for all tests
    globalSetup: "./e2e/global-setup.js",

    // Reporter configuration
    reporter: [
        ["list"],
        ["html", { open: "never" }],
        // JSON reporter for CI integration
        ...(process.env.CI
            ? [["json", { outputFile: "e2e-results.json" }]]
            : []),
    ],

    // Shared settings for all tests
    use: {
        // Base URL for navigation
        baseURL: "http://localhost:3000",

        // Collect trace on first retry for debugging failures
        trace: "on-first-retry",

        // Screenshot on failure
        screenshot: "only-on-failure",

        // Video recording on retry
        video: "on-first-retry",

        // Viewport size (mobile-first design)
        viewport: { width: 1280, height: 720 },

        // Timeout for actions like click, fill
        actionTimeout: 10000,
    },

    // Global timeout for each test
    timeout: 30000,

    // Configure projects for different browsers
    projects: [
        // Tests that don't need authentication
        {
            name: "setup",
            testMatch: /unauthenticated\.spec\.js/,
            use: { ...devices["Desktop Chrome"] },
        },
        // Main test suite with shared auth state
        {
            name: "chromium",
            testIgnore: /unauthenticated\.spec\.js/,
            use: {
                ...devices["Desktop Chrome"],
                // Use saved authentication state
                storageState: "e2e/.auth/user.json",
            },
            dependencies: ["setup"],
        },
        // Mobile viewport for responsive testing
        {
            name: "mobile",
            testIgnore: /unauthenticated\.spec\.js/,
            use: {
                ...devices["iPhone 13"],
                storageState: "e2e/.auth/user.json",
            },
            dependencies: ["setup"],
        },
    ],

    // Web server configuration - starts both frontend and backend
    webServer: [
        {
            // Backend Flask server
            // On Windows, use .venv; on CI (Linux), python is in PATH
            command:
                process.platform === "win32"
                    ? "cd .. && .venv\\Scripts\\python run.py"
                    : "cd .. && python run.py",
            url: "http://localhost:5000/api/v1/currencies",
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
            env: {
                FLASK_ENV: "development",
            },
        },
        {
            // Frontend Vite dev server
            command: "npm run dev",
            url: "http://localhost:3000",
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
            env: {
                // Override any .env.local settings to ensure localhost for tests
                VITE_API_URL: "http://localhost:5000/api/v1",
            },
        },
    ],

    // Output directory for test artifacts
    outputDir: "e2e-results",

    // Expect configuration
    expect: {
        // Timeout for expect assertions
        timeout: 5000,
    },
});
