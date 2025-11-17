/**
 * Bloom - Salary Period Setup Wizard
 *
 * Multi-step modal for setting up monthly salary periods with weekly budgets.
 * Steps:
 * 1. Enter monthly salary and start date
 * 2. Review/adjust auto-detected fixed bills from recurring expenses
 * 3. Confirm weekly budget calculation
 * 4. Create salary period and 4 weekly budgets
 */

import { useState, useEffect } from 'react'
import api from '../api'

function SalaryPeriodWizard({ onClose, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [salaryAmount, setSalaryAmount] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [preview, setPreview] = useState(null)
  const [fixedBills, setFixedBills] = useState([])

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const parseCurrency = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const dollars = parseFloat(cleaned) || 0
    return Math.round(dollars * 100)
  }

  const handleStep1Next = async () => {
    if (!salaryAmount || parseCurrency(salaryAmount) <= 0) {
      setError('Please enter your monthly salary')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/salary-periods/preview', {
        salary_amount: parseCurrency(salaryAmount),
        start_date: startDate
      })

      setPreview(response.data)
      setFixedBills(response.data.fixed_bills)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to preview salary period')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Next = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/salary-periods/preview', {
        salary_amount: parseCurrency(salaryAmount),
        start_date: startDate,
        fixed_bills: fixedBills
      })

      setPreview(response.data)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to recalculate budget')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setError('')
    setLoading(true)

    try {
      await api.post('/salary-periods', {
        salary_amount: parseCurrency(salaryAmount),
        start_date: startDate,
        fixed_bills: fixedBills
      })

      onComplete()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create salary period')
      setLoading(false)
    }
  }

  const updateFixedBillAmount = (index, value) => {
    const newBills = [...fixedBills]
    newBills[index].amount = parseCurrency(value)
    setFixedBills(newBills)
  }

  const removeFixedBill = (index) => {
    setFixedBills(fixedBills.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-bloom-pink">Setup Weekly Budget</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-bloom-pink' : 'bg-gray-200'}`} />
                {s < 3 && <div className="w-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Enter Your Monthly Salary</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We'll help you divide this into 4 weekly budgets after subtracting fixed bills.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Salary
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                    placeholder="4000.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Payment Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
                />
              </div>

              <button
                onClick={handleStep1Next}
                disabled={loading}
                className="w-full bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Next: Review Fixed Bills'}
              </button>
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review Fixed Bills</h3>
                <p className="text-sm text-gray-600 mb-4">
                  These recurring expenses won't count against your weekly budget. Adjust or remove as needed.
                </p>
              </div>

              {fixedBills.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-2">No fixed bills detected</p>
                  <p className="text-sm text-gray-500">
                    Mark recurring expenses as "Fixed Bill" in the Recurring Expenses page first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixedBills.map((bill, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{bill.name}</div>
                        <div className="text-sm text-gray-500">{bill.category}</div>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="text"
                          value={(bill.amount / 100).toFixed(2)}
                          onChange={(e) => updateFixedBillAmount(index, e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeFixedBill(index)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Total Fixed Bills</span>
                  <span className="text-lg font-bold text-bloom-pink">
                    {formatCurrency(fixedBills.reduce((sum, bill) => sum + bill.amount, 0))}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? 'Calculating...' : 'Next: Confirm Budget'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Confirm Your Weekly Budget</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Review the breakdown and create your 4-week budget plan.
                </p>
              </div>

              <div className="bg-gradient-to-br from-bloom-pink to-pink-600 text-white rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="opacity-90">Monthly Salary</span>
                  <span className="text-2xl font-bold">{formatCurrency(preview.salary_amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-90">− Fixed Bills</span>
                  <span className="text-xl">−{formatCurrency(preview.fixed_bills_total)}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between items-center">
                  <span className="opacity-90">= Remaining</span>
                  <span className="text-2xl font-bold">{formatCurrency(preview.remaining_amount)}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between items-center">
                  <span className="opacity-90">÷ 4 weeks</span>
                  <span className="text-3xl font-bold">{formatCurrency(preview.weekly_budget)}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">4-Week Schedule</h4>
                  <span className="text-sm text-gray-500">
                    {new Date(preview.start_date).toLocaleDateString()} - {new Date(preview.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-2">
                  {preview.weeks.map((week) => (
                    <div key={week.week_number} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-bloom-pink text-white rounded-full flex items-center justify-center font-semibold">
                        {week.week_number}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">
                          {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="font-semibold text-bloom-pink">
                        {formatCurrency(week.budget_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Pro tip:</strong> Any leftover budget at the end of each week should be allocated to debt or savings - it won't carry over!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Budget Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalaryPeriodWizard
