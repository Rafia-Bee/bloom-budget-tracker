/**
 * Bloom - Budget Period Setup Wizard
 *
 * Multi-step modal for setting up monthly budget periods with weekly budgets.
 * Steps:
 * 1. Enter current debit/credit balances and optional credit allowance
 * 2. Review/adjust auto-detected fixed bills from recurring expenses
 * 3. Confirm weekly budget calculation
 * 4. Create budget period and N sub-period budgets
 */

import { useState, useEffect, useMemo } from 'react';
import api, { recurringExpenseAPI, userAPI, incomeAPI, expenseAPI } from '../api';
import { useCurrency } from '../contexts/CurrencyContext';
import { logError } from '../utils/logger';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../utils/formatters';
import PeriodInfoModal from './PeriodInfoModal';

function SalaryPeriodWizard({ onClose, onComplete, editPeriod = null, rolloverData = null }) {
    const { defaultCurrency, convertAmount } = useCurrency();
    const { isEnabled } = useFeatureFlag();
    const balanceModeEnabled = isEnabled('balanceModeEnabled');
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [debitBalance, setDebitBalance] = useState('');
    const [creditAvailable, setCreditAvailable] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [creditAllowance, setCreditAllowance] = useState(0);
    const [balanceMode, setBalanceMode] = useState('sync');
    const [balanceStartDate, setBalanceStartDate] = useState(null);
    const [showBalanceModeInfo, setShowBalanceModeInfo] = useState(false);
    const [showPeriodInfoModal, setShowPeriodInfoModal] = useState(false);
    const [showFutureIncomePrompt, setShowFutureIncomePrompt] = useState(false);
    const [showBalanceDifferencePrompt, setShowBalanceDifferencePrompt] = useState(false);
    const [balanceDifferenceData, setBalanceDifferenceData] = useState(null);
    // Store tracked balances from getGlobalBalances for comparison
    const [trackedDebitBalance, setTrackedDebitBalance] = useState(null);
    const [trackedCreditAvailable, setTrackedCreditAvailable] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        // Default end date: 1 month from start - 1 day
        const defaultEnd = new Date();
        defaultEnd.setMonth(defaultEnd.getMonth() + 1);
        defaultEnd.setDate(defaultEnd.getDate() - 1);
        return defaultEnd.toISOString().split('T')[0];
    });
    const [numSubPeriods, setNumSubPeriods] = useState(4);
    const [preview, setPreview] = useState(null);
    const [fixedBills, setFixedBills] = useState([]);
    const [expectedIncome, setExpectedIncome] = useState([]);
    const [preExistingExpenses, setPreExistingExpenses] = useState({ count: 0, total: 0 });

    // Calculate max sub-periods based on date range
    const maxSubPeriods = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because end date is inclusive
        return Math.max(1, diffDays);
    }, [startDate, endDate]);

    // Ensure numSubPeriods doesn't exceed max when dates change
    useEffect(() => {
        if (numSubPeriods > maxSubPeriods) {
            setNumSubPeriods(Math.min(4, maxSubPeriods));
        }
    }, [maxSubPeriods, numSubPeriods]);

    // Calculate days per sub-period for display
    const daysPerSubPeriod = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end - start;
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Math.floor(totalDays / numSubPeriods);
    }, [startDate, endDate, numSubPeriods]);

    // Quick add fixed bill state
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddAmount, setQuickAddAmount] = useState('');
    const [quickAddCategory, setQuickAddCategory] = useState('Fixed Expenses');
    const [quickAddSubcategory, setQuickAddSubcategory] = useState('Subscriptions');
    const [quickAddPaymentMethod, setQuickAddPaymentMethod] = useState('Debit card');
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [quickAddError, setQuickAddError] = useState('');

    // Common fixed bill presets for quick selection
    const fixedBillPresets = [
        { name: 'Rent', category: 'Fixed Expenses', subcategory: 'Rent' },
        { name: 'Electricity', category: 'Fixed Expenses', subcategory: 'Utilities' },
        { name: 'Internet', category: 'Fixed Expenses', subcategory: 'Utilities' },
        { name: 'Phone', category: 'Fixed Expenses', subcategory: 'Utilities' },
        { name: 'Insurance', category: 'Fixed Expenses', subcategory: 'Insurance' },
        { name: 'Netflix', category: 'Fixed Expenses', subcategory: 'Subscriptions' },
        { name: 'Spotify', category: 'Fixed Expenses', subcategory: 'Subscriptions' },
    ];

    // Pre-fill form when editing existing salary period OR rolling over
    useEffect(() => {
        if (editPeriod) {
            // Convert stored EUR values to user's currency for display/editing
            setDebitBalance((fromEur(editPeriod.initial_debit_balance) / 100).toFixed(2));
            setCreditAvailable((fromEur(editPeriod.initial_credit_balance) / 100).toFixed(2));
            setCreditLimit((fromEur(editPeriod.credit_limit) / 100).toFixed(2));
            setCreditAllowance(fromEur(editPeriod.credit_budget_allowance || 0));
            setStartDate(editPeriod.start_date);
            setEndDate(editPeriod.end_date);
            // Set num_sub_periods from existing period (default 4 for old periods)
            if (editPeriod.num_sub_periods) {
                setNumSubPeriods(editPeriod.num_sub_periods);
            }
        } else if (rolloverData) {
            // Pre-fill with rollover balances (already in EUR, convert to user's currency)
            setDebitBalance((fromEur(rolloverData.suggestedDebitBalance) / 100).toFixed(2));
            setCreditAvailable((fromEur(rolloverData.suggestedCreditAvailable) / 100).toFixed(2));
            setCreditLimit((fromEur(rolloverData.creditLimit) / 100).toFixed(2));
            setCreditAllowance(fromEur(rolloverData.creditAllowance || 0));

            // Set start date to day after previous period ended
            const nextDay = new Date(rolloverData.endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setStartDate(nextDay.toISOString().split('T')[0]);

            // Calculate default end date (1 month from start)
            const defaultEnd = new Date(nextDay);
            defaultEnd.setMonth(defaultEnd.getMonth() + 1);
            defaultEnd.setDate(defaultEnd.getDate() - 1);
            setEndDate(defaultEnd.toISOString().split('T')[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editPeriod, rolloverData]);

    // Fetch current global balances when creating new period (no edit/rollover)
    useEffect(() => {
        if (!editPeriod && !rolloverData) {
            userAPI
                .getGlobalBalances()
                .then((response) => {
                    const data = response.data;
                    if (data.has_initial_balances) {
                        // Pre-fill with current calculated balances
                        const debitInUserCurrency = fromEur(data.debit_balance);
                        const creditInUserCurrency = fromEur(data.credit_available);
                        setDebitBalance((debitInUserCurrency / 100).toFixed(2));
                        setCreditAvailable((creditInUserCurrency / 100).toFixed(2));
                        // Store tracked balances for comparison (in cents, user currency)
                        setTrackedDebitBalance(debitInUserCurrency);
                        setTrackedCreditAvailable(creditInUserCurrency);
                        // Always set credit limit from API (preserves user's 0 setting)
                        setCreditLimit((fromEur(data.credit_limit) / 100).toFixed(2));
                    }
                })
                .catch((err) => {
                    logError('loadGlobalBalances', err);
                });
        }
        // Note: fromEur is stable (from context), so not needed in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editPeriod, rolloverData]);

    // Load user's balance mode preference and balance_start_date when feature is enabled
    useEffect(() => {
        if (balanceModeEnabled) {
            userAPI
                .getBalanceMode()
                .then((response) => {
                    setBalanceMode(response.data.balance_mode || 'sync');
                    setBalanceStartDate(response.data.balance_start_date || null);
                })
                .catch((err) => {
                    logError('loadBalanceMode', err);
                });
        }
    }, [balanceModeEnabled]);

    const formatCurrency = (cents) => {
        return formatCurrencyUtil(cents, defaultCurrency);
    };

    // Convert EUR cents (from DB) to user's currency cents for display
    const fromEur = (eurCents) => {
        return convertAmount ? convertAmount(eurCents, 'EUR', defaultCurrency) : eurCents;
    };

    // Convert user's currency cents to EUR cents for storage
    const toEur = (userCents) => {
        return convertAmount ? convertAmount(userCents, defaultCurrency, 'EUR') : userCents;
    };

    const parseCurrency = (value) => {
        const cleaned = value.replace(/[^0-9.]/g, '');
        const dollars = parseFloat(cleaned) || 0;
        return Math.round(dollars * 100);
    };

    // Handle quick add fixed bill
    const handleQuickAddSubmit = async () => {
        if (!quickAddName.trim() || !quickAddAmount) {
            setQuickAddError('Please enter name and amount');
            return;
        }

        setQuickAddError('');
        setQuickAddLoading(true);

        try {
            const amountInCents = toEur(parseCurrency(quickAddAmount));

            // Create recurring expense with is_fixed_bill = true
            await recurringExpenseAPI.create({
                name: quickAddName,
                amount: amountInCents,
                category: quickAddCategory,
                subcategory: quickAddSubcategory,
                payment_method: quickAddPaymentMethod,
                frequency: 'monthly',
                day_of_month: new Date().getDate(),
                start_date: new Date().toISOString().split('T')[0],
                is_active: true,
                is_fixed_bill: true,
            });

            // Add to local fixed bills list immediately
            setFixedBills([
                ...fixedBills,
                {
                    name: quickAddName,
                    amount: amountInCents,
                    category: quickAddCategory,
                },
            ]);

            // Reset form
            setQuickAddName('');
            setQuickAddAmount('');
            setQuickAddCategory('Fixed Expenses');
            setQuickAddSubcategory('Subscriptions');
            setQuickAddPaymentMethod('Debit card');
            setShowQuickAdd(false);
        } catch (err) {
            setQuickAddError(err.response?.data?.error || 'Failed to add fixed bill');
        } finally {
            setQuickAddLoading(false);
        }
    };

    // Select a preset and populate the quick add form
    const selectPreset = (preset) => {
        setQuickAddName(preset.name);
        setQuickAddCategory(preset.category);
        setQuickAddSubcategory(preset.subcategory);
        setShowQuickAdd(true);
    };

    const handleStep1Next = async () => {
        const debitCents = parseCurrency(debitBalance);
        const creditAvailableCents = parseCurrency(creditAvailable);

        if (debitCents <= 0) {
            setError('Please enter your current debit balance');
            return;
        }

        // Validate dates for sub-periods
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            setError('End date must be after start date');
            return;
        }
        if (numSubPeriods < 1 || numSubPeriods > maxSubPeriods) {
            setError(`Sub-periods must be between 1 and ${maxSubPeriods}`);
            return;
        }

        // No validation needed - credit allowance slider only shows when credit available

        setError('');
        // Close info box when moving to next step
        setShowBalanceModeInfo(false);
        setLoading(true);

        try {
            // Convert user's currency to EUR for backend storage
            const payload = {
                debit_balance: toEur(debitCents),
                credit_balance: toEur(creditAvailableCents),
                credit_limit: toEur(parseCurrency(creditLimit)),
                credit_allowance: toEur(creditAllowance),
                start_date: startDate,
            };

            // Add sub-periods params
            payload.end_date = endDate;
            payload.num_sub_periods = numSubPeriods;

            const response = await api.post('/salary-periods/preview', payload);

            setPreview(response.data);
            setFixedBills(response.data.fixed_bills);
            setExpectedIncome(response.data.expected_income || []);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to preview budget period');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Next = async () => {
        setError('');
        setLoading(true);

        try {
            // Convert user's currency to EUR for backend storage
            // Fixed bills amounts are already in EUR from the backend
            const payload = {
                debit_balance: toEur(parseCurrency(debitBalance)),
                credit_balance: toEur(parseCurrency(creditAvailable)),
                credit_limit: toEur(parseCurrency(creditLimit)),
                credit_allowance: toEur(creditAllowance),
                start_date: startDate,
                fixed_bills: fixedBills,
                expected_income: expectedIncome,
            };

            // Add sub-periods params
            payload.end_date = endDate;
            payload.num_sub_periods = numSubPeriods;

            const response = await api.post('/salary-periods/preview', payload);

            setPreview(response.data);

            // Fetch pre-existing expenses in this date range (non-fixed bills only)
            // These are expenses that already exist and will count toward the budget
            try {
                const expensesResponse = await expenseAPI.getAll({
                    start_date: startDate,
                    end_date: endDate,
                    is_fixed_bill: 'false',
                });
                const expenses = expensesResponse.data.expenses || [];
                const total = expenses.reduce((sum, e) => sum + e.amount, 0);
                setPreExistingExpenses({ count: expenses.length, total });
            } catch (expErr) {
                logError('fetchPreExistingExpenses', expErr);
                setPreExistingExpenses({ count: 0, total: 0 });
            }

            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to recalculate budget');
        } finally {
            setLoading(false);
        }
    };

    // Check if this is a past period (start_date < balance_start_date)
    // Past periods need an informational modal in both sync and budget modes
    const isPastPeriod = () => {
        if (editPeriod) return false; // Don't prompt when editing
        if (!balanceStartDate) return false; // No anchor date yet = first period, not "past"

        // Compare dates as strings (YYYY-MM-DD format)
        return startDate < balanceStartDate;
    };

    // Check if this is a future period in sync mode that needs an income prompt
    const isFuturePeriodInSyncMode = () => {
        if (editPeriod) return false; // Don't prompt when editing
        if (balanceMode !== 'sync') return false; // Only for sync mode

        // Compare dates as strings to avoid timezone issues
        // startDate is "YYYY-MM-DD" format
        const todayStr = new Date().toISOString().split('T')[0];
        if (startDate <= todayStr) return false; // Not a future period

        const debitCents = parseCurrency(debitBalance);
        if (debitCents <= 0) return false; // No starting balance
        return true;
    };

    // Check if entered balance differs from tracked balance (for current/past periods in sync mode)
    const getBalanceDifference = () => {
        if (!balanceModeEnabled) return null;
        if (balanceMode !== 'sync') return null;
        if (editPeriod) return null; // Skip for edits (different UX flow)
        if (rolloverData) return null; // Rollover pre-fills correct values
        if (trackedDebitBalance === null) return null; // No tracked data yet (first period or loading)

        // Skip if this is a PAST period (before anchor) - handled by PeriodInfoModal
        if (balanceStartDate && startDate < balanceStartDate) return null;

        // Skip if this is a FUTURE period - handled by FutureIncomePrompt
        const todayStr = new Date().toISOString().split('T')[0];
        if (startDate > todayStr) return null;

        const enteredDebit = parseCurrency(debitBalance);
        const enteredCredit = parseCurrency(creditAvailable);

        const debitDiff = enteredDebit - trackedDebitBalance;
        const creditDiff = enteredCredit - (trackedCreditAvailable || 0);

        // No difference - nothing to prompt
        if (debitDiff === 0 && creditDiff === 0) return null;

        return {
            debitDiff,
            creditDiff,
            trackedDebit: trackedDebitBalance,
            trackedCredit: trackedCreditAvailable || 0,
            enteredDebit,
            enteredCredit,
        };
    };

    const handleCreate = async () => {
        // Check if we should show the past period info modal
        if (balanceModeEnabled && isPastPeriod() && !showPeriodInfoModal) {
            setShowPeriodInfoModal(true);
            return;
        }

        // Check if we should show the future income prompt (sync mode only)
        if (balanceModeEnabled && isFuturePeriodInSyncMode() && !showFutureIncomePrompt) {
            setShowFutureIncomePrompt(true);
            return;
        }

        // Check if we should show the balance difference prompt (current periods in sync mode)
        const diff = getBalanceDifference();
        if (diff && !showBalanceDifferencePrompt) {
            setBalanceDifferenceData(diff);
            setShowBalanceDifferencePrompt(true);
            return;
        }

        await createSalaryPeriod(false);
    };

    // Handle continue from PeriodInfoModal (with optional mode change)
    const handlePeriodInfoContinue = async (newMode) => {
        // Update local state if mode changed
        if (newMode !== balanceMode) {
            setBalanceMode(newMode);
        }
        setShowPeriodInfoModal(false);

        // Now continue with the normal flow (check for future income prompt if applicable)
        if (newMode === 'sync' && isFuturePeriodInSyncMode()) {
            setShowFutureIncomePrompt(true);
            return;
        }

        await createSalaryPeriod(false);
    };

    const handleCreateWithIncome = async () => {
        await createSalaryPeriod(true);
    };

    // Create with reconciliation income (for balance difference case)
    const handleCreateWithReconciliationIncome = async () => {
        await createSalaryPeriod(false, balanceDifferenceData?.debitDiff);
    };

    const createSalaryPeriod = async (createIncome, reconciliationAmount = null) => {
        setError('');
        setLoading(true);
        setShowFutureIncomePrompt(false);
        setShowBalanceDifferencePrompt(false);

        try {
            // Convert user's currency to EUR for backend storage
            const payload = {
                debit_balance: toEur(parseCurrency(debitBalance)),
                credit_balance: toEur(parseCurrency(creditAvailable)),
                credit_limit: toEur(parseCurrency(creditLimit)),
                credit_allowance: toEur(creditAllowance),
                start_date: startDate,
                fixed_bills: fixedBills,
                expected_income: expectedIncome,
            };

            // Add sub-periods params
            payload.end_date = endDate;
            payload.num_sub_periods = numSubPeriods;

            if (editPeriod) {
                // Update existing salary period
                const periodId = editPeriod.period_id || editPeriod.id;
                await api.put(`/salary-periods/${periodId}`, payload);
            } else {
                // Create new salary period
                await api.post('/salary-periods', payload);

                // If user wants income created for future period, create it
                if (createIncome) {
                    const incomeAmount = toEur(parseCurrency(debitBalance));
                    await incomeAPI.create({
                        type: `Projected Period Salary: ${startDate}`,
                        amount: incomeAmount,
                        date: startDate,
                    });
                }

                // If user wants reconciliation income for balance difference
                if (reconciliationAmount && reconciliationAmount > 0) {
                    await incomeAPI.create({
                        type: 'Balance Reconciliation',
                        amount: toEur(reconciliationAmount),
                        date: new Date().toISOString().split('T')[0], // Today's date
                    });
                }
            }

            onComplete();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                    `Failed to ${editPeriod ? 'update' : 'create'} budget period`
            );
            setLoading(false);
        }
    };

    const updateFixedBillAmount = (index, value) => {
        const newBills = [...fixedBills];
        // User edits in their currency, convert to EUR for storage
        newBills[index].amount = toEur(parseCurrency(value));
        setFixedBills(newBills);
    };

    const removeFixedBill = (index) => {
        setFixedBills(fixedBills.filter((_, i) => i !== index));
    };

    const updateExpectedIncomeAmount = (index, value) => {
        const newIncome = [...expectedIncome];
        // User edits in their currency, convert to EUR for storage
        newIncome[index].amount = toEur(parseCurrency(value));
        setExpectedIncome(newIncome);
    };

    const removeExpectedIncome = (index) => {
        setExpectedIncome(expectedIncome.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 rounded-t-2xl z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">
                            {editPeriod ? 'Edit' : 'Setup'} Budget Periods
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text text-2xl font-light"
                        >
                            ×
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center flex-1">
                                <div
                                    className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-bloom-pink dark:bg-dark-pink' : 'bg-gray-200 dark:bg-dark-elevated'}`}
                                />
                                {s < 3 && <div className="w-2" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-dark-danger rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-text">
                                    Enter Your Current Balances
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    We'll help you create a {numSubPeriods}-period budget based
                                    on your available funds.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Debit Balance (Current Bank Account)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">
                                        {currencySymbol}
                                    </span>
                                    <input
                                        type="text"
                                        value={debitBalance}
                                        onChange={(e) => setDebitBalance(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                        placeholder="1500.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Credit Card Available (Remaining Limit)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">
                                        {currencySymbol}
                                    </span>
                                    <input
                                        type="text"
                                        value={creditAvailable}
                                        onChange={(e) => setCreditAvailable(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                        placeholder="1000.00"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    How much credit you have left to spend
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Credit Card Limit (Total)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">
                                        {currencySymbol}
                                    </span>
                                    <input
                                        type="text"
                                        value={creditLimit}
                                        onChange={(e) => setCreditLimit(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                        placeholder="1500.00"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    {parseCurrency(creditLimit) > parseCurrency(creditAvailable)
                                        ? `You currently owe ${formatCurrency(parseCurrency(creditLimit) - parseCurrency(creditAvailable))}`
                                        : 'No pre-existing debt'}
                                </p>
                            </div>

                            {parseCurrency(creditAvailable) > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        Credit Allowance (Optional)
                                    </label>
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-3">
                                        How much of your available credit do you want to include in
                                        this budget?
                                    </p>
                                    <input
                                        type="range"
                                        min="0"
                                        max={parseCurrency(creditAvailable)}
                                        step="100"
                                        value={creditAllowance}
                                        onChange={(e) =>
                                            setCreditAllowance(parseInt(e.target.value))
                                        }
                                        className="w-full"
                                    />
                                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                        <span>{formatCurrency(0)}</span>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-bloom-pink dark:text-dark-pink font-semibold text-sm">
                                                {currencySymbol}
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={(creditAllowance / 100).toFixed(2)}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(
                                                        /[^0-9.]/g,
                                                        ''
                                                    );
                                                    const cents = Math.round(
                                                        parseFloat(val || 0) * 100
                                                    );
                                                    const max = parseCurrency(creditAvailable);
                                                    const clamped = Math.max(
                                                        0,
                                                        Math.min(cents, max)
                                                    );
                                                    setCreditAllowance(clamped);
                                                }}
                                                onBlur={(e) => {
                                                    // Ensure proper formatting on blur
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const cents = Math.round(val * 100);
                                                    const max = parseCurrency(creditAvailable);
                                                    const clamped = Math.max(
                                                        0,
                                                        Math.min(cents, max)
                                                    );
                                                    setCreditAllowance(clamped);
                                                }}
                                                className="w-24 pl-6 pr-2 py-1 text-center border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-elevated text-bloom-pink dark:text-dark-pink font-semibold focus:ring-1 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:outline-none"
                                            />
                                        </div>
                                        <span>
                                            {formatCurrency(parseCurrency(creditAvailable))}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Only show "maxed out" warning if user has a credit card (limit > 0) but no available credit */}
                            {parseCurrency(creditLimit) > 0 &&
                                parseCurrency(creditAvailable) === 0 && (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                            No credit available (card is maxed out). Only your
                                            debit balance will be used for budgeting.
                                        </p>
                                    </div>
                                )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Budget Period Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                />
                            </div>

                            {/* Balance Mode Selector (behind feature flag) */}
                            {balanceModeEnabled && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                                            Balance Mode
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowBalanceModeInfo(!showBalanceModeInfo)
                                            }
                                            className="inline-flex items-center justify-center w-5 h-5 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-200 dark:bg-dark-elevated rounded-full hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
                                        >
                                            ?
                                        </button>
                                    </div>

                                    {/* Balance Mode Info Box */}
                                    {showBalanceModeInfo && (
                                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowBalanceModeInfo(false)}
                                                className="absolute top-2 right-2 text-purple-400 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                                            >
                                                ✕
                                            </button>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">
                                                Balance Mode Explained
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-purple-700 dark:text-purple-300">
                                                        Sync with Bank
                                                    </span>
                                                    <p className="text-purple-600 dark:text-purple-400 mt-1">
                                                        All your budget periods share ONE running
                                                        balance. If you create a new period to track
                                                        past transactions (e.g., €500 starting
                                                        balance), that adds to your total. You're
                                                        responsible for adding matching expenses to
                                                        balance the books.
                                                    </p>
                                                    <p className="text-purple-500 dark:text-purple-500 mt-1 text-xs italic">
                                                        Note: This doesn't connect to your bank - it
                                                        just calculates balances the same way.
                                                        Future-dated periods won't affect current
                                                        balance until their date arrives.
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-purple-700 dark:text-purple-300">
                                                        Budget Tracker
                                                    </span>
                                                    <p className="text-purple-600 dark:text-purple-400 mt-1">
                                                        Each budget period is completely isolated.
                                                        Creating new periods doesn't affect other
                                                        periods' balances. Good if you want to track
                                                        spending limits without worrying about your
                                                        actual bank balance.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <select
                                        value={balanceMode}
                                        onChange={(e) => {
                                            setBalanceMode(e.target.value);
                                            // Save preference immediately
                                            userAPI
                                                .updateBalanceMode(e.target.value)
                                                .catch((err) => logError('saveBalanceMode', err));
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                    >
                                        <option value="sync">Sync with Bank</option>
                                        <option value="budget">Budget Tracker</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        {balanceMode === 'sync'
                                            ? 'Balances accumulate across periods (tracks real bank balance)'
                                            : 'Each period has isolated balance calculation'}
                                    </p>
                                </div>
                            )}

                            {/* End Date and Number of Periods */}
                            <>
                                <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                            Budget Period End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                            Number of Sub-Periods
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="1"
                                                max={maxSubPeriods}
                                                value={numSubPeriods}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    setNumSubPeriods(
                                                        Math.max(1, Math.min(maxSubPeriods, val))
                                                    );
                                                }}
                                                className="w-24 px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent text-center"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                {daysPerSubPeriod === 7
                                                    ? '≈ weekly periods'
                                                    : daysPerSubPeriod === 14
                                                      ? '≈ bi-weekly periods'
                                                      : daysPerSubPeriod >= 28 &&
                                                          daysPerSubPeriod <= 31
                                                        ? '≈ monthly periods'
                                                        : `≈ ${daysPerSubPeriod} days each`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                            Max: {maxSubPeriods} (1 day per sub-period)
                                        </p>
                                    </div>
                            </>

                            <button
                                onClick={handleStep1Next}
                                disabled={loading}
                                className="w-full bg-bloom-pink dark:bg-dark-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 dark:hover:bg-dark-pink/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Loading...' : 'Next: Review Fixed Bills'}
                            </button>
                        </div>
                    )}

                    {step === 2 && preview && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-text">
                                    Review Fixed Bills
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    These recurring expenses won't count against your{' '}
                                    period budget. Adjust
                                    or remove as needed.
                                </p>
                            </div>

                            {fixedBills.length === 0 ? (
                                <div className="space-y-4">
                                    {/* Warning Message */}
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                        <div className="flex gap-3">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                                <p className="font-medium text-amber-800 dark:text-amber-400 mb-1">
                                                    No fixed bills set up yet
                                                </p>
                                                <p className="text-sm text-amber-700 dark:text-amber-500">
                                                    Do you have regular expenses like{' '}
                                                    <strong>
                                                        rent, utilities, or subscriptions
                                                    </strong>
                                                    ? Adding them now ensures your period
                                                    budget is accurate. Fixed bills are deducted
                                                    from your total budget <em>before</em>{' '}
                                                    calculating your period allowance.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Add Section */}
                                    <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-4">
                                        <p className="font-medium text-gray-700 dark:text-dark-text mb-3">
                                            Quick add common fixed bills:
                                        </p>

                                        {/* Preset Buttons */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {fixedBillPresets.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    onClick={() => selectPreset(preset)}
                                                    className="px-3 py-1.5 text-sm bg-white dark:bg-dark-surface text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border rounded-full hover:border-bloom-pink dark:hover:border-dark-pink hover:text-bloom-pink dark:hover:text-dark-pink transition-colors"
                                                >
                                                    + {preset.name}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Quick Add Form */}
                                        {showQuickAdd && (
                                            <div className="border-t border-gray-200 dark:border-dark-border pt-4 mt-2 space-y-3">
                                                {quickAddError && (
                                                    <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-dark-danger rounded text-sm">
                                                        {quickAddError}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                            Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={quickAddName}
                                                            onChange={(e) =>
                                                                setQuickAddName(e.target.value)
                                                            }
                                                            placeholder="e.g., Rent"
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                            Amount
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                                {currencySymbol}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={quickAddAmount}
                                                                onChange={(e) =>
                                                                    setQuickAddAmount(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="500.00"
                                                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                        Payment Method
                                                    </label>
                                                    <select
                                                        value={quickAddPaymentMethod}
                                                        onChange={(e) =>
                                                            setQuickAddPaymentMethod(e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                                    >
                                                        <option value="Debit card">
                                                            Debit Card
                                                        </option>
                                                        <option value="Credit card">
                                                            Credit Card
                                                        </option>
                                                    </select>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowQuickAdd(false);
                                                            setQuickAddName('');
                                                            setQuickAddAmount('');
                                                            setQuickAddSubcategory('Subscriptions');
                                                            setQuickAddError('');
                                                        }}
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-text rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleQuickAddSubmit}
                                                        disabled={quickAddLoading}
                                                        className="flex-1 px-3 py-2 text-sm bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink/80 disabled:opacity-50"
                                                    >
                                                        {quickAddLoading
                                                            ? 'Adding...'
                                                            : 'Add Fixed Bill'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!showQuickAdd && (
                                            <button
                                                type="button"
                                                onClick={() => setShowQuickAdd(true)}
                                                className="w-full mt-2 px-4 py-2 text-sm border-2 border-dashed border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary rounded-lg hover:border-bloom-pink dark:hover:border-dark-pink hover:text-bloom-pink dark:hover:text-dark-pink transition-colors"
                                            >
                                                + Add custom fixed bill
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center">
                                        Don't have any fixed bills? No problem — just click "Next"
                                        to continue.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fixedBills.map((bill, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 dark:text-dark-text text-sm sm:text-base truncate">
                                                    {bill.name}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                    {bill.category}
                                                </div>
                                            </div>
                                            <div className="relative w-24 sm:w-28 flex-shrink-0">
                                                <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">
                                                    {currencySymbol}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={(fromEur(bill.amount) / 100).toFixed(2)}
                                                    onChange={(e) =>
                                                        updateFixedBillAmount(index, e.target.value)
                                                    }
                                                    className="w-full pl-5 sm:pl-7 pr-2 sm:pr-3 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeFixedBill(index)}
                                                className="text-red-500 hover:text-red-700 px-2"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {/* Quick Add Button for existing bills */}
                                    {!showQuickAdd ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickAdd(true)}
                                            className="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary rounded-lg hover:border-bloom-pink dark:hover:border-dark-pink hover:text-bloom-pink dark:hover:text-dark-pink transition-colors"
                                        >
                                            + Add another fixed bill
                                        </button>
                                    ) : (
                                        <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3 space-y-3 bg-white dark:bg-dark-surface">
                                            {quickAddError && (
                                                <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-dark-danger rounded text-sm">
                                                    {quickAddError}
                                                </div>
                                            )}

                                            {/* Show remaining presets that haven't been added */}
                                            {(() => {
                                                const existingNames = fixedBills.map((b) =>
                                                    b.name.toLowerCase()
                                                );
                                                const remainingPresets = fixedBillPresets.filter(
                                                    (p) =>
                                                        !existingNames.includes(
                                                            p.name.toLowerCase()
                                                        )
                                                );
                                                return (
                                                    remainingPresets.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200 dark:border-dark-border">
                                                            {remainingPresets.map((preset) => (
                                                                <button
                                                                    key={preset.name}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        selectPreset(preset)
                                                                    }
                                                                    className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-dark-elevated text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border rounded-full hover:border-bloom-pink dark:hover:border-dark-pink hover:text-bloom-pink dark:hover:text-dark-pink transition-colors"
                                                                >
                                                                    + {preset.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )
                                                );
                                            })()}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                        Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={quickAddName}
                                                        onChange={(e) =>
                                                            setQuickAddName(e.target.value)
                                                        }
                                                        placeholder="e.g., Rent"
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                        Amount
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                            {currencySymbol}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={quickAddAmount}
                                                            onChange={(e) =>
                                                                setQuickAddAmount(e.target.value)
                                                            }
                                                            placeholder="500.00"
                                                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowQuickAdd(false);
                                                        setQuickAddName('');
                                                        setQuickAddAmount('');
                                                        setQuickAddSubcategory('Subscriptions');
                                                        setQuickAddError('');
                                                    }}
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-text rounded-lg hover:bg-gray-100 dark:hover:bg-dark-elevated"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleQuickAddSubmit}
                                                    disabled={quickAddLoading}
                                                    className="flex-1 px-3 py-2 text-sm bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink/80 disabled:opacity-50"
                                                >
                                                    {quickAddLoading ? 'Adding...' : 'Add'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-dark-text">
                                        Total Fixed Bills
                                    </span>
                                    <span className="text-lg font-bold text-bloom-pink dark:text-dark-pink">
                                        {formatCurrency(
                                            fromEur(
                                                fixedBills.reduce(
                                                    (sum, bill) => sum + bill.amount,
                                                    0
                                                )
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Expected Income Section */}
                            <>
                                <div className="border-t border-gray-200 dark:border-dark-border pt-6 mt-6">
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-text">
                                        Expected Income
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                        Recurring income will be added to your available budget.
                                    </p>
                                </div>

                                {expectedIncome.length === 0 ? (
                                    <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-4">
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary text-center">
                                            No recurring income set up yet. You can add
                                            recurring income from the Recurring page.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {expectedIncome.map((income, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800 dark:text-dark-text">
                                                        {income.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-dark-text-secondary capitalize">
                                                        {income.income_type || 'Other'}
                                                    </div>
                                                </div>
                                                <div className="relative w-32">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                                                        {currencySymbol}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={(
                                                            fromEur(income.amount) / 100
                                                        ).toFixed(2)}
                                                        onChange={(e) =>
                                                            updateExpectedIncomeAmount(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full pl-7 pr-3 py-2 border border-emerald-300 dark:border-emerald-700 rounded text-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeExpectedIncome(index)}
                                                    className="text-red-500 hover:text-red-700 px-2"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-700 dark:text-dark-text">
                                            Total Expected Income
                                        </span>
                                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            +
                                            {formatCurrency(
                                                fromEur(
                                                    expectedIncome.reduce(
                                                        (sum, inc) => sum + inc.amount,
                                                        0
                                                    )
                                                )
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-dark-elevated"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStep2Next}
                                    disabled={loading}
                                    className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50"
                                >
                                    {loading ? 'Calculating...' : 'Next: Confirm Budget'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && preview && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-text">
                                    Confirm Your Period Budget
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    Review the breakdown and create your{' '}
                                    {numSubPeriods}-period budget plan.
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-bloom-pink to-pink-600 text-white rounded-xl p-4 sm:p-6 space-y-2 sm:space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="opacity-90 text-sm sm:text-base">
                                        Debit Balance
                                    </span>
                                    <span className="text-xl sm:text-2xl font-bold">
                                        {formatCurrency(fromEur(preview.debit_balance))}
                                    </span>
                                </div>
                                {preview.credit_allowance > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="opacity-90 text-sm sm:text-base">
                                            + Credit Allowance
                                        </span>
                                        <span className="text-lg sm:text-xl">
                                            +{formatCurrency(fromEur(preview.credit_allowance))}
                                        </span>
                                    </div>
                                )}
                                {preview.expected_income_total > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="opacity-90 text-sm sm:text-base">
                                            + Expected Income
                                        </span>
                                        <span className="text-lg sm:text-xl">
                                            +
                                            {formatCurrency(fromEur(preview.expected_income_total))}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="opacity-90 text-sm sm:text-base">
                                        − Fixed Bills
                                    </span>
                                    <span className="text-lg sm:text-xl">
                                        −{formatCurrency(fromEur(preview.fixed_bills_total))}
                                    </span>
                                </div>
                                <div className="border-t border-white/30 pt-2 sm:pt-3 flex justify-between items-center">
                                    <span className="opacity-90 text-sm sm:text-base">
                                        = Total Budget
                                    </span>
                                    <span className="text-xl sm:text-2xl font-bold">
                                        {formatCurrency(fromEur(preview.total_budget))}
                                    </span>
                                </div>
                                <div className="border-t border-white/30 pt-2 sm:pt-3 flex justify-between items-center">
                                    <span className="opacity-90 text-sm sm:text-base">
                                        ÷ {numSubPeriods} periods
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-bold">
                                        {formatCurrency(fromEur(preview.weekly_budget))}
                                    </span>
                                </div>
                                {preview.weekly_credit_budget > 0 && (
                                    <div className="text-sm opacity-90 mt-2">
                                        <div className="flex justify-between">
                                            <span>
                                                Debit per period:
                                            </span>
                                            <span>
                                                {formatCurrency(
                                                    fromEur(preview.weekly_debit_budget)
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>
                                                Credit per period:
                                            </span>
                                            <span>
                                                {formatCurrency(
                                                    fromEur(preview.weekly_credit_budget)
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pre-existing expenses warning */}
                            {preExistingExpenses.count > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-amber-600 dark:text-amber-400 text-xl">
                                            ⚠️
                                        </span>
                                        <div>
                                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                                                Pre-existing Expenses Found
                                            </p>
                                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                                You have{' '}
                                                <span className="font-semibold">
                                                    {preExistingExpenses.count} expense
                                                    {preExistingExpenses.count > 1 ? 's' : ''}
                                                </span>{' '}
                                                totaling{' '}
                                                <span className="font-semibold">
                                                    {formatCurrency(
                                                        fromEur(preExistingExpenses.total)
                                                    )}
                                                </span>{' '}
                                                already recorded in this date range. These will
                                                count toward your period budget.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-gray-900 dark:text-dark-text">
                                        {numSubPeriods}-Period Schedule
                                    </h4>
                                    <span className="text-sm text-gray-500">
                                        {(() => {
                                            const d = new Date(preview.start_date);
                                            return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                        })()}{' '}
                                        -{' '}
                                        {(() => {
                                            const d = new Date(preview.end_date);
                                            return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {preview.weeks.map((week) => (
                                        <div
                                            key={week.week_number}
                                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg"
                                        >
                                            <div className="w-8 h-8 bg-bloom-pink text-white rounded-full flex items-center justify-center font-semibold">
                                                {week.week_number}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-gray-600">
                                                    {(() => {
                                                        const d = new Date(week.start_date);
                                                        return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                                    })()}{' '}
                                                    -{' '}
                                                    {(() => {
                                                        const d = new Date(week.end_date);
                                                        return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="font-semibold text-bloom-pink">
                                                {formatCurrency(fromEur(week.budget_amount))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Pro tip:</strong> Any leftover budget at the end of
                                    each week should be allocated to debt or savings - it won't
                                    carry over!
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-dark-elevated"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50"
                                >
                                    {loading
                                        ? `${editPeriod ? 'Updating' : 'Creating'}...`
                                        : `${editPeriod ? 'Update' : 'Create'} Budget Plan`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Future Income Confirmation Dialog */}
            {showFutureIncomePrompt && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-3">
                            Future Budget Period Detected
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
                            You're creating a budget period that starts on{' '}
                            <strong>
                                {new Date(startDate).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </strong>{' '}
                            with a starting balance of{' '}
                            <strong>{formatCurrency(parseCurrency(debitBalance))}</strong>.
                        </p>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
                            In <strong>Sync with Bank</strong> mode, this starting balance won't
                            automatically add to your current balance.
                        </p>
                        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium mb-2">
                                Are you expecting income of{' '}
                                {formatCurrency(parseCurrency(debitBalance))} on{' '}
                                {new Date(startDate).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                                ?
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                                If yes, we'll create an income entry for you so your balance is
                                accurate when that day arrives.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => createSalaryPeriod(false)}
                                disabled={loading}
                                className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-elevated disabled:opacity-50"
                            >
                                No, just create period
                            </button>
                            <button
                                onClick={handleCreateWithIncome}
                                disabled={loading}
                                className="flex-1 bg-bloom-pink text-white py-2 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Yes, create income'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Difference Prompt (for current periods in sync mode) */}
            {showBalanceDifferencePrompt && balanceDifferenceData && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-3">
                            Balance Difference Detected
                        </h3>

                        {/* Show debit difference */}
                        {balanceDifferenceData.debitDiff !== 0 && (
                            <div className="mb-4">
                                <p className="text-gray-600 dark:text-dark-text-secondary">
                                    <strong>Debit Balance:</strong>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                    Entered: {formatCurrency(balanceDifferenceData.enteredDebit)} •
                                    Tracked: {formatCurrency(balanceDifferenceData.trackedDebit)}
                                </p>
                            </div>
                        )}

                        {/* Show credit difference */}
                        {balanceDifferenceData.creditDiff !== 0 && (
                            <div className="mb-4">
                                <p className="text-gray-600 dark:text-dark-text-secondary">
                                    <strong>Credit Available:</strong>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                    Entered: {formatCurrency(balanceDifferenceData.enteredCredit)} •
                                    Tracked: {formatCurrency(balanceDifferenceData.trackedCredit)}
                                </p>
                            </div>
                        )}

                        {/* Entered > Tracked: Offer income creation */}
                        {balanceDifferenceData.debitDiff > 0 && (
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                                <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-2">
                                    Your entered balance is{' '}
                                    {formatCurrency(balanceDifferenceData.debitDiff)} higher than
                                    tracked.
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    Would you like to create an income entry to reconcile this
                                    difference? This will ensure your tracked balance matches your
                                    actual bank balance.
                                </p>
                            </div>
                        )}

                        {/* Entered < Tracked: Warning only */}
                        {balanceDifferenceData.debitDiff < 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">
                                    Your entered balance is{' '}
                                    {formatCurrency(Math.abs(balanceDifferenceData.debitDiff))}{' '}
                                    lower than tracked.
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    In <strong>Sync with Bank</strong> mode, your dashboard will
                                    continue showing the tracked balance (
                                    {formatCurrency(balanceDifferenceData.trackedDebit)}). You may
                                    have untracked expenses to add.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {/* Go Back button - always shown */}
                            <button
                                onClick={() => {
                                    setShowBalanceDifferencePrompt(false);
                                    setBalanceDifferenceData(null);
                                }}
                                disabled={loading}
                                className="border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-2 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-elevated disabled:opacity-50"
                            >
                                Go back
                            </button>

                            {balanceDifferenceData.debitDiff > 0 ? (
                                <>
                                    <button
                                        onClick={() => createSalaryPeriod(false)}
                                        disabled={loading}
                                        className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-elevated disabled:opacity-50"
                                    >
                                        No, just create
                                    </button>
                                    <button
                                        onClick={handleCreateWithReconciliationIncome}
                                        disabled={loading}
                                        className="flex-1 bg-bloom-pink text-white py-2 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Yes, create income'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => createSalaryPeriod(false)}
                                    disabled={loading}
                                    className="flex-1 bg-bloom-pink text-white py-2 rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Continue'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Past Period Info Modal */}
            <PeriodInfoModal
                isOpen={showPeriodInfoModal}
                onContinue={handlePeriodInfoContinue}
                periodType="past"
                balanceMode={balanceMode}
                periodBalance={parseCurrency(debitBalance)}
                periodStartDate={startDate}
            />
        </div>
    );
}

export default SalaryPeriodWizard;
