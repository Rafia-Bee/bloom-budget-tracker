/**
 * Bloom - Add Debt Modal
 *
 * Modal for adding new debts to track.
 */

import { useState } from 'react'

function AddDebtModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [currentBalance, setCurrentBalance] = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const balanceInCents = Math.round(parseFloat(currentBalance) * 100)
      const originalInCents = originalAmount
        ? Math.round(parseFloat(originalAmount) * 100)
        : balanceInCents
      const paymentInCents = monthlyPayment
        ? Math.round(parseFloat(monthlyPayment) * 100)
        : 0

      await onAdd({
        name,
        current_balance: balanceInCents,
        original_amount: originalInCents,
        monthly_payment: paymentInCents
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add debt')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-dark-danger">Add Debt</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-dark-text dark:hover:text-dark-text-secondary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Debt Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="e.g., Student Loan, Credit Card, Car Loan"
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-dark-danger"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Current Balance (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              placeholder="1500.00"
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-dark-danger"
              required
            />
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">How much you currently owe</p>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Original Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              placeholder="2000.00 (optional)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-dark-danger"
            />
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Original debt amount (defaults to current balance)</p>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Monthly Payment (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              placeholder="100.00 (optional)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-dark-danger"
            />
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">How much you pay each month</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 dark:bg-dark-danger text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDebtModal
