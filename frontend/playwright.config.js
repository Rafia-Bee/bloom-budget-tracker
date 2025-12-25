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

    // Run tests in parallel for speed
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry failed tests on CI only
    retries: process.env.CI ? 2 : 0,

    // Limit parallel workers on CI to avoid resource issues
    workers: process.env.CI ? 1 : undefined,

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
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        // Mobile viewport for responsive testing
        {
            name: "mobile",
            use: { ...devices["iPhone 13"] },
        },
    ],

    // Web server configuration - starts both frontend and backend
    webServer: [
        {
            // Backend Flask server
            command: "cd .. && python run.py",
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
