/**
 * Bloom - Recurring Page (Issue #177)
 *
 * Management page for recurring expense and income templates.
 * View, create, edit, toggle, and delete recurring items.
 * When recurringIncomeEnabled flag is on, shows Expenses/Income sub-tabs.
 */

import { useState, useEffect } from 'react';
import { recurringExpenseAPI, recurringIncomeAPI, recurringGenerationAPI } from '../api';
import { logError } from '../utils/logger';
import AddRecurringExpenseModal from '../components/AddRecurringExpenseModal';
import AddRecurringIncomeModal from '../components/AddRecurringIncomeModal';
import ExportImportModal from '../components/ExportImportModal';
import BankImportModal from '../components/BankImportModal';
import BudgetRecalculationModal from '../components/BudgetRecalculationModal';
import Loading from '../components/Loading';
import Header from '../components/Header';
import { useCurrency } from '../contexts/CurrencyContext';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';
import { formatCurrency } from '../utils/formatters';

function RecurringExpenses({ setIsAuthenticated }) {
    const [recurringExpenses, setRecurringExpenses] = useState([]);
    const [recurringIncome, setRecurringIncome] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingIncome, setEditingIncome] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteIncomeConfirm, setDeleteIncomeConfirm] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('export');
    const [showBankImportModal, setShowBankImportModal] = useState(false);
    const [view, setView] = useState('active'); // 'active' or 'upcoming'
    const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' or 'income' (for Active view)
    const [scheduledExpenses, setScheduledExpenses] = useState([]);
    const [scheduledIncome, setScheduledIncome] = useState([]);
    // eslint-disable-next-line no-unused-vars -- Reserved for future bulk selection feature
    const [selectedScheduled, setSelectedScheduled] = useState([]);
    const [budgetImpact, setBudgetImpact] = useState(null);

    // Currency context for multi-currency support
    const { defaultCurrency, convertAmount } = useCurrency();

    // Feature flags
    const { isEnabled } = useFeatureFlag();
    const budgetRecalculationEnabled = isEnabled('budgetRecalculationEnabled');
    const recurringIncomeEnabled = isEnabled('recurringIncomeEnabled');

    // Helper to check for budget impact in API response
    const checkBudgetImpact = (response) => {
        if (budgetRecalculationEnabled && response?.data?.budget_impact) {
            setBudgetImpact(response.data.budget_impact);
        }
    };

    // Helper function to format EUR amounts (stored in DB) converted to user's currency
    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    const handleExport = () => {
        setExportMode('export');
        setShowExportModal(true);
    };

    const handleImport = () => {
        setExportMode('import');
        setShowExportModal(true);
    };

    const handleBankImport = () => {
        setShowBankImportModal(true);
    };

    useEffect(() => {
        loadRecurringExpenses();
        if (recurringIncomeEnabled) {
            loadRecurringIncome();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recurringIncomeEnabled]);

    useEffect(() => {
        // Load scheduled items when switching to upcoming view
        if (view === 'upcoming') {
            loadScheduledExpenses();
            if (recurringIncomeEnabled) {
                loadScheduledIncome();
            }
            setSelectedScheduled([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, recurringIncomeEnabled]);

    const loadRecurringExpenses = async () => {
        try {
            const response = await recurringExpenseAPI.getAll();
            setRecurringExpenses(response.data);
        } catch (error) {
            logError('loadRecurringExpenses', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRecurringIncome = async () => {
        try {
            const response = await recurringIncomeAPI.getAll();
            setRecurringIncome(response.data);
        } catch (error) {
            logError('loadRecurringIncome', error);
        }
    };

    const loadScheduledExpenses = async () => {
        try {
            const response = await recurringGenerationAPI.previewExpenses();
            setScheduledExpenses(response.data.upcoming || []);
        } catch (error) {
            logError('loadScheduledExpenses', error);
        }
    };

    const loadScheduledIncome = async () => {
        try {
            const response = await recurringGenerationAPI.previewIncome();
            setScheduledIncome(response.data.upcoming || []);
        } catch (error) {
            logError('loadScheduledIncome', error);
        }
    };

    const handleAdd = async (data) => {
        const response = await recurringExpenseAPI.create(data);
        await loadRecurringExpenses();
        setShowAddModal(false);
        checkBudgetImpact(response);
    };

    const handleAddIncome = async (data) => {
        await recurringIncomeAPI.create(data);
        await loadRecurringIncome();
        setShowAddIncomeModal(false);
    };

    const handleEdit = async (data) => {
        const response = await recurringExpenseAPI.update(editingExpense.id, data);
        await loadRecurringExpenses();
        setEditingExpense(null);
        checkBudgetImpact(response);
    };

    const handleEditIncome = async (data) => {
        await recurringIncomeAPI.update(editingIncome.id, data);
        await loadRecurringIncome();
        setEditingIncome(null);
    };

    const handleToggle = async (id) => {
        try {
            const response = await recurringExpenseAPI.toggleActive(id);
            await loadRecurringExpenses();
            checkBudgetImpact(response);
        } catch (error) {
            logError('toggleRecurringExpense', error);
        }
    };

    const handleToggleIncome = async (id) => {
        try {
            await recurringIncomeAPI.toggleActive(id);
            await loadRecurringIncome();
        } catch (error) {
            logError('toggleRecurringIncome', error);
        }
    };

    const handleToggleFixedBill = async (id, currentStatus) => {
        try {
            const response = await recurringExpenseAPI.toggleFixedBill(id, !currentStatus);
            await loadRecurringExpenses();
            checkBudgetImpact(response);
        } catch (error) {
            logError('toggleFixedBillStatus', error);
        }
    };

    const handleDelete = async (id) => {
        setDeleteConfirm(id);
    };

    const handleDeleteIncome = async (id) => {
        setDeleteIncomeConfirm(id);
    };

    const confirmDelete = async () => {
        const id = deleteConfirm;
        setDeleteConfirm(null);

        try {
            const response = await recurringExpenseAPI.delete(id);
            await loadRecurringExpenses();
            checkBudgetImpact(response);
        } catch (error) {
            logError('deleteRecurringExpense', error);
        }
    };

    const confirmDeleteIncome = async () => {
        const id = deleteIncomeConfirm;
        setDeleteIncomeConfirm(null);

        try {
            await recurringIncomeAPI.delete(id);
            await loadRecurringIncome();
        } catch (error) {
            logError('deleteRecurringIncome', error);
        }
    };

    const getFrequencyText = (item) => {
        if (item.frequency === 'weekly') return 'Weekly';
        if (item.frequency === 'biweekly') return 'Biweekly';
        if (item.frequency === 'monthly')
            return `Monthly (${item.day_of_month}${getDaySuffix(item.day_of_month)})`;
        if (item.frequency === 'custom') return `Every ${item.frequency_value} days`;
        return item.frequency;
    };

    const getDaySuffix = (day) => {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1:
                return 'st';
            case 2:
                return 'nd';
            case 3:
                return 'rd';
            default:
                return 'th';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    };

    const activeExpenses = recurringExpenses.filter((e) => e.is_active);
    const inactiveExpenses = recurringExpenses.filter((e) => !e.is_active);
    const activeIncome = recurringIncome.filter((i) => i.is_active);
    const inactiveIncome = recurringIncome.filter((i) => !i.is_active);

    // Combine scheduled items for upcoming view
    const allScheduledItems = [
        ...scheduledExpenses.map((item) => ({ ...item, type: 'expense' })),
        ...scheduledIncome.map((item) => ({ ...item, type: 'income' })),
    ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return (
        <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
            {/* Header */}
            <Header
                setIsAuthenticated={setIsAuthenticated}
                onExport={handleExport}
                onImport={handleImport}
                onBankImport={handleBankImport}
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Top Row: Active/Upcoming tabs */}
                <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    {/* View Toggle Buttons - uniform size */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('active')}
                            className={`px-4 py-2 rounded-lg transition font-semibold min-w-[110px] text-center ${
                                view === 'active'
                                    ? 'bg-bloom-pink text-white'
                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setView('upcoming')}
                            className={`px-4 py-2 rounded-lg transition font-semibold min-w-[110px] text-center ${
                                view === 'upcoming'
                                    ? 'bg-bloom-pink text-white'
                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                            }`}
                        >
                            Upcoming
                        </button>
                    </div>
                </div>

                {/* Second Row: Sub-tabs (when income enabled) + Description */}
                <div className="mb-4">
                    {/* Sub-tabs for Active view (when income enabled) */}
                    {view === 'active' && recurringIncomeEnabled && (
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => setActiveSubTab('expenses')}
                                className={`px-4 py-2 rounded-lg transition font-medium min-w-[110px] text-center ${
                                    activeSubTab === 'expenses'
                                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border border border-transparent'
                                }`}
                            >
                                Expenses
                            </button>
                            <button
                                onClick={() => setActiveSubTab('income')}
                                className={`px-4 py-2 rounded-lg transition font-medium min-w-[110px] text-center ${
                                    activeSubTab === 'income'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border border border-transparent'
                                }`}
                            >
                                Incomes
                            </button>
                        </div>
                    )}

                    <p className="text-gray-600 dark:text-dark-text-secondary">
                        {view === 'active'
                            ? activeSubTab === 'income' && recurringIncomeEnabled
                                ? 'Manage your automatic income templates'
                                : 'Manage your automatic expense templates'
                            : recurringIncomeEnabled
                              ? 'Preview scheduled expenses and income'
                              : 'Preview and confirm scheduled expenses'}
                    </p>
                </div>

                {/* Third Row: Add Button (moved below tabs per Issue #17) */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                    {view === 'active' ? (
                        activeSubTab === 'income' && recurringIncomeEnabled ? (
                            <button
                                onClick={() => setShowAddIncomeModal(true)}
                                className="px-6 py-3 bg-bloom-mint text-green-800 rounded-lg hover:bg-green-200 transition-colors font-semibold shadow-sm whitespace-nowrap text-center justify-center flex items-center gap-2"
                            >
                                + Add Recurring Income
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink-hover transition-colors font-semibold shadow-sm whitespace-nowrap text-center justify-center flex items-center gap-2"
                            >
                                + Add Recurring Expense
                            </button>
                        )
                    ) : (
                        <button
                            onClick={async () => {
                                try {
                                    setGenerating(true);
                                    const result = await recurringGenerationAPI.generate(
                                        false,
                                        null,
                                        recurringIncomeEnabled
                                    );
                                    setGenerationResult(result.data);
                                    loadScheduledExpenses();
                                    if (recurringIncomeEnabled) {
                                        loadScheduledIncome();
                                    }
                                } catch (error) {
                                    logError('confirmScheduledItems', error);
                                } finally {
                                    setGenerating(false);
                                }
                            }}
                            disabled={
                                generating ||
                                (scheduledExpenses.length === 0 && scheduledIncome.length === 0)
                            }
                            className="px-6 py-3 bg-bloom-mint text-green-800 rounded-lg hover:bg-green-200 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-center justify-center flex items-center gap-2"
                        >
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
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                            {generating
                                ? 'Confirming...'
                                : recurringIncomeEnabled
                                  ? 'Confirm Scheduled Items'
                                  : 'Confirm Scheduled Expenses'}
                        </button>
                    )}
                </div>

                {/* Generation Result */}
                {generationResult && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-green-800 dark:text-dark-success">
                                    ✓ {generationResult.message}
                                </h3>
                                {generationResult.data?.templates &&
                                    generationResult.data.templates.length > 0 && (
                                        <ul className="mt-2 text-sm text-green-700 dark:text-dark-success space-y-1">
                                            {generationResult.data.templates.map(
                                                (template, idx) => (
                                                    <li key={idx}>
                                                        • {template.name} -{' '}
                                                        {fcEur(template.amount * 100)} on{' '}
                                                        {template.date}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    )}
                            </div>
                            <button
                                onClick={() => setGenerationResult(null)}
                                className="text-green-600 dark:text-dark-success hover:text-green-800 dark:hover:text-green-400"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <Loading />
                ) : (
                    <div className="space-y-6">
                        {/* Active View - Show active/inactive recurring expenses/income */}
                        {view === 'active' && (
                            <>
                                {/* Show Expenses when not in income mode, or when income flag is off */}
                                {(activeSubTab === 'expenses' || !recurringIncomeEnabled) && (
                                    <>
                                        {/* Active Recurring Expenses */}
                                        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4">
                                                Active ({activeExpenses.length})
                                            </h3>

                                            {activeExpenses.length === 0 ? (
                                                <p className="text-gray-500 dark:text-dark-text-tertiary text-center py-8">
                                                    No active recurring expenses. Click "Add
                                                    Recurring Expense" to create one.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {activeExpenses.map((expense) => (
                                                        <div
                                                            key={expense.id}
                                                            className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-dark-elevated"
                                                        >
                                                            {/* Mobile: Vertical layout with full-width buttons */}
                                                            <div className="flex flex-col gap-3 sm:hidden">
                                                                {/* Header with title and badges */}
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-2 truncate">
                                                                            {expense.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded whitespace-nowrap">
                                                                                {getFrequencyText(
                                                                                    expense
                                                                                )}
                                                                            </span>
                                                                            {expense.is_fixed_bill && (
                                                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium whitespace-nowrap">
                                                                                    Fixed
                                                                                </span>
                                                                            )}
                                                                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text rounded whitespace-nowrap">
                                                                                {expense.category}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Amount - prominent on mobile */}
                                                                    <div className="text-right flex-shrink-0">
                                                                        <p className="text-lg font-bold text-gray-800 dark:text-dark-text">
                                                                            {fcEur(expense.amount)}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                                                                            {expense.payment_method}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="flex flex-col xs:flex-row xs:justify-between gap-2 text-sm">
                                                                    <div>
                                                                        <span className="text-gray-500 dark:text-dark-text-tertiary text-xs">
                                                                            Next due:{' '}
                                                                        </span>
                                                                        <span className="font-medium dark:text-dark-text">
                                                                            {formatDate(
                                                                                expense.next_due_date
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {expense.notes && (
                                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary italic border-t border-gray-100 dark:border-dark-border pt-2">
                                                                        {expense.notes}
                                                                    </p>
                                                                )}

                                                                {/* Mobile Action Buttons - Full width row */}
                                                                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggleFixedBill(
                                                                                expense.id,
                                                                                expense.is_fixed_bill
                                                                            )
                                                                        }
                                                                        className={`flex-1 p-2.5 rounded transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
                                                                            expense.is_fixed_bill
                                                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40 font-semibold'
                                                                                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                        }`}
                                                                        title={
                                                                            expense.is_fixed_bill
                                                                                ? 'Remove from fixed bills'
                                                                                : 'Mark as fixed bill'
                                                                        }
                                                                    >
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
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                        <span className="text-sm font-medium hidden xs:inline">
                                                                            Pin
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingExpense(
                                                                                expense
                                                                            )
                                                                        }
                                                                        className="flex-1 p-2.5 text-gray-600 dark:text-gray-400 hover:text-bloom-pink dark:hover:text-dark-pink hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded transition-colors min-h-[44px] flex items-center justify-center gap-2"
                                                                        title="Edit"
                                                                    >
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
                                                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                            />
                                                                        </svg>
                                                                        <span className="text-sm font-medium hidden xs:inline">
                                                                            Edit
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggle(expense.id)
                                                                        }
                                                                        className="flex-1 p-2.5 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors min-h-[44px] flex items-center justify-center gap-2"
                                                                        title="Pause"
                                                                    >
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
                                                                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                        <span className="text-sm font-medium hidden xs:inline">
                                                                            Pause
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDelete(expense.id)
                                                                        }
                                                                        className="flex-1 p-2.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors min-h-[44px] flex items-center justify-center gap-2"
                                                                        title="Delete"
                                                                    >
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
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                        <span className="text-sm font-medium hidden xs:inline">
                                                                            Delete
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Desktop: Original horizontal layout with buttons on right */}
                                                            <div className="hidden sm:flex sm:justify-between sm:items-start gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                        <h4 className="font-semibold text-gray-800 dark:text-dark-text">
                                                                            {expense.name}
                                                                        </h4>
                                                                        <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded">
                                                                            {getFrequencyText(
                                                                                expense
                                                                            )}
                                                                        </span>
                                                                        {expense.is_fixed_bill && (
                                                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                                                                Fixed Bill
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-dark-text-tertiary">
                                                                                Amount:
                                                                            </span>{' '}
                                                                            <span className="font-medium dark:text-dark-text">
                                                                                {fcEur(
                                                                                    expense.amount
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-dark-text-tertiary">
                                                                                Category:
                                                                            </span>{' '}
                                                                            <span className="font-medium dark:text-dark-text">
                                                                                {expense.category}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-dark-text-tertiary">
                                                                                Next due:
                                                                            </span>{' '}
                                                                            <span className="font-medium dark:text-dark-text">
                                                                                {formatDate(
                                                                                    expense.next_due_date
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-dark-text-tertiary">
                                                                                Payment:
                                                                            </span>{' '}
                                                                            <span className="font-medium dark:text-dark-text">
                                                                                {
                                                                                    expense.payment_method
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {expense.notes && (
                                                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2 italic">
                                                                            {expense.notes}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Desktop Action Buttons - Horizontal on right */}
                                                                <div className="flex gap-3 ml-4 flex-shrink-0">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggleFixedBill(
                                                                                expense.id,
                                                                                expense.is_fixed_bill
                                                                            )
                                                                        }
                                                                        className={`p-2 rounded transition-colors ${
                                                                            expense.is_fixed_bill
                                                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40'
                                                                                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                        }`}
                                                                        title={
                                                                            expense.is_fixed_bill
                                                                                ? 'Remove from fixed bills'
                                                                                : 'Mark as fixed bill'
                                                                        }
                                                                    >
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
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingExpense(
                                                                                expense
                                                                            )
                                                                        }
                                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-bloom-pink dark:hover:text-dark-pink hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
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
                                                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggle(expense.id)
                                                                        }
                                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                                                        title="Pause"
                                                                    >
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
                                                                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDelete(expense.id)
                                                                        }
                                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
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
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Inactive Recurring Expenses */}
                                        {inactiveExpenses.length > 0 && (
                                            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4">
                                                    Paused ({inactiveExpenses.length})
                                                </h3>

                                                <div className="space-y-3">
                                                    {inactiveExpenses.map((expense) => (
                                                        <div
                                                            key={expense.id}
                                                            className="border border-gray-200 dark:border-dark-border rounded-lg p-4 bg-gray-50 dark:bg-dark-elevated opacity-75"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                        <h4 className="font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                                            {expense.name}
                                                                        </h4>
                                                                        <span className="text-sm px-2 py-1 bg-gray-200 text-gray-600 rounded">
                                                                            Paused
                                                                        </span>
                                                                    </div>

                                                                    <div className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                                                                        {fcEur(expense.amount)} •{' '}
                                                                        {getFrequencyText(expense)}
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-3 sm:ml-4 pr-2 sm:pr-0 self-end sm:self-start flex-shrink-0">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggle(expense.id)
                                                                        }
                                                                        className="p-2.5 sm:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                                                                        title="Resume"
                                                                    >
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
                                                                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                                            />
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDelete(expense.id)
                                                                        }
                                                                        className="p-2.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                                                                        title="Delete"
                                                                    >
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
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Show Income when in income mode and flag is enabled */}
                                {activeSubTab === 'income' && recurringIncomeEnabled && (
                                    <>
                                        {/* Active Recurring Income */}
                                        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4">
                                                Active ({activeIncome.length})
                                            </h3>

                                            {activeIncome.length === 0 ? (
                                                <p className="text-gray-500 dark:text-dark-text-tertiary text-center py-8">
                                                    No active recurring income. Click "Add Recurring
                                                    Income" to create one.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {activeIncome.map((income) => (
                                                        <div
                                                            key={income.id}
                                                            className="border border-green-200 dark:border-green-800 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-dark-elevated bg-green-50/30"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-2">
                                                                        {income.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded whitespace-nowrap">
                                                                            {getFrequencyText(
                                                                                income
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs px-2 py-1 bg-bloom-mint text-green-800 rounded whitespace-nowrap">
                                                                            {income.income_type}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-right flex-shrink-0">
                                                                    <p className="text-lg font-bold text-green-600 dark:text-bloom-mint">
                                                                        +{fcEur(income.amount)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                                                                        Next:{' '}
                                                                        {formatDate(
                                                                            income.next_due_date
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingIncome(income)
                                                                        }
                                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-bloom-mint dark:hover:text-bloom-mint hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
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
                                                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggleIncome(
                                                                                income.id
                                                                            )
                                                                        }
                                                                        className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                                                        title="Pause"
                                                                    >
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
                                                                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteIncome(
                                                                                income.id
                                                                            )
                                                                        }
                                                                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
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
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {income.notes && (
                                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary italic mt-2 border-t border-gray-100 dark:border-dark-border pt-2">
                                                                    {income.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Inactive Recurring Income */}
                                        {inactiveIncome.length > 0 && (
                                            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 opacity-75">
                                                <h3 className="text-lg font-semibold text-gray-600 dark:text-dark-text-secondary mb-4">
                                                    Paused ({inactiveIncome.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {inactiveIncome.map((income) => (
                                                        <div
                                                            key={income.id}
                                                            className="border border-gray-200 dark:border-dark-border rounded-lg p-4 dark:bg-dark-elevated"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                                                                        {income.name}
                                                                    </h4>
                                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                                        {income.income_type}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-gray-400">
                                                                        +{fcEur(income.amount)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleToggleIncome(
                                                                                income.id
                                                                            )
                                                                        }
                                                                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                                        title="Activate"
                                                                    >
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
                                                                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                                            />
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteIncome(
                                                                                income.id
                                                                            )
                                                                        }
                                                                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
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
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Upcoming View - Show scheduled expenses and income */}
                        {view === 'upcoming' && (
                            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
                                {(
                                    recurringIncomeEnabled
                                        ? allScheduledItems.length === 0
                                        : scheduledExpenses.length === 0
                                ) ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-dark-text-tertiary">
                                        <svg
                                            className="w-16 h-16 mb-4"
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
                                        <p>
                                            No upcoming scheduled{' '}
                                            {recurringIncomeEnabled ? 'items' : 'expenses'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(recurringIncomeEnabled
                                            ? allScheduledItems
                                            : scheduledExpenses.map((e) => ({
                                                  ...e,
                                                  type: 'expense',
                                              }))
                                        ).map((item, idx) => (
                                            <div
                                                key={`scheduled-${item.template_id || item.id}-${idx}`}
                                                className={`border rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-dark-elevated ${
                                                    item.type === 'income'
                                                        ? 'border-green-200 dark:border-green-800 bg-green-50/30'
                                                        : 'border-gray-200 dark:border-dark-border'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            <span
                                                                className={`text-lg ${item.type === 'income' ? 'text-green-600' : 'text-bloom-pink'}`}
                                                            >
                                                                {item.type === 'income'
                                                                    ? '💰'
                                                                    : '💸'}
                                                            </span>
                                                            <h4 className="font-semibold text-gray-800 dark:text-dark-text">
                                                                {item.name}
                                                            </h4>
                                                            <span
                                                                className={`text-sm px-2 py-1 rounded ${
                                                                    item.type === 'income'
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                                }`}
                                                            >
                                                                {formatDate(
                                                                    item.date || item.due_date
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`text-sm ${item.type === 'income' ? 'text-green-600 dark:text-bloom-mint' : 'text-gray-500 dark:text-dark-text-tertiary'}`}
                                                        >
                                                            {item.type === 'income' ? '+' : ''}
                                                            {fcEur(item.amount * 100)} •{' '}
                                                            {item.type === 'income'
                                                                ? item.income_type
                                                                : item.category}{' '}
                                                            {item.subcategory &&
                                                                `• ${item.subcategory}`}
                                                        </div>
                                                        <div className="text-xs text-gray-400 dark:text-dark-text-tertiary mt-1 capitalize">
                                                            {item.frequency}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals */}
            {showAddModal && (
                <AddRecurringExpenseModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAdd}
                />
            )}

            {editingExpense && (
                <AddRecurringExpenseModal
                    onClose={() => setEditingExpense(null)}
                    onAdd={handleEdit}
                    existingExpense={editingExpense}
                />
            )}

            {/* Add Recurring Income Modal */}
            {showAddIncomeModal && (
                <AddRecurringIncomeModal
                    onClose={() => setShowAddIncomeModal(false)}
                    onAdd={handleAddIncome}
                />
            )}

            {/* Edit Recurring Income Modal */}
            {editingIncome && (
                <AddRecurringIncomeModal
                    onClose={() => setEditingIncome(null)}
                    onAdd={handleEditIncome}
                    existingIncome={editingIncome}
                />
            )}

            {/* Delete Expense Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">
                            Delete Recurring Expense?
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                            Are you sure you want to delete this recurring expense? This action
                            cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Income Confirmation Modal */}
            {deleteIncomeConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">
                            Delete Recurring Income?
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                            Are you sure you want to delete this recurring income? This action
                            cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteIncomeConfirm(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteIncome}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export/Import Modal */}
            {showExportModal && (
                <ExportImportModal mode={exportMode} onClose={() => setShowExportModal(false)} />
            )}

            {/* Bank Import Modal */}
            {showBankImportModal && (
                <BankImportModal
                    onClose={() => setShowBankImportModal(false)}
                    onImported={() => {
                        setShowBankImportModal(false);
                        loadRecurringExpenses();
                    }}
                />
            )}

            {/* Budget Recalculation Modal (Experimental Feature) */}
            {budgetImpact && (
                <BudgetRecalculationModal
                    budgetImpact={budgetImpact}
                    onClose={() => setBudgetImpact(null)}
                    onRecalculated={() => {
                        setBudgetImpact(null);
                        // Optionally refresh data
                        loadRecurringExpenses();
                    }}
                />
            )}
        </div>
    );
}

export default RecurringExpenses;
