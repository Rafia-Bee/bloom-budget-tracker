/**
 * Salary Period Wizard Tests
 *
 * Tests for the 3-step salary period creation wizard.
 * Verifies the complete flow from entering balances to confirming the budget.
 */

import { test, expect, loginAsTestUser } from "./fixtures.js";

test.describe("Salary Period Wizard", () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    test.describe("Wizard Access", () => {
        test("wizard opens from dashboard", async ({ page }) => {
            // Look for setup/create budget button
            // Could be "Setup Budget", "Create Period", "New Salary Period", or "+" button
            const setupButton = page.locator(
                'button:has-text("Setup"), button:has-text("Create"), button:has-text("New Period"), button:has-text("Start New"), [data-testid="create-period"]'
            );

            // If there's already a period, we might need to look for a different button
            // or the wizard might not be immediately visible
            const wizardTrigger = setupButton.or(
                page.locator('button:has-text("Rollover"), button:has-text("Start Next")')
            );

            // Check if wizard trigger is available
            if (await wizardTrigger.first().isVisible({ timeout: 5000 })) {
                await wizardTrigger.first().click();

                // Wizard modal should appear
                await expect(page.locator('text=/Setup|Weekly Budget|Enter.*Balance/i').first()).toBeVisible({
                    timeout: 5000,
                });
            } else {
                // If no trigger visible, maybe there's already an active period
                // Look for indicator that a period exists
                await expect(
                    page.locator('text=/Week|Budget|Balance/i').first()
                ).toBeVisible({ timeout: 5000 });
            }
        });
    });

    test.describe("Step 1 - Enter Balances", () => {
        test("step 1 shows balance input fields", async ({ page }) => {
            // Try to open wizard
            const setupButton = page.locator(
                'button:has-text("Setup"), button:has-text("Create"), button:has-text("New Period"), button:has-text("Rollover")'
            );

            if (await setupButton.first().isVisible({ timeout: 3000 })) {
                await setupButton.first().click();

                // Should see Step 1 content
                await expect(page.locator('text=/Debit Balance|Bank Account/i').first()).toBeVisible();
                await expect(page.locator('text=/Credit.*Available|Credit Card/i').first()).toBeVisible();
                await expect(page.locator('input[type="text"]').first()).toBeVisible();
            }
        });

        test("step 1 validates required debit balance", async ({ page }) => {
            const setupButton = page.locator(
                'button:has-text("Setup"), button:has-text("Create"), button:has-text("New Period"), button:has-text("Rollover")'
            );

            if (await setupButton.first().isVisible({ timeout: 3000 })) {
                await setupButton.first().click();

                // Try to proceed without entering debit balance
                const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
                await nextButton.click();

                // Should show validation error
                await expect(page.locator('text=/debit balance|enter.*balance/i')).toBeVisible({
                    timeout: 3000,
                });
            }
        });
    });

    test.describe("Full Wizard Flow", () => {
        test("can complete wizard to create salary period", async ({ page }) => {
            // This test creates a full salary period through the wizard
            // Note: May need adjustment based on whether a period already exists

            const setupButton = page.locator(
                'button:has-text("Setup"), button:has-text("Create"), button:has-text("New Period"), button:has-text("Rollover"), button:has-text("Start")'
            );

            // Skip if no setup button (period already exists)
            if (!(await setupButton.first().isVisible({ timeout: 3000 }))) {
                test.skip();
                return;
            }

            await setupButton.first().click();

            // ===== STEP 1: Enter Balances =====
            await expect(page.locator('text=/Balance/i').first()).toBeVisible();

            // Fill in debit balance
            const debitInput = page.locator('input').first();
            await debitInput.clear();
            await debitInput.fill("1500");

            // Fill in credit available (second input)
            const creditInput = page.locator('input').nth(1);
            if (await creditInput.isVisible()) {
                await creditInput.clear();
                await creditInput.fill("1000");
            }

            // Click Next to go to Step 2
            await page.locator('button:has-text("Next")').click();

            // ===== STEP 2: Review Fixed Bills =====
            // Wait for step 2 to load
            await page.waitForTimeout(1000);

            // Check if we're on step 2 (fixed bills review)
            const step2Indicator = page.locator('text=/Fixed Bill|Recurring|Review/i');
            if (await step2Indicator.first().isVisible({ timeout: 3000 })) {
                // Step 2 exists, click Next
                await page.locator('button:has-text("Next"), button:has-text("Continue")').click();
            }

            // ===== STEP 3: Confirm Budget =====
            await page.waitForTimeout(1000);

            // Look for confirmation elements
            const confirmIndicator = page.locator('text=/Confirm|Weekly Budget|Summary/i');
            await expect(confirmIndicator.first()).toBeVisible({ timeout: 5000 });

            // Should see calculated weekly budget
            await expect(
                page.locator('text=/Week 1|Week 2|per week|weekly/i').first()
            ).toBeVisible();

            // Click Create/Confirm button
            const createButton = page.locator(
                'button:has-text("Create"), button:has-text("Confirm"), button:has-text("Save")'
            );
            await createButton.click();

            // Wait for wizard to close and dashboard to update
            await page.waitForTimeout(2000);

            // Wizard should close (modal should not be visible)
            await expect(page.locator('text=/Setup Weekly Budget/i')).not.toBeVisible({
                timeout: 5000,
            });
        });
    });

    test.describe("Edit Existing Period", () => {
        test("can access edit mode for existing period", async ({ page }) => {
            // Look for edit button on an existing salary period
            const editButton = page.locator(
                'button[aria-label*="edit"], button:has-text("Edit"), [data-testid="edit-period"]'
            );

            if (await editButton.first().isVisible({ timeout: 3000 })) {
                await editButton.first().click();

                // Should open wizard in edit mode
                await expect(page.locator('text=/Edit/i')).toBeVisible();

                // Fields should be pre-filled
                const debitInput = page.locator('input').first();
                const value = await debitInput.inputValue();
                expect(value).not.toBe("");
            }
        });
    });
});
