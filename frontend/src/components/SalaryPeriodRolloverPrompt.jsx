/**
 * Bloom - Salary Period Rollover Prompt
 *
 * Banner that appears when Week 4 of current salary period is ending or has ended.
 * Prompts user to create next salary period with pre-filled balances.
 */

import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { salaryPeriodAPI, expenseAPI, incomeAPI } from '../api'

function SalaryPeriodRolloverPrompt({ onCreateNext, onDismiss }) {
  const [rolloverData, setRolloverData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkRolloverStatus()
  }, [])

  const checkRolloverStatus = async () => {
    try {
      // Get full salary period data (getCurrent doesn't include initial balances)
      const allPeriodsRes = await salaryPeriodAPI.getAll()
      const salary_period = allPeriodsRes.data.find(p => p.is_active)

      if (!salary_period) {
        setError('No active salary period found')
        setLoading(false)
        return
      }

      const endDate = new Date(salary_period.end_date)
      const startDate = new Date(salary_period.start_date)
      const today = new Date()
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

      // Calculate current balances starting from INITIAL balances
      // Only count transactions WITHIN current salary period
      const [expensesRes, incomeRes] = await Promise.all([
        expenseAPI.getAll({ limit: 10000 }),
        incomeAPI.getAll({ limit: 10000 })
      ])

      const expenses = Array.isArray(expensesRes.data)
        ? expensesRes.data
        : (expensesRes.data?.expenses || [])

      const incomeList = incomeRes.data?.income || []

      // Start from the INITIAL balances of current period
      let periodDebitSpent = 0
      let periodCreditSpent = 0
      let periodIncome = 0

      // Filter transactions to ONLY those within current salary period
      incomeList.forEach(income => {
        const incomeDate = new Date(income.date || income.actual_date)
        // Only count income within current period (excluding Initial Balance)
        if (incomeDate >= startDate && incomeDate <= endDate && income.type !== 'Initial Balance') {
          periodIncome += income.amount
        }
      })

      // Process only expenses within current period
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date)

        // Skip system-generated expenses (dated before period)
        if (expense.name === 'Pre-existing Credit Card Debt') {
          return // This is auto-created BEFORE period, skip it
        }

        // Use date-only comparison to avoid timezone issues
        const expenseDateOnly = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate())
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        // Only include expenses that are:
        // 1. Within the period date range AND
        // 2. Not in the future (date <= today)
        if (expenseDateOnly >= startDateOnly && expenseDateOnly <= endDateOnly && expenseDateOnly <= todayDateOnly) {
          if (expense.category === 'Debt Payments' &&
              expense.subcategory === 'Credit Card' &&
              expense.payment_method === 'Debit card') {
            periodCreditSpent -= expense.amount  // Payment reduces credit debt
            periodDebitSpent += expense.amount   // Payment comes from debit
          } else if (expense.payment_method === 'Debit card') {
            periodDebitSpent += expense.amount
          } else if (expense.payment_method === 'Credit card') {
            periodCreditSpent += expense.amount
          }
        }
      })      // Current balance = initial balance + period income - period expenses
      const currentDebitBalance = salary_period.initial_debit_balance + periodIncome - periodDebitSpent

      // For credit: start from initial available, subtract period spending
      const creditLimit = salary_period.credit_limit
      const currentCreditAvailable = salary_period.initial_credit_balance - periodCreditSpent

      setRolloverData({
        daysRemaining,
        isOverdue: daysRemaining < 0,
        suggestedDebitBalance: currentDebitBalance,
        suggestedCreditBalance: currentCreditAvailable,
        creditLimit: creditLimit,
        creditAllowance: salary_period.credit_budget_allowance || 0,
        endDate: salary_period.end_date
      })

      setLoading(false)
    } catch (err) {
      console.error('Failed to check rollover status:', err)
      setError(err)
      setLoading(false)
    }
  }

  if (loading || error || !rolloverData) {
    return null
  }

  const { daysRemaining, isOverdue, suggestedDebitBalance, suggestedCreditBalance, creditLimit } = rolloverData

  return (
    <div className={`rounded-xl p-6 mb-6 ${isOverdue ? 'bg-red-50 border-2 border-red-300' : 'bg-yellow-50 border-2 border-yellow-300'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-6 h-6 ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`text-lg font-bold ${isOverdue ? 'text-red-800' : 'text-yellow-800'}`}>
              {isOverdue ? 'Salary Period Ended' : 'Week 4 Ending Soon'}
            </h3>
          </div>

          <p className={`text-sm mb-3 ${isOverdue ? 'text-red-700' : 'text-yellow-700'}`}>
            {isOverdue
              ? `Your salary period ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago. Create your next period to continue budgeting.`
              : `Your salary period ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Set up your next period now for seamless transition.`
            }
          </p>

          <div className={`text-sm mb-4 ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
            <p className="font-semibold mb-1">Calculated balances for next period:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Debit: €{(suggestedDebitBalance / 100).toFixed(2)}</li>
              <li>Credit Available: €{(suggestedCreditBalance / 100).toFixed(2)} / €{(creditLimit / 100).toFixed(2)}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onCreateNext(rolloverData)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                isOverdue
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              Create Next Period
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Remind Me Later
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

SalaryPeriodRolloverPrompt.propTypes = {
  onCreateNext: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired
}

export default SalaryPeriodRolloverPrompt
