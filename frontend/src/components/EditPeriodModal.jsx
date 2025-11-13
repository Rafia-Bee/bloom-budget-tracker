/**
 * Bloom - Edit Budget Period Modal
 *
 * Modal for editing existing budget periods.
 */

import { useState, useEffect } from 'react'

function EditPeriodModal({ onClose, onEdit, period }) {
  const [periodType, setPeriodType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (period) {
      setPeriodType(period.period_type)
      setStartDate(period.start_date)
      setEndDate(period.end_date)
    }
  }, [period])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (periodType === 'custom' && !endDate) {
        setError('End date is required for custom periods')
        setLoading(false)
        return
      }

      const periodData = {
        period_type: periodType,
        start_date: startDate,
        end_date: endDate
      }

      await onEdit(period.id, periodData)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update budget period')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-bloom-pink">Edit Budget Period</h2>
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
            <label className="block text-gray-700 font-semibold mb-2">Period Type</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
            >
              <option value="monthly">Monthly (30 days)</option>
              <option value="weekly">Weekly (7 days)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              required
              min={startDate}
            />
            <p className="text-sm text-gray-500 mt-1">
              {periodType === 'custom'
                ? 'You can set any date range for custom periods'
                : 'Note: Changing dates will override the period type duration'}
            </p>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditPeriodModal
