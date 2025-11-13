/**
 * Bloom - Add Expense Modal
 *
 * Modal dialog for quickly adding expenses with category selection,
 * subcategory, payment method, and amount input.
 */

import { useState } from 'react'

function AddExpenseModal({ onClose, onAdd }) {
  const [name, setName] = useState('Wolt')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Flexible Expenses')
  const [subcategory, setSubcategory] = useState('Food')
  const [paymentMethod, setPaymentMethod] = useState('Credit card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    'Fixed Expenses',
    'Flexible Expenses',
    'Savings & Investments',
    'Debt Payments'
  ]

  const subcategories = {
    'Fixed Expenses': ['Rent', 'Utilities', 'Insurance', 'Subscriptions'],
    'Flexible Expenses': ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Health'],
    'Savings & Investments': ['Emergency Fund', 'Investments', 'Savings Goals'],
    'Debt Payments': ['Credit Card', 'Loan', 'Other']
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)
      await onAdd({
        name,
        amount: amountInCents,
        category,
        subcategory,
        payment_method: paymentMethod
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              onChange={(e) => setSubcategory(e.target.value)}
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-bloom-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddExpenseModal
