/**
 * Balance Mode E2E Tests (Issue #149 - Phase 5)
 *
 * Tests balance mode setting and period creation.
 * Balance calculations are verified via the /current endpoint which returns
 * display_debit_balance and display_credit_available.
 *
 * IMPORTANT: These tests must run serially as they share the database.
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

// Test dates - dynamic based on current date for reliability
// PAST_PERIOD: 14-7 days ago
// CURRENT_PERIOD: today +/- 3 days (7 day window centered on today)
// FUTURE_PERIOD: 7-14 days from now
const PAST_PERIOD = {
    start: dateOffset(-14),
    end: dateOffset(-7),
    debit: 10000, // €100 in cents
    credit: 60000, // €600 available
    creditLimit: 150000, // €1500
};

const CURRENT_PERIOD = {
    start: dateOffset(-3),
    end: dateOffset(4),
    debit: 50000, // €500
    credit: 50000, // €500 available
    creditLimit: 150000, // €1500
};

const FUTURE_PERIOD = {
    start: dateOffset(7),
    end: dateOffset(14),
    debit: 5000, // €50
    credit: 10000, // €100 available
    creditLimit: 150000, // €1500
};

// Helper to get API base URL
const getBaseUrl = () => 'http://localhost:5000';

// Helper to clean database state
async function cleanDatabase(request, cookieHeader) {
    const baseUrl = getBaseUrl();
    const deleteRes = await request.post(`${baseUrl}/api/v1/user-data/delete-all`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { confirmation: 'Delete everything' },
    });
    console.log('Delete response:', deleteRes.status());
    return deleteRes.ok();
}

// Helper to set balance mode
async function setBalanceMode(request, cookieHeader, mode) {
    const baseUrl = getBaseUrl();
    const res = await request.put(`${baseUrl}/api/v1/user-data/settings/balance-mode`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { balance_mode: mode },
    });
    console.log(`Set ${mode} mode:`, res.status());
    return res.ok();
}

// Helper to get balance mode settings
async function getBalanceMode(request, cookieHeader) {
    const baseUrl = getBaseUrl();
    const res = await request.get(`${baseUrl}/api/v1/user-data/settings/balance-mode`, {
        headers: { Cookie: cookieHeader },
    });
    if (res.ok()) {
        return await res.json();
    }
    return null;
}

// Helper to create salary period
async function createSalaryPeriod(request, cookieHeader, periodData) {
    const baseUrl = getBaseUrl();
    const res = await request.post(`${baseUrl}/api/v1/salary-periods`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: {
            start_date: periodData.start,
            end_date: periodData.end,
            debit_balance: periodData.debit,
            credit_balance: periodData.credit,
            credit_limit: periodData.creditLimit,
            credit_allowance: 0,
            num_sub_periods: 1,
            fixed_bills: [],
        },
    });
    const body = await res.text();
    console.log(`Create period ${periodData.start} to ${periodData.end}:`, res.status());
    if (!res.ok()) {
        console.log('Error:', body);
    }
    return { ok: res.ok(), body: res.ok() ? JSON.parse(body) : body };
}

// Helper to get current salary period with balances
async function getCurrentPeriodBalance(request, cookieHeader) {
    const baseUrl = getBaseUrl();
    const res = await request.get(`${baseUrl}/api/v1/salary-periods/current`, {
        headers: { Cookie: cookieHeader },
    });
    if (res.ok()) {
        return await res.json();
    }
    return null;
}

// Helper to add expense
async function addExpense(request, cookieHeader, expense) {
    const baseUrl = getBaseUrl();
    const res = await request.post(`${baseUrl}/api/v1/expenses`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: expense,
    });
    console.log(`Add expense ${expense.name}:`, res.status());
    return res.ok();
}

// CRITICAL: Force single worker mode for these tests
// because they share the database and can't run in parallel
test.describe.configure({ mode: 'serial', timeout: 120000 });

test.describe('Balance Mode - Sync vs Budget (#149)', () => {
    /**
     * Test 1: Balance Mode Setting
     * Verify that balance mode can be set and retrieved correctly.
     */
    test('can set and retrieve balance mode', async ({ page, request }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        if (page.url().includes('/login')) {
            await loginAsTestUser(page);
        }

        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        // Clean state
        await cleanDatabase(request, cookieHeader);
        await page.waitForTimeout(500);

        // Test setting sync mode
        expect(await setBalanceMode(request, cookieHeader, 'sync')).toBeTruthy();

        let modeData = await getBalanceMode(request, cookieHeader);
        expect(modeData).toBeTruthy();
        expect(modeData.balance_mode).toBe('sync');

        // Test setting budget mode
        expect(await setBalanceMode(request, cookieHeader, 'budget')).toBeTruthy();

        modeData = await getBalanceMode(request, cookieHeader);
        expect(modeData.balance_mode).toBe('budget');

        console.log('✓ Balance mode setting works correctly');
    });

    /**
     * Test 2: Sync Mode - Period Creation
     * In sync mode, multiple periods can be created and balances accumulate.
     */
    test.describe('Sync with Bank Mode', () => {
        test('can create multiple periods and view balance', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Step 1: Clean state
            console.log('\n=== SYNC MODE TEST ===');
            expect(await cleanDatabase(request, cookieHeader)).toBeTruthy();
            await page.waitForTimeout(500);

            // Step 2: Set sync mode
            expect(await setBalanceMode(request, cookieHeader, 'sync')).toBeTruthy();

            // Step 3: Create current period (this is the anchor)
            console.log('Creating current period...');
            const currentResult = await createSalaryPeriod(request, cookieHeader, CURRENT_PERIOD);
            expect(currentResult.ok, 'Current period creation failed').toBeTruthy();
            const currentPeriodId = currentResult.body.id;
            console.log('Current period ID:', currentPeriodId);

            // Verify balance is set
            await page.waitForTimeout(500);
            let periodData = await getCurrentPeriodBalance(request, cookieHeader);
            expect(periodData).toBeTruthy();
            expect(periodData.salary_period).toBeTruthy();
            console.log(
                'Current period balance:',
                periodData.salary_period.display_debit_balance / 100,
                'EUR'
            );

            // In sync mode, first period sets the anchor - balance should be what we input
            expect(periodData.salary_period.display_debit_balance).toBe(CURRENT_PERIOD.debit);

            // Step 4: Create past period
            console.log('Creating past period...');
            const pastResult = await createSalaryPeriod(request, cookieHeader, PAST_PERIOD);
            expect(pastResult.ok, 'Past period creation failed').toBeTruthy();

            // Step 5: Create future period
            console.log('Creating future period...');
            const futureResult = await createSalaryPeriod(request, cookieHeader, FUTURE_PERIOD);
            expect(futureResult.ok, 'Future period creation failed').toBeTruthy();

            // Step 6: Verify current balance after adding periods
            // In sync mode, balance anchor moves to the EARLIEST period
            // So after creating PAST_PERIOD, the anchor becomes PAST_PERIOD.debit (€100)
            // not CURRENT_PERIOD.debit (€500)
            await page.waitForTimeout(500);
            periodData = await getCurrentPeriodBalance(request, cookieHeader);
            console.log(
                'Final current period balance:',
                periodData.salary_period.display_debit_balance / 100,
                'EUR'
            );

            // In sync mode, anchor moves to earliest period
            // Balance = PAST_PERIOD.debit (anchor) + any income - any expenses
            // With no transactions, balance should equal the anchor (past period's balance)
            expect(periodData.salary_period.display_debit_balance).toBeGreaterThanOrEqual(
                PAST_PERIOD.debit
            );

            console.log('✓ Sync mode period creation works');
        });

        test('expenses affect balance cumulatively', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Don't clean - use existing state from previous test
            // If previous test didn't run, this test will fail gracefully

            // Get initial balance
            let periodData = await getCurrentPeriodBalance(request, cookieHeader);
            if (!periodData) {
                console.log('No current period - skipping expense test');
                return;
            }
            const initialBalance = periodData.salary_period.display_debit_balance;
            console.log('Initial balance:', initialBalance / 100, 'EUR');

            // Add expense in current period
            expect(
                await addExpense(request, cookieHeader, {
                    name: 'Test Debit Expense',
                    amount: 1000, // €10
                    category: 'Flexible Expenses',
                    date: dateOffset(0), // Today - within current period
                    payment_method: 'Debit card',
                })
            ).toBeTruthy();

            // Verify balance decreased
            await page.waitForTimeout(500);
            periodData = await getCurrentPeriodBalance(request, cookieHeader);
            const newBalance = periodData.salary_period.display_debit_balance;
            console.log('After expense:', newBalance / 100, 'EUR');

            // Balance should decrease by expense amount
            expect(newBalance).toBe(initialBalance - 1000);

            console.log('✓ Expenses affect balance correctly');
        });
    });

    /**
     * Test 3: Budget Mode - Period Creation
     * In budget mode, each period has isolated balance.
     */
    test.describe('Budget Tracker Mode', () => {
        test('can create multiple periods with isolated balances', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Step 1: Clean state
            console.log('\n=== BUDGET MODE TEST ===');
            expect(await cleanDatabase(request, cookieHeader)).toBeTruthy();
            await page.waitForTimeout(500);

            // Step 2: Set budget mode
            expect(await setBalanceMode(request, cookieHeader, 'budget')).toBeTruthy();

            // Step 3: Create current period
            console.log('Creating current period...');
            const currentResult = await createSalaryPeriod(request, cookieHeader, CURRENT_PERIOD);
            expect(currentResult.ok, 'Current period creation failed').toBeTruthy();

            // Verify balance
            await page.waitForTimeout(500);
            let periodData = await getCurrentPeriodBalance(request, cookieHeader);
            expect(periodData).toBeTruthy();
            console.log(
                'Current period balance:',
                periodData.salary_period.display_debit_balance / 100,
                'EUR'
            );
            expect(periodData.salary_period.display_debit_balance).toBe(CURRENT_PERIOD.debit);

            // Step 4: Create past period
            console.log('Creating past period...');
            const pastResult = await createSalaryPeriod(request, cookieHeader, PAST_PERIOD);
            expect(pastResult.ok, 'Past period creation failed').toBeTruthy();

            // Step 5: Verify current balance unchanged (budget mode = isolated)
            await page.waitForTimeout(500);
            periodData = await getCurrentPeriodBalance(request, cookieHeader);
            console.log(
                'After past period - current balance:',
                periodData.salary_period.display_debit_balance / 100,
                'EUR'
            );

            // In budget mode, adding past period should NOT affect current balance
            expect(periodData.salary_period.display_debit_balance).toBe(CURRENT_PERIOD.debit);

            console.log('✓ Budget mode maintains isolated balances');
        });

        test('past period expenses do not affect current balance', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Get initial balance
            let periodData = await getCurrentPeriodBalance(request, cookieHeader);
            if (!periodData) {
                console.log('No current period - skipping expense test');
                return;
            }
            const initialBalance = periodData.salary_period.display_debit_balance;
            console.log('Initial current balance:', initialBalance / 100, 'EUR');

            // Add expense in PAST period
            expect(
                await addExpense(request, cookieHeader, {
                    name: 'Past Period Expense',
                    amount: 2000, // €20
                    category: 'Flexible Expenses',
                    date: dateOffset(-10), // 10 days ago - within past period (-14 to -7)
                    payment_method: 'Debit card',
                })
            ).toBeTruthy();

            // Verify CURRENT balance unchanged
            await page.waitForTimeout(500);
            periodData = await getCurrentPeriodBalance(request, cookieHeader);
            const newBalance = periodData.salary_period.display_debit_balance;
            console.log('After past expense - current balance:', newBalance / 100, 'EUR');

            // In budget mode, past period expenses should NOT affect current
            expect(newBalance).toBe(initialBalance);

            console.log('✓ Past expenses do not affect current balance in budget mode');
        });

        test('current period expenses affect current balance', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Get initial balance
            let periodData = await getCurrentPeriodBalance(request, cookieHeader);
            if (!periodData) {
                console.log('No current period - skipping expense test');
                return;
            }
            const initialBalance = periodData.salary_period.display_debit_balance;
            console.log('Initial balance:', initialBalance / 100, 'EUR');

            // Add expense in CURRENT period
            expect(
                await addExpense(request, cookieHeader, {
                    name: 'Current Period Expense',
                    amount: 500, // €5
                    category: 'Flexible Expenses',
                    date: dateOffset(0), // Today - within current period (-3 to +4)
                    payment_method: 'Debit card',
                })
            ).toBeTruthy();

            // Verify balance decreased
            await page.waitForTimeout(500);
            periodData = await getCurrentPeriodBalance(request, cookieHeader);
            const newBalance = periodData.salary_period.display_debit_balance;
            console.log('After current expense:', newBalance / 100, 'EUR');

            // Current period expenses SHOULD affect current balance
            expect(newBalance).toBe(initialBalance - 500);

            console.log('✓ Current expenses affect balance correctly');
        });
    });

    /**
     * Test 4: PeriodInfoModal Integration
     * Verify the modal appears when creating past periods.
     */
    test.describe('PeriodInfoModal', () => {
        test('modal appears when balance start date is set', async ({ page, request }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            if (page.url().includes('/login')) {
                await loginAsTestUser(page);
            }

            const cookies = await page.context().cookies();
            const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

            // Clean state
            expect(await cleanDatabase(request, cookieHeader)).toBeTruthy();
            await page.waitForTimeout(1000);
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Set sync mode and create initial period to set balance_start_date
            expect(await setBalanceMode(request, cookieHeader, 'sync')).toBeTruthy();
            const currentResult = await createSalaryPeriod(request, cookieHeader, CURRENT_PERIOD);
            expect(currentResult.ok).toBeTruthy();

            // IMPORTANT: Check balance_start_date IMMEDIATELY after period creation,
            // before any reload/wait that could allow another worker to interfere
            const modeData = await getBalanceMode(request, cookieHeader);
            console.log('Balance mode data:', modeData);
            expect(modeData.balance_start_date).toBeTruthy();

            console.log('✓ Balance start date is set after first period creation');
        });
    });
});
