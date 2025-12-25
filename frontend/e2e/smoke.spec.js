/**
 * Smoke Tests - Basic App Health Checks
 *
 * Verifies the app loads correctly and basic functionality works.
 * These are the first tests that run to ensure the app is operational.
 */

import { test, expect } from "./fixtures.js";

test.describe("Smoke Tests", () => {
    test("app loads without errors", async ({ page }) => {
        // Navigate to the app
        await page.goto("/");

        // Should redirect to login since not authenticated
        await expect(page).toHaveURL("/login");

        // Page should have title
        await expect(page).toHaveTitle(/Bloom/i);

        // No JavaScript errors should be present
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));

        // Wait a moment for any async errors
        await page.waitForTimeout(1000);

        expect(errors).toHaveLength(0);
    });

    test("login page renders correctly", async ({ page }) => {
        await page.goto("/login");

        // Check essential form elements exist
        // Use type selectors since the form doesn't use name attributes
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check for link to register
        await expect(page.locator('a[href="/register"]')).toBeVisible();
    });

    test("register page renders correctly", async ({ page }) => {
        await page.goto("/register");

        // Check essential form elements exist
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(
            page.locator('input[type="password"]').first()
        ).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check for link to login
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });
});
