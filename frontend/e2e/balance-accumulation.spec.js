/**
 * Initial Balance Tests (Issue #149)
 *
 * Tests that only the FIRST Initial Balance is used for balance calculation.
 * Creating multiple salary periods should NOT update the Initial Balance -
 * it should remain as the starting point when the user first began using the app.
 *
 * Key concept: When user enters "debit balance" in the salary period wizard,
 * this represents their CURRENT bank balance which ALREADY INCLUDES any salary
 * they've received. If we updated Initial Balance for each period, we'd be
 * double-counting salary income.
 */

import { test, expect, loginAsTestUser } from './fixtures.js';

test.describe('Initial Balance Handling (#149)', () => {
    // Run these tests serially to avoid race conditions with shared test user data
    test.describe.configure({ mode: 'serial' });

    // Navigate to dashboard before each test
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // If redirected to login, perform manual login
        if (page.url().includes('/login')) {
            await loginAsTestUser(page);
        }
    });

    // Restore a default salary period after all tests to avoid affecting other test files
    test.afterAll(async ({ request }) => {
        // Use global setup auth state
        const authFile = 'playwright/.auth/user.json';
        const fs = await import('fs');
        let cookies = [];

        try {
            const authState = JSON.parse(fs.readFileSync(authFile, 'utf8'));
            cookies = authState.cookies || [];
        } catch {
            // Auth file might not exist, skip restoration
            return;
        }

        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
        const baseUrl = 'http://localhost:5000';

        // Calculate dates for a period containing today
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 27); // 4 weeks

        const formatDate = (d) => d.toISOString().split('T')[0];

        // Create a default salary period so other tests can use the dashboard
        await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                debit_balance: 175000, // €1750
                credit_balance: 50000, // €500
                credit_limit: 100000, // €1000
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
    });

    test('only one Initial Balance record is created across multiple periods', async ({
        page,
        request,
    }) => {
        // This test creates multiple salary periods and verifies
        // that only ONE Initial Balance income record exists

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        const baseUrl = await page.evaluate(() => {
            return window.location.origin.includes('localhost')
                ? 'http://localhost:5000'
                : 'https://bloom-backend-b44r.onrender.com';
        });

        // Clean up existing data for clean state
        // Order is important: delete transactions first, then periods

        // 1. Delete ALL income first (including Initial Balance)
        const incomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });

        if (incomeRes.ok()) {
            const incomeResponse = await incomeRes.json();
            const incomeList = incomeResponse.income || [];
            for (const income of incomeList) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 2. Delete ALL expenses (including Debt category markers)
        const expenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });

        if (expenseRes.ok()) {
            const expenseResponse = await expenseRes.json();
            const expenseList = expenseResponse.expenses || [];
            for (const expense of expenseList) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 3. Now delete salary periods (they should be empty)
        const existingPeriodsRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        if (existingPeriodsRes.ok()) {
            const existingPeriods = await existingPeriodsRes.json();
            for (const period of existingPeriods) {
                await request.delete(`${baseUrl}/api/v1/salary-periods/${period.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // Create FIRST salary period with €1000 initial balance
        const period1Res = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2025-12-01',
                end_date: '2025-12-31',
                debit_balance: 100000, // €1000 in cents
                credit_balance: 50000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(period1Res.ok()).toBeTruthy();

        // Get Initial Balance after first period
        let incomeAfterFirst = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseFirst = await incomeAfterFirst.json();
        let incomeListFirst = incomeResponseFirst.income || [];
        let initialBalancesFirst = incomeListFirst.filter((i) => i.type === 'Initial Balance');

        expect(initialBalancesFirst.length).toBe(1);
        expect(initialBalancesFirst[0].amount).toBe(100000); // €1000

        // Create SECOND salary period with €2000 (different) initial balance
        const period2Res = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2026-01-01',
                end_date: '2026-01-31',
                debit_balance: 200000, // €2000 in cents (different!)
                credit_balance: 50000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(period2Res.ok()).toBeTruthy();

        // Verify: Still only ONE Initial Balance, and it's still €1000 (not updated to €2000)
        let incomeAfterSecond = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseSecond = await incomeAfterSecond.json();
        let incomeListSecond = incomeResponseSecond.income || [];
        let initialBalancesSecond = incomeListSecond.filter((i) => i.type === 'Initial Balance');

        expect(initialBalancesSecond.length).toBe(1);
        expect(initialBalancesSecond[0].amount).toBe(100000); // Still €1000!

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupIncomeRes.ok()) {
            const incomeData = await cleanupIncomeRes.json();
            for (const income of incomeData.income || []) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        const cleanupExpenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupExpenseRes.ok()) {
            const expenseData = await cleanupExpenseRes.json();
            for (const expense of expenseData.expenses || []) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        const cleanupRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        if (cleanupRes.ok()) {
            const periods = await cleanupRes.json();
            for (const period of periods) {
                await request.delete(`${baseUrl}/api/v1/salary-periods/${period.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }
    });

    test('debit balance uses only first Initial Balance', async ({ page, request }) => {
        // This test verifies that the displayed debit balance is based on
        // only the first Initial Balance, not cumulative

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        const baseUrl = await page.evaluate(() => {
            return window.location.origin.includes('localhost')
                ? 'http://localhost:5000'
                : 'https://bloom-backend-b44r.onrender.com';
        });

        // Clean up existing data for clean state
        // Order is important: delete transactions first, then periods

        // 1. Delete ALL income first (including Initial Balance)
        const incomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });

        if (incomeRes.ok()) {
            const incomeResponse = await incomeRes.json();
            const incomeList = incomeResponse.income || [];
            for (const income of incomeList) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 2. Delete ALL expenses (including Debt category markers)
        const expenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });

        if (expenseRes.ok()) {
            const expenseResponse = await expenseRes.json();
            const expenseList = expenseResponse.expenses || [];
            for (const expense of expenseList) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 3. Now delete salary periods (they should be empty)
        const existingPeriodsRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        if (existingPeriodsRes.ok()) {
            const existingPeriods = await existingPeriodsRes.json();
            for (const period of existingPeriods) {
                await request.delete(`${baseUrl}/api/v1/salary-periods/${period.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // Create first period with €1500 initial balance
        const period1 = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2025-12-10',
                end_date: '2026-01-09',
                debit_balance: 150000, // €1500
                credit_balance: 100000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(period1.ok()).toBeTruthy();

        // Create second period with €2000 initial balance
        const period2 = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2026-01-10',
                end_date: '2026-02-09',
                debit_balance: 200000, // €2000
                credit_balance: 100000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(period2.ok()).toBeTruthy();

        // Get current salary period balance
        const currentRes = await request.get(`${baseUrl}/api/v1/salary-periods/current`, {
            headers: { Cookie: cookieHeader },
        });

        expect(currentRes.ok()).toBeTruthy();
        const currentData = await currentRes.json();

        // Expected: €1500 (only first Initial Balance), NOT €1500 + €2000
        const expectedBalance = 150000; // €1500 in cents
        const actualBalance = currentData.salary_period?.display_debit_balance;

        console.log('Expected balance (cents):', expectedBalance);
        console.log('Actual balance (cents):', actualBalance);

        expect(actualBalance).toBe(expectedBalance);

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupIncomeRes.ok()) {
            const incomeData = await cleanupIncomeRes.json();
            for (const income of incomeData.income || []) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        const cleanupExpenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupExpenseRes.ok()) {
            const expenseData = await cleanupExpenseRes.json();
            for (const expense of expenseData.expenses || []) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        const cleanupRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        if (cleanupRes.ok()) {
            const periods = await cleanupRes.json();
            for (const period of periods) {
                await request.delete(`${baseUrl}/api/v1/salary-periods/${period.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }
    });

    test('updating salary period does not change Initial Balance', async ({ page, request }) => {
        // This test verifies that updating an existing salary period
        // does NOT update the Initial Balance

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        const baseUrl = await page.evaluate(() => {
            return window.location.origin.includes('localhost')
                ? 'http://localhost:5000'
                : 'https://bloom-backend-b44r.onrender.com';
        });

        // Clean up existing data for clean state
        // Order is important: delete transactions first, then periods

        // 1. Delete ALL income first (including Initial Balance)
        const incomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });

        if (incomeRes.ok()) {
            const incomeResponse = await incomeRes.json();
            const incomeList = incomeResponse.income || [];
            for (const income of incomeList) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 2. Delete ALL expenses (including Debt category markers)
        const expenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });

        if (expenseRes.ok()) {
            const expenseResponse = await expenseRes.json();
            const expenseList = expenseResponse.expenses || [];
            for (const expense of expenseList) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // 3. Now delete salary periods (they should be empty)
        const existingPeriodsRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        if (existingPeriodsRes.ok()) {
            const existingPeriods = await existingPeriodsRes.json();
            for (const period of existingPeriods) {
                await request.delete(`${baseUrl}/api/v1/salary-periods/${period.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        // Create salary period with €1000 initial balance
        const createRes = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2025-12-01',
                end_date: '2025-12-31',
                debit_balance: 100000, // €1000
                credit_balance: 50000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(createRes.ok()).toBeTruthy();
        const periodId = (await createRes.json()).id;

        // Verify Initial Balance is €1000
        let incomeAfterCreate = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseCreate = await incomeAfterCreate.json();
        let incomeListCreate = incomeResponseCreate.income || [];
        let initialBalanceCreate = incomeListCreate.find((i) => i.type === 'Initial Balance');
        expect(initialBalanceCreate.amount).toBe(100000);

        // UPDATE the salary period with €5000 debit balance
        const updateRes = await request.put(`${baseUrl}/api/v1/salary-periods/${periodId}`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: '2025-12-01',
                end_date: '2025-12-31',
                debit_balance: 500000, // €5000 (changed!)
                credit_balance: 50000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(updateRes.ok()).toBeTruthy();

        // Verify Initial Balance is STILL €1000 (not updated to €5000)
        let incomeAfterUpdate = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseUpdate = await incomeAfterUpdate.json();
        let incomeListUpdate = incomeResponseUpdate.income || [];
        let initialBalanceUpdate = incomeListUpdate.find((i) => i.type === 'Initial Balance');
        expect(initialBalanceUpdate.amount).toBe(100000); // Still €1000!

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(`${baseUrl}/api/v1/income`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupIncomeRes.ok()) {
            const incomeData = await cleanupIncomeRes.json();
            for (const income of incomeData.income || []) {
                await request.delete(`${baseUrl}/api/v1/income/${income.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        const cleanupExpenseRes = await request.get(`${baseUrl}/api/v1/expenses`, {
            headers: { Cookie: cookieHeader },
        });
        if (cleanupExpenseRes.ok()) {
            const expenseData = await cleanupExpenseRes.json();
            for (const expense of expenseData.expenses || []) {
                await request.delete(`${baseUrl}/api/v1/expenses/${expense.id}`, {
                    headers: { Cookie: cookieHeader },
                });
            }
        }

        await request.delete(`${baseUrl}/api/v1/salary-periods/${periodId}`, {
            headers: { Cookie: cookieHeader },
        });
    });
});
