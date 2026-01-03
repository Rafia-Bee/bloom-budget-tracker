/**
 * Test Data Setup Utilities for E2E Tests
 *
 * Provides functions to create test data via API for comprehensive E2E testing.
 * Used to set up salary periods, expenses, income, debts, goals, and recurring bills.
 *
 * All monetary values are in cents (e.g., 1000 = €10.00).
 * Database stores all values in EUR.
 */

/**
 * Base URL for API calls (from environment or default)
 */
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Helper to make authenticated API calls using page's cookies
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} data - Request body (for POST/PUT)
 * @returns {Promise<object>} Response data
 */
async function apiCall(page, method, endpoint, data = null) {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await page.request[method.toLowerCase()](url, {
        data: data ? JSON.stringify(data) : undefined,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`API ${method} ${endpoint} failed: ${response.status()} - ${errorText}`);
    }

    return response.json();
}

/**
 * Clean up all test data for the user
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function cleanupTestData(page) {
    try {
        await apiCall(page, 'POST', '/user-data/delete-all', {
            confirmation: 'Delete everything',
        });
    } catch (error) {
        console.warn('Cleanup failed (may be expected if no data):', error.message);
    }
}

/**
 * Delete all existing salary periods for the user
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function deleteAllSalaryPeriods(page) {
    try {
        const response = await apiCall(page, 'GET', '/salary-periods');
        const periods = response || [];
        for (const period of periods) {
            try {
                await apiCall(page, 'DELETE', `/salary-periods/${period.id}`);
            } catch (e) {
                console.warn(`Could not delete period ${period.id}:`, e.message);
            }
        }
    } catch (error) {
        console.warn('Could not list salary periods:', error.message);
    }
}

/**
 * Create a salary period with budget
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Period options
 * @returns {Promise<object>} Created salary period
 */
export async function createSalaryPeriod(page, options = {}) {
    const today = new Date();
    const startDate = options.startDate || today.toISOString().split('T')[0];

    // Calculate end date (default 4 weeks from start)
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + 27); // 28 days total = 4 weeks
    const endDate = options.endDate || endDateObj.toISOString().split('T')[0];

    const data = {
        debit_balance: options.debitBalance ?? 100000, // €1000.00 default
        credit_balance: options.creditBalance ?? 50000, // €500.00 default
        credit_limit: options.creditLimit ?? 100000, // €1000.00 default
        credit_allowance: options.creditAllowance ?? 0,
        start_date: startDate,
        end_date: endDate,
        num_sub_periods: options.numSubPeriods ?? 4,
        fixed_bills: options.fixedBills ?? [],
    };

    return apiCall(page, 'POST', '/salary-periods', data);
}

/**
 * Create an expense
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Expense options
 * @returns {Promise<object>} Created expense
 */
export async function createExpense(page, options = {}) {
    const today = new Date().toISOString().split('T')[0];

    // Valid categories: Fixed Expenses, Flexible Expenses, Savings & Investments, Debt Payments
    const data = {
        name: options.name ?? 'Test Expense',
        amount: options.amount ?? 2500, // €25.00 default
        category: options.category ?? 'Flexible Expenses',
        subcategory: options.subcategory ?? null,
        date: options.date ?? today,
        payment_method: options.paymentMethod ?? 'debit',
        is_fixed_bill: options.isFixedBill ?? false,
        notes: options.notes ?? null,
    };

    return apiCall(page, 'POST', '/expenses', data);
}

/**
 * Create income
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Income options
 * @returns {Promise<object>} Created income
 */
export async function createIncome(page, options = {}) {
    const today = new Date().toISOString().split('T')[0];

    const data = {
        type: options.type ?? 'Other',
        amount: options.amount ?? 50000, // €500.00 default
        scheduled_date: options.scheduledDate ?? today,
        actual_date: options.actualDate ?? today,
        notes: options.notes ?? null,
    };

    return apiCall(page, 'POST', '/income', data);
}

/**
 * Create a debt
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Debt options
 * @returns {Promise<object>} Created debt
 */
export async function createDebt(page, options = {}) {
    const data = {
        name: options.name ?? 'Test Debt',
        original_amount: options.originalAmount ?? 100000, // €1000.00 default
        current_balance: options.currentBalance ?? 80000, // €800.00 default
        monthly_payment: options.monthlyPayment ?? 10000, // €100.00 default
        interest_rate: options.interestRate ?? 5.0,
        due_date: options.dueDate ?? 15,
    };

    return apiCall(page, 'POST', '/debts', data);
}

/**
 * Create a goal
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Goal options
 * @returns {Promise<object>} Created goal
 */
export async function createGoal(page, options = {}) {
    // Default target date 6 months from now
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 6);

    const data = {
        name: options.name ?? 'Test Goal',
        target_amount: options.targetAmount ?? 50000, // €500.00 default
        current_amount: options.currentAmount ?? 10000, // €100.00 default
        target_date: options.targetDate ?? targetDate.toISOString().split('T')[0],
        category: options.category ?? 'Savings',
        subcategory: options.subcategory ?? null,
    };

    return apiCall(page, 'POST', '/goals', data);
}

/**
 * Create a recurring expense template
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Recurring expense options
 * @returns {Promise<object>} Created recurring expense
 */
export async function createRecurringExpense(page, options = {}) {
    // Default start date is tomorrow
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    // Valid categories: Fixed Expenses, Flexible Expenses, Savings & Investments, Debt Payments
    const data = {
        name: options.name ?? 'Test Recurring',
        amount: options.amount ?? 1500, // €15.00 default
        category: options.category ?? 'Fixed Expenses',
        subcategory: options.subcategory ?? null,
        frequency: options.frequency ?? 'monthly',
        start_date: options.startDate ?? startDate.toISOString().split('T')[0],
        is_fixed_bill: options.isFixedBill ?? false,
        payment_method: options.paymentMethod ?? 'debit',
    };

    return apiCall(page, 'POST', '/recurring-expenses', data);
}

/**
 * Set up comprehensive test data for currency conversion testing
 * Creates: salary period, multiple expenses (debit + credit), income, debt, goal, recurring bill
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<object>} Object with all created test data
 */
export async function setupCurrencyTestData(page) {
    // First, clean up ALL existing data to avoid overlap errors
    // (salary periods with transactions can't be deleted individually)
    await cleanupTestData(page);

    // Wait a bit for deletion to complete
    await page.waitForTimeout(500);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Create salary period first (this creates budget periods)
    const salaryPeriod = await createSalaryPeriod(page, {
        debitBalance: 150000, // €1500.00
        creditBalance: 75000, // €750.00
        creditLimit: 100000, // €1000.00
        creditAllowance: 25000, // €250.00 credit allowance for budget
    });

    // Valid categories: Fixed Expenses, Flexible Expenses, Savings & Investments, Debt Payments

    // Create debit expenses
    const debitExpense1 = await createExpense(page, {
        name: 'Groceries',
        amount: 4500, // €45.00
        category: 'Flexible Expenses',
        paymentMethod: 'debit',
        date: todayStr,
    });

    const debitExpense2 = await createExpense(page, {
        name: 'Coffee',
        amount: 350, // €3.50
        category: 'Flexible Expenses',
        paymentMethod: 'debit',
        date: todayStr,
    });

    // Create credit expense
    const creditExpense = await createExpense(page, {
        name: 'Electronics',
        amount: 12000, // €120.00
        category: 'Flexible Expenses',
        paymentMethod: 'credit',
        date: todayStr,
    });

    // Create income
    const income = await createIncome(page, {
        type: 'Salary',
        amount: 200000, // €2000.00
        scheduledDate: todayStr,
        actualDate: todayStr,
    });

    // Create debt
    const debt = await createDebt(page, {
        name: 'Personal Loan',
        originalAmount: 500000, // €5000.00
        currentBalance: 350000, // €3500.00
        monthlyPayment: 25000, // €250.00
        interestRate: 6.5,
    });

    // Create goal
    const goal = await createGoal(page, {
        name: 'Vacation Fund',
        targetAmount: 150000, // €1500.00
        currentAmount: 45000, // €450.00
    });

    // Create recurring expense (fixed bill)
    const recurringBill = await createRecurringExpense(page, {
        name: 'Netflix',
        amount: 1599, // €15.99
        category: 'Fixed Expenses',
        frequency: 'monthly',
        isFixedBill: true,
    });

    return {
        salaryPeriod,
        expenses: [debitExpense1, debitExpense2, creditExpense],
        income,
        debt,
        goal,
        recurringBill,
        // Summary of expected EUR amounts for verification
        expectedAmounts: {
            debitSpent: 4850, // €48.50 (45 + 3.50)
            creditSpent: 12000, // €120.00
            totalIncome: 200000, // €2000.00
            debtBalance: 350000, // €3500.00
            goalCurrent: 45000, // €450.00
            goalTarget: 150000, // €1500.00
            recurringAmount: 1599, // €15.99
        },
    };
}

/**
 * Get the current default currency for the user
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<string>} Currency code (e.g., 'EUR', 'USD')
 */
export async function getDefaultCurrency(page) {
    const response = await apiCall(page, 'GET', '/user-data/settings/default-currency');
    return response.default_currency || 'EUR';
}

/**
 * Set the default currency for the user
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} currency - Currency code (e.g., 'USD', 'GBP')
 */
export async function setDefaultCurrency(page, currency) {
    await apiCall(page, 'PUT', '/user-data/settings/default-currency', {
        default_currency: currency,
    });
}

/**
 * Reset currency back to EUR
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function resetCurrencyToEUR(page) {
    await setDefaultCurrency(page, 'EUR');
}
