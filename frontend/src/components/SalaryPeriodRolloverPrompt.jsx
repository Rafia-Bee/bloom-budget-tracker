/**
 * Bloom - Salary Period Rollover Prompt
 *
 * Banner that appears when Week 4 of current salary period is ending or has ended.
 * Prompts user to create next salary period with pre-filled balances.
 */

import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { salaryPeriodAPI } from '../api'
import { useCurrency } from '../contexts/CurrencyContext'
import { formatCurrency } from '../utils/formatters'

function SalaryPeriodRolloverPrompt({ onCreateNext, onDismiss }) {
  const { defaultCurrency } = useCurrency()
  const fc = (cents) => formatCurrency(cents, defaultCurrency)
  const [rolloverData, setRolloverData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkRolloverStatus()
  }, [])

  const checkRolloverStatus = async () => {
    try {
      // Get current salary period with real-time balances from backend
      const currentRes = await salaryPeriodAPI.getCurrent()
      const salary_period = currentRes.data.salary_period

      if (!salary_period) {
        setError('No active salary period found')
        setLoading(false)
        return
      }

      const endDate = new Date(salary_period.end_date)
      const today = new Date()
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

      // Use backend-calculated real-time balances (already in cents)
      const currentDebitBalance = salary_period.display_debit_balance
      const currentCreditAvailable = salary_period.display_credit_available
      const creditLimit = salary_period.credit_limit

      setRolloverData({
        daysRemaining,
        isOverdue: daysRemaining < 0,
        suggestedDebitBalance: currentDebitBalance,
        suggestedCreditAvailable: currentCreditAvailable,
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

  const { daysRemaining, isOverdue, suggestedDebitBalance, suggestedCreditAvailable, creditLimit } = rolloverData

  return (
    <div className={`rounded-xl p-6 mb-6 ${isOverdue ? 'bg-red-50 border-2 border-red-300 dark:bg-red-900/20 dark:border-red-700' : 'bg-yellow-50 border-2 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-6 h-6 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`text-lg font-bold ${isOverdue ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
              {isOverdue ? 'Salary Period Ended' : 'Week 4 Ending Soon'}
            </h3>
          </div>

          <p className={`text-sm mb-3 ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
            {isOverdue
              ? `Your salary period ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago. Create your next period to continue budgeting.`
              : `Your salary period ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Set up your next period now for seamless transition.`
            }
          </p>

          <div className={`text-sm mb-4 ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'}`}>
            <p className="font-semibold mb-1">Calculated balances for next period:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Debit: {fc(suggestedDebitBalance)}</li>
              <li>Credit Available: {fc(suggestedCreditAvailable)} / {fc(creditLimit)}</li>
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
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition"
            >
              Remind Me Later
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text text-xl"
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
