/**
 * Bloom - Dashboard Page
 *
 * Main dashboard displaying debit and credit card balances with expense tracking.
 * Shows balance cards, expense list with filters, and floating action button for adding expenses.
 */

import { useState, useEffect } from 'react'
import { expenseAPI, incomeAPI, budgetPeriodAPI } from '../api'
import AddExpenseModal from '../components/AddExpenseModal'
import AddIncomeModal from '../components/AddIncomeModal'
import AddDebtPaymentModal from '../components/AddDebtPaymentModal'
import EditExpenseModal from '../components/EditExpenseModal'
import EditIncomeModal from '../components/EditIncomeModal'
import PeriodSelector from '../components/PeriodSelector'
import CreatePeriodModal from '../components/CreatePeriodModal'
import EditPeriodModal from '../components/EditPeriodModal'
import SalaryPeriodWizard from '../components/SalaryPeriodWizard'
import WeeklyBudgetCard from '../components/WeeklyBudgetCard'
import LeftoverBudgetModal from '../components/LeftoverBudgetModal'

function Dashboard({ setIsAuthenticated }) {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'income', 'expense', 'debit', 'credit'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [modalType, setModalType] = useState(null) // 'expense' or 'income'
  const [editType, setEditType] = useState(null) // 'expense' or 'income'
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [allPeriods, setAllPeriods] = useState([])
  const [showCreatePeriod, setShowCreatePeriod] = useState(false)
  const [showEditPeriod, setShowEditPeriod] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [debitBalance, setDebitBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [currentPeriodDebitSpent, setCurrentPeriodDebitSpent] = useState(0)
  const [currentPeriodCreditSpent, setCurrentPeriodCreditSpent] = useState(0)
  const [currentPeriodIncome, setCurrentPeriodIncome] = useState(0)
  const [warningModal, setWarningModal] = useState(null)
  const [showSalaryWizard, setShowSalaryWizard] = useState(false)
  const [showLeftoverModal, setShowLeftoverModal] = useState(false)
  const [leftoverModalData, setLeftoverModalData] = useState(null)
  const creditLimit = 1500

  useEffect(() => {
    loadPeriods()
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
      loadTransactionsAndBalances()
    }
  }, [currentPeriod])

  const loadTransactionsAndBalances = async () => {
    if (!currentPeriod) return
    try {
      // Load current period transactions
      const [expensesRes, incomeRes] = await Promise.all([
        expenseAPI.getAll({ budget_period_id: currentPeriod.id }),
        incomeAPI.getAll({ budget_period_id: currentPeriod.id })
      ])

      setExpenses(expensesRes.data)
      setIncome(incomeRes.data)

      // Calculate cumulative balances from all periods
      await calculateCumulativeBalances()
    } catch (error) {
      console.error('Failed to load transactions and balances:', error)
    }
  }

  const loadExpenses = async () => {
    if (!currentPeriod) return
    try {
      const currentResponse = await expenseAPI.getAll({ budget_period_id: currentPeriod.id })
      setExpenses(currentResponse.data)
      await calculateCumulativeBalances()
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  const loadIncome = async () => {
    if (!currentPeriod) return
    try {
      const response = await incomeAPI.getAll({ budget_period_id: currentPeriod.id })
      setIncome(response.data)
      await calculateCumulativeBalances()
    } catch (error) {
      console.error('Failed to load income:', error)
    }
  }

  useEffect(() => {
    // Combine and sort transactions whenever expenses or income change
    const combined = [
      ...expenses.map(e => ({ ...e, transactionType: 'expense' })),
      ...income.map(i => ({ ...i, transactionType: 'income' }))
    ]
    // Sort by date (most recent first)
    combined.sort((a, b) => new Date(b.date) - new Date(a.date))
    setTransactions(combined)
  }, [expenses, income])

  const loadPeriods = async () => {
    try {
      const [allPeriodsRes, activeRes] = await Promise.all([
        budgetPeriodAPI.getAll(),
        budgetPeriodAPI.getActive().catch(() => null)
      ])

      setAllPeriods(allPeriodsRes.data)

      if (activeRes?.data) {
        setCurrentPeriod(activeRes.data)
      } else if (allPeriodsRes.data.length > 0) {
        // If no active period, use the most recent one
        setCurrentPeriod(allPeriodsRes.data[0])
      }
    } catch (error) {
      // Suppress 401 errors - the API interceptor handles auth redirects
      if (error.response?.status !== 401) {
        console.error('Failed to load periods:', error)
      }
    }
  }

  const calculateCumulativeBalances = async () => {
    if (!currentPeriod) return

    try {
      // Get all periods up to and including current period
      const periodsToInclude = allPeriods.filter(period => {
        const periodStart = new Date(period.start_date)
        const currentStart = new Date(currentPeriod.start_date)
        return periodStart <= currentStart
      })

      let cumulativeDebit = 0
      let cumulativeCredit = 0
      let cumulativeIncome = 0
      let currentDebit = 0
      let currentCredit = 0
      let currentIncome = 0

      // Calculate balances from all periods chronologically
      for (const period of periodsToInclude) {
        const isCurrentPeriod = period.id === currentPeriod.id

        // Get expenses for this period
        const expensesRes = await expenseAPI.getAll({ budget_period_id: period.id })
        const periodExpenses = expensesRes.data

        periodExpenses.forEach(expense => {
          const amount = expense.amount / 100

          if (expense.category === 'Debt Payments' && expense.subcategory === 'Credit Card' && expense.payment_method === 'Debit card') {
            cumulativeCredit -= amount // Payment reduces credit card debt
            cumulativeDebit += amount  // Payment comes from debit card
            if (isCurrentPeriod) {
              currentCredit -= amount
              currentDebit += amount
            }
          } else if (expense.payment_method === 'Debit card') {
            cumulativeDebit += amount
            if (isCurrentPeriod) currentDebit += amount
          } else if (expense.payment_method === 'Credit card') {
            cumulativeCredit += amount
            if (isCurrentPeriod) currentCredit += amount
          }
        })

        // Get income for this period
        const incomeRes = await incomeAPI.getAll({ budget_period_id: period.id })
        const periodIncome = incomeRes.data
        const periodIncomeTotal = periodIncome.reduce((sum, inc) => sum + (inc.amount / 100), 0)
        cumulativeIncome += periodIncomeTotal
        if (isCurrentPeriod) currentIncome = periodIncomeTotal
      }

      setDebitBalance(cumulativeDebit)
      setCreditBalance(cumulativeCredit)
      setTotalIncome(cumulativeIncome)
      setCurrentPeriodDebitSpent(currentDebit)
      setCurrentPeriodCreditSpent(currentCredit)
      setCurrentPeriodIncome(currentIncome)
    } catch (error) {
      console.error('Failed to calculate cumulative balances:', error)
    }
  }

  const handleCreatePeriod = async (periodData) => {
    try {
      await budgetPeriodAPI.create(periodData)
      await loadPeriods()
      setShowCreatePeriod(false)
    } catch (error) {
      console.error('Failed to create period:', error)
      throw error
    }
  }

  const handlePeriodChange = (period) => {
    setCurrentPeriod(period)
  }

  const handleEditPeriod = async (id, periodData) => {
    try {
      await budgetPeriodAPI.update(id, periodData)
      await loadPeriods()
      setShowEditPeriod(false)
      setSelectedPeriod(null)
    } catch (error) {
      console.error('Failed to update period:', error)
      throw error
    }
  }

  const handleDeletePeriod = async (id) => {
    try {
      await budgetPeriodAPI.delete(id)

      // Check remaining periods
      const periodsRes = await budgetPeriodAPI.getAll()
      setAllPeriods(periodsRes.data)

      if (periodsRes.data.length === 0) {
        // No periods left - clear everything
        setCurrentPeriod(null)
        setExpenses([])
        setIncome([])
      } else {
        // Still have periods - check for active or use most recent
        const activeRes = await budgetPeriodAPI.getActive().catch(() => null)
        if (activeRes?.data) {
          setCurrentPeriod(activeRes.data)
        } else {
          setCurrentPeriod(periodsRes.data[0])
        }
      }
    } catch (error) {
      console.error('Failed to delete period:', error)
      alert('Failed to delete period. It may contain transactions.')
    }
  }

  const getDebitAvailable = () => {
    // Available = Net balance (total income - total expenses)
    return totalIncome - debitBalance
  }

  const getCreditAvailable = () => {
    // Available credit = limit - current balance
    return creditLimit - creditBalance
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    setIsAuthenticated(false)
  }

  const handleAddExpense = async (expenseData) => {
    const expenseAmount = expenseData.amount / 100 // Convert cents to euros
    const paymentMethod = expenseData.payment_method

    // Check if this would exceed available balance
    if (paymentMethod === 'Debit card') {
      const available = getDebitAvailable()
      if (expenseAmount > available) {
        return new Promise((resolve, reject) => {
          setWarningModal({
            type: 'debit',
            expenseData,
            available,
            expenseAmount,
            resolve,
            reject
          })
        })
      }
    } else if (paymentMethod === 'Credit card') {
      const available = getCreditAvailable()
      if (expenseAmount > available) {
        return new Promise((resolve, reject) => {
          setWarningModal({
            type: 'credit',
            expenseData,
            available,
            expenseAmount,
            resolve,
            reject
          })
        })
      }
    }

    try {
      await expenseAPI.create({
        ...expenseData,
        budget_period_id: currentPeriod.id
      })
      loadExpenses()
      setShowAddModal(false)
      setModalType(null)
    } catch (error) {
      console.error('Failed to add expense:', error)
      throw error
    }
  }

  const handleAddIncome = async (incomeData) => {
    try {
      await incomeAPI.create({
        ...incomeData,
        budget_period_id: currentPeriod.id
      })
      setShowAddModal(false)
      setModalType(null)
      loadIncome() // Reload income list
    } catch (error) {
      console.error('Failed to add income:', error)
      throw error
    }
  }

  const handleDeleteIncome = async (id) => {
    try {
      await incomeAPI.delete(id)
      loadIncome()
    } catch (error) {
      console.error('Failed to delete income:', error)
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      await expenseAPI.delete(id)
      loadExpenses()
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  const handleEditExpense = async (id, expenseData) => {
    try {
      await expenseAPI.update(id, expenseData)
      loadExpenses()
      setShowEditModal(false)
      setEditType(null)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Failed to update expense:', error)
      throw error
    }
  }

  const handleEditIncome = async (id, incomeData) => {
    try {
      await incomeAPI.update(id, incomeData)
      loadIncome()
      setShowEditModal(false)
      setEditType(null)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Failed to update income:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="flex justify-between items-center md:hidden">
            <div>
              <h1 className="text-2xl font-bold text-bloom-pink">Bloom</h1>
              <p className="text-xs text-gray-600">Financial Habits</p>
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
              <h1 className="text-3xl font-bold text-bloom-pink">Bloom</h1>
              <p className="text-sm text-gray-600">Financial Habits That Grow With You</p>
            </div>
            <div className="flex items-center gap-4">
              <PeriodSelector
                currentPeriod={currentPeriod}
                periods={allPeriods}
                onPeriodChange={handlePeriodChange}
                onCreateNew={() => setShowCreatePeriod(true)}
                onEdit={(period) => {
                  setSelectedPeriod(period)
                  setShowEditPeriod(true)
                }}
                onDelete={handleDeletePeriod}
              />
              <a
                href="/debts"
                className="px-4 py-2 text-gray-600 hover:text-bloom-pink transition font-semibold"
              >
                Debts
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
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
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
                {/* Period Selector - Mobile */}
                <div className="mb-4">
                  <PeriodSelector
                    currentPeriod={currentPeriod}
                    periods={allPeriods}
                    onPeriodChange={handlePeriodChange}
                    onCreateNew={() => {
                      setShowCreatePeriod(true)
                      setShowMobileMenu(false)
                    }}
                    onEdit={(period) => {
                      setSelectedPeriod(period)
                      setShowEditPeriod(true)
                      setShowMobileMenu(false)
                    }}
                    onDelete={handleDeletePeriod}
                  />
                </div>

                {/* Navigation Links */}
                <a
                  href="/debts"
                  className="block px-4 py-3 text-gray-700 hover:bg-bloom-pink/10 hover:text-bloom-pink transition rounded-lg font-semibold"
                  onClick={() => setShowMobileMenu(false)}
                >
                  💳 Debts
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
                      handleLogout()
                      setShowMobileMenu(false)
                    }}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition rounded-lg flex items-center gap-2 font-semibold"
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
      <main className="max-w-7xl mx-auto px-4 py-8">{!currentPeriod ? (
          <div className="text-center py-20">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Budget Period</h2>
            <p className="text-gray-600 mb-6">Create your first budget period to start tracking expenses</p>
            <button
              onClick={() => setShowCreatePeriod(true)}
              className="bg-bloom-pink text-white px-6 py-3 rounded-lg hover:bg-bloom-pink/90 transition font-semibold"
            >
              Create Budget Period
            </button>
          </div>
        ) : (
          <>
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Weekly Budget Card */}
          <WeeklyBudgetCard
            onSetupClick={() => setShowSalaryWizard(true)}
            onAllocateClick={(salaryPeriodId, weekNumber) => {
              setLeftoverModalData({ salaryPeriodId, weekNumber })
              setShowLeftoverModal(true)
            }}
          />

          {/* Debit Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-mint">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-gray-600 font-semibold mb-1">Debit Card</p>
                <p className="text-sm text-gray-500 mb-3">Spent this period</p>
                <h2 className="text-4xl font-bold text-gray-800 mb-1">
                  €{currentPeriodDebitSpent.toFixed(2)}
                </h2>
                <p className="text-2xl font-semibold text-bloom-mint mt-2">
                  €{getDebitAvailable().toFixed(2)} <span className="text-sm text-gray-500 font-normal">available</span>
                </p>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Period income: €{currentPeriodIncome.toFixed(2)}</span>
                <span>Total spent: €{debitBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>All-time income: €{totalIncome.toFixed(2)}</span>
                <span>{totalIncome > 0 ? ((debitBalance / totalIncome) * 100).toFixed(0) : 0}% of total</span>
              </div>
            </div>
          </div>

          {/* Credit Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-pink">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-gray-600 font-semibold mb-1">Credit Card</p>
                <p className="text-sm text-gray-500 mb-3">Spent this period</p>
                <h2 className="text-4xl font-bold text-gray-800 mb-1">
                  €{currentPeriodCreditSpent.toFixed(2)}
                </h2>
                <p className="text-2xl font-semibold text-bloom-mint mt-2">
                  €{getCreditAvailable().toFixed(2)} <span className="text-sm text-gray-500 font-normal">available</span>
                </p>
              </div>
              <div className="bg-bloom-pink rounded-full p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Period spent: €{currentPeriodCreditSpent.toFixed(2)}</span>
                <span>Total balance: €{creditBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Credit limit: €{creditLimit}</span>
                <span>{((creditBalance / creditLimit) * 100).toFixed(0)}% used</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Transactions</h2>
            {/* Filter buttons - scrollable on mobile, flex-wrap on larger screens */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible scrollbar-hide">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'all'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'income'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Income
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'expense'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilter('debit')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'debit'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Debit
              </button>
              <button
                onClick={() => setFilter('credit')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'credit'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Credit
              </button>
            </div>
          </div>

          {transactions.filter(t => {
            if (filter === 'all') return true
            if (filter === 'income') return t.transactionType === 'income'
            if (filter === 'expense') return t.transactionType === 'expense'
            if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
            if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
            return true
          }).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No transactions yet. Start tracking your finances!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.filter(t => {
                if (filter === 'all') return true
                if (filter === 'income') return t.transactionType === 'income'
                if (filter === 'expense') return t.transactionType === 'expense'
                if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
                if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
                return true
              }).map(transaction => {
                const isFuture = new Date(transaction.date) > new Date()
                return (
                  <div
                    key={`${transaction.transactionType}-${transaction.id}`}
                    className={`flex items-center justify-between p-4 rounded-lg hover:opacity-80 transition ${transaction.transactionType === 'income' ? 'bg-bloom-mint/20' : 'bg-gray-50'
                      } ${isFuture ? 'opacity-60 border-2 border-dashed border-gray-300' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${transaction.transactionType === 'income'
                            ? 'bg-bloom-mint'
                            : transaction.payment_method === 'Credit card'
                              ? 'bg-bloom-pink'
                              : 'bg-bloom-mint'
                          }`}></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">
                              {transaction.transactionType === 'income' ? transaction.type : transaction.name}
                            </h3>
                            {isFuture && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Scheduled
                              </span>
                            )}
                            {transaction.transactionType === 'expense' && transaction.recurring_template_id && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Recurring
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {transaction.transactionType === 'expense'
                              ? `${transaction.category} • ${transaction.subcategory}`
                              : 'Income'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold ${transaction.transactionType === 'income' ? 'text-green-700' : 'text-gray-800'
                          }`}>
                          {transaction.transactionType === 'income' ? '+' : ''}€{(transaction.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">{transaction.date}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setEditType(transaction.transactionType)
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
                          onClick={() => transaction.transactionType === 'income'
                            ? handleDeleteIncome(transaction.id)
                            : handleDeleteExpense(transaction.id)
                          }
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>
        )}
      </main>

      {/* Floating Add Button with Menu - Only show if period exists */}
      {currentPeriod && (
        <div className="fixed bottom-8 right-8">
          {showAddMenu && (
            <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl p-2 mb-2 min-w-[150px]">
              <button
                onClick={() => {
                  setModalType('income')
                  setShowAddModal(true)
                  setShowAddMenu(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
              >
                <span className="text-2xl">💰</span>
                <span className="font-semibold text-gray-700">Add Income</span>
              </button>
              <button
                onClick={() => {
                  setModalType('expense')
                  setShowAddModal(true)
                  setShowAddMenu(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
              >
                <span className="text-2xl">💸</span>
                <span className="font-semibold text-gray-700">Add Expense</span>
              </button>
              <button
                onClick={() => {
                  setModalType('debt')
                  setShowAddModal(true)
                  setShowAddMenu(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
              >
                <span className="text-2xl">💳</span>
                <span className="font-semibold text-gray-700">Debt Payment</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="bg-bloom-pink text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 transition-transform hover:scale-110"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Add Modals */}
      {showAddModal && modalType === 'expense' && (
        <AddExpenseModal
          onClose={() => {
            setShowAddModal(false)
            setModalType(null)
          }}
          onAdd={handleAddExpense}
        />
      )}
      {showAddModal && modalType === 'income' && (
        <AddIncomeModal
          onClose={() => {
            setShowAddModal(false)
            setModalType(null)
          }}
          onAdd={handleAddIncome}
        />
      )}
      {showAddModal && modalType === 'debt' && (
        <AddDebtPaymentModal
          onClose={() => {
            setShowAddModal(false)
            setModalType(null)
          }}
          onAdd={handleAddExpense}
        />
      )}

      {/* Edit Modals */}
      {showEditModal && editType === 'expense' && selectedTransaction && (
        <EditExpenseModal
          onClose={() => {
            setShowEditModal(false)
            setEditType(null)
            setSelectedTransaction(null)
          }}
          onEdit={handleEditExpense}
          expense={selectedTransaction}
        />
      )}
      {showEditModal && editType === 'income' && selectedTransaction && (
        <EditIncomeModal
          onClose={() => {
            setShowEditModal(false)
            setEditType(null)
            setSelectedTransaction(null)
          }}
          onEdit={handleEditIncome}
          income={selectedTransaction}
        />
      )}

      {/* Create Period Modal */}
      {showCreatePeriod && (
        <CreatePeriodModal
          onClose={() => setShowCreatePeriod(false)}
          onCreate={handleCreatePeriod}
        />
      )}

      {/* Edit Period Modal */}
      {showEditPeriod && selectedPeriod && (
        <EditPeriodModal
          period={selectedPeriod}
          onClose={() => {
            setShowEditPeriod(false)
            setSelectedPeriod(null)
          }}
          onEdit={handleEditPeriod}
        />
      )}

      {/* Warning Modal for Exceeding Balance/Credit */}
      {warningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {warningModal.type === 'debit' ? 'Insufficient Funds' : 'Credit Limit Exceeded'}
              </h3>
            </div>

            {warningModal.type === 'debit' ? (
              <div className="text-gray-700 mb-6 space-y-2">
                <p>You're trying to spend <strong>€{warningModal.expenseAmount.toFixed(2)}</strong> but only have <strong>€{warningModal.available.toFixed(2)}</strong> available in your debit account.</p>
                <p className="text-red-600 font-semibold">This will result in a negative balance of €{(warningModal.available - warningModal.expenseAmount).toFixed(2)}.</p>
                <p className="text-sm">Do you want to proceed anyway?</p>
              </div>
            ) : (
              <div className="text-gray-700 mb-6 space-y-2">
                <p>You're trying to spend <strong>€{warningModal.expenseAmount.toFixed(2)}</strong> but only have <strong>€{warningModal.available.toFixed(2)}</strong> available credit.</p>
                <p>Your credit limit is €{creditLimit.toFixed(2)} and current balance is €{creditBalance.toFixed(2)}.</p>
                <p className="text-red-600 font-semibold">This will exceed your limit by €{(warningModal.expenseAmount - warningModal.available).toFixed(2)}.</p>
                <p className="text-sm">Do you want to proceed anyway?</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  warningModal.reject(new Error('Transaction cancelled by user'))
                  setWarningModal(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const data = warningModal.expenseData
                  const resolve = warningModal.resolve
                  setWarningModal(null)

                  try {
                    await expenseAPI.create({
                      ...data,
                      budget_period_id: currentPeriod.id
                    })
                    loadExpenses()
                    setShowAddModal(false)
                    setModalType(null)
                    resolve()
                  } catch (error) {
                    console.error('Failed to add expense:', error)
                    throw error
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold"
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
          onClose={() => setShowSalaryWizard(false)}
          onComplete={() => {
            setShowSalaryWizard(false)
            loadPeriods()
          }}
        />
      )}

      {/* Leftover Budget Allocation Modal */}
      {showLeftoverModal && leftoverModalData && (
        <LeftoverBudgetModal
          salaryPeriodId={leftoverModalData.salaryPeriodId}
          weekNumber={leftoverModalData.weekNumber}
          onClose={() => {
            setShowLeftoverModal(false)
            setLeftoverModalData(null)
          }}
          onAllocate={() => {
            setShowLeftoverModal(false)
            setLeftoverModalData(null)
            loadTransactionsAndBalances()
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
