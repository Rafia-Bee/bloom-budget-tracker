/**
 * Bloom - Budget Recalculation Modal
 *
 * Prompts user to recalculate their budget when fixed bills change.
 * Shows the impact on weekly budget and allows user to confirm or skip.
 * Only shown when experimental features are enabled.
 */

import { useState } from 'react'
import PropTypes from 'prop-types'
import { salaryPeriodAPI } from '../api'
import { formatCurrency } from '../utils/formatters'
import { logError } from '../utils/logger'

function BudgetRecalculationModal({ budgetImpact, onClose, onRecalculated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRecalculate = async () => {
    setLoading(true)
    setError('')

    try {
      await salaryPeriodAPI.recalculate(budgetImpact.salary_period_id)
      onRecalculated?.()
      onClose()
    } catch (err) {
      logError('handleRecalculate', err)
      setError(err.response?.data?.error || 'Failed to recalculate budget')
    } finally {
      setLoading(false)
    }
  }

  const weeklyDifference = budgetImpact.weekly_budget_difference
  const isIncrease = weeklyDifference > 0
  const differenceText = isIncrease ? 'increase' : 'decrease'
  const differenceColor = isIncrease
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                Budget Update Available
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                Your fixed bills have changed
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex justify-between items-start">
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <p className="text-gray-600 dark:text-dark-text-secondary">
            Your fixed bills total has changed. Would you like to recalculate your weekly budget?
          </p>

          {/* Impact Summary */}
          <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary">Fixed Bills</span>
              <div className="text-right">
                <span className="text-sm text-gray-400 dark:text-dark-text-secondary line-through mr-2">
                  {formatCurrency(budgetImpact.current_fixed_bills_total)}
                </span>
                <span className="font-semibold text-gray-900 dark:text-dark-text">
                  {formatCurrency(budgetImpact.new_fixed_bills_total)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary">Weekly Budget</span>
              <div className="text-right">
                <span className="text-sm text-gray-400 dark:text-dark-text-secondary line-through mr-2">
                  {formatCurrency(budgetImpact.current_weekly_budget)}
                </span>
                <span className="font-semibold text-gray-900 dark:text-dark-text">
                  {formatCurrency(budgetImpact.suggested_weekly_budget)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t dark:border-dark-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                  Weekly {differenceText}
                </span>
                <span className={`font-bold ${differenceColor}`}>
                  {isIncrease ? '+' : ''}{formatCurrency(weeklyDifference)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
            💡 This will update all remaining weeks in your current budget period.
            Past weeks and their spending history will not be affected.
          </p>
        </div>

        {/* Actions */}
        <div className="border-t dark:border-dark-border p-6 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={loading}
              className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Recalculate Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

BudgetRecalculationModal.propTypes = {
  budgetImpact: PropTypes.shape({
    salary_period_id: PropTypes.number.isRequired,
    current_fixed_bills_total: PropTypes.number.isRequired,
    new_fixed_bills_total: PropTypes.number.isRequired,
    fixed_bills_difference: PropTypes.number.isRequired,
    current_weekly_budget: PropTypes.number.isRequired,
    suggested_weekly_budget: PropTypes.number.isRequired,
    weekly_budget_difference: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onRecalculated: PropTypes.func,
}

export default BudgetRecalculationModal
