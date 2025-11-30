/**
 * Bloom - Edit Income Modal
 *
 * Modal dialog for editing existing income entries with pre-filled data.
 */

import { useState, useEffect } from 'react'

function EditIncomeModal({ onClose, onEdit, income }) {
  const [type, setType] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const incomeTypes = ['Salary', 'Bonus', 'Freelance', 'Other']

  useEffect(() => {
    if (income) {
      setType(income.type)
      setAmount((income.amount / 100).toFixed(2))
      // Convert date from "dd MMM, YYYY" to "YYYY-MM-DD" for date input
      const parsedDate = parseDisplayDate(income.date)
      setDate(parsedDate)
    }
  }, [income])

  const parseDisplayDate = (dateStr) => {
    // Parse "13 Nov, 2025" format to "2025-11-13"
    try {
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      }
      const parts = dateStr.split(' ')
      const day = parts[0].padStart(2, '0')
      const month = months[parts[1].replace(',', '')]
      const year = parts[2]
      return `${year}-${month}-${day}`
    } catch (err) {
      return new Date().toISOString().split('T')[0]
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)
      await onEdit(income.id, {
        type,
        amount: amountInCents,
        date
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update income')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-bloom-mint">Edit Income</h2>
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded flex justify-between items-start">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-900 ml-4 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-mint"
            >
              {incomeTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-mint"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
            />
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
              className="flex-1 bg-bloom-mint text-green-800 px-4 py-2 rounded-lg hover:bg-bloom-mint/80 transition disabled:opacity-50 font-semibold"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditIncomeModal
