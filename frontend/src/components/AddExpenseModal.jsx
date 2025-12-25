/**
 * Bloom - Add Expense Modal
 *
 * Modal dialog for quickly adding expenses with category selection,
 * subcategory, payment method, and amount input.
 */

import { useState, useEffect } from 'react'
import { debtAPI, recurringExpenseAPI, subcategoryAPI, goalAPI } from '../api'
import { logError } from '../utils/logger'
import PropTypes from 'prop-types';
import CurrencySelector from './CurrencySelector'
import { getCurrencySymbol } from '../utils/formatters'

function AddExpenseModal({ onClose, onAdd }) {
  const [name, setName] = useState('Wolt')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Flexible Expenses')
  const [subcategory, setSubcategory] = useState('Food')
  const [paymentMethod, setPaymentMethod] = useState('Debit card')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [frequencyValue, setFrequencyValue] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debts, setDebts] = useState([])
  const [goals, setGoals] = useState([])
  const [subcategoriesData, setSubcategoriesData] = useState({})

  useEffect(() => {
    // Always load fresh data when component mounts (modal opens)
    loadDebts()
    loadGoals()
    loadSubcategories()
  }, []) // Only run on mount since modal is conditionally rendered

  const loadDebts = async () => {
    try {
      const response = await debtAPI.getAll()
      setDebts(response.data)
    } catch (error) {
      logError('loadDebts', error)
    }
  }

  const loadGoals = async () => {
    try {
      const response = await goalAPI.getAll()
      setGoals(response.data.goals || [])
    } catch (error) {
      logError('loadGoals', error)
    }
  }

  const loadSubcategories = async () => {
    try {
      const response = await subcategoryAPI.getAll()
      setSubcategoriesData(response.data.subcategories || {})
    } catch (error) {
      logError('loadSubcategories', error)
      // Fallback to empty object if API fails
      setSubcategoriesData({})
    }
  }

  const categories = [
    'Fixed Expenses',
    'Flexible Expenses',
    'Savings & Investments',
    'Debt Payments'
  ]

  const getSubcategories = () => {
    // Use API data if available, otherwise fallback to hardcoded
    if (subcategoriesData[category]) {
      const subcats = subcategoriesData[category].map(s => typeof s === 'string' ? s : s.name)
      // Add debts to Debt Payments category
      if (category === 'Debt Payments') {
        return [...subcats, ...debts.map(d => d.name)]
      }
      return subcats
    }

    // Fallback to hardcoded subcategories
    const baseSubcategories = {
      'Fixed Expenses': ['Rent', 'Utilities', 'Insurance', 'Subscriptions', 'Other'],
      'Flexible Expenses': ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Health', 'Other'],
      'Savings & Investments': ['Emergency Fund', 'Investments', 'Savings Goals', 'Other'],
      'Debt Payments': ['Credit Card', 'Other', ...debts.map(d => d.name)]
    }
    return baseSubcategories[category] || []
  }

  const subcategories = getSubcategories()

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const handleSubcategoryChange = (value) => {
    setSubcategory(value)

    // If Debt Payments category, autofill the name based on selection
    if (category === 'Debt Payments') {
      if (value === 'Credit Card') {
        setName('Credit Card Payment')
        setAmount('') // Clear amount for manual entry
      } else {
        // For other debts, try to autofill amount from debt data
        const selectedDebt = debts.find(d => d.name === value)
        if (selectedDebt && selectedDebt.monthly_payment) {
          setAmount((selectedDebt.monthly_payment / 100).toFixed(2))
        }
        setName(`${value} Payment`)
      }
    }

    // If Savings & Investments category, autofill name based on goal selection
    if (category === 'Savings & Investments') {
      const selectedGoal = goals.find(g => g.subcategory_name === value)
      if (selectedGoal) {
        setName(`${selectedGoal.name} Contribution`)
      } else if (value === 'Other') {
        setName('Other Contribution')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)

      if (isRecurring) {
        // Create recurring expense template
        const recurringData = {
          name,
          amount: amountInCents,
          category,
          subcategory,
          payment_method: paymentMethod,
          frequency,
          frequency_value: frequency === 'custom' ? frequencyValue : null,
          day_of_month: frequency === 'monthly' ? dayOfMonth : null,
          day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
          start_date: date,
          is_active: true
        }

        await recurringExpenseAPI.create(recurringData)
        onClose()
      } else {
        // Create one-time expense
        await onAdd({
          name,
          amount: amountInCents,
          currency,
          date,
          category,
          subcategory,
          payment_method: paymentMethod
        })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b dark:border-dark-border">
          <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-dark-text dark:hover:text-dark-text-secondary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-950/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-dark-danger px-4 py-2 rounded flex justify-between items-start">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-700 dark:text-dark-danger hover:text-red-900 dark:hover:text-red-400 ml-4 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Amount</label>
            <div className="flex gap-2">
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                compact={true}
                showLabel={false}
                className="w-24 flex-shrink-0"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`0.00`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => {
                const newCategory = e.target.value
                setCategory(newCategory)

                // Get subcategories for the new category
                let newSubcats = []
                if (subcategoriesData[newCategory]) {
                  newSubcats = subcategoriesData[newCategory].map(s => typeof s === 'string' ? s : s.name)
                  if (newCategory === 'Debt Payments') {
                    newSubcats = [...newSubcats, ...debts.map(d => d.name)]
                  }
                } else {
                  // Fallback to hardcoded
                  const fallback = {
                    'Fixed Expenses': ['Rent', 'Utilities', 'Insurance', 'Subscriptions'],
                    'Flexible Expenses': ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Health'],
                    'Savings & Investments': ['Emergency Fund', 'Investments', 'Savings Goals'],
                    'Debt Payments': ['Credit Card', ...debts.map(d => d.name)]
                  }
                  newSubcats = fallback[newCategory] || []
                }

                if (newSubcats.length > 0) {
                  const firstSubcat = newSubcats[0]
                  setSubcategory(firstSubcat)

                  // Auto-fill name for Debt Payments category
                  if (newCategory === 'Debt Payments') {
                    if (firstSubcat === 'Credit Card') {
                      setName('Credit Card Payment')
                      setAmount('') // Clear amount for manual entry
                    } else {
                      // For other debts, try to autofill amount from debt data
                      const selectedDebt = debts.find(d => d.name === firstSubcat)
                      if (selectedDebt && selectedDebt.monthly_payment) {
                        setAmount((selectedDebt.monthly_payment / 100).toFixed(2))
                      }
                      setName(`${firstSubcat} Payment`)
                    }
                  }

                  // Auto-fill name for Savings & Investments category
                  if (newCategory === 'Savings & Investments') {
                    const selectedGoal = goals.find(g => g.subcategory_name === firstSubcat)
                    if (selectedGoal) {
                      setName(`${selectedGoal.name} Contribution`)
                    } else {
                      setName(`${firstSubcat} Contribution`)
                    }
                  }
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Subcategory</label>
            <select
              value={subcategory}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
            >
              {subcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Need a custom subcategory? Create one in Settings → Subcategories
            </p>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
            >
              <option value="Credit card">Credit card</option>
              <option value="Debit card">Debit card</option>
            </select>
          </div>

          {/* Recurring Expense Toggle */}
          <div className="border-t dark:border-dark-border pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 text-bloom-pink dark:text-dark-pink focus:ring-bloom-pink dark:focus:ring-dark-pink rounded"
              />
              <span className="text-gray-700 dark:text-dark-text font-semibold">Make this a recurring expense</span>
            </label>
          </div>

          {/* Recurring Expense Options */}
          {isRecurring && (
            <div className="bg-purple-50 dark:bg-dark-elevated border border-purple-200 dark:border-dark-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-purple-900 dark:text-dark-pink mb-2">Recurrence Schedule</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (Every X days)</option>
                </select>
              </div>

              {(frequency === 'weekly' || frequency === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink text-sm"
                  >
                    {weekDays.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink text-sm"
                  />
                </div>
              )}

              {frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Repeat every X days</label>
                  <input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink text-sm"
                  />
                </div>
              )}

              <p className="text-xs text-purple-700 dark:text-dark-text-secondary mt-2">
                Start date will be: {(() => { const d = new Date(date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()}
              </p>
            </div>
          )}
        </form>

        <div className="border-t dark:border-dark-border p-6 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : isRecurring ? 'Create Template' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

AddExpenseModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func,
};

export default AddExpenseModal
