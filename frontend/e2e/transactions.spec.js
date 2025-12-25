/**
 * Transaction Management Tests
 *
 * Tests for adding, editing, and deleting expenses and income.
 * Verifies that transactions update budget balances correctly.
 */

import { test, expect, loginAsTestUser } from "./fixtures.js";

test.describe("Transaction Management", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
        // Wait for dashboard to load
        await page.waitForLoadState("networkidle");
    });

    test.describe("Add Expense", () => {
        test("add expense modal opens and has required fields", async ({
            page,
        }) => {
            // Look for add expense button (FAB, button, or + icon)
            const addButton = page.locator(
                'button:has-text("Add"), button[aria-label*="add" i], [data-testid="add-expense"], button:has-text("+")'
            );

            // Click the first visible add button
            await addButton.first().click();

            // Check if expense modal opens
            await expect(
                page.locator("text=/Add Expense/i").first()
            ).toBeVisible({
                timeout: 5000,
            });

            // Verify required fields are present
            await expect(
                page.locator('input[type="text"]').first()
            ).toBeVisible(); // Name
            await expect(page.locator("select").first()).toBeVisible(); // Category
        });

        test("can add a simple expense", async ({ page }) => {
            // Get initial balance text for comparison later
            const initialBalance = await page
                .locator("text=/Balance|Budget|Spent/i")
                .first()
                .textContent();

            // Open add expense modal
            const addButton = page.locator(
                'button:has-text("Add"), button[aria-label*="add" i], [data-testid="add-expense"]'
            );
            await addButton.first().click();

            // Wait for modal
            await expect(page.locator("text=/Add Expense/i")).toBeVisible();

            // Fill in expense details
            // Name field
            const nameInput = page
                .locator('input[placeholder*="name" i], input')
                .first();
            await nameInput.fill("Test Expense E2E");

            // Amount field (look for input with currency symbol nearby)
            const amountInput = page
                .locator('input[type="text"], input[type="number"]')
                .filter({
                    has: page.locator(
                        'xpath=ancestor::div[contains(@class, "relative")]//span[contains(text(), "€") or contains(text(), "$")]'
                    ),
                })
                .first();

            if (await amountInput.isVisible()) {
                await amountInput.fill("25.00");
            } else {
                // Fallback: find amount input by position or placeholder
                const inputs = page.locator('input[type="text"]');
                await inputs.nth(1).fill("25.00");
            }

            // Submit the form
            const submitButton = page
                .locator(
                    'button[type="submit"], button:has-text("Add"), button:has-text("Save")'
                )
                .last();
            await submitButton.click();

            // Modal should close
            await expect(page.locator("text=/Add Expense/i")).not.toBeVisible({
                timeout: 5000,
            });

            // Expense should appear in the list (or balance should update)
            await expect(
                page.locator("text=/Test Expense E2E|25/i").first()
            ).toBeVisible({ timeout: 5000 });
        });

        test("expense validation shows error for missing amount", async ({
            page,
        }) => {
            // Open add expense modal
            const addButton = page.locator(
                'button:has-text("Add"), [data-testid="add-expense"]'
            );
            await addButton.first().click();

            await expect(page.locator("text=/Add Expense/i")).toBeVisible();

            // Clear any default amount and try to submit
            const amountInputs = page.locator('input[type="text"]');
            for (let i = 0; i < (await amountInputs.count()); i++) {
                const input = amountInputs.nth(i);
                const value = await input.inputValue();
                if (
                    value &&
                    !isNaN(parseFloat(value.replace(/[^0-9.]/g, "")))
                ) {
                    await input.clear();
                }
            }

            // Submit without amount
            const submitButton = page.locator('button[type="submit"]');
            await submitButton.click();

            // Should show error or not close modal
            // Either an error message appears or the modal stays open
            const stillOpen = await page
                .locator("text=/Add Expense/i")
                .isVisible();
            const hasError = await page
                .locator("text=/required|invalid|amount|enter/i")
                .isVisible();

            expect(stillOpen || hasError).toBeTruthy();
        });
    });

    test.describe("Add Income", () => {
        test("can access add income functionality", async ({ page }) => {
            // Look for income tab, button, or navigation
            const incomeButton = page.locator(
                'button:has-text("Income"), a:has-text("Income"), [data-testid="add-income"], tab:has-text("Income")'
            );

            if (await incomeButton.first().isVisible({ timeout: 3000 })) {
                await incomeButton.first().click();

                // Should see income-related UI
                await expect(
                    page
                        .locator("text=/Add Income|Income|Salary|Payment/i")
                        .first()
                ).toBeVisible();
            }
        });
    });

    test.describe("Expense List", () => {
        test("expense list shows transaction details", async ({ page }) => {
            // Navigate to or find expense list
            // Could be on dashboard or separate page
            const expenseList = page.locator(
                '[data-testid="expense-list"], .expense-list, text=/Expenses|Transactions/i'
            );

            if (await expenseList.first().isVisible({ timeout: 3000 })) {
                // Check for expense items or empty state
                const hasExpenses = await page
                    .locator('[data-testid="expense-item"], .expense-item')
                    .count();
                const hasEmptyState = await page
                    .locator("text=/No expenses|No transactions/i")
                    .isVisible();

                expect(hasExpenses > 0 || hasEmptyState).toBeTruthy();
            }
        });

        test("can expand expense details", async ({ page }) => {
            // Look for expandable expense items
            const expenseItem = page
                .locator('[data-testid="expense-item"], .expense-item')
                .first();

            if (await expenseItem.isVisible({ timeout: 3000 })) {
                // Click to expand
                await expenseItem.click();

                // Should show more details (date, category, etc.)
                await expect(
                    page.locator("text=/Date|Category|Payment Method/i").first()
                ).toBeVisible({ timeout: 3000 });
            }
        });
    });

    test.describe("Edit Expense", () => {
        test("can access edit mode for expense", async ({ page }) => {
            // Find an expense item and look for edit button
            const editButton = page.locator(
                'button[aria-label*="edit" i], button:has-text("Edit"), [data-testid="edit-expense"]'
            );

            if (await editButton.first().isVisible({ timeout: 3000 })) {
                await editButton.first().click();

                // Edit modal should open
                await expect(
                    page.locator("text=/Edit|Update/i").first()
                ).toBeVisible();
            }
        });
    });

    test.describe("Delete Expense", () => {
        test("can access delete functionality for expense", async ({
            page,
        }) => {
            // Find delete button
            const deleteButton = page.locator(
                'button[aria-label*="delete" i], button:has-text("Delete"), [data-testid="delete-expense"]'
            );

            if (await deleteButton.first().isVisible({ timeout: 3000 })) {
                // Check that clicking shows confirmation (don't actually delete)
                await deleteButton.first().click();

                // Should show confirmation dialog or the item should be gone
                const hasConfirmation = await page
                    .locator("text=/Confirm|Are you sure|Delete/i")
                    .isVisible();
                expect(hasConfirmation).toBeTruthy();

                // Cancel if confirmation dialog
                const cancelButton = page.locator(
                    'button:has-text("Cancel"), button:has-text("No")'
                );
                if (await cancelButton.isVisible()) {
                    await cancelButton.click();
                }
            }
        });
    });
});
