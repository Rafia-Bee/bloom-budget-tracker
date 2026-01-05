/**
 * Authentication Flow Tests
 *
 * Tests for login, logout, and session management.
 * Uses the test account (test@test.com / test) for authenticated flows.
 *
 * NOTE: This file imports test from @playwright/test but helpers from fixtures.js.
 * This allows testing login/logout without automatic cookie restoration.
 */

import { test, expect } from '@playwright/test';
import { TEST_USER, loginAsTestUser, isMobileViewport, openMobileMenu } from './fixtures.js';

// These tests check login/logout behavior - start without auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flow', () => {
    test.describe('Login', () => {
        test('user can log in with valid credentials', async ({ page }) => {
            await page.goto('/login');

            // Fill in credentials (use type selectors - no name attributes)
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);

            // Submit form
            await page.click('button[type="submit"]');

            // Should redirect to dashboard
            await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });

            // Wait for page to fully load (especially important on mobile viewport)
            await page.waitForLoadState('networkidle');

            // Dashboard should show user is logged in
            // On mobile, navigation links are hidden in hamburger menu, so look for
            // actual page content that's visible on all viewports
            // Using "Debit Card" or "Credit Card" which appear in balance cards,
            // or "available" text which appears in the balance display
            // Also check for "Welcome" or "Get Started" in case no salary periods exist
            await expect(
                page
                    .locator(
                        'text=/Debit Card|Credit Card|available|Spent this period|Welcome|Get Started|Create.*Period/i'
                    )
                    .first()
            ).toBeVisible({ timeout: 15000 });
        });

        test('login persists across page reload', async ({ page }) => {
            // Login
            await loginAsTestUser(page);

            // Reload the page
            await page.reload();

            // Should still be on dashboard, not redirected to login
            await expect(page).not.toHaveURL('/login', { timeout: 5000 });
        });
    });

    test.describe('Logout', () => {
        test('user can log out', async ({ page }) => {
            // Login first
            await loginAsTestUser(page);

            // Wait for page to fully load
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1500); // Extra buffer for UI to settle

            // Check if mobile hamburger menu is visible
            const hamburgerButton = page.locator('button[aria-label="Menu"]');
            const userMenuButton = page.locator('button[title="User menu"]');

            // Check which menu is visible and click it
            // On mobile (< 768px), hamburger is visible; on desktop, user menu is visible
            if (await hamburgerButton.isVisible({ timeout: 5000 })) {
                // Mobile: Use hamburger menu
                await hamburgerButton.click();
            } else {
                // Desktop: Use user menu button
                await expect(userMenuButton).toBeVisible({ timeout: 5000 });
                await userMenuButton.click();
            }

            // Wait for menu to appear and click logout
            const logoutButton = page.locator('button:has-text("Logout")');
            await expect(logoutButton).toBeVisible({ timeout: 5000 });

            // Scroll into view to ensure it's clickable on small screens
            await logoutButton.scrollIntoViewIfNeeded();

            // Use force click to handle mobile menu where button might be outside viewport
            await logoutButton.click({ force: true });

            // Should redirect to login
            await expect(page).toHaveURL('/login', { timeout: 10000 });
        });

        test('after logout, protected routes redirect to login', async ({ page }) => {
            // Login first
            await loginAsTestUser(page);

            // Wait for page to load (look for any dashboard content)
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Extra buffer for UI to settle

            // Use viewport-based detection for mobile (more reliable than element visibility)
            const isMobile = await isMobileViewport(page);
            const userMenuButton = page.locator('button[title="User menu"]');

            if (isMobile) {
                // Mobile: Use hamburger menu
                await openMobileMenu(page);
            } else {
                // Desktop: Use user menu button
                await expect(userMenuButton).toBeVisible({ timeout: 5000 });
                await userMenuButton.click();
            }

            // Wait for menu to appear and click logout
            const logoutButton = page.locator('button:has-text("Logout")');
            await expect(logoutButton).toBeVisible({ timeout: 5000 });

            // Scroll into view to ensure it's clickable on small screens
            await logoutButton.scrollIntoViewIfNeeded();

            // Use force click to handle mobile menu where button might be outside viewport
            await logoutButton.click({ force: true });

            // Wait for redirect to login
            await expect(page).toHaveURL('/login', { timeout: 10000 });

            // Try to access protected route
            await page.goto('/dashboard');

            // Should redirect back to login
            await expect(page).toHaveURL('/login');
        });
    });

    test.describe('Session Management', () => {
        test('authenticated user can access protected routes', async ({ page }) => {
            await loginAsTestUser(page);

            // Navigate to various protected routes
            // Just verify URL and that page loaded without error (not specific content)
            const protectedRoutes = ['/debts', '/goals', '/settings'];

            for (const path of protectedRoutes) {
                await page.goto(path);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(500);

                // Verify we're on the right page (not redirected to login)
                await expect(page).toHaveURL(path);

                // Verify page loaded (any content visible means auth worked)
                await expect(page.locator('body')).toBeVisible();
            }
        });

        test('api requests include auth cookies automatically', async ({ page, context }) => {
            await loginAsTestUser(page);

            // Make an API call that requires auth
            const responsePromise = page.waitForResponse(
                (response) =>
                    response.url().includes('/api/v1/salary-periods') && response.status() < 400
            );

            // Navigate to dashboard which triggers salary periods fetch
            await page.goto('/');

            const response = await responsePromise;

            // Should not get 401
            expect(response.status()).not.toBe(401);
        });
    });
});
