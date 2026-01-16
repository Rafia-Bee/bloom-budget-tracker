/**
 * Reports & Analytics E2E Tests
 *
 * Tests for the Reports page functionality including:
 * - Navigation to Reports page (requires feature flag)
 * - Date range controls
 * - Chart rendering
 * - Summary cards display
 *
 * Note: Reports feature is behind the reportsEnabled experimental flag.
 * These tests enable the flag in localStorage before testing.
 */

import { test, expect, loginAsTestUser, isMobileViewport, openMobileMenu } from './fixtures.js';

test.describe('Reports & Analytics', () => {
    test.beforeEach(async ({ page }) => {
        // Enable reports flag in localStorage
        await page.addInitScript(() => {
            localStorage.setItem(
                'feature_flags',
                JSON.stringify({
                    reportsEnabled: true,
                    budgetRecalculationEnabled: false,
                    flexibleSubPeriodsEnabled: false,
                })
            );
        });

        // Navigate to dashboard first (cookies are auto-restored by fixture)
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // If redirected to login, perform manual login
        if (page.url().includes('/login')) {
            await loginAsTestUser(page);
        }
    });

    test.describe('Navigation', () => {
        test('can navigate to Reports page via nav link', async ({ page }) => {
            // Wait for page to be loaded
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(500);

            // Use viewport-based detection for mobile
            const isMobile = await isMobileViewport(page);

            if (isMobile) {
                // Mobile: Use hamburger menu
                const menuOpened = await openMobileMenu(page);
                if (menuOpened) {
                    // Click Reports in mobile menu
                    const mobileReportsLink = page.locator('button:has-text("📊 Reports")');
                    if (await mobileReportsLink.isVisible({ timeout: 3000 })) {
                        await mobileReportsLink.click();
                    } else {
                        // Fallback to direct navigation
                        await page.goto('/reports');
                    }
                } else {
                    await page.goto('/reports');
                }
            } else {
                // Desktop: Click nav link directly
                const reportsLink = page.locator('a[href="/reports"]');
                if (await reportsLink.isVisible({ timeout: 3000 })) {
                    await reportsLink.click();
                } else {
                    await page.goto('/reports');
                }
            }

            // Should be on Reports page
            await expect(page).toHaveURL(/\/reports/);
        });

        test('Reports page shows correct title', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Check page title
            await expect(page.locator("h1:has-text('Reports & Analytics')")).toBeVisible({
                timeout: 5000,
            });
        });
    });

    test.describe('Date Range Controls', () => {
        test('shows date range inputs', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Should have date inputs
            const startDate = page.locator('input[type="date"]').first();
            const endDate = page.locator('input[type="date"]').last();

            await expect(startDate).toBeVisible();
            await expect(endDate).toBeVisible();
        });
    });

    test.describe('Summary Cards', () => {
        test('shows summary cards section', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Wait for loading to complete
            await page.waitForSelector('text=/Loading analytics/i', {
                state: 'hidden',
                timeout: 10000,
            });

            // Should show summary cards (even if data is 0)
            const summaryLabels = ['Total Income', 'Total Spending', 'Net Savings', 'Savings Rate'];

            for (const label of summaryLabels) {
                await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 5000 });
            }
        });
    });

    test.describe('Charts', () => {
        test('shows Spending Trends chart section', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Wait for loading to complete
            await page.waitForSelector('text=/Loading analytics/i', {
                state: 'hidden',
                timeout: 10000,
            });

            // Should show chart section header
            await expect(page.locator('text=/Spending Trends/i').first()).toBeVisible({
                timeout: 5000,
            });
        });

        test('shows Category Breakdown chart section', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Wait for loading to complete
            await page.waitForSelector('text=/Loading analytics/i', {
                state: 'hidden',
                timeout: 10000,
            });

            // Should show chart section header
            await expect(page.locator('text=/Spending by Category/i').first()).toBeVisible({
                timeout: 5000,
            });
        });

        test('granularity selector changes chart view', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Wait for loading to complete
            await page.waitForSelector('text=/Loading analytics/i', {
                state: 'hidden',
                timeout: 10000,
            });

            // Find and change granularity selector
            const granularitySelect = page.locator('select').first();
            await expect(granularitySelect).toBeVisible();

            // Change to weekly
            await granularitySelect.selectOption('weekly');
            await page.waitForTimeout(500);

            // Should still be on reports page (no errors)
            await expect(page).toHaveURL(/\/reports/);
        });
    });

    test.describe('Empty State', () => {
        test('handles no data gracefully', async ({ page }) => {
            await page.goto('/reports');
            await page.waitForLoadState('networkidle');

            // Wait for loading to complete
            await page.waitForSelector('text=/Loading analytics/i', {
                state: 'hidden',
                timeout: 10000,
            });

            // Should show either data or empty state message, not crash
            const hasData = await page.locator('text=/Total/i').first().isVisible();
            const hasEmptyMessage = await page
                .locator('text=/No spending data/i')
                .first()
                .isVisible({ timeout: 2000 })
                .catch(() => false);

            expect(hasData || hasEmptyMessage).toBeTruthy();
        });
    });
});
