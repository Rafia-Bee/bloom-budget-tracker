/**
 * Bloom - Dashboard Page
 *
 * Main dashboard displaying debit and credit card balances with expense tracking.
 * Shows balance cards, expense list with filters, and floating action button for adding expenses.
 */

import { useState, useEffect, useRef } from 'react';
import {
    expenseAPI,
    incomeAPI,
    budgetPeriodAPI,
    salaryPeriodAPI,
    recurringExpenseAPI,
} from '../api';
import { logError } from '../utils/logger';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatters';
import Header from '../components/Header';
import PeriodSelector from '../components/PeriodSelector';
import WeeklyBudgetCard from '../components/WeeklyBudgetCard';
import DraggableFloatingButton from '../components/DraggableFloatingButton';
import SalaryPeriodRolloverPrompt from '../components/SalaryPeriodRolloverPrompt';
import Loading from '../components/Loading';

// Refactored Components
import BalanceCards from '../components/dashboard/BalanceCards';
import TransactionList from '../components/dashboard/TransactionList';
import DashboardModals from '../components/dashboard/DashboardModals';

function Dashboard({ setIsAuthenticated }) {
    const [expenses, setExpenses] = useState([]);
    const [income, setIncome] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all'); // eslint-disable-line no-unused-vars -- Reserved for future filter feature
    const [transactionView, setTransactionView] = useState('transactions'); // 'transactions' or 'scheduled'
    const [scheduledExpenses, setScheduledExpenses] = useState([]);
    const [selectedScheduled, setSelectedScheduled] = useState([]); // Array of template_ids for scheduled view
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [modalType, setModalType] = useState(null); // 'expense' or 'income'
    const [editType, setEditType] = useState(null); // 'expense' or 'income'
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [currentPeriod, setCurrentPeriod] = useState(null);
    const [allPeriods, setAllPeriods] = useState([]);
    const [salaryPeriods, setSalaryPeriods] = useState([]); // Salary periods for selector
    const [showRolloverPrompt, setShowRolloverPrompt] = useState(false);
    const [rolloverData, setRolloverData] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('export');
    const [showBankImportModal, setShowBankImportModal] = useState(false);
    const [debitBalance, setDebitBalance] = useState(0);
    const [creditAvailable, setCreditAvailable] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [allTimeSpent, setAllTimeSpent] = useState(0);
    const [currentPeriodDebitSpent, setCurrentPeriodDebitSpent] = useState(0);
    const [currentPeriodCreditSpent, setCurrentPeriodCreditSpent] = useState(0);
    const [currentPeriodIncome, setCurrentPeriodIncome] = useState(0);
    const [warningModal, setWarningModal] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // {type: 'expense'|'income', id, transaction}
    const [selectedTransactions, setSelectedTransactions] = useState([]); // Array of {type, id}
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [showSalaryWizard, setShowSalaryWizard] = useState(false);
    const [editSalaryPeriod, setEditSalaryPeriod] = useState(null); // Period to edit in wizard
    const [showLeftoverModal, setShowLeftoverModal] = useState(false);
    const [leftoverModalData, setLeftoverModalData] = useState(null);
    const [currentWeekPeriod, setCurrentWeekPeriod] = useState(null); // Current week from salary period
    const [creditLimit, setCreditLimit] = useState(null); // Load from salary period
    const [isInitialLoading, setIsInitialLoading] = useState(true); // Prevent flickering on initial load
    const [viewingSalaryPeriodId, setViewingSalaryPeriodId] = useState(null); // Track which salary period we're viewing
    const [salaryPeriodData, setSalaryPeriodData] = useState(null); // Cached salary period data for child components
    // eslint-disable-next-line no-unused-vars -- Reserved for future current period indicator
    const [isViewingCurrentPeriod, setIsViewingCurrentPeriod] = useState(true);
    const weeklyBudgetCardRef = useRef(null);

    // Currency context for multi-currency support
    const { defaultCurrency, convertAmount } = useCurrency();

    // Helper to convert EUR amounts to user's currency and format
    // Used for balances/totals stored in EUR on backend
    // eslint-disable-next-line no-unused-vars -- Reserved for future currency conversion
    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    // Filter and pagination state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        subcategory: '',
        paymentMethod: '',
        minAmount: '',
        maxAmount: '',
        search: '',
        transactionType: 'both',
    });
    const [expensesPage, setExpensesPage] = useState(1);
    const [incomePage, setIncomePage] = useState(1);
    const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
    const [hasMoreIncome, setHasMoreIncome] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Date navigation state
    const [transactionDates, setTransactionDates] = useState([]);
    const [currentViewDate, setCurrentViewDate] = useState(null); // null = show period, ISO date = show specific day

    useEffect(() => {
        loadPeriodsAndCurrentWeek();
        loadTransactionDates();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.add-menu')) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (currentPeriod) {
            loadIncomeStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPeriod]);

    useEffect(() => {
        if (currentPeriod) {
            loadTransactionsAndBalances();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPeriod]);

    const loadTransactionsAndBalances = async () => {
        if (!currentPeriod) return;
        try {
            // Load based on transactionType filter
            const promises = [];

            if (activeFilters.transactionType !== 'income') {
                promises.push(loadExpenses());
            } else {
                setExpenses([]);
            }

            // Skip income if expense-only filters are active (category, subcategory, payment_method)
            const hasExpenseOnlyFilters =
                activeFilters.category || activeFilters.subcategory || activeFilters.paymentMethod;

            if (activeFilters.transactionType !== 'expense' && !hasExpenseOnlyFilters) {
                promises.push(loadIncome());
            } else {
                setIncome([]);
            }

            await Promise.all(promises);
            // calculateCumulativeBalances is called within loadExpenses/loadIncome
        } catch (error) {
            logError('loadTransactionsAndBalances', error);
        }
    };

    const loadScheduledExpenses = async () => {
        try {
            const response = await recurringExpenseAPI.previewUpcoming();
            setScheduledExpenses(response.data.upcoming || []);
        } catch (error) {
            logError('loadScheduledExpenses', error);
        }
    };

    const loadExpenses = async (page = 1, append = false) => {
        if (!currentPeriod) return;
        try {
            // Build query params with filters
            const params = {
                page,
                limit: 50,
            };

            // Only filter by current period if NO filters are active
            const hasActiveFilters =
                activeFilters.startDate ||
                activeFilters.endDate ||
                activeFilters.category ||
                activeFilters.subcategory ||
                activeFilters.paymentMethod ||
                activeFilters.minAmount ||
                activeFilters.maxAmount ||
                activeFilters.search;

            if (!hasActiveFilters) {
                // Use date range filtering instead of budget_period_id
                params.start_date = currentPeriod.start_date;
                params.end_date = currentPeriod.end_date;
            }

            // Apply active filters
            if (activeFilters.startDate) params.start_date = activeFilters.startDate;
            if (activeFilters.endDate) params.end_date = activeFilters.endDate;
            if (activeFilters.category) params.category = activeFilters.category;
            if (activeFilters.subcategory) params.subcategory = activeFilters.subcategory;
            if (activeFilters.paymentMethod) params.payment_method = activeFilters.paymentMethod;
            if (activeFilters.minAmount)
                params.min_amount = Math.round(parseFloat(activeFilters.minAmount) * 100);
            if (activeFilters.maxAmount)
                params.max_amount = Math.round(parseFloat(activeFilters.maxAmount) * 100);
            if (activeFilters.search) params.search = activeFilters.search;

            const currentResponse = await expenseAPI.getAll(params);

            // Handle both old (array) and new (object with expenses array) response formats
            const expensesData = Array.isArray(currentResponse.data)
                ? currentResponse.data
                : currentResponse.data.expenses || [];

            // Handle pagination metadata
            const pagination = currentResponse.data.pagination;
            if (pagination) {
                setHasMoreExpenses(pagination.has_more);
            } else {
                setHasMoreExpenses(false);
            }

            if (append) {
                setExpenses((prev) => [...prev, ...expensesData]);
            } else {
                setExpenses(expensesData);
            }

            // Don't recalculate balances - we use backend-calculated balances from salary period
            // Refresh weekly budget card to update spent amount
            weeklyBudgetCardRef.current?.refresh();
        } catch (error) {
            logError('loadExpenses', error);
        }
    };

    const loadIncome = async (page = 1, append = false) => {
        if (!currentPeriod) return;
        try {
            // Build query params with filters
            const params = {
                page,
                limit: 50,
            };

            // Only filter by current period if NO filters are active
            const hasActiveFilters =
                activeFilters.startDate ||
                activeFilters.endDate ||
                activeFilters.minAmount ||
                activeFilters.maxAmount ||
                activeFilters.search;

            if (!hasActiveFilters) {
                // Use date range filtering instead of budget_period_id
                params.start_date = currentPeriod.start_date;
                params.end_date = currentPeriod.end_date;
            }

            // Apply active filters
            if (activeFilters.startDate) params.start_date = activeFilters.startDate;
            if (activeFilters.endDate) params.end_date = activeFilters.endDate;
            if (activeFilters.minAmount)
                params.min_amount = Math.round(parseFloat(activeFilters.minAmount) * 100);
            if (activeFilters.maxAmount)
                params.max_amount = Math.round(parseFloat(activeFilters.maxAmount) * 100);
            if (activeFilters.search) params.search = activeFilters.search;

            const response = await incomeAPI.getAll(params);

            // Handle both old (array) and new (object with income array) response formats
            const incomeData = Array.isArray(response.data)
                ? response.data
                : response.data.income || [];

            // Handle pagination metadata
            const pagination = response.data.pagination;
            if (pagination) {
                setHasMoreIncome(pagination.has_more);
            } else {
                setHasMoreIncome(false);
            }

            if (append) {
                setIncome((prev) => [...prev, ...incomeData]);
            } else {
                setIncome(incomeData);
            }

            // Don't recalculate balances - we use backend-calculated balances from salary period
            // Refresh weekly budget card to update balances
            weeklyBudgetCardRef.current?.refresh();
        } catch (error) {
            logError('loadIncome', error);
        }
    };

    useEffect(() => {
        // Combine and sort transactions whenever expenses or income change
        const combined = [
            ...expenses.map((e) => ({ ...e, transactionType: 'expense' })),
            ...income.map((i) => ({ ...i, transactionType: 'income' })),
        ];
        // Sort by date (most recent first)
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(combined);
    }, [expenses, income]);

    useEffect(() => {
        // Clear selections and exit selection mode when filter changes
        setSelectedTransactions([]);
        setSelectionMode(false);
    }, [filter]);

    useEffect(() => {
        // Load scheduled expenses when switching to scheduled view
        if (transactionView === 'scheduled') {
            loadScheduledExpenses();
            setSelectedScheduled([]);
        } else {
            setSelectedScheduled([]);
        }
    }, [transactionView]);

    useEffect(() => {
        // Reload transactions when active filters change
        if (currentPeriod) {
            loadTransactionsAndBalances();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilters]);

    const loadTransactionDates = async () => {
        try {
            const response = await expenseAPI.getDatesWithTransactions();
            setTransactionDates(response.data.dates || []);
        } catch (error) {
            logError('loadTransactionDates', error);
        }
    };

    const loadPeriodsAndCurrentWeek = async () => {
        try {
            const [allPeriodsRes, activeRes, salaryPeriodRes, salaryPeriodsListRes] =
                await Promise.all([
                    budgetPeriodAPI.getAll(),
                    budgetPeriodAPI.getActive().catch(() => null),
                    salaryPeriodAPI.getCurrent().catch(() => null),
                    salaryPeriodAPI.getAll().catch(() => ({ data: [] })),
                ]);

            setAllPeriods(allPeriodsRes.data);

            // Combine salary periods with all budget periods (including sub-periods)
            // PeriodSelector needs sub-periods (with salary_period_id) for collapsible display
            const standalonePeriods = allPeriodsRes.data.filter((p) => !p.salary_period_id);
            const subPeriods = allPeriodsRes.data.filter((p) => p.salary_period_id);
            const combinedPeriods = [
                ...(salaryPeriodsListRes.data || []),
                ...standalonePeriods,
                ...subPeriods,
            ];
            // Sort by start date descending (most recent first)
            combinedPeriods.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
            setSalaryPeriods(combinedPeriods);

            // Prefer salary period's current week if available
            if (salaryPeriodRes?.data?.current_week?.id) {
                const currentWeek = salaryPeriodRes.data.current_week;
                const salaryPeriod = salaryPeriodRes.data.salary_period;

                // Cache salary period data for child components (avoids duplicate API calls)
                setSalaryPeriodData(salaryPeriodRes.data);

                // Load credit limit from salary period
                if (salaryPeriod.credit_limit) {
                    setCreditLimit(salaryPeriod.credit_limit / 100); // Convert cents to euros
                }

                // Use display balances from backend (real-time calculated from transactions)
                if (salaryPeriod.display_debit_balance !== undefined) {
                    setDebitBalance(salaryPeriod.display_debit_balance / 100); // Convert cents to euros
                }
                if (salaryPeriod.display_credit_available !== undefined) {
                    setCreditAvailable(salaryPeriod.display_credit_available / 100); // Convert cents to euros
                }

                // Set period-level spending by payment method (NEW)
                if (salaryPeriod.period_debit_spent !== undefined) {
                    setCurrentPeriodDebitSpent(salaryPeriod.period_debit_spent / 100); // Convert cents to euros
                }
                if (salaryPeriod.period_credit_spent !== undefined) {
                    setCurrentPeriodCreditSpent(salaryPeriod.period_credit_spent / 100); // Convert cents to euros
                }
                // Set period income
                if (salaryPeriod.period_income !== undefined) {
                    setCurrentPeriodIncome(salaryPeriod.period_income / 100);
                }
                // Set all-time spent
                if (salaryPeriod.all_time_spent !== undefined) {
                    setAllTimeSpent(salaryPeriod.all_time_spent / 100);
                }

                // Track that we're viewing the current salary period
                setViewingSalaryPeriodId(salaryPeriod.id);
                setIsViewingCurrentPeriod(true);

                // Create a budget period object from current week data
                const weekPeriod = {
                    id: currentWeek.id, // Use actual budget_period ID from database
                    salary_period_id: salaryPeriod.id, // Include parent salary period ID
                    start_date: currentWeek.start_date,
                    end_date: currentWeek.end_date,
                    period_type: 'weekly',
                    week_number: currentWeek.week_number,
                    budget_amount: currentWeek.budget_amount,
                };
                setCurrentWeekPeriod(weekPeriod);
                // Use current week for both display AND expense tracking
                setCurrentPeriod(weekPeriod);
            } else {
                // Fall back to old system if no salary period
                setCurrentWeekPeriod(null);
                setViewingSalaryPeriodId(null);
                setIsViewingCurrentPeriod(true);
                if (activeRes?.data) {
                    setCurrentPeriod(activeRes.data);
                } else if (allPeriodsRes.data.length > 0) {
                    setCurrentPeriod(allPeriodsRes.data[0]);
                }
            }

            // Check if rollover prompt should be shown
            if (salaryPeriodRes?.data?.current_week?.week_number === 4) {
                const periodEndDate = salaryPeriodRes.data.salary_period.end_date;
                const dismissedRollover = localStorage.getItem('dismissedRollover');

                let shouldShowPrompt = true;

                // Check if there's already a future salary period created (starts after current period ends)
                const currentEndDate = new Date(periodEndDate);
                const futurePeriodExists = salaryPeriodsListRes.data?.some((p) => {
                    const pStartDate = new Date(p.start_date);
                    return pStartDate > currentEndDate;
                });

                if (futurePeriodExists) {
                    // Already created next period, don't show prompt
                    shouldShowPrompt = false;
                } else if (dismissedRollover) {
                    try {
                        const dismissedData = JSON.parse(dismissedRollover);

                        // Check if it's the same period
                        if (dismissedData.periodEndDate === periodEndDate) {
                            // Calculate hours since dismissal
                            const hoursSinceDismissal =
                                (Date.now() - new Date(dismissedData.dismissedAt)) /
                                (1000 * 60 * 60);

                            // Only keep dismissed if less than 24 hours have passed
                            if (hoursSinceDismissal < 24) {
                                shouldShowPrompt = false;
                            }
                        }
                    } catch (e) {
                        // If parsing fails (old format), clear it and show prompt
                        localStorage.removeItem('dismissedRollover');
                    }
                }

                if (shouldShowPrompt) {
                    setShowRolloverPrompt(true);
                }
            }

            // Refresh weekly budget card when periods change
            weeklyBudgetCardRef.current?.refresh();
        } catch (error) {
            // Suppress 401 errors - the API interceptor handles auth redirects
            if (error.response?.status !== 401) {
                logError('loadPeriods', error);
            }
        } finally {
            setIsInitialLoading(false);
        }
    };

    // Handle date navigation change
    const handleDateNavigate = (date) => {
        if (date === null) {
            // Clear date filter - return to period view
            setCurrentViewDate(null);
            setActiveFilters((prev) => ({
                ...prev,
                startDate: '',
                endDate: '',
            }));
        } else {
            // Set specific date filter
            setCurrentViewDate(date);
            setActiveFilters((prev) => ({
                ...prev,
                startDate: date,
                endDate: date,
            }));
        }
    };

    const loadIncomeStats = async () => {
        if (!currentPeriod) return;

        try {
            const response = await incomeAPI.getStats();
            setTotalIncome(response.data.total_income / 100); // Convert cents to euros
            setCurrentPeriodIncome(response.data.period_income / 100); // Convert cents to euros
        } catch (error) {
            logError('loadIncomeStats', error);
        }
    };

    const handlePeriodChange = async (period) => {
        setCurrentPeriod(period);

        // Determine the salary period ID to load data for
        // If this is a sub-period (budget period), get its parent salary_period_id
        // If this is a salary period (has weekly_budget field), use its own ID
        const salaryPeriodId =
            period.weekly_budget !== undefined ? period.id : period.salary_period_id;

        if (salaryPeriodId && salaryPeriodId !== viewingSalaryPeriodId) {
            setViewingSalaryPeriodId(salaryPeriodId);
            await loadSalaryPeriodData(salaryPeriodId);
        }
    };

    const loadSalaryPeriodData = async (salaryPeriodId) => {
        try {
            const response = await salaryPeriodAPI.getById(salaryPeriodId);
            const salaryPeriod = response.data.salary_period;

            // Update balances from the selected period
            if (salaryPeriod.credit_limit) {
                setCreditLimit(salaryPeriod.credit_limit / 100);
            }
            if (salaryPeriod.display_debit_balance !== undefined) {
                setDebitBalance(salaryPeriod.display_debit_balance / 100);
            }
            if (salaryPeriod.display_credit_available !== undefined) {
                setCreditAvailable(salaryPeriod.display_credit_available / 100);
            }
            if (salaryPeriod.period_debit_spent !== undefined) {
                setCurrentPeriodDebitSpent(salaryPeriod.period_debit_spent / 100);
            }
            if (salaryPeriod.period_credit_spent !== undefined) {
                setCurrentPeriodCreditSpent(salaryPeriod.period_credit_spent / 100);
            }
            // Update period income
            if (salaryPeriod.period_income !== undefined) {
                setCurrentPeriodIncome(salaryPeriod.period_income / 100);
            }
            // Update all-time spent (shown as totalIncome in BalanceCards for "Total spent")
            if (salaryPeriod.all_time_spent !== undefined) {
                setAllTimeSpent(salaryPeriod.all_time_spent / 100);
            }

            // Track if we're viewing the current period
            setIsViewingCurrentPeriod(salaryPeriod.is_current || false);
        } catch (error) {
            logError('loadSalaryPeriodData', error);
        }
    };

    const handleReturnToCurrentPeriod = async () => {
        // Reload current period data
        await loadPeriodsAndCurrentWeek();
    };

    const handleDeletePeriod = async (id) => {
        try {
            // Find the period to determine its type
            const periodToDelete =
                salaryPeriods.find((p) => p.id === id) || allPeriods.find((p) => p.id === id);

            if (!periodToDelete) {
                throw new Error('Period not found');
            }

            // Use the appropriate API based on whether it's a salary period (has weekly_budget field)
            if (periodToDelete.weekly_budget !== undefined) {
                // It's a salary period
                await salaryPeriodAPI.delete(id);

                // Reload salary periods
                const salaryPeriodsRes = await salaryPeriodAPI.getAll();
                setSalaryPeriods(salaryPeriodsRes.data);
            } else {
                // It's a budget period
                await budgetPeriodAPI.delete(id);
            }

            // Check remaining periods
            const periodsRes = await budgetPeriodAPI.getAll();
            setAllPeriods(periodsRes.data);

            if (periodsRes.data.length === 0) {
                // No periods left - clear everything
                setCurrentPeriod(null);
                setExpenses([]);
                setIncome([]);
            } else {
                // Still have periods - check for active or use most recent
                const activeRes = await budgetPeriodAPI.getActive().catch(() => null);
                if (activeRes?.data) {
                    setCurrentPeriod(activeRes.data);
                } else {
                    setCurrentPeriod(periodsRes.data[0]);
                }
            }
        } catch (error) {
            logError('deletePeriod', error);
            const errorMessage =
                error.response?.data?.error ||
                'Failed to delete period. It may contain transactions.';
            alert(errorMessage);
        }
    };

    const getDebitAvailable = () => {
        // debitBalance from backend is already the available amount (income - expenses)
        return debitBalance;
    };

    const getCreditAvailable = () => {
        // creditAvailable from backend is the available amount (what you can spend)
        return creditAvailable;
    };

    const getCreditDebt = () => {
        // Debt = limit - available
        return creditLimit - creditAvailable;
    };

    // Format date for display in the viewing indicator
    const formatDateRange = (startDate, endDate) => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const options = { day: 'numeric', month: 'short' };
        return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
    };

    // Determine if we're viewing the "today" period
    // Show indicator when viewing ANY period other than the current sub-period
    const isViewingTodaysPeriod = () => {
        if (!currentPeriod || !currentWeekPeriod) return true;

        // If selected is a sub-period (has week_number), compare with currentWeekPeriod
        if (currentPeriod.week_number) {
            return currentPeriod.id === currentWeekPeriod.id;
        }

        // If selected is a salary period, it's not today's period unless we're at salary period level
        // (which shouldn't normally happen - we usually select sub-periods)
        return false;
    };

    // Get current period info for the viewing indicator
    const getViewingPeriodInfo = () => {
        if (!currentPeriod) return null;

        // Check if viewing a sub-period (has week_number) or a salary period (has weekly_budget)
        if (currentPeriod.week_number) {
            return {
                type: 'sub-period',
                label: `Period ${currentPeriod.week_number}`,
                dateRange: formatDateRange(currentPeriod.start_date, currentPeriod.end_date),
            };
        } else if (currentPeriod.weekly_budget !== undefined) {
            return {
                type: 'salary-period',
                label: 'Salary Period',
                dateRange: formatDateRange(currentPeriod.start_date, currentPeriod.end_date),
            };
        }
        return null;
    };

    const handleAddExpense = async (expenseData) => {
        const expenseAmount = expenseData.amount / 100; // Convert cents to euros
        const paymentMethod = expenseData.payment_method;

        // Determine which budget period this expense belongs to based on date
        let targetPeriodId = currentPeriod.id; // Default to current week

        if (expenseData.date && allPeriods.length > 0) {
            const expenseDate = new Date(expenseData.date);
            const matchingPeriod = allPeriods.find((period) => {
                const start = new Date(period.start_date);
                const end = new Date(period.end_date);
                return expenseDate >= start && expenseDate <= end;
            });
            if (matchingPeriod) {
                targetPeriodId = matchingPeriod.id;
            }
        }

        // Check if this would exceed available balance
        if (paymentMethod === 'Debit card') {
            const available = getDebitAvailable();
            if (expenseAmount > available) {
                return new Promise((resolve, reject) => {
                    setWarningModal({
                        type: 'debit',
                        expenseData,
                        available,
                        expenseAmount,
                        resolve,
                        reject,
                    });
                });
            }
        } else if (paymentMethod === 'Credit card') {
            const available = getCreditAvailable();
            if (expenseAmount > available) {
                return new Promise((resolve, reject) => {
                    setWarningModal({
                        type: 'credit',
                        expenseData,
                        available,
                        expenseAmount,
                        resolve,
                        reject,
                    });
                });
            }
        }

        try {
            await expenseAPI.create({
                ...expenseData,
                budget_period_id: targetPeriodId,
            });
            await loadExpenses();
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            loadTransactionDates(); // Refresh date navigation
            setShowAddModal(false);
            setModalType(null);
        } catch (error) {
            logError('addExpense', error);
            throw error;
        }
    };

    const handleApplyFilters = (filters) => {
        setActiveFilters(filters);
        // Reset pagination when filters change
        setExpensesPage(1);
        setIncomePage(1);
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            const promises = [];

            // Load more expenses if there are more and we're showing expenses
            if (hasMoreExpenses && activeFilters.transactionType !== 'income') {
                const nextExpensesPage = expensesPage + 1;
                promises.push(loadExpenses(nextExpensesPage, true));
                setExpensesPage(nextExpensesPage);
            }

            // Load more income if there are more and we're showing income
            if (hasMoreIncome && activeFilters.transactionType !== 'expense') {
                const nextIncomePage = incomePage + 1;
                promises.push(loadIncome(nextIncomePage, true));
                setIncomePage(nextIncomePage);
            }

            await Promise.all(promises);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleAddIncome = async (incomeData) => {
        // Determine which budget period this income belongs to based on date
        let targetPeriodId = currentPeriod.id; // Default to current week

        const incomeDate = incomeData.date
            ? new Date(incomeData.date)
            : incomeData.actual_date
              ? new Date(incomeData.actual_date)
              : incomeData.scheduled_date
                ? new Date(incomeData.scheduled_date)
                : null;

        if (incomeDate && allPeriods.length > 0) {
            const matchingPeriod = allPeriods.find((period) => {
                const start = new Date(period.start_date);
                const end = new Date(period.end_date);
                return incomeDate >= start && incomeDate <= end;
            });
            if (matchingPeriod) {
                targetPeriodId = matchingPeriod.id;
            }
        }

        try {
            await incomeAPI.create({
                ...incomeData,
                budget_period_id: targetPeriodId,
            });
            setShowAddModal(false);
            setModalType(null);
            await loadIncome(); // Reload income list
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            await loadIncomeStats(); // Update income stats
        } catch (error) {
            logError('addIncome', error);
            throw error;
        }
    };

    const handleDeleteIncome = async (id) => {
        try {
            await incomeAPI.delete(id);
            await loadIncome();
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            await loadIncomeStats(); // Update income stats
        } catch (error) {
            logError('deleteIncome', error);
        }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await expenseAPI.delete(id);
            await loadExpenses();
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            loadTransactionDates(); // Refresh date navigation
        } catch (error) {
            logError('deleteExpense', error);
        }
    };

    const handleEditExpense = async (id, expenseData) => {
        try {
            await expenseAPI.update(id, expenseData);
            await loadExpenses();
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            loadTransactionDates(); // Refresh date navigation
            setShowEditModal(false);
            setEditType(null);
            setSelectedTransaction(null);
        } catch (error) {
            logError('updateExpense', error);
            throw error;
        }
    };

    const handleEditIncome = async (id, incomeData) => {
        try {
            await incomeAPI.update(id, incomeData);
            await loadIncome();
            await loadPeriodsAndCurrentWeek(); // Reload salary period to update card balances
            await loadIncomeStats(); // Update income stats
            setShowEditModal(false);
            setEditType(null);
            setSelectedTransaction(null);
        } catch (error) {
            logError('updateIncome', error);
            throw error;
        }
    };

    const toggleTransactionSelection = (type, id) => {
        const key = `${type}-${id}`;
        setSelectedTransactions((prev) => {
            const exists = prev.find((t) => t.key === key);
            if (exists) {
                return prev.filter((t) => t.key !== key);
            } else {
                return [...prev, { type, id, key }];
            }
        });
    };

    const toggleSelectAll = () => {
        const filteredTxns = transactions.filter((t) => {
            if (filter === 'all') return true;
            if (filter === 'income') return t.transactionType === 'income';
            if (filter === 'expense') return t.transactionType === 'expense';
            if (filter === 'debit')
                return t.transactionType === 'expense' && t.payment_method === 'Debit card';
            if (filter === 'credit')
                return t.transactionType === 'expense' && t.payment_method === 'Credit card';
            return true;
        });

        if (selectedTransactions.length === filteredTxns.length) {
            // Deselect all
            setSelectedTransactions([]);
        } else {
            // Select all filtered
            setSelectedTransactions(
                filteredTxns.map((t) => ({
                    type: t.transactionType,
                    id: t.id,
                    key: `${t.transactionType}-${t.id}`,
                }))
            );
        }
    };

    const handleBulkDelete = async () => {
        try {
            // Delete all selected transactions
            await Promise.all(
                selectedTransactions.map((txn) => {
                    if (txn.type === 'expense') {
                        return expenseAPI.delete(txn.id);
                    } else {
                        return incomeAPI.delete(txn.id);
                    }
                })
            );

            // Reload data
            await loadExpenses();
            await loadIncome();

            // Clear selections and exit selection mode
            setSelectedTransactions([]);
            setShowBulkDeleteConfirm(false);
            setSelectionMode(false);
        } catch (error) {
            logError('deleteTransactions', error);
        }
    };

    if (isInitialLoading) {
        return <Loading />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
            <Header
                setIsAuthenticated={setIsAuthenticated}
                onExport={() => {
                    setShowExportModal(true);
                    setExportMode('export');
                }}
                onImport={() => {
                    setShowExportModal(true);
                    setExportMode('import');
                }}
                onBankImport={() => setShowBankImportModal(true)}
            >
                <PeriodSelector
                    currentPeriod={currentPeriod}
                    periods={salaryPeriods}
                    onPeriodChange={handlePeriodChange}
                    onCreateNew={() => setShowSalaryWizard(true)}
                    onEdit={(period) => {
                        // Only allow editing salary periods (has weekly_budget field)
                        if (period.weekly_budget !== undefined) {
                            setEditSalaryPeriod(period);
                            setShowSalaryWizard(true);
                        }
                        // Individual weeks (salary_period_id set) are not editable
                    }}
                    onDelete={handleDeletePeriod}
                />
            </Header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {!currentPeriod ? (
                    <>
                        {/* Weekly Budget Card - shown even without period to trigger setup */}
                        <div className="max-w-md mx-auto mb-8">
                            <WeeklyBudgetCard
                                ref={weeklyBudgetCardRef}
                                onSetupClick={() => {
                                    // Use the currently viewed salary period, not active period
                                    if (viewingSalaryPeriodId) {
                                        const viewedPeriod = salaryPeriods.find(
                                            (p) => p.id === viewingSalaryPeriodId
                                        );
                                        if (viewedPeriod) {
                                            setEditSalaryPeriod(viewedPeriod);
                                        }
                                    }
                                    setShowSalaryWizard(true);
                                }}
                                onAllocateClick={(salaryPeriodId, weekNumber) => {
                                    setLeftoverModalData({ salaryPeriodId, weekNumber });
                                    setShowLeftoverModal(true);
                                }}
                                onWeekChange={(weekPeriod) => {
                                    setCurrentPeriod(weekPeriod);
                                }}
                                initialSalaryPeriodData={salaryPeriodData}
                            />
                        </div>
                        <div className="text-center py-12">
                            <svg
                                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                No Budget Period
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Click "Set Up Weekly Budget" above to get started
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Rollover Prompt - Show when Week 4 is ending */}
                        {showRolloverPrompt && (
                            <SalaryPeriodRolloverPrompt
                                onCreateNext={(data) => {
                                    setRolloverData(data);
                                    setShowSalaryWizard(true);
                                    setShowRolloverPrompt(false);
                                }}
                                onDismiss={() => {
                                    // Remember dismissal for this period with timestamp (24-hour snooze)
                                    const currentSalaryPeriod = salaryPeriods.find(
                                        (p) => p.is_active
                                    );
                                    if (currentSalaryPeriod) {
                                        localStorage.setItem(
                                            'dismissedRollover',
                                            JSON.stringify({
                                                periodEndDate: currentSalaryPeriod.end_date,
                                                dismissedAt: new Date().toISOString(),
                                            })
                                        );
                                    }
                                    setShowRolloverPrompt(false);
                                }}
                                salaryPeriodData={salaryPeriodData}
                            />
                        )}

                        {/* Viewing Past/Future Period Indicator */}
                        {!isViewingTodaysPeriod() && currentPeriod && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="font-medium">
                                        Viewing {getViewingPeriodInfo()?.label}:{' '}
                                        <span className="font-normal">
                                            {getViewingPeriodInfo()?.dateRange}
                                        </span>
                                    </span>
                                </div>
                                <button
                                    onClick={handleReturnToCurrentPeriod}
                                    className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
                                >
                                    Return to Today
                                </button>
                            </div>
                        )}

                        {/* Balance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Weekly Budget Card */}
                            <WeeklyBudgetCard
                                key={viewingSalaryPeriodId || 'current'}
                                ref={weeklyBudgetCardRef}
                                onSetupClick={() => {
                                    // Use the currently viewed salary period, not active period
                                    if (viewingSalaryPeriodId) {
                                        const viewedPeriod = salaryPeriods.find(
                                            (p) => p.id === viewingSalaryPeriodId
                                        );
                                        if (viewedPeriod) {
                                            setEditSalaryPeriod(viewedPeriod);
                                        }
                                    }
                                    setShowSalaryWizard(true);
                                }}
                                onAllocateClick={(salaryPeriodId, weekNumber) => {
                                    setLeftoverModalData({ salaryPeriodId, weekNumber });
                                    setShowLeftoverModal(true);
                                }}
                                onWeekChange={(weekPeriod) => {
                                    // Just set the period - useEffect will handle loading
                                    setCurrentPeriod(weekPeriod);
                                }}
                                selectedPeriod={currentPeriod}
                                initialSalaryPeriodData={salaryPeriodData}
                            />

                            <BalanceCards
                                currentPeriodDebitSpent={currentPeriodDebitSpent}
                                debitAvailable={getDebitAvailable()}
                                currentPeriodIncome={currentPeriodIncome}
                                totalIncome={totalIncome}
                                allTimeSpent={allTimeSpent}
                                creditLimit={creditLimit}
                                currentPeriodCreditSpent={currentPeriodCreditSpent}
                                creditAvailable={getCreditAvailable()}
                                creditDebt={getCreditDebt()}
                            />
                        </div>

                        {/* Transactions Section */}
                        <TransactionList
                            transactionView={transactionView}
                            setTransactionView={setTransactionView}
                            transactions={transactions}
                            scheduledExpenses={scheduledExpenses}
                            isLoadingMore={isLoadingMore}
                            handleLoadMore={handleLoadMore}
                            hasMoreExpenses={hasMoreExpenses}
                            hasMoreIncome={hasMoreIncome}
                            selectionMode={selectionMode}
                            setSelectionMode={setSelectionMode}
                            selectedTransactions={selectedTransactions}
                            toggleTransactionSelection={toggleTransactionSelection}
                            toggleSelectAll={toggleSelectAll}
                            setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
                            setSelectedTransaction={setSelectedTransaction}
                            setEditType={setEditType}
                            setShowEditModal={setShowEditModal}
                            setDeleteConfirmation={setDeleteConfirmation}
                            transactionDates={transactionDates}
                            currentViewDate={currentViewDate}
                            handleDateNavigate={handleDateNavigate}
                            activeFilters={activeFilters}
                            setShowFilterModal={setShowFilterModal}
                            selectedScheduled={selectedScheduled}
                            setSelectedScheduled={setSelectedScheduled}
                            loadScheduledExpenses={loadScheduledExpenses}
                            loadTransactionsAndBalances={loadTransactionsAndBalances}
                            defaultCurrency={defaultCurrency}
                            convertAmount={convertAmount}
                            currentPeriod={currentPeriod}
                        />
                    </>
                )}
            </main>

            {/* Floating Add Button with Menu - Only show if period exists */}
            {/* Disabled when any modal is open: hidden on mobile, unclickable on desktop */}
            {currentPeriod && (
                <DraggableFloatingButton
                    showMenu={showAddMenu}
                    onToggleMenu={() => setShowAddMenu(!showAddMenu)}
                    disabled={
                        showAddModal ||
                        showEditModal ||
                        showExportModal ||
                        showBankImportModal ||
                        showLeftoverModal ||
                        showFilterModal ||
                        showSalaryWizard ||
                        showRolloverPrompt ||
                        showBulkDeleteConfirm ||
                        !!warningModal ||
                        !!deleteConfirmation
                    }
                >
                    <button
                        onClick={() => {
                            setModalType('income');
                            setShowAddModal(true);
                            setShowAddMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
                    >
                        <span className="text-2xl">💰</span>
                        <span className="font-semibold text-gray-700 dark:text-dark-text">
                            Add Income
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setModalType('expense');
                            setShowAddModal(true);
                            setShowAddMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
                    >
                        <span className="text-2xl">💸</span>
                        <span className="font-semibold text-gray-700 dark:text-dark-text">
                            Add Expense
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setModalType('debt');
                            setShowAddModal(true);
                            setShowAddMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
                    >
                        <span className="text-2xl">💳</span>
                        <span className="font-semibold text-gray-700 dark:text-dark-text">
                            Debt Payment
                        </span>
                    </button>
                </DraggableFloatingButton>
            )}

            <DashboardModals
                showAddModal={showAddModal}
                setShowAddModal={setShowAddModal}
                modalType={modalType}
                setModalType={setModalType}
                handleAddExpense={handleAddExpense}
                handleAddIncome={handleAddIncome}
                showEditModal={showEditModal}
                setShowEditModal={setShowEditModal}
                editType={editType}
                setEditType={setEditType}
                selectedTransaction={selectedTransaction}
                setSelectedTransaction={setSelectedTransaction}
                handleEditExpense={handleEditExpense}
                handleEditIncome={handleEditIncome}
                warningModal={warningModal}
                setWarningModal={setWarningModal}
                creditLimit={creditLimit}
                creditAvailable={getCreditAvailable()}
                currentPeriod={currentPeriod}
                loadExpenses={loadExpenses}
                showSalaryWizard={showSalaryWizard}
                setShowSalaryWizard={setShowSalaryWizard}
                editSalaryPeriod={editSalaryPeriod}
                setEditSalaryPeriod={setEditSalaryPeriod}
                rolloverData={rolloverData}
                setRolloverData={setRolloverData}
                loadPeriodsAndCurrentWeek={loadPeriodsAndCurrentWeek}
                loadSalaryPeriodData={loadSalaryPeriodData}
                viewingSalaryPeriodId={viewingSalaryPeriodId}
                weeklyBudgetCardRef={weeklyBudgetCardRef}
                showLeftoverModal={showLeftoverModal}
                setShowLeftoverModal={setShowLeftoverModal}
                leftoverModalData={leftoverModalData}
                setLeftoverModalData={setLeftoverModalData}
                loadTransactionsAndBalances={loadTransactionsAndBalances}
                deleteConfirmation={deleteConfirmation}
                setDeleteConfirmation={setDeleteConfirmation}
                handleDeleteIncome={handleDeleteIncome}
                handleDeleteExpense={handleDeleteExpense}
                showBulkDeleteConfirm={showBulkDeleteConfirm}
                setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
                selectedTransactions={selectedTransactions}
                transactions={transactions}
                handleBulkDelete={handleBulkDelete}
                showExportModal={showExportModal}
                setShowExportModal={setShowExportModal}
                exportMode={exportMode}
                showBankImportModal={showBankImportModal}
                setShowBankImportModal={setShowBankImportModal}
                showFilterModal={showFilterModal}
                setShowFilterModal={setShowFilterModal}
                handleApplyFilters={handleApplyFilters}
                activeFilters={activeFilters}
            />
        </div>
    );
}

export default Dashboard;
