import React from 'react';
import { recurringExpenseAPI, recurringGenerationAPI, recurringIncomeAPI } from '../../api';
import { logError } from '../../utils/logger';
import { formatCurrency, formatTransactionAmount } from '../../utils/formatters';
import DateNavigator from '../DateNavigator';

const TransactionList = ({
    transactionView,
    setTransactionView,
    transactions,
    scheduledExpenses,
    scheduledIncome = [],
    recurringIncomeEnabled = false,
    isLoadingMore,
    handleLoadMore,
    hasMoreExpenses,
    hasMoreIncome,
    selectionMode,
    setSelectionMode,
    selectedTransactions,
    toggleTransactionSelection,
    toggleSelectAll,
    setShowBulkDeleteConfirm,
    setSelectedTransaction,
    setEditType,
    setShowEditModal,
    setDeleteConfirmation,
    transactionDates,
    currentViewDate,
    handleDateNavigate,
    activeFilters,
    setShowFilterModal,
    selectedScheduled,
    setSelectedScheduled,
    loadScheduledExpenses,
    loadScheduledIncome,
    loadTransactionsAndBalances,
    defaultCurrency,
    convertAmount,
    currentPeriod,
}) => {
    // Convert EUR cents (from DB) to user's currency and format
    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    // Helper to group transactions by date
    const groupedTransactions = transactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});

    return (
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                    {/* View Toggle Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTransactionView('transactions')}
                            className={`px-4 py-2 rounded-lg transition font-semibold ${
                                transactionView === 'transactions'
                                    ? 'bg-bloom-pink text-white'
                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                            }`}
                        >
                            Transactions
                        </button>
                        <button
                            onClick={() => setTransactionView('scheduled')}
                            className={`px-4 py-2 rounded-lg transition font-semibold ${
                                transactionView === 'scheduled'
                                    ? 'bg-bloom-pink text-white'
                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                            }`}
                        >
                            Scheduled
                        </button>
                    </div>

                    {/* Filter Button */}
                    {transactionView === 'transactions' && (
                        <button
                            onClick={() => setShowFilterModal(true)}
                            className={`p-2 rounded-lg transition ${
                                Object.keys(activeFilters).some((k) => activeFilters[k])
                                    ? 'bg-bloom-pink text-white'
                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                            }`}
                            title="Filter Transactions"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {transactionView === 'transactions' && (
                    <DateNavigator
                        transactionDates={transactionDates}
                        scheduledDates={[
                            ...scheduledExpenses.map((e) => e.date),
                            ...scheduledIncome.map((i) => i.date),
                        ]}
                        currentViewDate={currentViewDate}
                        onDateChange={handleDateNavigate}
                        selectedPeriod={currentPeriod}
                    />
                )}
            </div>

            {/* Transactions List */}
            {transactionView === 'transactions' && (
                <>
                    {/* Selection Mode Actions */}
                    {transactions.length > 0 && (
                        <div className="flex justify-between items-center mb-4">
                            {selectionMode ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="text-sm font-semibold text-bloom-pink hover:text-pink-600"
                                        >
                                            {selectedTransactions.length === transactions.length
                                                ? 'Deselect All'
                                                : 'Select All'}
                                        </button>
                                        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {selectedTransactions.length} selected
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedTransactions.length > 0 && (
                                            <button
                                                onClick={() => setShowBulkDeleteConfirm(true)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
                                            >
                                                Delete Selected
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectionMode(false);
                                            }}
                                            className="px-4 py-2 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition text-sm font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    onClick={() => setSelectionMode(true)}
                                    className="px-3 py-1.5 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-elevated border border-gray-300 dark:border-dark-border rounded-full hover:bg-gray-200 dark:hover:bg-dark-border hover:border-gray-400 dark:hover:border-dark-text-tertiary transition"
                                >
                                    Select Multiple
                                </button>
                            )}
                        </div>
                    )}

                    {transactions.length === 0 ? (
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
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
                                <div key={date}>
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-text-tertiary mb-3 sticky top-0 bg-gray-50/90 dark:bg-dark-base/90 backdrop-blur-sm py-2 z-10">
                                        {(() => {
                                            const d = new Date(date);
                                            const today = new Date();
                                            const yesterday = new Date(today);
                                            yesterday.setDate(yesterday.getDate() - 1);

                                            if (d.toDateString() === today.toDateString())
                                                return 'Today';
                                            if (d.toDateString() === yesterday.toDateString())
                                                return 'Yesterday';
                                            return d.toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                            });
                                        })()}
                                    </h3>
                                    <div className="space-y-3">
                                        {dayTransactions.map((transaction) => {
                                            const isSelected = selectedTransactions.some(
                                                (t) =>
                                                    t.key ===
                                                    `${transaction.transactionType}-${transaction.id}`
                                            );
                                            return (
                                                <div
                                                    key={`${transaction.transactionType}-${transaction.id}`}
                                                    className={`bg-gray-50 dark:bg-dark-elevated rounded-xl p-4 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                        isSelected ? 'ring-2 ring-bloom-pink' : ''
                                                    } ${selectionMode ? 'cursor-pointer' : ''}`}
                                                    onClick={() => {
                                                        if (selectionMode) {
                                                            toggleTransactionSelection(
                                                                transaction.transactionType,
                                                                transaction.id
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {selectionMode && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}} // Handled by div click
                                                                className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink cursor-pointer"
                                                            />
                                                        )}
                                                        <div
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                                                                transaction.transactionType ===
                                                                'income'
                                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-bloom-pink/10 text-bloom-pink'
                                                            }`}
                                                        >
                                                            {transaction.transactionType ===
                                                            'income'
                                                                ? '💰'
                                                                : '💸'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-gray-800 dark:text-dark-text text-lg">
                                                                    {transaction.transactionType ===
                                                                    'income'
                                                                        ? transaction.name ||
                                                                          transaction.type
                                                                        : transaction.name}
                                                                </h4>
                                                                {transaction.is_fixed_bill && (
                                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                                                                        <svg
                                                                            className="w-3 h-3"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                                                            />
                                                                        </svg>
                                                                        Fixed Bill
                                                                    </span>
                                                                )}
                                                                {((transaction.transactionType ===
                                                                    'expense' &&
                                                                    transaction.recurring_template_id) ||
                                                                    (transaction.transactionType ===
                                                                        'income' &&
                                                                        transaction.recurring_income_id)) && (
                                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                                                                        <svg
                                                                            className="w-3 h-3"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                                            />
                                                                        </svg>
                                                                        Recurring
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {transaction.transactionType ===
                                                                'expense'
                                                                    ? `${transaction.category} • ${transaction.subcategory}`
                                                                    : 'Income'}
                                                            </p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                {transaction.date}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Bottom row on mobile: amount + payment method + buttons */}
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                                        <div className="text-left sm:text-right">
                                                            {(() => {
                                                                const txAmount =
                                                                    formatTransactionAmount(
                                                                        transaction,
                                                                        defaultCurrency,
                                                                        convertAmount
                                                                    );
                                                                return (
                                                                    <>
                                                                        <p
                                                                            className={`font-bold ${transaction.transactionType === 'income' ? 'text-green-700 dark:text-dark-success' : 'text-gray-800 dark:text-dark-text'}`}
                                                                        >
                                                                            {transaction.transactionType ===
                                                                            'income'
                                                                                ? '+'
                                                                                : ''}
                                                                            {txAmount.display}
                                                                        </p>
                                                                        {txAmount.showDual && (
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                ≈{' '}
                                                                                {txAmount.converted}
                                                                            </p>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            {transaction.transactionType ===
                                                                'expense' && (
                                                                <span
                                                                    className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
                                                                        transaction.payment_method ===
                                                                        'Credit card'
                                                                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                    }`}
                                                                >
                                                                    {transaction.payment_method}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!selectionMode && (
                                                            <div className="flex gap-2 flex-shrink-0">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedTransaction(
                                                                            transaction
                                                                        );
                                                                        setEditType(
                                                                            transaction.transactionType
                                                                        );
                                                                        setShowEditModal(true);
                                                                    }}
                                                                    className="p-2.5 sm:p-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
                                                                        setDeleteConfirmation({
                                                                            type: transaction.transactionType,
                                                                            id: transaction.id,
                                                                            transaction:
                                                                                transaction,
                                                                        })
                                                                    }
                                                                    className="p-2.5 sm:p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Load More Button */}
                    {(hasMoreExpenses || hasMoreIncome) && transactions.length > 0 && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-6 py-3 bg-bloom-pink text-white rounded-lg font-medium hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoadingMore ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Loading...
                                    </>
                                ) : (
                                    <>
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
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                        Load More
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Scheduled View */}
            {transactionView === 'scheduled' && (
                <>
                    {/* Combine and sort scheduled items */}
                    {(() => {
                        // Combine expenses and income with type markers
                        const allScheduledItems = [
                            ...scheduledExpenses.map((item) => ({ ...item, itemType: 'expense' })),
                            ...(recurringIncomeEnabled
                                ? scheduledIncome.map((item) => ({ ...item, itemType: 'income' }))
                                : []),
                        ].sort((a, b) => new Date(a.date) - new Date(b.date));

                        const hasItems = allScheduledItems.length > 0;

                        return (
                            <>
                                {/* Scheduled Actions */}
                                {hasItems && (
                                    <div className="flex justify-between items-center mb-4">
                                        {selectionMode ? (
                                            <>
                                                {selectedScheduled.length > 0 && (
                                                    <>
                                                        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                            {selectedScheduled.length} selected
                                                        </span>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    // Separate expense and income IDs
                                                                    const expenseIds =
                                                                        selectedScheduled.filter(
                                                                            (id) =>
                                                                                scheduledExpenses.some(
                                                                                    (e) =>
                                                                                        e.template_id ===
                                                                                        id
                                                                                )
                                                                        );
                                                                    const incomeIds =
                                                                        selectedScheduled.filter(
                                                                            (id) =>
                                                                                scheduledIncome.some(
                                                                                    (i) =>
                                                                                        i.template_id ===
                                                                                        id
                                                                                )
                                                                        );

                                                                    // Delete selected items from respective APIs
                                                                    await Promise.all([
                                                                        ...expenseIds.map((id) =>
                                                                            recurringExpenseAPI.delete(
                                                                                id
                                                                            )
                                                                        ),
                                                                        ...incomeIds.map((id) =>
                                                                            recurringIncomeAPI.delete(
                                                                                id
                                                                            )
                                                                        ),
                                                                    ]);
                                                                    loadScheduledExpenses();
                                                                    if (loadScheduledIncome)
                                                                        loadScheduledIncome();
                                                                    setSelectedScheduled([]);
                                                                    setSelectionMode(false);
                                                                } catch (error) {
                                                                    logError(
                                                                        'deleteScheduledItems',
                                                                        error
                                                                    );
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
                                                        >
                                                            Delete Selected
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectionMode(false);
                                                        setSelectedScheduled([]);
                                                    }}
                                                    className="px-4 py-2 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition text-sm font-semibold"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Generate both expenses and income using unified API
                                                        await recurringGenerationAPI.generate(
                                                            false,
                                                            null,
                                                            recurringIncomeEnabled
                                                        );
                                                        // Reload transactions and switch to transactions view
                                                        loadTransactionsAndBalances();
                                                        setTransactionView('transactions');
                                                    } catch (error) {
                                                        logError('confirmScheduledItems', error);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-bloom-mint text-green-800 rounded-lg hover:bg-green-200 transition font-semibold flex items-center gap-2"
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
                                                Confirm Schedule
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Scheduled Items List */}
                                {!hasItems ? (
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
                                            {recurringIncomeEnabled ? 'transactions' : 'expenses'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {allScheduledItems.map((item, idx) => {
                                            const isSelected = selectedScheduled.includes(
                                                item.template_id
                                            );
                                            const isIncome = item.itemType === 'income';
                                            return (
                                                <div
                                                    key={`scheduled-${item.itemType}-${item.template_id}-${idx}`}
                                                    className={`bg-gray-50 dark:bg-dark-elevated rounded-lg p-4 hover:shadow-md transition cursor-pointer ${
                                                        isSelected ? 'ring-2 ring-bloom-pink' : ''
                                                    } ${isIncome ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}
                                                    onClick={() => {
                                                        if (selectionMode) {
                                                            setSelectedScheduled((prev) =>
                                                                prev.includes(item.template_id)
                                                                    ? prev.filter(
                                                                          (id) =>
                                                                              id !==
                                                                              item.template_id
                                                                      )
                                                                    : [...prev, item.template_id]
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {selectionMode && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-4 h-4 text-bloom-pink rounded focus:ring-bloom-pink cursor-pointer"
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-start gap-2 flex-wrap">
                                                                        <h4 className="font-semibold text-gray-800 dark:text-dark-text break-words">
                                                                            {item.name}
                                                                        </h4>
                                                                        <span
                                                                            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                                                isIncome
                                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                            }`}
                                                                        >
                                                                            {isIncome
                                                                                ? 'Income'
                                                                                : 'Expense'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                                                        {item.category}{' '}
                                                                        {item.subcategory &&
                                                                            `• ${item.subcategory}`}
                                                                    </p>
                                                                </div>
                                                                <span
                                                                    className={`text-base sm:text-lg font-bold whitespace-nowrap flex-shrink-0 ${
                                                                        isIncome
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : 'text-red-600 dark:text-red-400'
                                                                    }`}
                                                                >
                                                                    {isIncome ? '+' : '-'}
                                                                    {fcEur(item.amount * 100)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-dark-text-tertiary">
                                                                <span>
                                                                    {(() => {
                                                                        const d = new Date(
                                                                            item.date
                                                                        );
                                                                        return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                                                    })()}
                                                                </span>
                                                                <span className="capitalize">
                                                                    {item.frequency}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </>
            )}
        </div>
    );
};

export default TransactionList;
