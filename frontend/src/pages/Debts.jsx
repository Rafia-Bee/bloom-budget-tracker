/**
 * Bloom - Debts Page
 *
 * Manage and track debts with payoff projections.
 * Shows debt list, balances, monthly payments, and estimated payoff dates.
 */

import { useState, useEffect } from 'react'
import { debtAPI, expenseAPI, budgetPeriodAPI, salaryPeriodAPI } from '../api'
import AddDebtModal from '../components/AddDebtModal'
import AddDebtPaymentModal from '../components/AddDebtPaymentModal'
import EditDebtModal from '../components/EditDebtModal'
import ExportImportModal from '../components/ExportImportModal'
import BankImportModal from '../components/BankImportModal'
import ExperimentalFeaturesModal from '../components/ExperimentalFeaturesModal'
import Header from '../components/Header'

function Debts({ setIsAuthenticated }) {
  const [debts, setDebts] = useState([])
  const [archivedDebts, setArchivedDebts] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [creditCardDebt, setCreditCardDebt] = useState(null)
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [expandedDebtId, setExpandedDebtId] = useState(null)
  const [debtTransactions, setDebtTransactions] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const [showBankImportModal, setShowBankImportModal] = useState(false)
  const [showExperimentalModal, setShowExperimentalModal] = useState(false)
  const creditLimit = 1500

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
    loadCurrentPeriod()
    loadDebts()
    loadArchivedDebts()
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

      // Get current salary period for initial credit balance
      const salaryPeriodRes = await salaryPeriodAPI.getCurrent()

      if (!salaryPeriodRes?.data?.salary_period) {
        setCreditCardDebt(null)
        return
      }

      const salaryPeriod = salaryPeriodRes.data.salary_period

      // display_credit_available returns AVAILABLE amount (what you can spend)
      // Debt = limit - available (what you owe)
      const creditAvailable = salaryPeriod.display_credit_available // Already in cents
      const creditLimit = salaryPeriod.credit_limit // Already in cents
      const currentBalance = creditLimit - creditAvailable // Debt (what you owe)
      const monthlyPayment = currentBalance > 0 ? Math.round(currentBalance * 0.5) : 0 // 50% of debt

      if (currentBalance > 0) {
        setCreditCardDebt({
          id: 'credit-card',
          name: 'Credit Card',
          original_amount: creditLimit,
          current_balance: currentBalance, // Debt amount
          monthly_payment: monthlyPayment,
          isVirtual: true
        })
      } else {
        setCreditCardDebt(null)
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
      const expensesRes = await expenseAPI.getAll({
        category: 'Debt Payments',
        subcategory: debtName,
        limit: 1000
      })

      const allPayments = Array.isArray(expensesRes.data)
        ? expensesRes.data
        : (expensesRes.data?.expenses || [])

      // Filter out future payments (scheduled but not yet occurred)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      const realizedPayments = allPayments.filter(payment => {
        const paymentDate = new Date(payment.date_iso || payment.date)
        return paymentDate <= today
      })

      // Sort by date (newest first)
      realizedPayments.sort((a, b) => new Date(b.date) - new Date(a.date))

      setDebtTransactions(prev => ({
        ...prev,
        [debtId]: realizedPayments
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
      {/* Header */}
      <Header
        setIsAuthenticated={setIsAuthenticated}
        onExport={handleExport}
        onImport={handleImport}
        onBankImport={handleBankImport}
        onShowExperimental={() => setShowExperimentalModal(true)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Total Debt</p>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text">
                  €{getTotalDebt().toFixed(2)}
                </h2>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-dark-text-tertiary">
              Across {getAllDebts().length} {getAllDebts().length === 1 ? 'debt' : 'debts'}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Monthly Payments</p>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text">
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
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Your Debts</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-bloom-pink dark:bg-dark-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink-hover transition flex items-center gap-2"
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
              <h3 className="text-xl font-semibold text-gray-800 dark:text-dark-text mb-2">No debts tracked</h3>
              <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Add your debts to track payoff progress</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-bloom-pink dark:bg-dark-pink text-white px-6 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink-hover transition"
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
                  <div key={debt.id} className={`border rounded-lg p-3 sm:p-6 hover:shadow-md transition ${debt.isVirtual ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30' : 'border-gray-200 dark:border-dark-border dark:bg-dark-elevated'}`}>
                    {/* Mobile: Compact vertical layout, Desktop: Horizontal */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start gap-2 mb-2 sm:mb-3">
                          <h3 className="text-base sm:text-xl font-bold text-gray-800 dark:text-dark-text break-words flex-1">{debt.name}</h3>
                          {debt.isVirtual && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap flex-shrink-0">Auto-calculated</span>
                          )}
                        </div>

                        {/* Info Grid - More compact on mobile */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mb-0.5">Debt</p>
                            <p className="font-semibold text-gray-800 dark:text-dark-text text-sm sm:text-base">€{balance.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mb-0.5">{debt.isVirtual ? 'Limit' : 'Original'}</p>
                            <p className="font-semibold text-gray-800 dark:text-dark-text text-sm sm:text-base">€{original.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mb-0.5">Monthly</p>
                            {monthly > 0 ? (
                              <>
                                <p className="font-semibold text-gray-800 dark:text-dark-text text-sm sm:text-base">€{monthly.toFixed(2)}</p>
                                {debt.isVirtual && <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">50% of balance</p>}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-green-600 dark:text-dark-success text-sm sm:text-base">€0 paid</p>
                                {debt.isVirtual && <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">Already paid 50%</p>}
                              </>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mb-0.5">Payoff</p>
                            <p className="font-semibold text-gray-800 dark:text-dark-text text-sm sm:text-base">
                              {monthsLeft ? `${monthsLeft} ${monthsLeft === 1 ? 'mo' : 'mos'}` : 'Set payment'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Action Buttons - Vertical layout with Edit, Delete, Pay */}
                      <div className="flex sm:hidden gap-2 flex-shrink-0 justify-end">
                        {!debt.isVirtual && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDebt(debt)
                                setShowEditModal(true)
                              }}
                              className="p-2.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDebt(debt)
                            setShowPaymentModal(true)
                          }}
                          className="bg-bloom-mint dark:bg-dark-mint/20 text-green-800 dark:text-dark-success px-3 py-2.5 rounded-lg hover:bg-green-200 dark:hover:bg-dark-mint/30 transition font-medium min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5"
                          title="Make Payment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm">Pay</span>
                        </button>
                      </div>

                      {/* Desktop Action Buttons - Original layout: Pay first, then Edit/Delete */}
                      <div className="hidden sm:flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedDebt(debt)
                            setShowPaymentModal(true)
                          }}
                          className="bg-bloom-mint dark:bg-dark-mint/20 text-green-800 dark:text-dark-success px-4 py-2 rounded-lg hover:bg-green-200 dark:hover:bg-dark-mint/30 transition font-medium"
                          title="Make Payment"
                        >
                          Pay
                        </button>
                        {!debt.isVirtual && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                        <span>Progress: {progress.toFixed(1)}% paid off</span>
                        <span>€{(original - balance).toFixed(2)} / €{original.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-3">
                        <div
                          className="bg-bloom-mint rounded-full h-3 transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                      <button
                        onClick={() => toggleDebtExpansion(debt.id, debt.name)}
                        className="flex items-center gap-2 text-bloom-pink dark:text-dark-pink hover:text-bloom-pink/80 dark:hover:text-dark-pink-hover transition font-semibold"
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
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                        <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-3">Payment History</h4>
                        {debtTransactions[debt.id] && debtTransactions[debt.id].length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {debtTransactions[debt.id].map(transaction => (
                              <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800 dark:text-dark-text">{transaction.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">{transaction.date}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-green-600 dark:text-dark-success">€{(transaction.amount / 100).toFixed(2)}</p>
                                  <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">{transaction.payment_method}</p>
                                </div>
                              </div>
                            ))}
                            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-dark-border">
                              <div className="flex justify-between items-center font-bold text-gray-800 dark:text-dark-text">
                                <span>Total Paid:</span>
                                <span className="text-green-600 dark:text-dark-success">
                                  €{debtTransactions[debt.id].reduce((sum, t) => sum + (t.amount / 100), 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-dark-text-tertiary text-center py-4">No payments recorded yet</p>
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
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Archived Debts</h2>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-bloom-pink dark:text-dark-pink hover:text-bloom-pink/80 dark:hover:text-dark-pink-hover transition flex items-center gap-2"
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
                <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div key={debt.id} className="border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-dark-text">{debt.name}</h3>
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">Paid Off</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-dark-text-tertiary">Original Amount</p>
                              <p className="font-semibold text-gray-800 dark:text-dark-text">€{original.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-dark-text-tertiary">Paid On</p>
                              <p className="font-semibold text-gray-800 dark:text-dark-text">{(() => { const d = new Date(debt.updated_at); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()}</p>
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
                        <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                          <h4 className="font-semibold text-gray-700 dark:text-dark-text mb-2">Payment History</h4>
                          {transactions.length === 0 ? (
                            <p className="text-gray-500 dark:text-dark-text-tertiary text-sm">No payment history available</p>
                          ) : (
                            <div className="space-y-2">
                              {transactions.map(transaction => (
                                <div key={transaction.id} className="flex justify-between items-center text-sm bg-white dark:bg-dark-elevated p-2 rounded border border-green-200 dark:border-green-700">
                                  <div>
                                    <p className="font-medium text-gray-800 dark:text-dark-text">{transaction.name}</p>
                                    <p className="text-gray-500 dark:text-dark-text-tertiary text-xs">{(() => { const d = new Date(transaction.date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()}</p>
                                  </div>
                                  <p className="font-semibold text-green-700 dark:text-dark-success">€{(transaction.amount / 100).toFixed(2)}</p>
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
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">Delete Debt?</h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              Are you sure you want to delete this debt? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border transition font-semibold"
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

      {/* Debt Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <AddDebtPaymentModal
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedDebt(null)
          }}
          onAdd={async (paymentData) => {
            try {
              await expenseAPI.create(paymentData)
              loadDebts()
              loadCreditCardDebt()
              setShowPaymentModal(false)
              setSelectedDebt(null)
            } catch (error) {
              console.error('Failed to create debt payment:', error)
              throw error // Re-throw so modal can handle the error
            }
          }}
          preSelectedDebt={selectedDebt.name}
        />
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
            loadDebts();
            loadArchivedDebts();
            if (currentPeriod) loadCreditCardDebt();
          }}
        />
      )}

      {/* Experimental Features Modal */}
      {showExperimentalModal && (
        <ExperimentalFeaturesModal
          onClose={() => setShowExperimentalModal(false)}
        />
      )}
    </div>
  )
}

export default Debts
