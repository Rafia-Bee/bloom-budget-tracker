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
import { useNavigate } from 'react-router-dom'

function RecurringExpenses() {
  const navigate = useNavigate()
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')

  useEffect(() => {
    loadRecurringExpenses()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showUserMenu])

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
    try {
      await recurringExpenseAPI.create(data)
      await loadRecurringExpenses()
      setShowAddModal(false)
    } catch (error) {
      throw error
    }
  }

  const handleEdit = async (data) => {
    try {
      await recurringExpenseAPI.update(editingExpense.id, data)
      await loadRecurringExpenses()
      setEditingExpense(null)
    } catch (error) {
      throw error
    }
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

      // Auto-hide after 5 seconds
      setTimeout(() => setGenerationResult(null), 5000)
    } catch (error) {
      console.error('Failed to generate expenses:', error)
      setGenerationResult({ message: 'Failed to generate expenses', generated_count: 0 })
      setTimeout(() => setGenerationResult(null), 5000)
    } finally {
      setGenerating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    navigate('/login')
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile Header */}
          <div className="flex justify-between items-center md:hidden">
            <div>
              <h1 className="text-2xl font-bold text-bloom-pink">Bloom</h1>
              <p className="text-xs text-gray-600">Recurring Expense Management</p>
            </div>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="w-10 h-10 rounded-lg bg-bloom-pink/10 hover:bg-bloom-pink/20 transition flex items-center justify-center text-bloom-pink"
              aria-label="Menu"
            >
              {showMobileMenu ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-bloom-pink to-pink-400 bg-clip-text text-transparent">
                Bloom
              </h1>
              <p className="text-sm text-gray-600">Recurring Expense Management</p>
            </div>

            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-gray-600 hover:text-bloom-pink transition">
                ← Back to Dashboard
              </a>
              <a
                href="/debts"
                className="px-4 py-2 text-gray-600 hover:text-bloom-pink transition font-semibold"
              >
                Debts
              </a>

              {/* User Menu */}
              <div className="relative user-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUserMenu(!showUserMenu)
                  }}
                  className="w-10 h-10 rounded-full bg-bloom-pink text-white font-semibold hover:bg-pink-600 transition-colors flex items-center justify-center"
                >
                  {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm text-gray-600 truncate">
                        {localStorage.getItem('user_email')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowExportModal(true)
                        setExportMode('export')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Data
                    </button>
                    <button
                      onClick={() => {
                        setShowExportModal(true)
                        setExportMode('import')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Data
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200 mt-2 pt-2"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigate('/dashboard')
                    setShowMobileMenu(false)
                  }}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-bloom-pink/10 hover:text-bloom-pink transition rounded-lg font-semibold"
                >
                  🏠 Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate('/debts')
                    setShowMobileMenu(false)
                  }}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-bloom-pink/10 hover:text-bloom-pink transition rounded-lg font-semibold"
                >
                  💳 Debts
                </button>

                {/* User Info & Logout */}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800">{localStorage.getItem('user_email')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowExportModal(true)
                      setExportMode('export')
                      setShowMobileMenu(false)
                    }}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition rounded-lg flex items-center gap-2 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Data
                  </button>
                  <button
                    onClick={() => {
                      setShowExportModal(true)
                      setExportMode('import')
                      setShowMobileMenu(false)
                    }}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition rounded-lg flex items-center gap-2 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Data
                  </button>
                  <button
                    onClick={() => {
                      handleLogout()
                      setShowMobileMenu(false)
                    }}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition rounded-lg flex items-center gap-2 font-semibold border-t border-gray-200 mt-2 pt-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Recurring Expenses</h2>
            <p className="text-gray-600 mt-1">Manage your automatic expense templates</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowConfirmGenerate(true)}
              disabled={generating || recurringExpenses.filter(e => e.is_active).length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title={recurringExpenses.filter(e => e.is_active).length === 0
                ? "No active recurring expenses to generate"
                : "Generate due recurring expenses now"}
            >
              {generating ? 'Generating...' : '⚡ Generate Now'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold shadow-sm whitespace-nowrap"
            >
              + Add Recurring Expense
            </button>
          </div>
        </div>

        {/* Generation Result */}
        {generationResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-green-800">
                  ✓ {generationResult.message}
                </h3>
                {generationResult.data?.templates && generationResult.data.templates.length > 0 && (
                  <ul className="mt-2 text-sm text-green-700 space-y-1">
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
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-bloom-pink border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading recurring expenses...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Recurring Expenses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Active ({activeExpenses.length})
              </h3>

              {activeExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No active recurring expenses. Click "Add Recurring Expense" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="font-semibold text-gray-800">{expense.name}</h4>
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
                              <span className="text-gray-500">Amount:</span>{' '}
                              <span className="font-medium">${(expense.amount / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Category:</span>{' '}
                              <span className="font-medium">{expense.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Next due:</span>{' '}
                              <span className="font-medium">{formatDate(expense.next_due_date)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Payment:</span>{' '}
                              <span className="font-medium">{expense.payment_method}</span>
                            </div>
                          </div>

                          {expense.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{expense.notes}</p>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Paused ({inactiveExpenses.length})
                </h3>

                <div className="space-y-3">
                  {inactiveExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-75"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="font-semibold text-gray-600">{expense.name}</h4>
                            <span className="text-sm px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              Paused
                            </span>
                          </div>

                          <div className="text-sm text-gray-500">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Generate Recurring Expenses?</h3>
            <p className="text-gray-600 mb-6">
              This will create expense entries for all recurring expenses that are due. Do you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmGenerate(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNow}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Recurring Expense?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this recurring expense? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
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
    </div>
  )
}

export default RecurringExpenses
