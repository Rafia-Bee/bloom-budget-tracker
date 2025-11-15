/**
 * Bloom - Add Expense Modal
 *
 * Modal dialog for quickly adding expenses with category selection,
 * subcategory, payment method, and amount input.
 */

import { useState, useEffect } from 'react'
import { debtAPI, recurringExpenseAPI } from '../api'

function AddExpenseModal({ onClose, onAdd }) {
  const [name, setName] = useState('Wolt')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Flexible Expenses')
  const [subcategory, setSubcategory] = useState('Food')
  const [paymentMethod, setPaymentMethod] = useState('Credit card')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [frequencyValue, setFrequencyValue] = useState(30)
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

        // Optionally show success message
        alert('Recurring expense template created! Use "Generate Now" to create the first instance.')
      } else {
        // Create one-time expense
        await onAdd({
          name,
          amount: amountInCents,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-bloom-pink">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setSubcategory(subcategories[e.target.value][0])
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Subcategory</label>
            <select
              value={subcategory}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
            >
              {subcategories[category].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
            >
              <option value="Credit card">Credit card</option>
              <option value="Debit card">Debit card</option>
            </select>
          </div>

          {/* Recurring Expense Toggle */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 text-bloom-pink focus:ring-bloom-pink rounded"
              />
              <span className="text-gray-700 font-semibold">Make this a recurring expense</span>
            </label>
          </div>

          {/* Recurring Expense Options */}
          {isRecurring && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-purple-900 mb-2">Recurrence Schedule</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (Every X days)</option>
                </select>
              </div>

              {(frequency === 'weekly' || frequency === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink text-sm"
                  >
                    {weekDays.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink text-sm"
                  />
                </div>
              )}

              {frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeat every X days</label>
                  <input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink text-sm"
                  />
                </div>
              )}

              <p className="text-xs text-purple-700 mt-2">
                Start date will be: {new Date(date).toLocaleDateString()}
              </p>
            </div>
          )}
        </form>

        <div className="border-t p-6 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-bloom-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : isRecurring ? 'Create Template' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddExpenseModal
