/**
 * Bloom - Edit Goal Modal Component
 *
 * Modal for editing existing savings goals.
 */

import { useState, useEffect } from 'react'
import { logError } from '../utils/logger'
import { useCurrency } from '../contexts/CurrencyContext'
import { getCurrencySymbol, formatCurrency } from '../utils/formatters'

function EditGoalModal({ goal, onClose, onUpdate }) {
  const { defaultCurrency } = useCurrency()
  const currencySymbol = getCurrencySymbol(defaultCurrency)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    initial_amount: '',
    target_date: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        description: goal.description || '',
        target_amount: goal.target_amount ? (goal.target_amount / 100).toFixed(2) : '',
        initial_amount: goal.initial_amount ? (goal.initial_amount / 100).toFixed(2) : '',
        target_date: goal.target_date || ''
      })
    }
  }, [goal])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Goal name must be 50 characters or less'
    }

    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = 'Target amount must be greater than 0'
    } else if (parseFloat(formData.target_amount) > 1000000) {
      newErrors.target_amount = 'Target amount must be less than 1,000,000'
    }

    if (formData.target_date) {
      const targetDate = new Date(formData.target_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (targetDate <= today) {
        newErrors.target_date = 'Target date must be in the future'
      }
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less'
    }

    // Validate initial amount if provided
    if (formData.initial_amount) {
      const initialAmt = parseFloat(formData.initial_amount)
      if (initialAmt < 0) {
        newErrors.initial_amount = 'Initial amount cannot be negative'
      } else if (formData.target_amount && initialAmt > parseFloat(formData.target_amount)) {
        newErrors.initial_amount = 'Initial amount cannot exceed target amount'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const goalData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        target_amount: Math.round(parseFloat(formData.target_amount) * 100), // Convert to cents
        initial_amount: formData.initial_amount
          ? Math.round(parseFloat(formData.initial_amount) * 100)
          : 0, // Convert to cents
        target_date: formData.target_date || null
      }

      await onUpdate(goalData)
    } catch (error) {
      logError('updateGoal', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrencyInput = (value) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '')

    // Ensure only one decimal point
    const parts = numericValue.split('.')
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('')
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2)
    }

    return numericValue
  }

  const handleAmountChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value)
    setFormData(prev => ({
      ...prev,
      target_amount: formatted
    }))

    if (errors.target_amount) {
      setErrors(prev => ({
        ...prev,
        target_amount: ''
      }))
    }
  }

  const handleInitialAmountChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value)
    setFormData(prev => ({
      ...prev,
      initial_amount: formatted
    }))

    if (errors.initial_amount) {
      setErrors(prev => ({
        ...prev,
        initial_amount: ''
      }))
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    today.setDate(today.getDate() + 1) // Tomorrow as minimum date
    return today.toISOString().split('T')[0]
  }

  // Format currency using centralized utility
  const fc = (cents) => formatCurrency(cents, defaultCurrency)

  if (!goal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Goal
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Progress Display */}
          <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Progress</h3>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{fc(goal.progress?.current_amount || 0)} saved</span>
              <span>{(goal.progress?.percentage || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 bg-bloom-pink rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, goal.progress?.percentage || 0)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Subcategory: {goal.subcategory_name}</span>
              <span>{goal.progress?.contribution_count || 0} contributions</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:bg-dark-surface dark:border-dark-border dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                maxLength={50}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.name.length}/50 characters
              </div>
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Amount ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                <input
                  type="text"
                  name="target_amount"
                  value={formData.target_amount}
                  onChange={handleAmountChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:bg-dark-surface dark:border-dark-border dark:text-white ${
                    errors.target_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1000.00"
                />
              </div>
              {errors.target_amount && (
                <p className="text-red-500 text-sm mt-1">{errors.target_amount}</p>
              )}
            </div>

            {/* Initial Amount (Pre-existing savings) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Already Saved ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                <input
                  type="text"
                  name="initial_amount"
                  value={formData.initial_amount}
                  onChange={handleInitialAmountChange}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:bg-dark-surface dark:border-dark-border dark:text-white ${
                    errors.initial_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.initial_amount && (
                <p className="text-red-500 text-sm mt-1">{errors.initial_amount}</p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Adjust the pre-existing amount you had saved before tracking
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Date (Optional)
              </label>
              <input
                type="date"
                name="target_date"
                value={formData.target_date}
                onChange={handleInputChange}
                min={getTodayDate()}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:bg-dark-surface dark:border-dark-border dark:text-white ${
                  errors.target_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.target_date && (
                <p className="text-red-500 text-sm mt-1">{errors.target_date}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:bg-dark-surface dark:border-dark-border dark:text-white resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="What are you saving for?"
                maxLength={200}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.description.length}/200 characters
              </div>
            </div>

            {/* Warning for target amount reduction */}
            {goal.progress?.current_amount > 0 &&
             parseFloat(formData.target_amount) * 100 < goal.progress.current_amount && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="text-orange-600 dark:text-orange-400 mt-0.5">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-orange-700 dark:text-orange-300 text-sm">
                      <strong>Warning:</strong> Setting the target below your current savings
                      ({formatCurrency(goal.progress.current_amount)}) will mark this goal as completed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-surface rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-bloom-pink hover:bg-bloom-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Goal'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditGoalModal