/**
 * Authentication Flow Tests
 *
 * Tests for login, logout, and session management.
 * Uses the test account (test@test.com / test) for authenticated flows.
 */

import { test, expect, TEST_USER, loginAsTestUser } from "./fixtures.js";

test.describe("Authentication Flow", () => {
    test.describe("Login", () => {
        test("user can log in with valid credentials", async ({ page }) => {
            await page.goto("/login");

            // Fill in credentials
            await page.fill('input[name="email"]', TEST_USER.email);
            await page.fill('input[name="password"]', TEST_USER.password);

            // Submit form
            await page.click('button[type="submit"]');

            // Should redirect to dashboard (root path)
            await expect(page).toHaveURL("/", { timeout: 15000 });

            // Dashboard should show user is logged in (has navigation or user elements)
            // Look for any of these indicators that we're on the dashboard
            await expect(
                page.locator("text=/Dashboard|Budget|Balance|Salary Period/i").first()
            ).toBeVisible({ timeout: 10000 });
        });

        test("login persists across page reload", async ({ page }) => {
            // Login
            await loginAsTestUser(page);

            // Reload the page
            await page.reload();

            // Should still be on dashboard, not redirected to login
            await expect(page).not.toHaveURL("/login", { timeout: 5000 });
        });
    });

    test.describe("Logout", () => {
        test("user can log out", async ({ page }) => {
            // Login first
            await loginAsTestUser(page);

            // Look for logout button in navigation/menu
            // The app might have a hamburger menu or direct logout button
            const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), [data-testid="menu-button"]');
            if (await menuButton.isVisible()) {
                await menuButton.click();
            }

            // Click logout
            const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
            await logoutButton.click();

            // Should redirect to login
            await expect(page).toHaveURL("/login", { timeout: 10000 });
        });

        test("after logout, protected routes redirect to login", async ({ page }) => {
            // Login first
            await loginAsTestUser(page);

            // Find and click logout
            const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), [data-testid="menu-button"]');
            if (await menuButton.isVisible()) {
                await menuButton.click();
            }

            const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
            await logoutButton.click();

            // Wait for redirect to login
            await expect(page).toHaveURL("/login", { timeout: 10000 });

            // Try to access protected route
            await page.goto("/dashboard");

            // Should redirect back to login
            await expect(page).toHaveURL("/login");
        });
    });

    test.describe("Session Management", () => {
        test("authenticated user can access protected routes", async ({ page }) => {
            await loginAsTestUser(page);

            // Navigate to various protected routes
            const protectedRoutes = [
                { path: "/debts", indicator: /Debts|Debt/i },
                { path: "/goals", indicator: /Goals|Goal|Savings/i },
                { path: "/settings", indicator: /Settings|Preferences/i },
            ];

            for (const route of protectedRoutes) {
                await page.goto(route.path);
                await expect(page).toHaveURL(route.path);
                await expect(page.locator(`text=${route.indicator}`).first()).toBeVisible({ timeout: 5000 });
            }
        });

        test("api requests include auth cookies automatically", async ({ page, context }) => {
            await loginAsTestUser(page);

            // Make an API call that requires auth
            const responsePromise = page.waitForResponse((response) => response.url().includes("/api/v1/salary-periods") && response.status() < 400);

            // Navigate to dashboard which triggers salary periods fetch
            await page.goto("/");

            const response = await responsePromise;

            // Should not get 401
            expect(response.status()).not.toBe(401);
        });
    });
});
