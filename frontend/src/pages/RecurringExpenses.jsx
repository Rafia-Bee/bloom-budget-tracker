/**
 * Bloom - Recurring Expenses Page
 *
 * Management page for recurring expense templates.
 * View, create, edit, toggle, and delete recurring expenses.
 */

import { useState, useEffect } from 'react'
import { recurringExpenseAPI } from '../api'
import AddRecurringExpenseModal from '../components/AddRecurringExpenseModal'
import { useNavigate } from 'react-router-dom'

function RecurringExpenses() {
  const navigate = useNavigate()
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)

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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recurring expense?')) {
      return
    }

    try {
      await recurringExpenseAPI.delete(id)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Failed to delete recurring expense:', error)
    }
  }

  const handleGenerateNow = async () => {
    if (!confirm('Generate due recurring expenses now?')) {
      return
    }

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
      alert('Failed to generate expenses. Check console for details.')
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
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-bloom-pink to-pink-400 bg-clip-text text-transparent">
                Bloom
              </h1>
              <nav className="flex gap-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-bloom-pink transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/debts')}
                  className="text-gray-600 hover:text-bloom-pink transition-colors"
                >
                  Debts
                </button>
                <button
                  onClick={() => navigate('/recurring-expenses')}
                  className="text-bloom-pink font-semibold"
                >
                  Recurring
                </button>
              </nav>
            </div>

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
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Recurring Expenses</h2>
            <p className="text-gray-600 mt-1">Manage your automatic expense templates</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateNow}
              disabled={generating}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate due recurring expenses now"
            >
              {generating ? 'Generating...' : '⚡ Generate Now'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold shadow-sm"
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-800">{expense.name}</h4>
                            <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded">
                              {getFrequencyText(expense)}
                            </span>
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

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-2 text-gray-600 hover:text-bloom-pink hover:bg-pink-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggle(expense.id)}
                            className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Pause"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-600">{expense.name}</h4>
                            <span className="text-sm px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              Paused
                            </span>
                          </div>

                          <div className="text-sm text-gray-500">
                            ${(expense.amount / 100).toFixed(2)} • {getFrequencyText(expense)}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleToggle(expense.id)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Resume"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
    </div>
  )
}

export default RecurringExpenses
