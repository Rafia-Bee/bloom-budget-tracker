/**
 * Bloom - Dashboard Page
 *
 * Main dashboard displaying debit and credit card balances with expense tracking.
 * Shows balance cards, expense list with filters, and floating action button for adding expenses.
 */

import { useState, useEffect, useRef } from 'react'
import { expenseAPI, incomeAPI, budgetPeriodAPI, salaryPeriodAPI, authAPI } from '../api'
import { useFeatureFlag } from '../contexts/FeatureFlagContext'
import AddExpenseModal from '../components/AddExpenseModal'
import AddIncomeModal from '../components/AddIncomeModal'
import AddDebtPaymentModal from '../components/AddDebtPaymentModal'
import EditExpenseModal from '../components/EditExpenseModal'
import EditIncomeModal from '../components/EditIncomeModal'
import PeriodSelector from '../components/PeriodSelector'
import SalaryPeriodWizard from '../components/SalaryPeriodWizard'
import WeeklyBudgetCard from '../components/WeeklyBudgetCard'
import LeftoverBudgetModal from '../components/LeftoverBudgetModal'
import ExportImportModal from '../components/ExportImportModal'
import DraggableFloatingButton from '../components/DraggableFloatingButton'
import BankImportModal from '../components/BankImportModal'
import FilterTransactionsModal from '../components/FilterTransactionsModal'
import SalaryPeriodRolloverPrompt from '../components/SalaryPeriodRolloverPrompt'
import CatLoading from '../components/CatLoading'
import ExperimentalFeaturesModal from '../components/ExperimentalFeaturesModal'
import ThemeToggle from '../components/ThemeToggle'

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
  const [salaryPeriods, setSalaryPeriods] = useState([]) // Salary periods for selector
  const [showRolloverPrompt, setShowRolloverPrompt] = useState(false)
  const [rolloverData, setRolloverData] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [expandedMobileSubmenu, setExpandedMobileSubmenu] = useState(null) // 'import-export' | 'experimental' | null
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const [showBankImportModal, setShowBankImportModal] = useState(false)
  const [debitBalance, setDebitBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [currentPeriodDebitSpent, setCurrentPeriodDebitSpent] = useState(0)
  const [currentPeriodCreditSpent, setCurrentPeriodCreditSpent] = useState(0)
  const [currentPeriodIncome, setCurrentPeriodIncome] = useState(0)
  const [warningModal, setWarningModal] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null) // {type: 'expense'|'income', id, transaction}
  const [selectedTransactions, setSelectedTransactions] = useState([]) // Array of {type, id}
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [showSalaryWizard, setShowSalaryWizard] = useState(false)
  const [editSalaryPeriod, setEditSalaryPeriod] = useState(null) // Period to edit in wizard
  const [showLeftoverModal, setShowLeftoverModal] = useState(false)
  const [leftoverModalData, setLeftoverModalData] = useState(null)
  const [currentWeekPeriod, setCurrentWeekPeriod] = useState(null) // Current week from salary period
  const [creditLimit, setCreditLimit] = useState(null) // Load from salary period
  const [isInitialLoading, setIsInitialLoading] = useState(true) // Prevent flickering on initial load
  const weeklyBudgetCardRef = useRef(null)

  // Feature flags for experimental features
  const { flags, toggleFlag } = useFeatureFlag()

  // Filter and pagination state
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [activeFilters, setActiveFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    subcategory: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    transactionType: 'both'
  })
  const [expensesPage, setExpensesPage] = useState(1)
  const [incomePage, setIncomePage] = useState(1)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false)
  const [hasMoreIncome, setHasMoreIncome] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showExperimentalModal, setShowExperimentalModal] = useState(false)

  useEffect(() => {
    loadPeriodsAndCurrentWeek()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu')) {
        setShowUserMenu(false)
      }
      if (!e.target.closest('.add-menu')) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (currentPeriod) {
      loadIncomeStats()
    }
  }, [currentPeriod])

  useEffect(() => {
    if (currentPeriod) {
      loadTransactionsAndBalances()
    }
  }, [currentPeriod])

  const loadTransactionsAndBalances = async () => {
    if (!currentPeriod) return
    try {
      // Load based on transactionType filter
      const promises = []

      if (activeFilters.transactionType !== 'income') {
        promises.push(loadExpenses())
      } else {
        setExpenses([])
      }

      // Skip income if expense-only filters are active (category, subcategory, payment_method)
      const hasExpenseOnlyFilters = activeFilters.category || activeFilters.subcategory || activeFilters.paymentMethod

      if (activeFilters.transactionType !== 'expense' && !hasExpenseOnlyFilters) {
        promises.push(loadIncome())
      } else {
        setIncome([])
      }

      await Promise.all(promises)
      // calculateCumulativeBalances is called within loadExpenses/loadIncome
    } catch (error) {
      console.error('Failed to load transactions and balances:', error)
    }
  }

  const loadExpenses = async (page = 1, append = false) => {
    if (!currentPeriod) return
    try {
      // Build query params with filters
      const params = {
        page,
        limit: 50
      }

      // Only filter by current period if NO filters are active
      const hasActiveFilters = activeFilters.startDate || activeFilters.endDate ||
        activeFilters.category || activeFilters.subcategory ||
        activeFilters.paymentMethod || activeFilters.minAmount ||
        activeFilters.maxAmount || activeFilters.search

      if (!hasActiveFilters) {
        // Use date range filtering instead of budget_period_id
        params.start_date = currentPeriod.start_date
        params.end_date = currentPeriod.end_date
      }

      // Apply active filters
      if (activeFilters.startDate) params.start_date = activeFilters.startDate
      if (activeFilters.endDate) params.end_date = activeFilters.endDate
      if (activeFilters.category) params.category = activeFilters.category
      if (activeFilters.subcategory) params.subcategory = activeFilters.subcategory
      if (activeFilters.paymentMethod) params.payment_method = activeFilters.paymentMethod
      if (activeFilters.minAmount) params.min_amount = Math.round(parseFloat(activeFilters.minAmount) * 100)
      if (activeFilters.maxAmount) params.max_amount = Math.round(parseFloat(activeFilters.maxAmount) * 100)
      if (activeFilters.search) params.search = activeFilters.search

      const currentResponse = await expenseAPI.getAll(params)

      // Handle both old (array) and new (object with expenses array) response formats
      const expensesData = Array.isArray(currentResponse.data)
        ? currentResponse.data
        : currentResponse.data.expenses || []

      // Handle pagination metadata
      const pagination = currentResponse.data.pagination
      if (pagination) {
        setHasMoreExpenses(pagination.has_more)
      } else {
        setHasMoreExpenses(false)
      }

      if (append) {
        setExpenses(prev => [...prev, ...expensesData])
      } else {
        setExpenses(expensesData)
      }

      // Don't recalculate balances - we use backend-calculated balances from salary period
      // Refresh weekly budget card to update spent amount
      weeklyBudgetCardRef.current?.refresh()
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  const loadIncome = async (page = 1, append = false) => {
    if (!currentPeriod) return
    try {
      // Build query params with filters
      const params = {
        page,
        limit: 50
      }

      // Only filter by current period if NO filters are active
      const hasActiveFilters = activeFilters.startDate || activeFilters.endDate ||
        activeFilters.minAmount || activeFilters.maxAmount || activeFilters.search

      if (!hasActiveFilters) {
        // Use date range filtering instead of budget_period_id
        params.start_date = currentPeriod.start_date
        params.end_date = currentPeriod.end_date
      }

      // Apply active filters
      if (activeFilters.startDate) params.start_date = activeFilters.startDate
      if (activeFilters.endDate) params.end_date = activeFilters.endDate
      if (activeFilters.minAmount) params.min_amount = Math.round(parseFloat(activeFilters.minAmount) * 100)
      if (activeFilters.maxAmount) params.max_amount = Math.round(parseFloat(activeFilters.maxAmount) * 100)
      if (activeFilters.search) params.search = activeFilters.search

      const response = await incomeAPI.getAll(params)

      // Handle both old (array) and new (object with income array) response formats
      const incomeData = Array.isArray(response.data)
        ? response.data
        : response.data.income || []

      // Handle pagination metadata
      const pagination = response.data.pagination
      if (pagination) {
        setHasMoreIncome(pagination.has_more)
      } else {
        setHasMoreIncome(false)
      }

      if (append) {
        setIncome(prev => [...prev, ...incomeData])
      } else {
        setIncome(incomeData)
      }

      // Don't recalculate balances - we use backend-calculated balances from salary period
      // Refresh weekly budget card to update balances
      weeklyBudgetCardRef.current?.refresh()
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

  useEffect(() => {
    // Clear selections and exit selection mode when filter changes
    setSelectedTransactions([])
    setSelectionMode(false)
  }, [filter])

  useEffect(() => {
    // Reload transactions when active filters change
    if (currentPeriod) {
      loadTransactionsAndBalances()
    }
  }, [activeFilters])

  const loadPeriodsAndCurrentWeek = async () => {
    try {
      const [allPeriodsRes, activeRes, salaryPeriodRes, salaryPeriodsListRes] = await Promise.all([
        budgetPeriodAPI.getAll(),
        budgetPeriodAPI.getActive().catch(() => null),
        salaryPeriodAPI.getCurrent().catch(() => null),
        salaryPeriodAPI.getAll().catch(() => ({ data: [] }))
      ])

      setAllPeriods(allPeriodsRes.data)

      // Combine salary periods with standalone budget periods (for historical data access)
      // Filter out budget periods that belong to salary periods (they have salary_period_id)
      const standalonePeriods = allPeriodsRes.data.filter(p => !p.salary_period_id)
      const combinedPeriods = [...(salaryPeriodsListRes.data || []), ...standalonePeriods]
      // Sort by start date descending (most recent first)
      combinedPeriods.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
      setSalaryPeriods(combinedPeriods)

      // Prefer salary period's current week if available
      if (salaryPeriodRes?.data?.current_week?.id) {
        const currentWeek = salaryPeriodRes.data.current_week
        const salaryPeriod = salaryPeriodRes.data.salary_period

        // Load credit limit from salary period
        if (salaryPeriod.credit_limit) {
          setCreditLimit(salaryPeriod.credit_limit / 100) // Convert cents to euros
        }

        // Use display balances from backend (real-time calculated from transactions)
        if (salaryPeriod.display_debit_balance !== undefined) {
          setDebitBalance(salaryPeriod.display_debit_balance / 100) // Convert cents to euros
        }
        if (salaryPeriod.display_credit_balance !== undefined) {
          setCreditBalance(salaryPeriod.display_credit_balance / 100) // Convert cents to euros
        }

        // Set period-level spending by payment method (NEW)
        if (salaryPeriod.period_debit_spent !== undefined) {
          setCurrentPeriodDebitSpent(salaryPeriod.period_debit_spent / 100) // Convert cents to euros
        }
        if (salaryPeriod.period_credit_spent !== undefined) {
          setCurrentPeriodCreditSpent(salaryPeriod.period_credit_spent / 100) // Convert cents to euros
        }

        // Create a budget period object from current week data
        const weekPeriod = {
          id: currentWeek.id, // Use actual budget_period ID from database
          start_date: currentWeek.start_date,
          end_date: currentWeek.end_date,
          period_type: 'weekly',
          week_number: currentWeek.week_number,
          budget_amount: currentWeek.budget_amount
        }
        setCurrentWeekPeriod(weekPeriod)
        // Use current week for both display AND expense tracking
        setCurrentPeriod(weekPeriod)
      } else {
        // Fall back to old system if no salary period
        setCurrentWeekPeriod(null)
        if (activeRes?.data) {
          setCurrentPeriod(activeRes.data)
        } else if (allPeriodsRes.data.length > 0) {
          setCurrentPeriod(allPeriodsRes.data[0])
        }
      }

      // Check if rollover prompt should be shown
      if (salaryPeriodRes?.data?.current_week?.week_number === 4) {
        const periodEndDate = salaryPeriodRes.data.salary_period.end_date
        const dismissedRollover = localStorage.getItem('dismissedRollover')

        let shouldShowPrompt = true

        // Check if there's already a future salary period created (starts after current period ends)
        const currentEndDate = new Date(periodEndDate)
        const futurePeriodExists = salaryPeriodsListRes.data?.some(p => {
          const pStartDate = new Date(p.start_date)
          return pStartDate > currentEndDate
        })

        if (futurePeriodExists) {
          // Already created next period, don't show prompt
          shouldShowPrompt = false
        } else if (dismissedRollover) {
          try {
            const dismissedData = JSON.parse(dismissedRollover)

            // Check if it's the same period
            if (dismissedData.periodEndDate === periodEndDate) {
              // Calculate hours since dismissal
              const hoursSinceDismissal = (Date.now() - new Date(dismissedData.dismissedAt)) / (1000 * 60 * 60)

              // Only keep dismissed if less than 24 hours have passed
              if (hoursSinceDismissal < 24) {
                shouldShowPrompt = false
              }
            }
          } catch (e) {
            // If parsing fails (old format), clear it and show prompt
            localStorage.removeItem('dismissedRollover')
          }
        }

        if (shouldShowPrompt) {
          setShowRolloverPrompt(true)
        }
      }

      // Refresh weekly budget card when periods change
      weeklyBudgetCardRef.current?.refresh()
    } catch (error) {
      // Suppress 401 errors - the API interceptor handles auth redirects
      if (error.response?.status !== 401) {
        console.error('Failed to load periods:', error)
      }
    } finally {
      setIsInitialLoading(false)
    }
  }

  // Keep old loadPeriods method for other callers
  const loadPeriods = loadPeriodsAndCurrentWeek

  const loadIncomeStats = async () => {
    if (!currentPeriod) return

    try {
      const response = await incomeAPI.getStats()
      setTotalIncome(response.data.total_income / 100)  // Convert cents to euros
      setCurrentPeriodIncome(response.data.period_income / 100)  // Convert cents to euros
    } catch (error) {
      console.error('Failed to load income stats:', error)
    }
  }

  const handlePeriodChange = (period) => {
    setCurrentPeriod(period)
  }

  const handleDeletePeriod = async (id) => {
    try {
      // Find the period to determine its type
      const periodToDelete = salaryPeriods.find(p => p.id === id) || allPeriods.find(p => p.id === id)

      if (!periodToDelete) {
        throw new Error('Period not found')
      }

      // Use the appropriate API based on whether it's a salary period (has weekly_budget field)
      if (periodToDelete.weekly_budget !== undefined) {
        // It's a salary period
        await salaryPeriodAPI.delete(id)

        // Reload salary periods
        const salaryPeriodsRes = await salaryPeriodAPI.getAll()
        setSalaryPeriods(salaryPeriodsRes.data)
      } else {
        // It's a budget period
        await budgetPeriodAPI.delete(id)
      }

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
      const errorMessage = error.response?.data?.error || 'Failed to delete period. It may contain transactions.'
      alert(errorMessage)
    }
  }

  const getDebitAvailable = () => {
    // debitBalance from backend is already the available amount (income - expenses)
    return debitBalance
  }

  const getCreditAvailable = () => {
    // creditBalance from backend is the available amount (limit - debt)
    return creditBalance
  }

  const getCreditDebt = () => {
    // Debt = limit - available
    return creditLimit - creditBalance
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout(); // Clear httpOnly cookies on server (#80 security fix)
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('user_email'); // Only email is stored locally now
    setIsAuthenticated(false);
  };

  const handleAddExpense = async (expenseData) => {
    const expenseAmount = expenseData.amount / 100 // Convert cents to euros
    const paymentMethod = expenseData.payment_method

    // Determine which budget period this expense belongs to based on date
    let targetPeriodId = currentPeriod.id // Default to current week

    if (expenseData.date && allPeriods.length > 0) {
      const expenseDate = new Date(expenseData.date)
      const matchingPeriod = allPeriods.find(period => {
        const start = new Date(period.start_date)
        const end = new Date(period.end_date)
        return expenseDate >= start && expenseDate <= end
      })
      if (matchingPeriod) {
        targetPeriodId = matchingPeriod.id
      }
    }

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
        budget_period_id: targetPeriodId
      })
      await loadExpenses()
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
      setShowAddModal(false)
      setModalType(null)
    } catch (error) {
      console.error('Failed to add expense:', error)
      throw error
    }
  }

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters)
    // Reset pagination when filters change
    setExpensesPage(1)
    setIncomePage(1)
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    try {
      const promises = []

      // Load more expenses if there are more and we're showing expenses
      if (hasMoreExpenses && activeFilters.transactionType !== 'income') {
        const nextExpensesPage = expensesPage + 1
        promises.push(loadExpenses(nextExpensesPage, true))
        setExpensesPage(nextExpensesPage)
      }

      // Load more income if there are more and we're showing income
      if (hasMoreIncome && activeFilters.transactionType !== 'expense') {
        const nextIncomePage = incomePage + 1
        promises.push(loadIncome(nextIncomePage, true))
        setIncomePage(nextIncomePage)
      }

      await Promise.all(promises)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAddIncome = async (incomeData) => {
    // Determine which budget period this income belongs to based on date
    let targetPeriodId = currentPeriod.id // Default to current week

    const incomeDate = incomeData.date ? new Date(incomeData.date) :
                       incomeData.actual_date ? new Date(incomeData.actual_date) :
                       incomeData.scheduled_date ? new Date(incomeData.scheduled_date) : null

    if (incomeDate && allPeriods.length > 0) {
      const matchingPeriod = allPeriods.find(period => {
        const start = new Date(period.start_date)
        const end = new Date(period.end_date)
        return incomeDate >= start && incomeDate <= end
      })
      if (matchingPeriod) {
        targetPeriodId = matchingPeriod.id
      }
    }

    try {
      await incomeAPI.create({
        ...incomeData,
        budget_period_id: targetPeriodId
      })
      setShowAddModal(false)
      setModalType(null)
      await loadIncome() // Reload income list
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
      await loadIncomeStats() // Update income stats
    } catch (error) {
      console.error('Failed to add income:', error)
      throw error
    }
  }

  const handleDeleteIncome = async (id) => {
    try {
      await incomeAPI.delete(id)
      await loadIncome()
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
      await loadIncomeStats() // Update income stats
    } catch (error) {
      console.error('Failed to delete income:', error)
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      await expenseAPI.delete(id)
      await loadExpenses()
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  const handleEditExpense = async (id, expenseData) => {
    try {
      await expenseAPI.update(id, expenseData)
      await loadExpenses()
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
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
      await loadIncome()
      await loadPeriodsAndCurrentWeek() // Reload salary period to update card balances
      await loadIncomeStats() // Update income stats
      setShowEditModal(false)
      setEditType(null)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Failed to update income:', error)
      throw error
    }
  }

  const toggleTransactionSelection = (type, id) => {
    const key = `${type}-${id}`
    setSelectedTransactions(prev => {
      const exists = prev.find(t => t.key === key)
      if (exists) {
        return prev.filter(t => t.key !== key)
      } else {
        return [...prev, { type, id, key }]
      }
    })
  }

  const toggleSelectAll = () => {
    const filteredTxns = transactions.filter(t => {
      if (filter === 'all') return true
      if (filter === 'income') return t.transactionType === 'income'
      if (filter === 'expense') return t.transactionType === 'expense'
      if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
      if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
      return true
    })

    if (selectedTransactions.length === filteredTxns.length) {
      // Deselect all
      setSelectedTransactions([])
    } else {
      // Select all filtered
      setSelectedTransactions(filteredTxns.map(t => ({
        type: t.transactionType,
        id: t.id,
        key: `${t.transactionType}-${t.id}`
      })))
    }
  }

  const handleBulkDelete = async () => {
    try {
      // Delete all selected transactions
      await Promise.all(
        selectedTransactions.map(txn => {
          if (txn.type === 'expense') {
            return expenseAPI.delete(txn.id)
          } else {
            return incomeAPI.delete(txn.id)
          }
        })
      )

      // Reload data
      await loadExpenses()
      await loadIncome()

      // Clear selections and exit selection mode
      setSelectedTransactions([])
      setShowBulkDeleteConfirm(false)
      setSelectionMode(false)
    } catch (error) {
      console.error('Failed to delete transactions:', error)
    }
  };

  if (isInitialLoading) {
    return <CatLoading message="Loading your budget..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="flex justify-between items-center md:hidden">
            <div className="max-w-[70%]">
              <h1 className="text-2xl font-bold text-bloom-pink">Bloom</h1>
              <p className="text-[10px] leading-tight text-gray-600 dark:text-dark-text-secondary">Financial Habits That Grow With You</p>
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
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Financial Habits That Grow With You</p>
            </div>
            <div className="flex items-center gap-4">
              <PeriodSelector
                currentPeriod={currentPeriod}
                periods={salaryPeriods}
                onPeriodChange={handlePeriodChange}
                onCreateNew={() => setShowSalaryWizard(true)}
                onEdit={(period) => {
                  // Only allow editing salary periods (has weekly_budget field)
                  if (period.weekly_budget !== undefined) {
                    setEditSalaryPeriod(period)
                    setShowSalaryWizard(true)
                  }
                  // Individual weeks (salary_period_id set) are not editable
                }}
                onDelete={handleDeletePeriod}
              />
              <a
                href="/debts"
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-bloom-pink transition font-semibold"
              >
                Debts
              </a>
              <a
                href="/recurring-expenses"
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-bloom-pink transition font-semibold"
              >
                Recurring
              </a>
              <div className="relative user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-bloom-pink dark:bg-dark-pink hover:bg-opacity-80 transition flex items-center justify-center text-white font-semibold"
                  title="User menu"
                >
                  {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-dark-border py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
                      <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-dark-text">{localStorage.getItem('user_email')}</p>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
                      <ThemeToggle />
                    </div>
                    <button
                      onClick={() => {
                        setShowExportModal(true)
                        setExportMode('export')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
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
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Data
                    </button>
                    <button
                      onClick={() => {
                        setShowBankImportModal(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Import Bank Transactions
                    </button>
                    <button
                      onClick={() => {
                        setShowExperimentalModal(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      ⚗️ Experimental Features
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2 border-t border-gray-200 dark:border-dark-border mt-2 pt-2"
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
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-dark-border pt-4">
              <div className="space-y-3">
                {/* Period Selector - Mobile */}
                <div className="mb-4">
                  <PeriodSelector
                    currentPeriod={currentPeriod}
                    periods={allPeriods}
                    onPeriodChange={handlePeriodChange}
                    onCreateNew={() => {
                      setShowSalaryWizard(true)
                      setShowMobileMenu(false)
                    }}
                    onEdit={(period) => {
                      // Only allow editing salary periods (has weekly_budget field)
                      if (period.weekly_budget !== undefined) {
                        setEditSalaryPeriod(period)
                        setShowSalaryWizard(true)
                      }
                      // Individual weeks (salary_period_id set) are not editable
                      setShowMobileMenu(false)
                    }}
                    onDelete={handleDeletePeriod}
                  />
                </div>

                {/* Navigation Links */}
                <a
                  href="/debts"
                  className="block px-4 py-3 text-gray-700 dark:text-dark-text hover:bg-bloom-pink/10 dark:hover:bg-dark-pink/20 hover:text-bloom-pink dark:hover:text-dark-pink transition rounded-lg font-semibold"
                  onClick={() => setShowMobileMenu(false)}
                >
                  💳 Debts
                </a>
                <a
                  href="/recurring-expenses"
                  className="block px-4 py-3 text-gray-700 dark:text-dark-text hover:bg-bloom-pink/10 dark:hover:bg-dark-pink/20 hover:text-bloom-pink dark:hover:text-dark-pink transition rounded-lg font-semibold"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🔄 Recurring Expenses
                </a>

                {/* User Info & Action Buttons */}
                <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-3">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-dark-text">{localStorage.getItem('user_email')}</p>
                  </div>
                  <div className="px-4 py-2 border-b border-t border-gray-200 dark:border-dark-border">
                    <ThemeToggle />
                  </div>

                  {/* Import/Export Submenu */}
                  <>
                    <button
                      onClick={() =>
                        setExpandedMobileSubmenu(
                          expandedMobileSubmenu === "import-export" ? null : "import-export"
                        )
                      }
                      className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center justify-between group font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>Import/Export</span>
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform duration-150 ${
                          expandedMobileSubmenu === "import-export" ? "rotate-180" : ""
                        }`}
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
                    </button>
                    {expandedMobileSubmenu === "import-export" && (
                      <div className="bg-gray-50 dark:bg-dark-elevated border-l-2 border-bloom-pink dark:border-dark-pink ml-4 my-1 rounded-lg overflow-hidden transition-all duration-150">
                        <button
                          onClick={() => { setShowExportModal(true); setExportMode('export'); setShowMobileMenu(false); setExpandedMobileSubmenu(null); }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Export Financial Data
                        </button>
                        <button
                          onClick={() => { setShowExportModal(true); setExportMode('import'); setShowMobileMenu(false); setExpandedMobileSubmenu(null); }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Import Financial Data
                        </button>
                        <button
                          onClick={() => { setShowBankImportModal(true); setShowMobileMenu(false); setExpandedMobileSubmenu(null); }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          Import Bank Transactions
                        </button>
                      </div>
                    )}
                  </>

                  {/* Experimental Features Toggle */}
                  <>
                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>⚗️</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">Experimental Features</span>
                        </div>
                        <button
                          onClick={() => toggleFlag('experimentalFeaturesEnabled')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            flags.experimentalFeaturesEnabled
                              ? 'bg-bloom-pink dark:bg-dark-pink'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              flags.experimentalFeaturesEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Delete All Data - only show when experimental is ON */}
                    {flags.experimentalFeaturesEnabled && (
                      <button
                        onClick={() => { setShowExperimentalModal(true); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition rounded-lg flex items-center gap-2 font-semibold"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        🗑️ Delete All Data
                      </button>
                    )}
                  </>

                  <button
                    onClick={() => {
                      handleLogout()
                      setShowMobileMenu(false)
                    }}
                    className="w-full text-left px-4 py-3 text-red-600 dark:text-dark-danger hover:bg-red-50 dark:hover:bg-red-950/30 transition rounded-lg flex items-center gap-2 font-semibold"
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
          <>
            {/* Weekly Budget Card - shown even without period to trigger setup */}
            <div className="max-w-md mx-auto mb-8">
              <WeeklyBudgetCard
                ref={weeklyBudgetCardRef}
                onSetupClick={async () => {
                  // Check if there's an active salary period to edit
                  try {
                    const response = await salaryPeriodAPI.getAll()
                    const activePeriod = response.data?.find(p => p.is_active)
                    if (activePeriod) {
                      setEditSalaryPeriod(activePeriod)
                    }
                  } catch (err) {
                    console.error('Failed to check for active period:', err)
                  }
                  setShowSalaryWizard(true)
                }}
                onAllocateClick={(salaryPeriodId, weekNumber) => {
                  setLeftoverModalData({ salaryPeriodId, weekNumber })
                  setShowLeftoverModal(true)
                }}
                onWeekChange={(weekPeriod) => {
                  setCurrentPeriod(weekPeriod)
                }}
              />
            </div>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Budget Period</h2>
              <p className="text-gray-600 mb-4">Click "Set Up Weekly Budget" above to get started</p>
            </div>
          </>
        ) : (
          <>
        {/* Rollover Prompt - Show when Week 4 is ending */}
        {showRolloverPrompt && (
          <SalaryPeriodRolloverPrompt
            onCreateNext={(data) => {
              setRolloverData(data)
              setShowSalaryWizard(true)
              setShowRolloverPrompt(false)
            }}
            onDismiss={() => {
              // Remember dismissal for this period with timestamp (24-hour snooze)
              const currentSalaryPeriod = salaryPeriods.find(p => p.is_active)
              if (currentSalaryPeriod) {
                localStorage.setItem('dismissedRollover', JSON.stringify({
                  periodEndDate: currentSalaryPeriod.end_date,
                  dismissedAt: new Date().toISOString()
                }))
              }
              setShowRolloverPrompt(false)
            }}
          />
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Weekly Budget Card */}
          <WeeklyBudgetCard
            ref={weeklyBudgetCardRef}
            onSetupClick={async () => {
              // Check if there's an active salary period to edit
              try {
                const response = await salaryPeriodAPI.getAll()
                const activePeriod = response.data?.find(p => p.is_active)
                if (activePeriod) {
                  setEditSalaryPeriod(activePeriod)
                }
              } catch (err) {
                console.error('Failed to check for active period:', err)
              }
              setShowSalaryWizard(true)
            }}
            onAllocateClick={(salaryPeriodId, weekNumber) => {
              setLeftoverModalData({ salaryPeriodId, weekNumber })
              setShowLeftoverModal(true)
            }}
            onWeekChange={(weekPeriod) => {
              setCurrentPeriod(weekPeriod)
              loadTransactionsAndBalances()
            }}
          />

          {/* Debit Card */}
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-bloom-mint dark:border-bloom-mint/50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Debit Card</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">Spent this period</p>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text mb-1">
                  €{currentPeriodDebitSpent.toFixed(2)}
                </h2>
                <p className="text-2xl font-semibold text-bloom-mint dark:text-dark-success mt-2">
                  €{getDebitAvailable().toFixed(2)} <span className="text-sm text-gray-500 dark:text-dark-text-tertiary font-normal">available</span>
                </p>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Period income: €{currentPeriodIncome.toFixed(2)}</span>
                <span>Total spent: €{debitBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>All-time income: €{totalIncome.toFixed(2)}</span>
                <span>{totalIncome > 0 ? ((debitBalance / totalIncome) * 100).toFixed(0) : 0}% of total</span>
              </div>
            </div>
          </div>

          {/* Credit Card */}
          {creditLimit !== null && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-bloom-pink dark:border-bloom-pink/50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Credit Card</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">Spent this period</p>
                  <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text mb-1">
                    €{currentPeriodCreditSpent.toFixed(2)}
                  </h2>
                  <p className="text-2xl font-semibold text-bloom-mint dark:text-dark-success mt-2">
                    €{getCreditAvailable().toFixed(2)} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">available</span>
                  </p>
                </div>
                <div className="bg-bloom-pink rounded-full p-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                  <span>Period spent: €{currentPeriodCreditSpent.toFixed(2)}</span>
                  <span>Total balance: €{getCreditDebt().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                  <span>Credit limit: €{creditLimit}</span>
                  <span>{((getCreditDebt() / creditLimit) * 100).toFixed(0)}% used</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Section */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Transactions</h2>

              {/* Selection Mode Controls */}
              <div className="flex items-center gap-2">
                {!selectionMode ? (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition text-sm font-semibold flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Select
                  </button>
                ) : (
                  <>
                    {selectedTransactions.length > 0 && (
                      <>
                        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">{selectedTransactions.length} selected</span>
                        <button
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectionMode(false)
                        setSelectedTransactions([])
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter buttons - scrollable on mobile, flex-wrap on larger screens */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible scrollbar-hide">
              {/* Advanced Filter Button */}
              <button
                onClick={() => setShowFilterModal(true)}
                className="relative px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 bg-bloom-pink text-white hover:bg-pink-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
                {(() => {
                  const activeCount = Object.entries(activeFilters).filter(([key, value]) => {
                    if (key === 'transactionType') return value !== 'both'
                    return value !== ''
                  }).length
                  return activeCount > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeCount}
                    </span>
                  ) : null
                })()}
              </button>

              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'all'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'income'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Income
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'expense'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilter('debit')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'debit'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Debit
              </button>
              <button
                onClick={() => setFilter('credit')}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${filter === 'credit'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Credit
              </button>
            </div>

            {/* Select All Checkbox */}
            {selectionMode && transactions.filter(t => {
              if (filter === 'all') return true
              if (filter === 'income') return t.transactionType === 'income'
              if (filter === 'expense') return t.transactionType === 'expense'
              if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
              if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
              return true
            }).length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedTransactions.length === transactions.filter(t => {
                    if (filter === 'all') return true
                    if (filter === 'income') return t.transactionType === 'income'
                    if (filter === 'expense') return t.transactionType === 'expense'
                    if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
                    if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
                    return true
                  }).length && selectedTransactions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-bloom-pink rounded focus:ring-bloom-pink cursor-pointer"
                />
                <label htmlFor="select-all" className="text-gray-700 dark:text-dark-text-secondary cursor-pointer select-none">
                  Select All
                </label>
              </div>
            )}
          </div>

          {transactions.filter(t => {
            if (filter === 'all') return true
            if (filter === 'income') return t.transactionType === 'income'
            if (filter === 'expense') return t.transactionType === 'expense'
            if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
            if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
            return true
          }).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-dark-text-tertiary">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                const isSelected = selectedTransactions.some(t => t.key === `${transaction.transactionType}-${transaction.id}`)
                return (
                  <div
                    key={`${transaction.transactionType}-${transaction.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg hover:opacity-80 transition ${transaction.transactionType === 'income' ? 'bg-bloom-mint/20 dark:bg-bloom-mint/10' : 'bg-gray-50 dark:bg-dark-elevated'
                      } ${isFuture ? 'opacity-60 border-2 border-dashed border-gray-300 dark:border-gray-600' : ''} ${isSelected ? 'ring-2 ring-bloom-pink' : ''}`}
                  >
                    {/* Top row on mobile: checkbox, title/badges */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTransactionSelection(transaction.transactionType, transaction.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-1 text-bloom-pink rounded focus:ring-bloom-pink cursor-pointer flex-shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-800 dark:text-dark-text">
                            {transaction.transactionType === 'income' ? transaction.type : transaction.name}
                          </h3>
                          {isFuture && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                              Scheduled
                            </span>
                          )}
                          {transaction.transactionType === 'expense' && transaction.recurring_template_id && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.transactionType === 'expense'
                            ? `${transaction.category} • ${transaction.subcategory}`
                            : 'Income'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{transaction.date}</p>
                      </div>
                    </div>

                    {/* Bottom row on mobile: amount + payment method + buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <div className="text-left sm:text-right">
                        <p className={`font-bold ${transaction.transactionType === 'income' ? 'text-green-700 dark:text-dark-success' : 'text-gray-800 dark:text-dark-text'
                          }`}>
                          {transaction.transactionType === 'income' ? '+' : ''}€{(transaction.amount / 100).toFixed(2)}
                        </p>
                        {transaction.transactionType === 'expense' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
                            transaction.payment_method === 'Credit card'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {transaction.payment_method}
                          </span>
                        )}
                      </div>
                      {!selectionMode && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setEditType(transaction.transactionType)
                              setShowEditModal(true)
                            }}
                            className="p-2.5 sm:p-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation({
                              type: transaction.transactionType,
                              id: transaction.id,
                              transaction: transaction
                            })}
                            className="p-2.5 sm:p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Load More
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </main>

      {/* Floating Add Button with Menu - Only show if period exists */}
      {currentPeriod && (
        <DraggableFloatingButton
          showMenu={showAddMenu}
          onToggleMenu={() => setShowAddMenu(!showAddMenu)}
        >
          <button
            onClick={() => {
              setModalType('income')
              setShowAddModal(true)
              setShowAddMenu(false)
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
          >
            <span className="text-2xl">💰</span>
            <span className="font-semibold text-gray-700 dark:text-dark-text">Add Income</span>
          </button>
          <button
            onClick={() => {
              setModalType('expense')
              setShowAddModal(true)
              setShowAddMenu(false)
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
          >
            <span className="text-2xl">💸</span>
            <span className="font-semibold text-gray-700 dark:text-dark-text">Add Expense</span>
          </button>
          <button
            onClick={() => {
              setModalType('debt')
              setShowAddModal(true)
              setShowAddMenu(false)
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition flex items-center gap-3"
          >
            <span className="text-2xl">💳</span>
            <span className="font-semibold text-gray-700 dark:text-dark-text">Debt Payment</span>
          </button>
        </DraggableFloatingButton>
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

      {/* Warning Modal for Exceeding Balance/Credit */}
      {warningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text">
                {warningModal.type === 'debit' ? 'Insufficient Funds' : 'Credit Limit Exceeded'}
              </h3>
            </div>

            {warningModal.type === 'debit' ? (
              <div className="text-gray-700 dark:text-dark-text mb-6 space-y-2">
                <p>You're trying to spend <strong>€{warningModal.expenseAmount.toFixed(2)}</strong> but only have <strong>€{warningModal.available.toFixed(2)}</strong> available in your debit account.</p>
                <p className="text-red-600 dark:text-dark-danger font-semibold">This will result in a negative balance of €{(warningModal.available - warningModal.expenseAmount).toFixed(2)}.</p>
                <p className="text-sm">Do you want to proceed anyway?</p>
              </div>
            ) : (
              <div className="text-gray-700 dark:text-dark-text mb-6 space-y-2">
                <p>You're trying to spend <strong>€{warningModal.expenseAmount.toFixed(2)}</strong> but only have <strong>€{warningModal.available.toFixed(2)}</strong> available credit.</p>
                <p>Your credit limit is €{creditLimit.toFixed(2)} and current balance is €{creditBalance.toFixed(2)}.</p>
                <p className="text-red-600 dark:text-dark-danger font-semibold">This will exceed your limit by €{(warningModal.expenseAmount - warningModal.available).toFixed(2)}.</p>
                <p className="text-sm">Do you want to proceed anyway?</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  warningModal.reject(new Error('Transaction cancelled by user'))
                  setWarningModal(null)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-elevated/80 transition font-semibold"
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
                    await loadExpenses()
                    setShowAddModal(false)
                    setModalType(null)
                    resolve()
                  } catch (error) {
                    console.error('Failed to add expense:', error)
                    throw error
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
      {/* Creates 4-week salary periods with automatic weekly budgets */}
      {showSalaryWizard && (
        <SalaryPeriodWizard
          editPeriod={editSalaryPeriod}
          rolloverData={rolloverData}
          onClose={() => {
            setShowSalaryWizard(false)
            setEditSalaryPeriod(null)
            // Don't clear rolloverData on cancel - keep prompt visible
          }}
          onComplete={async () => {
            setShowSalaryWizard(false)
            setEditSalaryPeriod(null)
            setRolloverData(null)
            // Reload all data
            await loadPeriodsAndCurrentWeek()
            await loadExpenses()
            // Force refresh the weekly budget card
            weeklyBudgetCardRef.current?.refresh()
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
            weeklyBudgetCardRef.current?.refresh()
            loadTransactionsAndBalances()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">Delete Transaction?</h3>
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
                €{(deleteConfirmation.transaction.amount / 100).toFixed(2)}
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
                    handleDeleteIncome(deleteConfirmation.id)
                  } else {
                    handleDeleteExpense(deleteConfirmation.id)
                  }
                  setDeleteConfirmation(null)
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
            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">Delete Multiple Transactions?</h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              Are you sure you want to delete <strong>{selectedTransactions.length}</strong> transaction(s)?
            </p>
            <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-2">Selected transactions:</p>
              {selectedTransactions.map(txn => {
                const transaction = transactions.find(t =>
                  t.transactionType === txn.type && t.id === txn.id
                )
                if (!transaction) return null
                return (
                  <div key={txn.key} className="flex justify-between items-center py-1 text-sm">
                    <span className="text-gray-700 dark:text-dark-text-secondary">
                      {txn.type === 'income' ? transaction.type : transaction.name}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-dark-text">
                      €{(transaction.amount / 100).toFixed(2)}
                    </span>
                  </div>
                )
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
            loadPeriodsAndCurrentWeek()
            loadTransactionsAndBalances()
          }}
        />
      )}

      {/* Bank Import Modal */}
      {showBankImportModal && (
        <BankImportModal
          onClose={() => setShowBankImportModal(false)}
          onImportComplete={() => {
            loadTransactionsAndBalances()
            setShowBankImportModal(false)
          }}
        />
      )}

      {/* Experimental Features Modal */}
      {showExperimentalModal && (
        <ExperimentalFeaturesModal
          onClose={() => setShowExperimentalModal(false)}
        />
      )}

      {/* Filter Transactions Modal */}
      <FilterTransactionsModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </div>
  )
}

export default Dashboard
