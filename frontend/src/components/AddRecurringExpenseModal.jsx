/**
 * Bloom - Add Recurring Expense Modal
 *
 * Modal dialog for creating recurring expense templates with frequency scheduling.
 * Supports weekly, biweekly, monthly, and custom day intervals.
 */

import { useState, useEffect } from 'react'
import { debtAPI } from '../api'

function AddRecurringExpenseModal({ onClose, onAdd, existingExpense = null }) {
  const isEditing = !!existingExpense

  const [name, setName] = useState(existingExpense?.name || 'Netflix')
  const [amount, setAmount] = useState(existingExpense?.amount ? (existingExpense.amount / 100).toFixed(2) : '')
  const [category, setCategory] = useState(existingExpense?.category || 'Fixed Expenses')
  const [subcategory, setSubcategory] = useState(existingExpense?.subcategory || 'Subscriptions')
  const [paymentMethod, setPaymentMethod] = useState(existingExpense?.payment_method || 'Credit card')
  const [frequency, setFrequency] = useState(existingExpense?.frequency || 'monthly')
  const [frequencyValue, setFrequencyValue] = useState(existingExpense?.frequency_value || 30)
  const [dayOfMonth, setDayOfMonth] = useState(existingExpense?.day_of_month || 1)
  const [dayOfWeek, setDayOfWeek] = useState(existingExpense?.day_of_week || 0)
  const [startDate, setStartDate] = useState(
    existingExpense?.start_date || new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(existingExpense?.end_date || '')
  const [notes, setNotes] = useState(existingExpense?.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debts, setDebts] = useState([])

  useEffect(() => {
    loadDebts()
  }, [])

  const loadDebts = async () => {
    try {
      const response = await debtAPI.getAll()
      setDebts(response.data)
    } catch (error) {
      console.error('Failed to load debts:', error)
    }
  }

  const categories = [
    'Fixed Expenses',
    'Flexible Expenses',
    'Savings & Investments',
    'Debt Payments'
  ]

  const getSubcategories = () => {
    const baseSubcategories = {
      'Fixed Expenses': ['Rent', 'Utilities', 'Insurance', 'Subscriptions'],
      'Flexible Expenses': ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Health'],
      'Savings & Investments': ['Emergency Fund', 'Investments', 'Savings Goals'],
      'Debt Payments': ['Credit Card', ...debts.map(d => d.name)]
    }
    return baseSubcategories
  }

  const subcategories = getSubcategories()

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const handleCategoryChange = (value) => {
    setCategory(value)
    // Reset to first subcategory of new category
    const newSubcategories = getSubcategories()[value]
    setSubcategory(newSubcategories[0])
  }

  const handleSubcategoryChange = (value) => {
    setSubcategory(value)

    // If Debt Payments category and a debt is selected, autofill the amount and name
    if (category === 'Debt Payments' && value !== 'Credit Card') {
      const selectedDebt = debts.find(d => d.name === value)
      if (selectedDebt && selectedDebt.monthly_payment) {
        setAmount((selectedDebt.monthly_payment / 100).toFixed(2))
        setName(`${value} Payment`)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)
      const data = {
        name,
        amount: amountInCents,
        category,
        subcategory,
        payment_method: paymentMethod,
        frequency,
        frequency_value: frequency === 'custom' ? frequencyValue : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
        day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
        start_date: startDate,
        end_date: endDate || null,
        notes: notes || null,
        is_active: true
      }

      await onAdd(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recurring expense')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 my-8 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-bloom-pink">
            {isEditing ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                <option value="Credit card">Credit Card</option>
                <option value="Debit card">Debit Card</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                {subcategories[category]?.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recurrence Schedule</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Frequency Type */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (Every X days)</option>
                </select>
              </div>

              {/* Day of Week (for weekly/biweekly) */}
              {(frequency === 'weekly' || frequency === 'biweekly') && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                  >
                    {weekDays.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Due Date (for monthly) */}
              {frequency === 'monthly' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (Day of Month)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value)
                      setDayOfMonth(selectedDate.getDate())
                      setStartDate(e.target.value)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recurring on day {dayOfMonth} of each month
                  </p>
                </div>
              )}

              {/* Custom Day Interval */}
              {frequency === 'custom' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat every X days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                  />
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                  required
                />
              </div>

              {/* End Date (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              placeholder="Add any additional details..."
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/1000 characters</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddRecurringExpenseModal
