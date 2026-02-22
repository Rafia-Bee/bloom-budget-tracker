/**
 * Bloom - Trash Page
 *
 * View and restore soft-deleted items.
 * Items are auto-purged after 30 days.
 * Tabs for: Expenses, Income, Debts, Goals, Recurring Expenses
 */

import { useState, useEffect } from 'react';
import { expenseAPI, incomeAPI, debtAPI, recurringExpenseAPI, goalAPI } from '../api';
import { logError } from '../utils/logger';
import Header from '../components/Header';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

function Trash({ setIsAuthenticated }) {
    const [activeTab, setActiveTab] = useState('expenses');
    const [deletedExpenses, setDeletedExpenses] = useState([]);
    const [deletedIncome, setDeletedIncome] = useState([]);
    const [deletedDebts, setDeletedDebts] = useState([]);
    const [deletedGoals, setDeletedGoals] = useState([]);
    const [deletedRecurring, setDeletedRecurring] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(null);

    const { defaultCurrency, convertAmount } = useCurrency();

    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    useEffect(() => {
        loadAllDeleted();
    }, []);

    const loadAllDeleted = async () => {
        setLoading(true);
        try {
            const [expensesRes, incomeRes, debtsRes, goalsRes, recurringRes] = await Promise.all([
                expenseAPI.getDeleted(),
                incomeAPI.getDeleted(),
                debtAPI.getDeleted(),
                goalAPI.getDeleted(),
                recurringExpenseAPI.getDeleted(),
            ]);
            setDeletedExpenses(expensesRes.data);
            setDeletedIncome(incomeRes.data);
            setDeletedDebts(debtsRes.data);
            setDeletedGoals(goalsRes.data);
            setDeletedRecurring(recurringRes.data);
        } catch (error) {
            logError('loadAllDeleted', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (type, id) => {
        setRestoring(`${type}-${id}`);
        try {
            switch (type) {
                case 'expense':
                    await expenseAPI.restore(id);
                    setDeletedExpenses((prev) => prev.filter((e) => e.id !== id));
                    break;
                case 'income':
                    await incomeAPI.restore(id);
                    setDeletedIncome((prev) => prev.filter((i) => i.id !== id));
                    break;
                case 'debt':
                    await debtAPI.restore(id);
                    setDeletedDebts((prev) => prev.filter((d) => d.id !== id));
                    break;
                case 'goal':
                    await goalAPI.restore(id);
                    setDeletedGoals((prev) => prev.filter((g) => g.id !== id));
                    break;
                case 'recurring':
                    await recurringExpenseAPI.restore(id);
                    setDeletedRecurring((prev) => prev.filter((r) => r.id !== id));
                    break;
            }
        } catch (error) {
            logError('handleRestore', error);
        } finally {
            setRestoring(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatDeletedAt = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (daysAgo === 0) return 'Today';
        if (daysAgo === 1) return 'Yesterday';
        if (daysAgo < 7) return `${daysAgo} days ago`;
        return formatDate(dateStr);
    };

    const getDaysUntilPurge = (dateStr) => {
        if (!dateStr) return null;
        const deletedDate = new Date(dateStr);
        const purgeDate = new Date(deletedDate);
        purgeDate.setDate(purgeDate.getDate() + 30);
        const now = new Date();
        const daysLeft = Math.ceil((purgeDate - now) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysLeft);
    };

    const totalCount =
        deletedExpenses.length +
        deletedIncome.length +
        deletedDebts.length +
        deletedGoals.length +
        deletedRecurring.length;

    const tabs = [
        { id: 'expenses', label: 'Expenses', count: deletedExpenses.length },
        { id: 'income', label: 'Income', count: deletedIncome.length },
        { id: 'debts', label: 'Debts', count: deletedDebts.length },
        { id: 'goals', label: 'Goals', count: deletedGoals.length },
        { id: 'recurring', label: 'Recurring', count: deletedRecurring.length },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
            <Header setIsAuthenticated={setIsAuthenticated} />

            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                        Trash
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {totalCount === 0
                            ? 'No deleted items'
                            : `${totalCount} deleted item${totalCount !== 1 ? 's' : ''} • Auto-purged after 30 days`}
                    </p>
                </div>

                {/* Tabs - dropdown on mobile, tabs on desktop */}
                {/* Mobile: Dropdown */}
                <div className="sm:hidden mb-4">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                        {tabs.map((tab) => (
                            <option key={tab.id} value={tab.id}>
                                {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Desktop: Tab buttons */}
                <div className="hidden sm:flex flex-wrap gap-1 border-b border-gray-200 dark:border-dark-border mb-4 pb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-pink-500 text-pink-600 dark:text-dark-pink'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-dark-elevated text-gray-600 dark:text-gray-400">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Expenses Tab */}
                        {activeTab === 'expenses' && (
                            <div className="space-y-2">
                                {deletedExpenses.length === 0 ? (
                                    <EmptyState message="No deleted expenses" />
                                ) : (
                                    deletedExpenses.map((expense) => (
                                        <DeletedItemCard
                                            key={expense.id}
                                            title={expense.name}
                                            subtitle={`${expense.category} • ${formatDate(expense.date)}`}
                                            amount={fcEur(expense.amount)}
                                            deletedAt={expense.deleted_at}
                                            onRestore={() => handleRestore('expense', expense.id)}
                                            isRestoring={restoring === `expense-${expense.id}`}
                                            formatDeletedAt={formatDeletedAt}
                                            getDaysUntilPurge={getDaysUntilPurge}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Income Tab */}
                        {activeTab === 'income' && (
                            <div className="space-y-2">
                                {deletedIncome.length === 0 ? (
                                    <EmptyState message="No deleted income" />
                                ) : (
                                    deletedIncome.map((income) => (
                                        <DeletedItemCard
                                            key={income.id}
                                            title={income.type}
                                            subtitle={formatDate(income.scheduled_date)}
                                            amount={fcEur(income.amount)}
                                            deletedAt={income.deleted_at}
                                            onRestore={() => handleRestore('income', income.id)}
                                            isRestoring={restoring === `income-${income.id}`}
                                            formatDeletedAt={formatDeletedAt}
                                            getDaysUntilPurge={getDaysUntilPurge}
                                            isIncome
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Debts Tab */}
                        {activeTab === 'debts' && (
                            <div className="space-y-2">
                                {deletedDebts.length === 0 ? (
                                    <EmptyState message="No deleted debts" />
                                ) : (
                                    deletedDebts.map((debt) => (
                                        <DeletedItemCard
                                            key={debt.id}
                                            title={debt.name}
                                            subtitle={`Balance: ${fcEur(debt.current_balance)} / ${fcEur(debt.original_amount)}`}
                                            deletedAt={debt.deleted_at}
                                            onRestore={() => handleRestore('debt', debt.id)}
                                            isRestoring={restoring === `debt-${debt.id}`}
                                            formatDeletedAt={formatDeletedAt}
                                            getDaysUntilPurge={getDaysUntilPurge}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Goals Tab */}
                        {activeTab === 'goals' && (
                            <div className="space-y-2">
                                {deletedGoals.length === 0 ? (
                                    <EmptyState message="No deleted goals" />
                                ) : (
                                    deletedGoals.map((goal) => (
                                        <DeletedItemCard
                                            key={goal.id}
                                            title={goal.name}
                                            subtitle={goal.subcategory_name || 'Savings Goal'}
                                            amount={fcEur(goal.target_amount)}
                                            deletedAt={goal.deleted_at}
                                            onRestore={() => handleRestore('goal', goal.id)}
                                            isRestoring={restoring === `goal-${goal.id}`}
                                            formatDeletedAt={formatDeletedAt}
                                            getDaysUntilPurge={getDaysUntilPurge}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Recurring Tab */}
                        {activeTab === 'recurring' && (
                            <div className="space-y-2">
                                {deletedRecurring.length === 0 ? (
                                    <EmptyState message="No deleted recurring expenses" />
                                ) : (
                                    deletedRecurring.map((recurring) => (
                                        <DeletedItemCard
                                            key={recurring.id}
                                            title={recurring.name}
                                            subtitle={`${recurring.category} • ${recurring.frequency}${recurring.is_fixed_bill ? ' • Fixed Bill' : ''}`}
                                            amount={fcEur(recurring.amount)}
                                            deletedAt={recurring.deleted_at}
                                            onRestore={() =>
                                                handleRestore('recurring', recurring.id)
                                            }
                                            isRestoring={restoring === `recurring-${recurring.id}`}
                                            formatDeletedAt={formatDeletedAt}
                                            getDaysUntilPurge={getDaysUntilPurge}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
            <p className="text-gray-500 dark:text-gray-400">{message}</p>
        </div>
    );
}

function DeletedItemCard({
    title,
    subtitle,
    amount,
    deletedAt,
    onRestore,
    isRestoring,
    formatDeletedAt,
    getDaysUntilPurge,
    isIncome = false,
}) {
    const daysLeft = getDaysUntilPurge(deletedAt);

    return (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-3 sm:p-4">
            {/* Mobile: Stack layout, Desktop: Row layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                {/* Item info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-dark-text truncate flex-1">
                            {title}
                        </h3>
                        {/* Amount shown inline on mobile */}
                        {amount && (
                            <div
                                className={`sm:hidden text-right flex-shrink-0 ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-dark-text'}`}
                            >
                                <span className="font-medium text-sm">
                                    {isIncome ? '+' : '-'}
                                    {amount}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {subtitle}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1">
                        Deleted {formatDeletedAt(deletedAt)}
                        {daysLeft !== null && (
                            <span className={`ml-1 sm:ml-2 ${daysLeft <= 7 ? 'text-red-500' : ''}`}>
                                • {daysLeft}d left
                            </span>
                        )}
                    </p>
                </div>

                {/* Amount - hidden on mobile, shown on desktop */}
                {amount && (
                    <div
                        className={`hidden sm:block text-right mr-4 ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-dark-text'}`}
                    >
                        <span className="font-medium">
                            {isIncome ? '+' : '-'}
                            {amount}
                        </span>
                    </div>
                )}

                {/* Restore button - full width on mobile */}
                <button
                    onClick={onRestore}
                    disabled={isRestoring}
                    className="w-full sm:w-auto px-3 py-1.5 text-sm font-medium text-pink-600 dark:text-dark-pink bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
                >
                    {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
            </div>
        </div>
    );
}

export default Trash;
