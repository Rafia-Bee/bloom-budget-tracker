/**
 * Global Setup for Playwright E2E Tests
 *
 * Runs once before all tests to set up shared authentication state.
 * This avoids hitting rate limits by logging in only once per test run.
 */

import { chromium } from "@playwright/test";

const TEST_USER = {
    email: "test@test.com",
    password: "test123",
};

/**
 * Global setup - authenticates once and saves cookies for all tests
 */
async function globalSetup(config) {
    const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

    // Launch browser for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to login page
        await page.goto(`${baseURL}/login`);

        // Wait for form to be ready
        await page.waitForSelector('input[type="email"]', {
            state: "visible",
            timeout: 10000,
        });

        // Fill credentials
        await page.locator('input[type="email"]').fill(TEST_USER.email);
        await page.locator('input[type="password"]').fill(TEST_USER.password);

        // Submit and wait for redirect
        await Promise.all([
            page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 }),
            page.click('button[type="submit"]'),
        ]);

        // Save authentication state
        await context.storageState({ path: "e2e/.auth/user.json" });

        console.log("✅ Global setup: Authentication state saved");
    } catch (error) {
        console.error("❌ Global setup failed:", error.message);
        // Don't throw - let tests handle auth individually if global setup fails
    } finally {
        await browser.close();
    }
}

export default globalSetup;
