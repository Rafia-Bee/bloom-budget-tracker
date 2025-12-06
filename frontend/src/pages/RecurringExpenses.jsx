/**
 * Bloom - Recurring Expenses Page
 *
 * Management page for recurring expense templates.
 * View, create, edit, toggle, and delete recurring expenses.
 */

import { useState, useEffect } from 'react'
import { recurringExpenseAPI } from '../api'
import AddRecurringExpenseModal from '../components/AddRecurringExpenseModal'
import ExportImportModal from '../components/ExportImportModal'
import BankImportModal from '../components/BankImportModal'
import CatLoading from '../components/CatLoading'
import Header from '../components/Header'

function RecurringExpenses({ setIsAuthenticated }) {
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const [showBankImportModal, setShowBankImportModal] = useState(false)

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
    loadRecurringExpenses()
  }, [])

  const loadRecurringExpenses = async () => {
    try {
      const response = await recurringExpenseAPI.getAll()
      setRecurringExpenses(response.data)
    } catch (error) {
      console.error('Failed to load recurring expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (data) => {
    await recurringExpenseAPI.create(data)

    // Automatically generate the first instance
    try {
      await recurringExpenseAPI.generateNow(false, 90)
    } catch (err) {
      console.warn('Failed to auto-generate recurring expense:', err)
    }

    await loadRecurringExpenses()
    setShowAddModal(false)
  }

  const handleEdit = async (data) => {
    await recurringExpenseAPI.update(editingExpense.id, data)
    await loadRecurringExpenses()
    setEditingExpense(null)
  }

  const handleToggle = async (id) => {
    try {
      await recurringExpenseAPI.toggleActive(id)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Failed to toggle recurring expense:', error)
    }
  }

  const handleToggleFixedBill = async (id, currentStatus) => {
    try {
      await recurringExpenseAPI.toggleFixedBill(id, !currentStatus)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Failed to toggle fixed bill status:', error)
    }
  }

  const handleDelete = async (id) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = async () => {
    const id = deleteConfirm
    setDeleteConfirm(null)

    try {
      await recurringExpenseAPI.delete(id)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Failed to delete recurring expense:', error)
    }
  }

  const handleGenerateNow = async () => {
    setShowConfirmGenerate(false)
    setGenerating(true)
    setGenerationResult(null)

    try {
      const response = await recurringExpenseAPI.generateNow(false)
      setGenerationResult(response.data)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Failed to generate expenses:', error)
      setGenerationResult({ message: 'Failed to generate expenses', generated_count: 0 })
    } finally {
      setGenerating(false)
    }
  }

  const getFrequencyText = (expense) => {
    if (expense.frequency === 'weekly') return 'Weekly'
    if (expense.frequency === 'biweekly') return 'Biweekly'
    if (expense.frequency === 'monthly') return `Monthly (${expense.day_of_month}${getDaySuffix(expense.day_of_month)})`
    if (expense.frequency === 'custom') return `Every ${expense.frequency_value} days`
    return expense.frequency
  }

  const getDaySuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const activeExpenses = recurringExpenses.filter(e => e.is_active)
  const inactiveExpenses = recurringExpenses.filter(e => !e.is_active)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-green-50 dark:from-dark-base dark:via-dark-surface dark:to-dark-base">
      {/* Header */}
      <Header
        setIsAuthenticated={setIsAuthenticated}
        onExport={handleExport}
        onImport={handleImport}
        onBankImport={handleBankImport}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Recurring Expenses</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Manage your automatic expense templates</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowConfirmGenerate(true)}
              disabled={generating || recurringExpenses.filter(e => e.is_active).length === 0}
              className="px-6 py-3 bg-green-600 dark:bg-dark-mint/30 text-white dark:text-dark-success rounded-lg hover:bg-green-700 dark:hover:bg-dark-mint/40 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title={recurringExpenses.filter(e => e.is_active).length === 0
                ? "No active recurring expenses to generate"
                : "Generate due recurring expenses now"}
            >
              {generating ? 'Generating...' : '⚡ Generate Now'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink-hover transition-colors font-semibold shadow-sm whitespace-nowrap"
            >
              + Add Recurring Expense
            </button>
          </div>
        </div>

        {/* Generation Result */}
        {generationResult && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-green-800 dark:text-dark-success">
                  ✓ {generationResult.message}
                </h3>
                {generationResult.data?.templates && generationResult.data.templates.length > 0 && (
                  <ul className="mt-2 text-sm text-green-700 dark:text-dark-success space-y-1">
                    {generationResult.data.templates.map((template, idx) => (
                      <li key={idx}>
                        • {template.name} - ${template.amount?.toFixed(2)} on {template.date}
                      </li>
                    ))}
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
          <CatLoading message="Loading recurring expenses..." />
        ) : (
          <div className="space-y-6">
            {/* Active Recurring Expenses */}
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4">
                Active ({activeExpenses.length})
              </h3>

              {activeExpenses.length === 0 ? (
                <p className="text-gray-500 dark:text-dark-text-tertiary text-center py-8">
                  No active recurring expenses. Click "Add Recurring Expense" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-dark-elevated"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="font-semibold text-gray-800 dark:text-dark-text">{expense.name}</h4>
                            <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded">
                              {getFrequencyText(expense)}
                            </span>
                            {expense.is_fixed_bill && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                📌 Fixed Bill
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-dark-text-tertiary">Amount:</span>{' '}
                              <span className="font-medium dark:text-dark-text">${(expense.amount / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-dark-text-tertiary">Category:</span>{' '}
                              <span className="font-medium dark:text-dark-text">{expense.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-dark-text-tertiary">Next due:</span>{' '}
                              <span className="font-medium dark:text-dark-text">{formatDate(expense.next_due_date)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-dark-text-tertiary">Payment:</span>{' '}
                              <span className="font-medium dark:text-dark-text">{expense.payment_method}</span>
                            </div>
                          </div>

                          {expense.notes && (
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2 italic">{expense.notes}</p>
                          )}
                        </div>

                        <div className="flex gap-3 sm:ml-4 pr-2 sm:pr-0 self-end sm:self-start flex-shrink-0">
                          <button
                            onClick={() => handleToggleFixedBill(expense.id, expense.is_fixed_bill)}
                            className={`p-2.5 sm:p-2 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
                              expense.is_fixed_bill
                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={expense.is_fixed_bill ? 'Remove from fixed bills' : 'Mark as fixed bill'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-2.5 sm:p-2 text-gray-600 hover:text-bloom-pink hover:bg-pink-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggle(expense.id)}
                            className="p-2.5 sm:p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Pause"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                            <h4 className="font-semibold text-gray-600 dark:text-dark-text-secondary">{expense.name}</h4>
                            <span className="text-sm px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              Paused
                            </span>
                          </div>

                          <div className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                            ${(expense.amount / 100).toFixed(2)} • {getFrequencyText(expense)}
                          </div>
                        </div>

                        <div className="flex gap-3 sm:ml-4 pr-2 sm:pr-0 self-end sm:self-start flex-shrink-0">
                          <button
                            onClick={() => handleToggle(expense.id)}
                            className="p-2.5 sm:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Resume"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Confirm Generate Modal */}
      {showConfirmGenerate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">Generate Recurring Expenses?</h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              This will create expense entries for all recurring expenses that are due. Do you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmGenerate(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-elevated/80 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNow}
                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition font-semibold"
              >
                ⚡ Generate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">Delete Recurring Expense?</h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              Are you sure you want to delete this recurring expense? This action cannot be undone.
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

      {/* Export/Import Modal */}
      {showExportModal && (
        <ExportImportModal
          mode={exportMode}
          onClose={() => setShowExportModal(false)}
        />
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
    </div>
  )
}

export default RecurringExpenses
