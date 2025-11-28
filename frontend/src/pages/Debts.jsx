/**
 * Bloom - Debts Page
 *
 * Manage and track debts with payoff projections.
 * Shows debt list, balances, monthly payments, and estimated payoff dates.
 */

import { useState, useEffect } from 'react'
import { debtAPI, expenseAPI, incomeAPI, budgetPeriodAPI } from '../api'
import AddDebtModal from '../components/AddDebtModal'
import EditDebtModal from '../components/EditDebtModal'
import ExportImportModal from '../components/ExportImportModal'

function Debts({ setIsAuthenticated }) {
  const [debts, setDebts] = useState([])
  const [archivedDebts, setArchivedDebts] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [creditCardDebt, setCreditCardDebt] = useState(null)
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [expandedDebtId, setExpandedDebtId] = useState(null)
  const [debtTransactions, setDebtTransactions] = useState({})
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const creditLimit = 1500

  useEffect(() => {
    loadCurrentPeriod()
    loadDebts()
    loadArchivedDebts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (currentPeriod) {
      loadCreditCardDebt()
    }
  }, [currentPeriod])

  const loadCurrentPeriod = async () => {
    try {
      const periodsRes = await budgetPeriodAPI.getAll()
      if (periodsRes.data.length > 0) {
        setCurrentPeriod(periodsRes.data[0])
      }
    } catch (error) {
      console.error('Failed to load periods:', error)
    }
  }

  const loadDebts = async () => {
    try {
      const response = await debtAPI.getAll()
      setDebts(response.data)
    } catch (error) {
      console.error('Failed to load debts:', error)
    }
  }

  const loadArchivedDebts = async () => {
    try {
      const response = await debtAPI.getAll({ archived: true })
      setArchivedDebts(response.data)
    } catch (error) {
      console.error('Failed to load archived debts:', error)
    }
  }

  const loadCreditCardDebt = async () => {
    try {
      if (!currentPeriod) return

      // Get all periods up to and including current period (same as Dashboard)
      const allPeriodsRes = await budgetPeriodAPI.getAll()
      const periodsToInclude = allPeriodsRes.data.filter(period => {
        const periodStart = new Date(period.start_date)
        const currentStart = new Date(currentPeriod.start_date)
        return periodStart <= currentStart
      })

      let cumulativeCredit = 0

      // Calculate credit balance from all periods chronologically (matches Dashboard logic)
      for (const period of periodsToInclude) {
        const expensesRes = await expenseAPI.getAll({ budget_period_id: period.id })
        const periodExpenses = expensesRes.data

        periodExpenses.forEach(expense => {
          const amount = expense.amount / 100

          if (expense.category === 'Debt Payments' && expense.subcategory === 'Credit Card' && expense.payment_method === 'Debit card') {
            cumulativeCredit -= amount // Payment reduces credit card debt
          } else if (expense.payment_method === 'Credit card') {
            cumulativeCredit += amount // Credit card purchase increases debt
          }
        })
      }

      const currentBalance = Math.round(cumulativeCredit * 100) // Convert to cents
      const monthlyPayment = currentBalance > 0 ? Math.round(currentBalance * 0.5) : 0 // 50% of current balance if positive

      // Show credit card debt if there's any balance remaining (even if monthly payment is 0)
      if (currentBalance > 0) {
        setCreditCardDebt({
          id: 'credit-card',
          name: 'Credit Card',
          original_amount: creditLimit * 100, // Convert to cents
          current_balance: currentBalance,
          monthly_payment: monthlyPayment,
          isVirtual: true // Flag to prevent editing/deleting
        })
      } else {
        setCreditCardDebt(null) // No debt to show if balance is zero or negative (fully paid off)
      }
    } catch (error) {
      console.error('Failed to load credit card debt:', error)
    }
  }

  const handleAddDebt = async (debtData) => {
    try {
      await debtAPI.create(debtData)
      loadDebts()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add debt:', error)
      throw error
    }
  }

  const handleEditDebt = async (id, debtData) => {
    try {
      await debtAPI.update(id, debtData)
      loadDebts()
      setShowEditModal(false)
      setSelectedDebt(null)
    } catch (error) {
      console.error('Failed to update debt:', error)
      throw error
    }
  }

  const handleDeleteDebt = async (id) => {
    setDeleteConfirm(id)
  }

  const confirmDeleteDebt = async () => {
    const id = deleteConfirm
    setDeleteConfirm(null)

    try {
      await debtAPI.delete(id)
      loadDebts()
    } catch (error) {
      console.error('Failed to delete debt:', error)
    }
  }

  const toggleDebtExpansion = async (debtId, debtName) => {
    if (expandedDebtId === debtId) {
      setExpandedDebtId(null)
    } else {
      setExpandedDebtId(debtId)
      // Load transactions for this debt if not already loaded
      if (!debtTransactions[debtId]) {
        await loadDebtTransactions(debtId, debtName)
      }
    }
  }

  const loadDebtTransactions = async (debtId, debtName) => {
    try {
      // Get all expenses that are payments for this debt
      const allPeriodsRes = await budgetPeriodAPI.getAll()
      let allPayments = []

      for (const period of allPeriodsRes.data) {
        const expensesRes = await expenseAPI.getAll({ budget_period_id: period.id })
        const payments = expensesRes.data.filter(e =>
          e.category === 'Debt Payments' && e.subcategory === debtName
        )
        allPayments = [...allPayments, ...payments]
      }

      // Sort by date (newest first)
      allPayments.sort((a, b) => new Date(b.date) - new Date(a.date))

      setDebtTransactions(prev => ({
        ...prev,
        [debtId]: allPayments
      }))
    } catch (error) {
      console.error('Failed to load debt transactions:', error)
    }
  }

  const calculatePayoffMonths = (balance, monthlyPayment) => {
    if (monthlyPayment <= 0) return null
    return Math.ceil(balance / monthlyPayment)
  }

  const getAllDebts = () => {
    const allDebts = [...debts]
    if (creditCardDebt && creditCardDebt.current_balance > 0) {
      allDebts.unshift(creditCardDebt) // Add credit card at the beginning
    }
    return allDebts
  }

  const getTotalDebt = () => {
    const allDebts = getAllDebts()
    return allDebts.reduce((sum, debt) => sum + (debt.current_balance / 100), 0)
  }

  const getTotalMonthlyPayment = () => {
    const allDebts = getAllDebts()
    return allDebts.reduce((sum, debt) => sum + (debt.monthly_payment / 100), 0)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    setIsAuthenticated(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="flex justify-between items-center md:hidden">
            <div>
              <h1 className="text-2xl font-bold text-bloom-pink">Debts</h1>
              <p className="text-xs text-gray-600">Track payoff progress</p>
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
              <h1 className="text-3xl font-bold text-bloom-pink">Bloom - Debt Tracker</h1>
              <p className="text-sm text-gray-600">Manage your debts and track payoff progress</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-gray-600 hover:text-bloom-pink transition">
                ← Back to Dashboard
              </a>
              <a
                href="/recurring-expenses"
                className="px-4 py-2 text-gray-600 hover:text-bloom-pink transition font-semibold"
              >
                Recurring
              </a>
              <div className="relative user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-bloom-pink hover:bg-opacity-80 transition flex items-center justify-center text-white font-semibold"
                  title="User menu"
                >
                  {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-xs text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-800">{localStorage.getItem('user_email')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowExportModal(true)
                        setExportMode('export')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
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
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Data
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 border-t border-gray-200 mt-2 pt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
                <a
                  href="/dashboard"
                  className="block px-4 py-3 text-gray-700 hover:bg-bloom-pink/10 hover:text-bloom-pink transition rounded-lg font-semibold"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🏠 Dashboard
                </a>
                <a
                  href="/recurring-expenses"
                  className="block px-4 py-3 text-gray-700 hover:bg-bloom-pink/10 hover:text-bloom-pink transition rounded-lg font-semibold"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🔄 Recurring Expenses
                </a>

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-semibold mb-1">Total Debt</p>
                <h2 className="text-4xl font-bold text-gray-800">
                  €{getTotalDebt().toFixed(2)}
                </h2>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Across {getAllDebts().length} {getAllDebts().length === 1 ? 'debt' : 'debts'}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-semibold mb-1">Monthly Payments</p>
                <h2 className="text-4xl font-bold text-gray-800">
                  €{getTotalMonthlyPayment().toFixed(2)}
                </h2>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Debts List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Debts</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-bloom-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Debt
            </button>
          </div>

          {getAllDebts().length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No debts tracked</h3>
              <p className="text-gray-600 mb-4">Add your debts to track payoff progress</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-bloom-pink text-white px-6 py-2 rounded-lg hover:bg-bloom-pink/90 transition"
              >
                Add Your First Debt
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {getAllDebts().map(debt => {
                const balance = debt.current_balance / 100
                const original = debt.original_amount / 100
                const monthly = debt.monthly_payment / 100
                const progress = ((original - balance) / original) * 100
                const monthsLeft = calculatePayoffMonths(balance, monthly)

                return (
                  <div key={debt.id} className={`border rounded-lg p-6 hover:shadow-md transition ${debt.isVirtual ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{debt.name}</h3>
                          {debt.isVirtual && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">Auto-calculated</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Current Balance</p>
                            <p className="font-semibold text-gray-800">€{balance.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">{debt.isVirtual ? 'Credit Limit' : 'Original Amount'}</p>
                            <p className="font-semibold text-gray-800">€{original.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Payment</p>
                            {monthly > 0 ? (
                              <>
                                <p className="font-semibold text-gray-800">€{monthly.toFixed(2)}</p>
                                {debt.isVirtual && <p className="text-xs text-gray-500 mt-1">50% of balance</p>}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-green-600">€0 this period</p>
                                {debt.isVirtual && <p className="text-xs text-gray-500 mt-1">Already paid 50%</p>}
                              </>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500">Payoff Time</p>
                            <p className="font-semibold text-gray-800">
                              {monthsLeft ? `${monthsLeft} ${monthsLeft === 1 ? 'month' : 'months'}` : 'Set payment'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!debt.isVirtual && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedDebt(debt)
                              setShowEditModal(true)
                            }}
                            className="text-blue-500 hover:text-blue-700 transition"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress: {progress.toFixed(1)}% paid off</span>
                        <span>€{(original - balance).toFixed(2)} / €{original.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-bloom-mint rounded-full h-3 transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => toggleDebtExpansion(debt.id, debt.name)}
                        className="flex items-center gap-2 text-bloom-pink hover:text-bloom-pink/80 transition font-semibold"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${expandedDebtId === debt.id ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {expandedDebtId === debt.id ? 'Hide' : 'View'} Payment History
                      </button>
                    </div>

                    {/* Transactions List (Expanded) */}
                    {expandedDebtId === debt.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3">Payment History</h4>
                        {debtTransactions[debt.id] && debtTransactions[debt.id].length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {debtTransactions[debt.id].map(transaction => (
                              <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{transaction.name}</p>
                                  <p className="text-sm text-gray-500">{transaction.date}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-green-600">-€{(transaction.amount / 100).toFixed(2)}</p>
                                  <p className="text-xs text-gray-500">{transaction.payment_method}</p>
                                </div>
                              </div>
                            ))}
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <div className="flex justify-between items-center font-bold text-gray-800">
                                <span>Total Paid:</span>
                                <span className="text-green-600">
                                  -€{debtTransactions[debt.id].reduce((sum, t) => sum + (t.amount / 100), 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Archived Debts Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Archived Debts</h2>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-bloom-pink hover:text-bloom-pink/80 transition flex items-center gap-2"
            >
              <svg
                className={`w-5 h-5 transition-transform ${showArchived ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedDebts.length})
            </button>
          </div>

          {showArchived && (
            archivedDebts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>No archived debts yet</p>
                <p className="text-sm mt-1">Debts are automatically archived when fully paid</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedDebts.map(debt => {
                  const original = debt.original_amount / 100
                  const isExpanded = expandedDebtId === debt.id
                  const transactions = debtTransactions[debt.id] || []

                  return (
                    <div key={debt.id} className="border border-green-300 bg-green-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{debt.name}</h3>
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">Paid Off</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Original Amount</p>
                              <p className="font-semibold text-gray-800">€{original.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Paid On</p>
                              <p className="font-semibold text-gray-800">{new Date(debt.updated_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleDebtExpansion(debt.id, debt.name)}
                            className="text-green-600 hover:text-green-700 transition"
                            title="View payment history"
                          >
                            <svg
                              className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div className="text-green-600">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-green-300">
                          <h4 className="font-semibold text-gray-700 mb-2">Payment History</h4>
                          {transactions.length === 0 ? (
                            <p className="text-gray-500 text-sm">No payment history available</p>
                          ) : (
                            <div className="space-y-2">
                              {transactions.map(transaction => (
                                <div key={transaction.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-green-200">
                                  <div>
                                    <p className="font-medium text-gray-800">{transaction.name}</p>
                                    <p className="text-gray-500 text-xs">{new Date(transaction.date).toLocaleDateString()}</p>
                                  </div>
                                  <p className="font-semibold text-green-700">€{(transaction.amount / 100).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </main>

      {/* Add Debt Modal */}
      {showAddModal && (
        <AddDebtModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDebt}
        />
      )}

      {/* Edit Debt Modal */}
      {showEditModal && selectedDebt && (
        <EditDebtModal
          onClose={() => {
            setShowEditModal(false)
            setSelectedDebt(null)
          }}
          onEdit={handleEditDebt}
          debt={selectedDebt}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Debt?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this debt? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDebt}
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

export default Debts
