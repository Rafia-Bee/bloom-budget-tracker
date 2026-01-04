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

import { test as base, expect } from '@playwright/test';
import fs from 'fs';

const COOKIES_PATH = 'e2e/.auth/cookies.json';

/**
 * Test credentials for the test account
 */
export const TEST_USER = {
    email: 'test@test.com',
    password: 'test123',
};

/**
 * Load saved cookies from global setup (includes HttpOnly cookies)
 * @returns {Array} Array of cookie objects
 */
function loadSavedCookies() {
    try {
        if (fs.existsSync(COOKIES_PATH)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'));
            return cookies;
        }
    } catch (error) {
        console.warn('Could not load saved cookies:', error.message);
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
            await page.goto('/dashboard');

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
    await page.goto('/login');

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { state: 'visible' });

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
    await page.goto('/dashboard');

    // If redirected to login, do manual login
    if (page.url().includes('/login')) {
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
 * Open the mobile hamburger menu with robust retry logic
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options for opening the menu
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 500)
 * @returns {Promise<boolean>} True if menu was opened successfully
 */
export async function openMobileMenu(page, options = {}) {
    const { maxRetries = 3, retryDelay = 500 } = options;
    const hamburgerButton = page.locator('button[aria-label="Menu"]');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Wait for hamburger to be visible and stable
            await hamburgerButton.waitFor({ state: 'visible', timeout: 5000 });

            // Ensure button is clickable (not covered by other elements)
            await hamburgerButton.click({ timeout: 3000 });

            // Wait for menu animation to complete
            await page.waitForTimeout(300);

            // Verify menu is open by checking multiple indicators
            const menuContainer = page.locator('.mobile-menu-container');
            const menuNav = menuContainer.locator('nav');

            // Wait for the menu container and nav to be visible
            await menuContainer.waitFor({ state: 'visible', timeout: 3000 });
            await menuNav.waitFor({ state: 'visible', timeout: 2000 });

            // Additional check: verify a menu item is actually visible and clickable
            // Look for common menu items (Dashboard, Debts, Goals, Settings, etc.)
            const menuItemVisible = await page
                .locator(
                    '.mobile-menu-container button:has-text("Dashboard"), ' +
                        '.mobile-menu-container button:has-text("Debts"), ' +
                        '.mobile-menu-container button:has-text("Goals"), ' +
                        '.mobile-menu-container button:has-text("Currency")'
                )
                .first()
                .isVisible({ timeout: 2000 });

            if (menuItemVisible) {
                return true;
            }

            // Menu opened but items not visible yet - wait and continue
            if (attempt < maxRetries) {
                await page.waitForTimeout(retryDelay);
            }
        } catch (error) {
            if (attempt < maxRetries) {
                // Close menu if partially opened (click elsewhere)
                try {
                    const overlay = page.locator(
                        ".mobile-menu-container + div, [class*='overlay']"
                    );
                    if (await overlay.isVisible({ timeout: 500 })) {
                        await overlay.click();
                        await page.waitForTimeout(200);
                    }
                } catch {
                    // Ignore cleanup errors
                }
                await page.waitForTimeout(retryDelay);
            }
        }
    }

    return false;
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
    await expect(page).toHaveURL('/login');
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
        const mobileLink = page.locator(`a[href="${path}"], button:has-text("${linkText}")`);
        if (await mobileLink.first().isVisible({ timeout: 2000 })) {
            await mobileLink.first().click();
        } else {
            // Fallback to direct navigation
            await page.goto(path);
        }
    } else {
        // Desktop: Try direct link first, then user menu
        const directLink = page.locator(`a[href="${path}"], nav a:has-text("${linkText}")`);
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
        (response) => response.url().includes(urlPattern) && response.status() === 200
    );
}

/**
 * Wait for any pending API calls to complete (with timeout)
 * More reliable than waitForTimeout for API-dependent operations
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Maximum time to wait in ms (default: 5000)
 */
export async function waitForNetworkSettled(page, timeout = 5000) {
    try {
        await page.waitForLoadState('networkidle', { timeout });
    } catch {
        // Network didn't settle in time - continue anyway
        // This prevents tests from hanging on slow API responses
    }
}

/**
 * Wait for an element to appear after an action (e.g., form submission)
 * More reliable than waitForTimeout for UI state changes
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector to wait for
 * @param {object} options - Options for waiting
 * @param {number} options.timeout - Maximum time to wait (default: 10000)
 * @param {boolean} options.shouldNotExist - Wait for element to disappear (default: false)
 * @returns {Promise<boolean>} True if condition was met
 */
export async function waitForElement(page, selector, options = {}) {
    const { timeout = 10000, shouldNotExist = false } = options;
    try {
        const locator = page.locator(selector).first();
        if (shouldNotExist) {
            await locator.waitFor({ state: 'hidden', timeout });
        } else {
            await locator.waitFor({ state: 'visible', timeout });
        }
        return true;
    } catch {
        return false;
    }
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
    await page.waitForLoadState('networkidle');
}

// Re-export expect for convenience
export { expect };
