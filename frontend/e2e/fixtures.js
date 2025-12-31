/**
 * E2E Test Utilities and Fixtures for Bloom Budget Tracker
 *
 * Provides reusable test fixtures, helper functions, and page objects
 * for consistent E2E testing across all test files.
 *
 * IMPORTANT: HttpOnly cookies (JWT auth) require special handling.
 * The global-setup.js saves cookies to cookies.json using context.cookies().
 * Tests must restore these cookies via context.addCookies() before navigating.
 */

import { test as base, expect } from "@playwright/test";
import fs from "fs";

const COOKIES_PATH = "e2e/.auth/cookies.json";

/**
 * Test credentials for the test account
 */
export const TEST_USER = {
    email: "test@test.com",
    password: "test123",
};

/**
 * Load saved cookies from global setup (includes HttpOnly cookies)
 * @returns {Array} Array of cookie objects
 */
function loadSavedCookies() {
    try {
        if (fs.existsSync(COOKIES_PATH)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf-8"));
            return cookies;
        }
    } catch (error) {
        console.warn("Could not load saved cookies:", error.message);
    }
    return [];
}

/**
 * Extended test fixture with automatic HttpOnly cookie restoration
 *
 * This fixture solves the HttpOnly cookie problem by:
 * 1. Reading cookies saved by global-setup.js (which uses context.cookies())
 * 2. Adding them to the browser context via context.addCookies()
 * 3. This works because addCookies CAN set HttpOnly cookies
 */
export const test = base.extend({
    /**
     * Auto-fixture that restores HttpOnly cookies before each test
     * This runs automatically for all tests using this fixture
     */
    page: async ({ page, context }, use) => {
        // Load and restore cookies (including HttpOnly JWT)
        const savedCookies = loadSavedCookies();
        if (savedCookies.length > 0) {
            await context.addCookies(savedCookies);
        }

        await use(page);
    },

    /**
     * Fixture that ensures we're authenticated on dashboard
     * Use this when you need guaranteed authenticated state
     */
    authenticatedPage: [
        async ({ page, context }, use) => {
            // Load and restore cookies
            const savedCookies = loadSavedCookies();
            if (savedCookies.length > 0) {
                await context.addCookies(savedCookies);
            }

            // Navigate to dashboard
            await page.goto("/dashboard");

            // Check if we're authenticated
            const isAuthenticated = await page
                .waitForURL(/\/(dashboard)?$/, { timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (!isAuthenticated) {
                // Fall back to manual login if cookies didn't work
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
 * Helper to ensure page is authenticated, logging in if needed
 * Use this in beforeEach hooks for tests that require auth
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {import('@playwright/test').BrowserContext} context - Browser context
 */
export async function ensureAuthenticated(page, context) {
    // Restore cookies
    const savedCookies = loadSavedCookies();
    if (savedCookies.length > 0) {
        await context.addCookies(savedCookies);
    }

    // Navigate and check auth
    await page.goto("/dashboard");

    // If redirected to login, do manual login
    if (page.url().includes("/login")) {
        await loginAsTestUser(page);
    }
}

/**
 * Check if the current viewport is mobile-sized
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if viewport width < 768px (md breakpoint)
 */
export async function isMobileViewport(page) {
    const viewport = page.viewportSize();
    return viewport && viewport.width < 768;
}

/**
 * Open the mobile hamburger menu
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if menu was opened successfully
 */
export async function openMobileMenu(page) {
    const hamburgerButton = page.locator('button[aria-label="Menu"]');
    // Wait for hamburger to be visible first (page must be loaded)
    try {
        await hamburgerButton.waitFor({ state: "visible", timeout: 5000 });
        await hamburgerButton.click();
        // Wait for menu animation and content to be visible
        await page.waitForTimeout(500);
        // Verify menu is open by checking for a nav element or button in the menu
        const menuContent = page.locator(".mobile-menu-container nav");
        await menuContent.waitFor({ state: "visible", timeout: 3000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Helper to log out current user (works on both desktop and mobile viewports)
 * Uses element visibility detection rather than viewport size for reliability.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logout(page) {
    // Wait for either menu button to be visible (page loaded)
    const hamburgerButton = page.locator('button[aria-label="Menu"]');
    const userMenuButton = page.locator('button[title="User menu"]');

    await expect(hamburgerButton.or(userMenuButton)).toBeVisible({
        timeout: 15000,
    });

    // Determine which one is visible and click it
    const isHamburgerVisible = await hamburgerButton.isVisible();

    if (isHamburgerVisible) {
        // Mobile: Use hamburger menu
        await hamburgerButton.click();
    } else {
        // Desktop: Use user menu button
        await userMenuButton.click();
    }

    // Click logout button (same selector works for both menus)
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();
    await expect(page).toHaveURL("/login");
}

/**
 * Navigate to a page using appropriate method for viewport size
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} path - Target path (e.g., '/debts', '/goals', '/settings')
 * @param {string} linkText - Text to look for in navigation (e.g., 'Debts', 'Goals')
 */
export async function navigateToPage(page, path, linkText) {
    const isMobile = await isMobileViewport(page);

    if (isMobile) {
        // Mobile: Use hamburger menu
        await openMobileMenu(page);
        // Look for link in mobile menu
        const mobileLink = page.locator(
            `a[href="${path}"], button:has-text("${linkText}")`
        );
        if (await mobileLink.first().isVisible({ timeout: 2000 })) {
            await mobileLink.first().click();
        } else {
            // Fallback to direct navigation
            await page.goto(path);
        }
    } else {
        // Desktop: Try direct link first, then user menu
        const directLink = page.locator(
            `a[href="${path}"], nav a:has-text("${linkText}")`
        );
        if (await directLink.first().isVisible({ timeout: 2000 })) {
            await directLink.first().click();
        } else {
            // Fallback to direct navigation
            await page.goto(path);
        }
    }

    await expect(page).toHaveURL(path);
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
