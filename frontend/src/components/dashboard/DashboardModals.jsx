import React from 'react';
import { expenseAPI } from '../../api';
import { logError } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';
import AddExpenseModal from '../AddExpenseModal';
import AddIncomeModal from '../AddIncomeModal';
import AddDebtPaymentModal from '../AddDebtPaymentModal';
import EditExpenseModal from '../EditExpenseModal';
import EditIncomeModal from '../EditIncomeModal';
import SalaryPeriodWizard from '../SalaryPeriodWizard';
import LeftoverBudgetModal from '../LeftoverBudgetModal';
import ExportImportModal from '../ExportImportModal';
import BankImportModal from '../BankImportModal';
import FilterTransactionsModal from '../FilterTransactionsModal';

const DashboardModals = ({
    showAddModal,
    setShowAddModal,
    modalType,
    setModalType,
    handleAddExpense,
    handleAddIncome,
    showEditModal,
    setShowEditModal,
    editType,
    setEditType,
    selectedTransaction,
    setSelectedTransaction,
    handleEditExpense,
    handleEditIncome,
    warningModal,
    setWarningModal,
    creditLimit,
    creditAvailable,
    currentPeriod,
    loadExpenses,
    showSalaryWizard,
    setShowSalaryWizard,
    editSalaryPeriod,
    setEditSalaryPeriod,
    rolloverData,
    setRolloverData,
    loadPeriodsAndCurrentWeek,
    loadSalaryPeriodData,
    viewingSalaryPeriodId,
    weeklyBudgetCardRef,
    showLeftoverModal,
    setShowLeftoverModal,
    leftoverModalData,
    setLeftoverModalData,
    loadTransactionsAndBalances,
    deleteConfirmation,
    setDeleteConfirmation,
    handleDeleteIncome,
    handleDeleteExpense,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    selectedTransactions,
    transactions,
    handleBulkDelete,
    showExportModal,
    setShowExportModal,
    exportMode,
    showBankImportModal,
    setShowBankImportModal,
    showFilterModal,
    setShowFilterModal,
    handleApplyFilters,
    activeFilters,
}) => {
    const fcEur = (cents) => formatCurrency(cents);
    const fc = (cents) => formatCurrency(cents); // Alias used in some modals

    return (
        <>
            {/* Add Modals */}
            {showAddModal && modalType === 'expense' && (
                <AddExpenseModal
                    onClose={() => {
                        setShowAddModal(false);
                        setModalType(null);
                    }}
                    onAdd={handleAddExpense}
                />
            )}
            {showAddModal && modalType === 'income' && (
                <AddIncomeModal
                    onClose={() => {
                        setShowAddModal(false);
                        setModalType(null);
                    }}
                    onAdd={handleAddIncome}
                />
            )}
            {showAddModal && modalType === 'debt' && (
                <AddDebtPaymentModal
                    onClose={() => {
                        setShowAddModal(false);
                        setModalType(null);
                    }}
                    onAdd={handleAddExpense}
                />
            )}

            {/* Edit Modals */}
            {showEditModal && editType === 'expense' && selectedTransaction && (
                <EditExpenseModal
                    onClose={() => {
                        setShowEditModal(false);
                        setEditType(null);
                        setSelectedTransaction(null);
                    }}
                    onEdit={handleEditExpense}
                    expense={selectedTransaction}
                />
            )}
            {showEditModal && editType === 'income' && selectedTransaction && (
                <EditIncomeModal
                    onClose={() => {
                        setShowEditModal(false);
                        setEditType(null);
                        setSelectedTransaction(null);
                    }}
                    onEdit={handleEditIncome}
                    income={selectedTransaction}
                />
            )}

            {/* Warning Modal for Exceeding Balance/Credit */}
            {warningModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center flex-shrink-0">
                                <svg
                                    className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text">
                                {warningModal.type === 'debit'
                                    ? 'Insufficient Funds'
                                    : 'Credit Limit Exceeded'}
                            </h3>
                        </div>

                        {warningModal.type === 'debit' ? (
                            <div className="text-gray-700 dark:text-dark-text mb-6 space-y-2">
                                <p>
                                    You're trying to spend{' '}
                                    <strong>{fcEur(warningModal.expenseAmount * 100)}</strong> but
                                    only have <strong>{fcEur(warningModal.available * 100)}</strong>{' '}
                                    available in your debit account.
                                </p>
                                <p className="text-red-600 dark:text-dark-danger font-semibold">
                                    This will result in a negative balance of{' '}
                                    {fcEur(
                                        (warningModal.available - warningModal.expenseAmount) * 100
                                    )}
                                    .
                                </p>
                                <p className="text-sm">Do you want to proceed anyway?</p>
                            </div>
                        ) : (
                            <div className="text-gray-700 dark:text-dark-text mb-6 space-y-2">
                                <p>
                                    You're trying to spend{' '}
                                    <strong>{fcEur(warningModal.expenseAmount * 100)}</strong> but
                                    only have <strong>{fcEur(warningModal.available * 100)}</strong>{' '}
                                    available credit.
                                </p>
                                <p>
                                    Your credit limit is {fcEur(creditLimit * 100)} and you have{' '}
                                    {fcEur(creditAvailable * 100)} available.
                                </p>
                                <p className="text-red-600 dark:text-dark-danger font-semibold">
                                    This will exceed your limit by{' '}
                                    {fcEur(
                                        (warningModal.expenseAmount - warningModal.available) * 100
                                    )}
                                    .
                                </p>
                                <p className="text-sm">Do you want to proceed anyway?</p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    warningModal.reject(new Error('Transaction cancelled by user'));
                                    setWarningModal(null);
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-elevated/80 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const data = warningModal.expenseData;
                                    const resolve = warningModal.resolve;
                                    setWarningModal(null);

                                    try {
                                        await expenseAPI.create({
                                            ...data,
                                            budget_period_id: currentPeriod.id,
                                        });
                                        await loadExpenses();
                                        setShowAddModal(false);
                                        setModalType(null);
                                        resolve();
                                    } catch (error) {
                                        logError('addExpense', error);
                                        throw error;
                                    }
                                }}
                                className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition font-semibold"
                            >
                                Proceed Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Period Wizard */}
            {showSalaryWizard && (
                <SalaryPeriodWizard
                    editPeriod={editSalaryPeriod}
                    rolloverData={rolloverData}
                    onClose={() => {
                        setShowSalaryWizard(false);
                        setEditSalaryPeriod(null);
                        // Don't clear rolloverData on cancel - keep prompt visible
                    }}
                    onComplete={async () => {
                        setShowSalaryWizard(false);
                        setEditSalaryPeriod(null);
                        setRolloverData(null);
                        // Reload all data
                        await loadPeriodsAndCurrentWeek();
                        await loadExpenses();
                        // If viewing a specific period, reload that period's data too
                        if (viewingSalaryPeriodId && loadSalaryPeriodData) {
                            await loadSalaryPeriodData(viewingSalaryPeriodId);
                        }
                        // Force refresh the weekly budget card
                        weeklyBudgetCardRef.current?.refresh();
                    }}
                />
            )}

            {/* Leftover Budget Allocation Modal */}
            {showLeftoverModal && leftoverModalData && (
                <LeftoverBudgetModal
                    salaryPeriodId={leftoverModalData.salaryPeriodId}
                    weekNumber={leftoverModalData.weekNumber}
                    onClose={() => {
                        setShowLeftoverModal(false);
                        setLeftoverModalData(null);
                    }}
                    onAllocate={() => {
                        setShowLeftoverModal(false);
                        setLeftoverModalData(null);
                        weeklyBudgetCardRef.current?.refresh();
                        loadTransactionsAndBalances();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">
                            Delete Transaction?
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-2">
                            Are you sure you want to delete this {deleteConfirmation.type}?
                        </p>
                        <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-3 mb-6">
                            <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                                {deleteConfirmation.type === 'income' ? 'Type' : 'Name'}
                            </p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {deleteConfirmation.type === 'income'
                                    ? deleteConfirmation.transaction.type
                                    : deleteConfirmation.transaction.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Amount</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {fc(deleteConfirmation.transaction.amount)}
                            </p>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                            ⚠️ This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirmation.type === 'income') {
                                        handleDeleteIncome(deleteConfirmation.id);
                                    } else {
                                        handleDeleteExpense(deleteConfirmation.id);
                                    }
                                    setDeleteConfirmation(null);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">
                            Delete Multiple Transactions?
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
                            Are you sure you want to delete{' '}
                            <strong>{selectedTransactions.length}</strong> transaction(s)?
                        </p>
                        <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                            <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-2">
                                Selected transactions:
                            </p>
                            {selectedTransactions.map((txn) => {
                                const transaction = transactions.find(
                                    (t) => t.transactionType === txn.type && t.id === txn.id
                                );
                                if (!transaction) return null;
                                return (
                                    <div
                                        key={txn.key}
                                        className="flex justify-between items-center py-1 text-sm"
                                    >
                                        <span className="text-gray-700 dark:text-dark-text-secondary">
                                            {txn.type === 'income'
                                                ? transaction.type
                                                : transaction.name}
                                        </span>
                                        <span className="font-semibold text-gray-800 dark:text-dark-text">
                                            {fc(transaction.amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                            ⚠️ This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                Delete {selectedTransactions.length} Transaction(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export/Import Modal */}
            {showExportModal && (
                <ExportImportModal
                    mode={exportMode}
                    onClose={() => setShowExportModal(false)}
                    onImportComplete={() => {
                        loadPeriodsAndCurrentWeek();
                        loadTransactionsAndBalances();
                    }}
                />
            )}

            {/* Bank Import Modal */}
            {showBankImportModal && (
                <BankImportModal
                    onClose={() => setShowBankImportModal(false)}
                    onImportComplete={() => {
                        loadTransactionsAndBalances();
                        setShowBankImportModal(false);
                    }}
                />
            )}

            {/* Filter Transactions Modal */}
            <FilterTransactionsModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={handleApplyFilters}
                initialFilters={activeFilters}
            />
        </>
    );
};

export default DashboardModals;
