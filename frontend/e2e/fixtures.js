/**
 * E2E Test Utilities and Fixtures for Bloom Budget Tracker
 *
 * Provides reusable test fixtures, helper functions, and page objects
 * for consistent E2E testing across all test files.
 */

import { test as base, expect } from "@playwright/test";

/**
 * Test credentials for the test account
 */
export const TEST_USER = {
    email: "test@test.com",
    password: "test",
};

/**
 * Extended test fixture with common utilities
 */
export const test = base.extend({
    /**
     * Auto-fixture that clears cookies before each test
     * Ensures clean state for authentication tests
     */
    cleanState: [
        async ({ context }, use) => {
            await context.clearCookies();
            await use();
        },
        { auto: true },
    ],
});

/**
 * Helper to log in as test user
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function loginAsTestUser(page) {
    await page.goto("/login");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 10000 });
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
