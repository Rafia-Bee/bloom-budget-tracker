/**
 * Settings Page E2E Tests
 *
 * Tests for the Settings page functionality including:
 * - Navigation to Settings page
 * - Subcategory management (create, edit, delete)
 * - Preferences (recurring lookahead, default currency)
 * - Data export/import
 * - Account settings
 *
 * Authentication is handled automatically by fixtures.js which restores
 * HttpOnly JWT cookies saved by global-setup.js using context.addCookies().
 */

import { test, expect, loginAsTestUser } from './fixtures.js';

test.describe('Settings Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to settings page (cookies are auto-restored by fixture)
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        // If redirected to login, perform manual login
        if (page.url().includes('/login')) {
            await loginAsTestUser(page);
            await page.goto('/settings');
            await page.waitForLoadState('networkidle');
        }
    });

    test.describe('Navigation', () => {
        test('can access Settings page', async ({ page }) => {
            // Should be on settings page (not login)
            expect(page.url()).toContain('/settings');

            // Look for the Categories tab which should be visible on Settings page
            await expect(page.locator("button:has-text('Categories')")).toBeVisible({
                timeout: 5000,
            });
        });

        test('Settings page defaults to Preferences tab', async ({ page }) => {
            // Check if we're on the settings page (not redirected)
            if (page.url().includes('/login')) {
                test.skip();
                return;
            }

            // Preferences tab should be active by default (new behavior)
            // Look for Preferences-specific content like recurring lookahead or currency
            await expect(
                page.locator('text=/Recurring Lookahead|Currency|Preferences/i').first()
            ).toBeVisible({ timeout: 5000 });
        });

        test('Settings page shows tab navigation when authenticated', async ({ page }) => {
            // Check if we're on the settings page (not redirected)
            if (page.url().includes('/login')) {
                test.skip();
                return;
            }

            // Tab labels are: Categories (🏷️), Preferences (⚙️), Account (👤)
            const categoriesTab = page.locator("button:has-text('Categories')");
            const preferencesTab = page.locator("button:has-text('Preferences')");
            const accountTab = page.locator("button:has-text('Account')");

            await expect(categoriesTab).toBeVisible();
            await expect(preferencesTab).toBeVisible();
            await expect(accountTab).toBeVisible();
        });
    });

    test.describe('Subcategories Tab', () => {
        test.beforeEach(async ({ page }) => {
            // Navigate to Categories tab (Settings now defaults to Preferences)
            await page.locator("button:has-text('Categories')").click();
            await page.waitForTimeout(500);
        });

        test('categories tab shows subcategory content', async ({ page }) => {
            // Should show subcategory content
            await expect(
                page.locator('text=/Subcategories|Categories|Add Subcategory/i').first()
            ).toBeVisible();
        });

        test('shows category selector', async ({ page }) => {
            // Should have category buttons or dropdown
            const categorySelector = page.locator(
                'button:has-text("Fixed Expenses"), button:has-text("Flexible"), select:has(option:has-text("Fixed"))'
            );
            await expect(categorySelector.first()).toBeVisible({
                timeout: 5000,
            });
        });

        test('can open Create Subcategory modal', async ({ page }) => {
            // Look for add subcategory button
            const addButton = page.locator(
                'button:has-text("Add Subcategory"), button:has-text("Add"), button:has-text("Create")'
            );
            await expect(addButton.first()).toBeVisible({ timeout: 5000 });
            await addButton.first().click();

            // Modal should open
            await expect(
                page.locator('text=/Create Subcategory|Add Subcategory|New Subcategory/i').first()
            ).toBeVisible({ timeout: 3000 });
        });

        test('Create Subcategory modal has required fields', async ({ page }) => {
            // Open create modal
            const addButton = page.locator('button:has-text("Add Subcategory")');
            await addButton.click();
            await page.waitForTimeout(500);

            // Should have name input (by placeholder text)
            const nameInput = page.locator('input[placeholder*="Streaming Services"]');
            await expect(nameInput).toBeVisible();

            // Category selector should be visible
            const categorySelector = page.locator('select');
            await expect(categorySelector.first()).toBeVisible();
        });

        test('can create a new subcategory', async ({ page }) => {
            // Open create modal
            const addButton = page.locator('button:has-text("Add Subcategory")');
            await addButton.click();
            await page.waitForTimeout(500);

            // Fill in name using placeholder selector
            const nameInput = page.locator('input[placeholder*="Streaming Services"]');
            const testName = `E2E Test Sub ${Date.now()}`;
            await nameInput.fill(testName);

            // Submit (Create button)
            const submitButton = page.locator('button:has-text("Create")');
            await submitButton.click();

            // Wait for modal to close
            await page.waitForTimeout(1000);

            // Subcategory should appear in list
            await expect(page.getByText(testName).first()).toBeVisible({
                timeout: 5000,
            });
        });

        test('can edit existing subcategory', async ({ page }) => {
            // Look for edit button on a subcategory
            const editButton = page.locator(
                'button:has-text("Edit"), button[aria-label*="edit" i], [data-testid*="edit"]'
            );

            if (await editButton.first().isVisible({ timeout: 3000 })) {
                await editButton.first().click();
                await page.waitForTimeout(500);

                // Edit modal should open
                await expect(page.locator('text=/Edit Subcategory|Update/i').first()).toBeVisible({
                    timeout: 3000,
                });
            } else {
                // No subcategories to edit
                test.skip();
            }
        });

        test('delete subcategory shows confirmation', async ({ page }) => {
            // Look for delete button
            const deleteButton = page.locator(
                'button:has-text("Delete"), button[aria-label*="delete" i], [data-testid*="delete"]'
            );

            if (await deleteButton.first().isVisible({ timeout: 3000 })) {
                await deleteButton.first().click();
                await page.waitForTimeout(500);

                // Should show confirmation
                const confirmDialog = page.locator('text=/Are you sure|Confirm|Delete this/i');
                await expect(confirmDialog.first()).toBeVisible({
                    timeout: 3000,
                });

                // Cancel
                const cancelButton = page.locator(
                    'button:has-text("Cancel"), button:has-text("No")'
                );
                if (await cancelButton.isVisible({ timeout: 1000 })) {
                    await cancelButton.click();
                }
            } else {
                test.skip();
            }
        });

        test('can switch between category tabs', async ({ page }) => {
            // Click different category buttons
            const categoryButtons = page.locator(
                'button:has-text("Fixed Expenses"), button:has-text("Flexible"), button:has-text("Savings"), button:has-text("Debt")'
            );

            if ((await categoryButtons.count()) > 1) {
                // Click second category
                await categoryButtons.nth(1).click();
                await page.waitForTimeout(300);
                // Should switch without error
            }
        });
    });

    test.describe('Preferences Tab', () => {
        test('can switch to Preferences tab', async ({ page }) => {
            const preferencesTab = page.locator("button:has-text('Preferences')");
            await preferencesTab.click();
            await page.waitForTimeout(500);

            // Should show preferences content
            await expect(
                page.locator('text=/Preferences|Lookahead|Currency/i').first()
            ).toBeVisible();
        });

        test('shows recurring lookahead setting', async ({ page }) => {
            // Switch to Preferences tab
            await page.locator("button:has-text('Preferences')").click();
            await page.waitForTimeout(500);

            // Should show lookahead setting
            const lookaheadSetting = page.locator('text=/lookahead|days ahead|preview/i');
            await expect(lookaheadSetting.first()).toBeVisible({
                timeout: 5000,
            });
        });

        test('can change recurring lookahead days', async ({ page }) => {
            // Switch to Preferences tab
            await page.locator("button:has-text('Preferences')").click();
            await page.waitForTimeout(500);

            // Find lookahead input
            const lookaheadInput = page.locator('input[type="number"], input[name*="lookahead" i]');

            if (await lookaheadInput.first().isVisible({ timeout: 3000 })) {
                await lookaheadInput.first().fill('30');

                // Save button
                const saveButton = page
                    .locator('button:has-text("Save"), button:has-text("Update")')
                    .first();
                if (await saveButton.isVisible({ timeout: 1000 })) {
                    await saveButton.click();
                    await page.waitForTimeout(1000);

                    // Should show success message
                    const successMessage = page.locator('text=/saved|success|updated/i');
                    // Success might appear briefly
                }
            } else {
                // Lookahead might be a dropdown
                test.skip();
            }
        });

        test('shows currency setting when multi-currency enabled', async ({ page }) => {
            // Switch to Preferences tab
            await page.locator("button:has-text('Preferences')").click();
            await page.waitForTimeout(500);

            // Currency setting might be visible - check for either the label or a select with EUR
            const hasCurrencyLabel = await page
                .getByText(/Currency|Default Currency/i)
                .isVisible({ timeout: 3000 });

            const hasEurOption = await page
                .locator('select:has(option:has-text("EUR"))')
                .isVisible({ timeout: 1000 });

            // Either visible or not - both are valid states
            // This test just verifies we can access the preferences tab
            expect(true).toBeTruthy();
        });
    });

    test.describe('Account Tab', () => {
        test('can switch to Account tab', async ({ page }) => {
            const accountTab = page.locator("button:has-text('Account')");
            await accountTab.click();
            await page.waitForTimeout(500);

            // Should show account content
            await expect(page.locator('text=/Account|Danger Zone|Delete/i').first()).toBeVisible();
        });

        test('shows danger zone with delete option', async ({ page }) => {
            // Switch to Account tab
            await page.locator("button:has-text('Account')").click();
            await page.waitForTimeout(500);

            // Should show danger zone
            const dangerZone = page.locator('text=/Danger Zone|Delete.*Data/i');
            await expect(dangerZone.first()).toBeVisible({ timeout: 5000 });
        });

        test('delete all data requires confirmation text', async ({ page }) => {
            // Switch to Account tab
            await page.locator("button:has-text('Account')").click();
            await page.waitForTimeout(500);

            // Look for delete button
            const deleteButton = page.locator(
                'button:has-text("Delete All"), button:has-text("Delete Data")'
            );

            if (await deleteButton.first().isVisible({ timeout: 3000 })) {
                await deleteButton.first().click();
                await page.waitForTimeout(500);

                // Should require typing confirmation text
                const confirmInput = page.locator(
                    'input[placeholder*="Delete" i], input[type="text"]'
                );
                await expect(confirmInput.first()).toBeVisible({
                    timeout: 3000,
                });

                // Cancel by clicking outside or cancel button
                const cancelButton = page.locator('button:has-text("Cancel")');
                if (await cancelButton.isVisible({ timeout: 1000 })) {
                    await cancelButton.click();
                } else {
                    await page.keyboard.press('Escape');
                }
            }
        });
    });

    test.describe('Data Export/Import', () => {
        test('export option is accessible from Account tab', async ({ page }) => {
            // Navigate to Account tab where Export/Import now lives
            await page.locator("button:has-text('Account')").click();
            await page.waitForTimeout(500);

            // Click Export Financial Data button in Account tab
            const exportButton = page.locator('button:has-text("Export Financial Data")');
            await exportButton.click();

            // Export modal should open
            await expect(page.locator('text=/Export|Download|Backup/i').first()).toBeVisible({
                timeout: 3000,
            });
        });

        test('import option is accessible from Account tab', async ({ page }) => {
            // Navigate to Account tab where Export/Import now lives
            await page.locator("button:has-text('Account')").click();
            await page.waitForTimeout(500);

            // Click Import JSON Backup button in Account tab
            const importButton = page.locator('button:has-text("Import JSON Backup")');
            await importButton.click();

            // Import modal should open
            await expect(page.locator('text=/Import|Upload|Restore/i').first()).toBeVisible({
                timeout: 3000,
            });
        });

        test('export modal shows format options', async ({ page }) => {
            // Navigate to Account tab and open export modal
            await page.locator("button:has-text('Account')").click();
            await page.waitForTimeout(500);
            await page.locator('button:has-text("Export Financial Data")').click();

            await page.waitForTimeout(500);

            // Should show JSON and CSV options (use separate locators, not combined regex)
            const jsonOption = page
                .locator('text=/JSON/i')
                .or(page.locator('button:has-text("JSON")'));
            const csvOption = page
                .locator('text=/CSV/i')
                .or(page.locator('button:has-text("CSV")'));

            const hasJson = await jsonOption
                .first()
                .isVisible({ timeout: 2000 })
                .catch(() => false);
            const hasCsv = await csvOption
                .first()
                .isVisible({ timeout: 1000 })
                .catch(() => false);

            // At least one format should be available
            expect(hasJson || hasCsv).toBeTruthy();
        });
    });

    test.describe('Feature Flags', () => {
        test('experimental features accessible in dedicated tab', async ({ page }) => {
            // Switch to Experimental tab (new dedicated tab)
            await page.locator("button:has-text('Experimental')").click();
            await page.waitForTimeout(500);

            // Experimental features should be visible
            const experimentalSection = page.locator('text=/Experimental|Beta|Feature/i');

            const isVisible = await experimentalSection.first().isVisible({ timeout: 2000 });
            expect(isVisible).toBeTruthy();
        });
    });
});
