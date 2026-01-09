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

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Helper to create date offset by days
function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDate(d);
}

// Helper to set balance mode
async function setBalanceMode(request, cookieHeader, mode) {
    const baseUrl = 'http://localhost:5000';
    const res = await request.put(`${baseUrl}/api/v1/user-data/settings/balance-mode`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { balance_mode: mode },
    });
    return res.ok();
}

// Helper to clean database state completely
// This uses /delete-all which also resets User balance tracking fields
async function cleanDatabase(request, cookieHeader) {
    const baseUrl = 'http://localhost:5000';
    const deleteRes = await request.post(`${baseUrl}/api/v1/user-data/delete-all`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { confirmation: 'Delete everything' },
    });
    return deleteRes.ok();
}

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

    // NOTE: No afterAll hook - tests should clean up after themselves
    // and other tests should create their own periods as needed

    test('only one Initial Balance record is created across multiple periods', async ({
        page,
        request,
    }) => {
        // This test creates multiple salary periods and verifies
        // that only ONE Initial Balance income record exists

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        // Clean database completely (resets User balance fields too)
        await cleanDatabase(request, cookieHeader);

        // Set balance mode to "budget" - these tests verify Initial Balance behavior
        await setBalanceMode(request, cookieHeader, 'budget');

        const baseUrl = 'http://localhost:5000';

        // Create FIRST salary period with €1000 initial balance
        // Use dynamic dates: 90-120 days ago (past period)
        // NOTE: Using dates far in the past to avoid overlap with balance-mode.spec.js
        // which uses -14 to +14 days range
        const period1Start = dateOffset(-120);
        const period1End = dateOffset(-91);
        const period1Res = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: period1Start,
                end_date: period1End,
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
        // Note: include_markers=true is required to see Initial Balance records
        let incomeAfterFirst = await request.get(`${baseUrl}/api/v1/income?include_markers=true`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseFirst = await incomeAfterFirst.json();
        let incomeListFirst = incomeResponseFirst.income || [];
        let initialBalancesFirst = incomeListFirst.filter((i) => i.type === 'Initial Balance');

        expect(initialBalancesFirst.length).toBe(1);
        expect(initialBalancesFirst[0].amount).toBe(100000); // €1000

        // Create SECOND salary period with €2000 (different) initial balance
        // Use dynamic dates: 60-30 days ago (second past period, non-overlapping)
        const period2Start = dateOffset(-60);
        const period2End = dateOffset(-31);
        const period2Res = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: period2Start,
                end_date: period2End,
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
        let incomeAfterSecond = await request.get(`${baseUrl}/api/v1/income?include_markers=true`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseSecond = await incomeAfterSecond.json();
        let incomeListSecond = incomeResponseSecond.income || [];
        let initialBalancesSecond = incomeListSecond.filter((i) => i.type === 'Initial Balance');

        expect(initialBalancesSecond.length).toBe(1);
        expect(initialBalancesSecond[0].amount).toBe(100000); // Still €1000!

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(
            `${baseUrl}/api/v1/income?include_markers=true`,
            {
                headers: { Cookie: cookieHeader },
            }
        );
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
        // This test verifies that in SYNC mode, the displayed debit balance is based on
        // only the first Initial Balance (User.user_initial_debit_balance anchor),
        // not each period's snapshot

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        // Clean database completely (resets User balance fields too)
        await cleanDatabase(request, cookieHeader);

        // Set balance mode to "sync" - this test verifies only first Initial Balance counts
        // across all periods (cumulative behavior)
        await setBalanceMode(request, cookieHeader, 'sync');

        const baseUrl = 'http://localhost:5000';

        // Create first period with €1500 initial balance
        // Use dynamic dates: 90-120 days ago (past period)
        // NOTE: Using dates far in the past to avoid overlap with balance-mode.spec.js
        const test2Period1Start = dateOffset(-120);
        const test2Period1End = dateOffset(-91);
        const period1 = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: test2Period1Start,
                end_date: test2Period1End,
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
        // Use dynamic dates: 60-31 days ago (second past period, non-overlapping)
        const test2Period2Start = dateOffset(-90);
        const test2Period2End = dateOffset(-61);
        const period2 = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: test2Period2Start,
                end_date: test2Period2End,
                debit_balance: 200000, // €2000
                credit_balance: 100000,
                credit_limit: 100000,
                credit_allowance: 0,
                num_sub_periods: 4,
                fixed_bills: [],
            },
        });
        expect(period2.ok()).toBeTruthy();

        // Get most recent salary period to check balance
        // First get list to find the most recent period ID
        const periodsRes = await request.get(`${baseUrl}/api/v1/salary-periods`, {
            headers: { Cookie: cookieHeader },
        });

        expect(periodsRes.ok()).toBeTruthy();
        const periods = await periodsRes.json();

        // Sort by end_date descending to get most recent period
        periods.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        const mostRecentPeriodId = periods[0]?.id;

        // Fetch the specific period to get display_debit_balance
        // (list endpoint doesn't include calculated display balances)
        const periodDetailRes = await request.get(
            `${baseUrl}/api/v1/salary-periods/${mostRecentPeriodId}`,
            { headers: { Cookie: cookieHeader } }
        );
        expect(periodDetailRes.ok()).toBeTruthy();
        const periodDetail = await periodDetailRes.json();

        // Expected: €1500 (only first Initial Balance), NOT €1500 + €2000
        const expectedBalance = 150000; // €1500 in cents
        const actualBalance = periodDetail.salary_period?.display_debit_balance;

        console.log('Expected balance (cents):', expectedBalance);
        console.log('Actual balance (cents):', actualBalance);

        expect(actualBalance).toBe(expectedBalance);

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(
            `${baseUrl}/api/v1/income?include_markers=true`,
            {
                headers: { Cookie: cookieHeader },
            }
        );
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

        // Clean database completely (resets User balance fields too)
        await cleanDatabase(request, cookieHeader);

        // Set balance mode to "budget" - these tests verify Initial Balance behavior
        await setBalanceMode(request, cookieHeader, 'budget');

        const baseUrl = 'http://localhost:5000';

        // Create salary period with €1000 initial balance
        // Use dynamic dates: 90-120 days ago (past period)
        // NOTE: Using dates far in the past to avoid overlap with balance-mode.spec.js
        const test3Start = dateOffset(-120);
        const test3End = dateOffset(-91);
        const createRes = await request.post(`${baseUrl}/api/v1/salary-periods`, {
            headers: {
                Cookie: cookieHeader,
                'Content-Type': 'application/json',
            },
            data: {
                start_date: test3Start,
                end_date: test3End,
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
        // Verify Initial Balance is €1000
        // Note: include_markers=true is required to see Initial Balance records
        let incomeAfterCreate = await request.get(`${baseUrl}/api/v1/income?include_markers=true`, {
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
                start_date: test3Start,
                end_date: test3End,
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
        let incomeAfterUpdate = await request.get(`${baseUrl}/api/v1/income?include_markers=true`, {
            headers: { Cookie: cookieHeader },
        });
        let incomeResponseUpdate = await incomeAfterUpdate.json();
        let incomeListUpdate = incomeResponseUpdate.income || [];
        let initialBalanceUpdate = incomeListUpdate.find((i) => i.type === 'Initial Balance');
        expect(initialBalanceUpdate.amount).toBe(100000); // Still €1000!

        // Cleanup - delete transactions first, then periods
        const cleanupIncomeRes = await request.get(
            `${baseUrl}/api/v1/income?include_markers=true`,
            {
                headers: { Cookie: cookieHeader },
            }
        );
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
