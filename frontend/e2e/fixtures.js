/**
 * E2E Test Utilities and Fixtures for Bloom Budget Tracker
 *
 * Provides reusable test fixtures, helper functions, and page objects
 * for consistent E2E testing across all test files.
 *
 * Note: Most tests use global auth state from global-setup.js.
 * The loginAsTestUser function is kept for tests that need fresh login.
 */

import { test as base, expect } from "@playwright/test";

/**
 * Test credentials for the test account
 */
export const TEST_USER = {
    email: "test@test.com",
    password: "test123",
};

/**
 * Extended test fixture with common utilities
 */
export const test = base.extend({
    /**
     * Auto-fixture that ensures we're on dashboard before each test
     * Works with both global auth state and fresh login
     */
    authenticatedPage: [
        async ({ page }, use) => {
            // Try to navigate to dashboard
            await page.goto("/dashboard");

            // Check if we're authenticated (global auth state should work)
            const isAuthenticated = await page
                .waitForURL(/\/(dashboard)?$/, { timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (!isAuthenticated) {
                // Fall back to manual login if global auth didn't work
                await loginAsTestUser(page);
            }

            await use(page);
        },
        { auto: false },
    ],
});

/**
 * Helper to log in as test user (for tests that need fresh login)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function loginAsTestUser(page) {
    await page.goto("/login");

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { state: "visible" });

    // Clear and fill email
    await page.locator('input[type="email"]').clear();
    await page.locator('input[type="email"]').fill(TEST_USER.email);

    // Clear and fill password
    await page.locator('input[type="password"]').clear();
    await page.locator('input[type="password"]').fill(TEST_USER.password);

    // Wait a moment for React state to update
    await page.waitForTimeout(100);

    // Click submit and wait for navigation
    await Promise.all([
        page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 }),
        page.click('button[type="submit"]'),
    ]);
}

/**
 * Helper to log out current user
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logout(page) {
    // Open settings/menu and click logout
    // Adjust selector based on actual UI
    const menuButton = page.locator(
        '[data-testid="menu-button"], button:has-text("Menu")'
    );
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    await expect(page).toHaveURL("/login");
}

/**
 * Helper to wait for API response
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} urlPattern - URL pattern to wait for
 */
export async function waitForAPI(page, urlPattern) {
    return page.waitForResponse(
        (response) =>
            response.url().includes(urlPattern) && response.status() === 200
    );
}

/**
 * Format amount as cents to euros display (for assertions)
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency string
 */
export function formatCurrency(cents) {
    return `€${(cents / 100).toFixed(2)}`;
}

/**
 * Wait for page to be fully loaded (no pending network requests)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForPageLoad(page) {
    await page.waitForLoadState("networkidle");
}

// Re-export expect for convenience
export { expect };
