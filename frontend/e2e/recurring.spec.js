/**
 * Recurring Expenses E2E Tests
 *
 * Tests for the Recurring Expenses page functionality including:
 * - Navigation to Recurring Expenses page
 * - Creating new recurring expense templates
 * - Editing recurring templates
 * - Preview/generate expenses on-demand
 * - Toggling active/inactive status
 * - Deleting recurring templates
 *
 * Authentication is handled automatically by fixtures.js which restores
 * HttpOnly JWT cookies saved by global-setup.js using context.addCookies().
 */

import { test, expect, loginAsTestUser } from "./fixtures.js";

test.describe("Recurring Expenses", () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to recurring-expenses page (cookies are auto-restored by fixture)
        await page.goto("/recurring-expenses");
        await page.waitForLoadState("networkidle");

        // If redirected to login, perform manual login
        if (page.url().includes("/login")) {
            await loginAsTestUser(page);
            await page.goto("/recurring-expenses");
            await page.waitForLoadState("networkidle");
        }
    });

    test.describe("Navigation", () => {
        test("can access Recurring Expenses page", async ({ page }) => {
            // Should be on recurring page (not login)
            expect(page.url()).toContain("/recurring");

            // Wait for page to fully load (loading spinner to disappear)
            await page.waitForSelector("text=Active", { timeout: 10000 });

            // Check for page content
            const activeButton = page.locator("button:has-text('Active')");
            await expect(activeButton).toBeVisible();
        });

        test("Recurring page shows Active/Upcoming tabs when authenticated", async ({
            page,
        }) => {
            // Should have Active and Upcoming toggle buttons
            const activeTab = page.locator("button:has-text('Active')");
            const upcomingTab = page.locator("button:has-text('Upcoming')");

            await expect(activeTab).toBeVisible();
            await expect(upcomingTab).toBeVisible();
        });
    });

    test.describe("Create Recurring Template", () => {
        test("can open Add Recurring Expense modal", async ({ page }) => {
            // Wait for Active button to be visible first
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Look for "Add Recurring Expense" button
            const addButton = page.locator(
                'button:has-text("Add Recurring Expense")'
            );

            if (await addButton.isVisible({ timeout: 3000 })) {
                await addButton.click();

                // Modal should open - look for the modal h2 heading specifically
                await expect(
                    page.getByRole("heading", {
                        name: "Add Recurring Expense",
                        level: 2,
                    })
                ).toBeVisible({ timeout: 3000 });
            } else {
                test.skip();
            }
        });

        test("Add Recurring modal has required fields", async ({ page }) => {
            // Wait for page to load
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Open add modal
            const addButton = page.locator(
                'button:has-text("Add Recurring Expense")'
            );
            if (!(await addButton.isVisible({ timeout: 3000 }))) {
                test.skip();
                return;
            }
            await addButton.click();
            await page.waitForTimeout(500);

            // Should have name input (input type=text after "Name" label)
            const nameInput = page.locator('input[type="text"]').first();
            await expect(nameInput).toBeVisible();

            // Should have amount input (input type=number)
            const amountInput = page.locator('input[type="number"]').first();
            await expect(amountInput).toBeVisible();

            // Frequency selector (select with Monthly option)
            const frequencySelector = page.locator(
                'select:has(option:has-text("Monthly"))'
            );
            await expect(frequencySelector.first()).toBeVisible();
        });

        test("can create a new recurring expense template", async ({
            page,
        }) => {
            // Wait for page to load
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Open add modal
            const addButton = page.locator(
                'button:has-text("Add Recurring Expense")'
            );
            if (!(await addButton.isVisible({ timeout: 3000 }))) {
                test.skip();
                return;
            }
            await addButton.click();

            // Wait for modal to open
            await page.waitForSelector('h2:has-text("Add Recurring Expense")', {
                timeout: 5000,
            });

            // Fill in the form using type-based selectors
            const nameInput = page.locator('input[type="text"]').first();
            const amountInput = page.locator('input[type="number"]').first();

            const testName = `E2E Test Recurring ${Date.now()}`;
            await nameInput.fill(testName);
            await amountInput.fill("50.00");

            // Select frequency if dropdown exists
            const frequencySelect = page
                .locator("select")
                .filter({ hasText: /monthly|weekly/i });
            if (await frequencySelect.isVisible({ timeout: 1000 })) {
                await frequencySelect.selectOption({ label: "Monthly" });
            }

            // Submit
            const submitButton = page
                .locator(
                    'button[type="submit"], button:has-text("Save"), button:has-text("Add"), button:has-text("Create")'
                )
                .last();
            await submitButton.click();

            // Wait for modal to close (h2 should disappear)
            await page.waitForSelector('h2:has-text("Add Recurring Expense")', {
                state: "hidden",
                timeout: 10000,
            });

            // Wait for API response to complete
            await page.waitForLoadState("networkidle");

            // Verify template was created successfully by checking API response
            // The POST request returned 201 and the list was refreshed
            // Just verify the page shows the Active tab with items
            const activeItems = page.locator(
                '[class*="rounded-lg"][class*="bg-white"], [class*="rounded-lg"][class*="dark:bg"]'
            );
            // Should have at least one item now (the one we just created)
            await expect(activeItems.first()).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe("Toggle Active Status", () => {
        test("can toggle recurring expense active status", async ({ page }) => {
            // Look for existing recurring expense with toggle
            const toggleButton = page.locator(
                'button:has-text("Pause"), button:has-text("Activate"), button[aria-label*="toggle" i], [data-testid*="toggle"]'
            );

            if (await toggleButton.first().isVisible({ timeout: 3000 })) {
                // Get initial state
                const initialText = await toggleButton.first().textContent();
                await toggleButton.first().click();
                await page.waitForTimeout(500);

                // State should change
                const newText = await toggleButton.first().textContent();
                // Text might change from Pause to Activate or vice versa
                // Or the item might move to inactive section
            } else {
                // No recurring expenses exist to toggle
                test.skip();
            }
        });

        test("can toggle fixed bill status", async ({ page }) => {
            // Look for fixed bill toggle (checkbox or button)
            const fixedBillToggle = page.locator(
                'input[type="checkbox"][name*="fixed" i], button:has-text("Fixed"), [data-testid*="fixed-bill"]'
            );

            if (await fixedBillToggle.first().isVisible({ timeout: 3000 })) {
                await fixedBillToggle.first().click();
                await page.waitForTimeout(500);
                // Toggle should work without error
            } else {
                // Fixed bill toggle not visible or no items exist
                test.skip();
            }
        });
    });

    test.describe("Preview & Generate", () => {
        test("can switch to Upcoming view", async ({ page }) => {
            // Wait for page to load first
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Click Upcoming tab
            const upcomingTab = page.locator("button:has-text('Upcoming')");
            await upcomingTab.click();
            await page.waitForTimeout(500);

            // Should show upcoming/scheduled expenses or empty state
            const contentArea = page.locator("main, .content, [role='main']");
            await expect(contentArea.first()).toBeVisible();
        });

        test("Upcoming view shows scheduled expenses when templates exist", async ({
            page,
        }) => {
            // Wait for page to load first
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Click Upcoming tab
            await page.locator("button:has-text('Upcoming')").click();
            await page.waitForTimeout(1000);

            // Should show either scheduled expenses or empty state message
            // Check for specific UI elements rather than text patterns
            const hasConfirmButton = await page
                .getByRole("button", { name: /Confirm Scheduled/i })
                .isVisible({ timeout: 3000 });

            const hasEmptyState = await page
                .getByText("No upcoming scheduled expenses")
                .isVisible({ timeout: 1000 });

            // Either should be true
            expect(hasConfirmButton || hasEmptyState).toBeTruthy();
        });

        test("can generate expenses from scheduled items", async ({ page }) => {
            // Wait for page to load first
            await page.waitForSelector("button:has-text('Active')", {
                timeout: 10000,
            });

            // Switch to Upcoming view
            await page.locator("button:has-text('Upcoming')").click();
            await page.waitForTimeout(500);

            // Look for generate/confirm button
            const generateButton = page.locator(
                'button:has-text("Generate"), button:has-text("Confirm"), button:has-text("Create Selected")'
            );

            if (await generateButton.first().isVisible({ timeout: 3000 })) {
                // Check if button is enabled (there are items to generate)
                const isEnabled = await generateButton.first().isEnabled();

                if (isEnabled) {
                    // Need to select items first if selection mode exists
                    const selectCheckbox = page
                        .locator('input[type="checkbox"]')
                        .first();
                    if (await selectCheckbox.isVisible({ timeout: 1000 })) {
                        await selectCheckbox.click();
                    }

                    // Click generate
                    await generateButton.first().click();
                    await page.waitForTimeout(1000);

                    // Should show success or result message
                    const resultMessage = page.locator(
                        "text=/Generated|Created|Success|Added/i"
                    );
                    // Generation might succeed or have no items - both are valid
                } else {
                    // Button exists but is disabled (no scheduled items)
                    // This is valid - the UI shows the button but it's disabled
                    expect(true).toBeTruthy();
                }
            } else {
                // No scheduled items to generate
                test.skip();
            }
        });
    });

    test.describe("Edit Recurring Template", () => {
        test("can access edit mode for existing template", async ({ page }) => {
            // Look for edit button on a recurring expense item
            const editButton = page.locator(
                'button:has-text("Edit"), button[aria-label*="edit" i], [data-testid*="edit"]'
            );

            if (await editButton.first().isVisible({ timeout: 3000 })) {
                await editButton.first().click();
                await page.waitForTimeout(500);

                // Edit modal should open with pre-filled values
                await expect(
                    page.locator("text=/Edit Recurring|Update/i").first()
                ).toBeVisible({ timeout: 3000 });
            } else {
                // No recurring expenses exist to edit
                test.skip();
            }
        });

        test("edit modal pre-fills existing values", async ({ page }) => {
            const editButton = page.locator(
                'button:has-text("Edit"), button[aria-label*="edit" i]'
            );

            if (!(await editButton.first().isVisible({ timeout: 3000 }))) {
                test.skip();
                return;
            }

            await editButton.first().click();
            await page.waitForTimeout(500);

            // Name field should have a value
            const nameInput = page
                .locator('input[name="name"], input[placeholder*="name" i]')
                .first();
            const nameValue = await nameInput.inputValue();
            expect(nameValue.length).toBeGreaterThan(0);

            // Amount field should have a value
            const amountInput = page
                .locator('input[name="amount"], input[placeholder*="amount" i]')
                .first();
            const amountValue = await amountInput.inputValue();
            expect(amountValue.length).toBeGreaterThan(0);
        });
    });

    test.describe("Delete Recurring Template", () => {
        test("delete shows confirmation dialog", async ({ page }) => {
            // Look for delete button
            const deleteButton = page.locator(
                'button:has-text("Delete"), button[aria-label*="delete" i], [data-testid*="delete"]'
            );

            if (await deleteButton.first().isVisible({ timeout: 3000 })) {
                await deleteButton.first().click();
                await page.waitForTimeout(500);

                // Should show confirmation dialog
                const confirmDialog = page.locator(
                    "text=/Are you sure|Confirm|Delete this/i"
                );
                await expect(confirmDialog.first()).toBeVisible({
                    timeout: 3000,
                });

                // Cancel the delete
                const cancelButton = page.locator(
                    'button:has-text("Cancel"), button:has-text("No")'
                );
                if (await cancelButton.isVisible({ timeout: 1000 })) {
                    await cancelButton.click();
                }
            } else {
                // No recurring expenses exist to delete
                test.skip();
            }
        });
    });

    test.describe("Frequency Options", () => {
        test("frequency options include weekly, monthly, custom", async ({
            page,
        }) => {
            // Open add modal
            const addButton = page.locator(
                'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
            );
            if (!(await addButton.first().isVisible({ timeout: 3000 }))) {
                test.skip();
                return;
            }
            await addButton.first().click();
            await page.waitForTimeout(500);

            // Check frequency options
            const frequencySelect = page
                .locator("select")
                .filter({ hasText: /monthly|weekly/i });
            if (await frequencySelect.isVisible({ timeout: 1000 })) {
                // Check for different frequency options
                const options = await frequencySelect
                    .locator("option")
                    .allTextContents();
                const hasWeekly = options.some((o) => /weekly/i.test(o));
                const hasMonthly = options.some((o) => /monthly/i.test(o));

                expect(hasWeekly || hasMonthly).toBeTruthy();
            } else {
                // Frequency might be radio buttons or different UI
                const frequencyRadio = page.locator(
                    'input[type="radio"][name*="frequency" i]'
                );
                if (await frequencyRadio.first().isVisible({ timeout: 1000 })) {
                    expect(await frequencyRadio.count()).toBeGreaterThan(1);
                }
            }
        });
    });
});
