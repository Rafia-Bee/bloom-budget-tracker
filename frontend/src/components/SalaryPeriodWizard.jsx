/**
 * Bloom - Budget Period Setup Wizard
 *
 * Multi-step modal for setting up monthly budget periods with weekly budgets.
 * Steps:
 * 1. Enter current debit/credit balances and optional credit allowance
 * 2. Review/adjust auto-detected fixed bills from recurring expenses
 * 3. Confirm weekly budget calculation
 * 4. Create budget period and 4 weekly budgets
 */

import { useState, useEffect } from 'react'
import api from '../api'
import { useCurrency } from '../contexts/CurrencyContext'
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../utils/formatters'

function SalaryPeriodWizard({ onClose, onComplete, editPeriod = null, rolloverData = null }) {
  const { defaultCurrency } = useCurrency()
  const currencySymbol = getCurrencySymbol(defaultCurrency)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [debitBalance, setDebitBalance] = useState('')
  const [creditAvailable, setCreditAvailable] = useState('')
  const [creditLimit, setCreditLimit] = useState('1500')
  const [creditAllowance, setCreditAllowance] = useState(0)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [preview, setPreview] = useState(null)
  const [fixedBills, setFixedBills] = useState([])

  // Pre-fill form when editing existing salary period OR rolling over
  useEffect(() => {
    if (editPeriod) {
      setDebitBalance((editPeriod.initial_debit_balance / 100).toFixed(2))
      setCreditAvailable((editPeriod.initial_credit_balance / 100).toFixed(2))
      setCreditLimit((editPeriod.credit_limit / 100).toFixed(2))
      setCreditAllowance(editPeriod.credit_budget_allowance || 0)
      setStartDate(editPeriod.start_date)
    } else if (rolloverData) {
      // Pre-fill with rollover balances
      setDebitBalance((rolloverData.suggestedDebitBalance / 100).toFixed(2))
      setCreditAvailable((rolloverData.suggestedCreditAvailable / 100).toFixed(2))
      setCreditLimit((rolloverData.creditLimit / 100).toFixed(2))
      setCreditAllowance(rolloverData.creditAllowance || 0)

      // Set start date to day after previous period ended
      const nextDay = new Date(rolloverData.endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setStartDate(nextDay.toISOString().split('T')[0])
    }
  }, [editPeriod, rolloverData])

  const formatCurrency = (cents) => {
    return formatCurrencyUtil(cents, defaultCurrency)
  }

  const parseCurrency = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const dollars = parseFloat(cleaned) || 0
    return Math.round(dollars * 100)
  }

  const handleStep1Next = async () => {
    const debitCents = parseCurrency(debitBalance)
    const creditAvailableCents = parseCurrency(creditAvailable)

    if (debitCents <= 0) {
      setError('Please enter your current debit balance')
      return
    }

    // No validation needed - credit allowance slider only shows when credit available

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/salary-periods/preview', {
        debit_balance: debitCents,
        credit_balance: creditAvailableCents,
        credit_limit: parseCurrency(creditLimit),
        credit_allowance: creditAllowance,
        start_date: startDate
      })

      setPreview(response.data)
      setFixedBills(response.data.fixed_bills)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to preview budget period')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Next = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/salary-periods/preview', {
        debit_balance: parseCurrency(debitBalance),
        credit_balance: parseCurrency(creditAvailable),
        credit_limit: parseCurrency(creditLimit),
        credit_allowance: creditAllowance,
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
      const payload = {
        debit_balance: parseCurrency(debitBalance),
        credit_balance: parseCurrency(creditAvailable),
        credit_limit: parseCurrency(creditLimit),
        credit_allowance: creditAllowance,
        start_date: startDate,
        fixed_bills: fixedBills
      }

      if (editPeriod) {
        // Update existing salary period
        const periodId = editPeriod.period_id || editPeriod.id
        await api.put(`/salary-periods/${periodId}`, payload)
      } else {
        // Create new salary period
        await api.post('/salary-periods', payload)
      }

      onComplete()
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editPeriod ? 'update' : 'create'} budget period`)
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">
              {editPeriod ? 'Edit' : 'Setup'} Weekly Budget
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text text-2xl font-light"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-bloom-pink dark:bg-dark-pink' : 'bg-gray-200 dark:bg-dark-elevated'}`} />
                {s < 3 && <div className="w-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-dark-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Enter Your Current Balances</h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                  We'll help you create a 4-week budget based on your available funds.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  Debit Balance (Current Bank Account)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">{currencySymbol}</span>
                  <input
                    type="text"
                    value={debitBalance}
                    onChange={(e) => setDebitBalance(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                    placeholder="1500.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  Credit Card Available (Remaining Limit)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">{currencySymbol}</span>
                  <input
                    type="text"
                    value={creditAvailable}
                    onChange={(e) => setCreditAvailable(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                    placeholder="1000.00"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">How much credit you have left to spend</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  Credit Card Limit (Total)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">{currencySymbol}</span>
                  <input
                    type="text"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                    placeholder="1500.00"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                  {parseCurrency(creditLimit) > parseCurrency(creditAvailable)
                    ? `You currently owe ${formatCurrency(parseCurrency(creditLimit) - parseCurrency(creditAvailable))}`
                    : 'No pre-existing debt'}
                </p>
              </div>

              {parseCurrency(creditAvailable) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                    Credit Allowance (Optional)
                  </label>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-3">
                    How much of your available credit do you want to include in this budget?
                  </p>
                  <input
                    type="range"
                    min="0"
                    max={parseCurrency(creditAvailable)}
                    step="1000"
                    value={creditAllowance}
                    onChange={(e) => setCreditAllowance(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    <span>{formatCurrency(0)}</span>
                    <span className="font-semibold text-bloom-pink dark:text-dark-pink">{formatCurrency(creditAllowance)}</span>
                    <span>{formatCurrency(parseCurrency(creditAvailable))}</span>
                  </div>
                </div>
              )}

              {parseCurrency(creditAvailable) === 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    ⚠️ No credit available (card is maxed out). Only your debit balance will be used for budgeting.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  Budget Period Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                />
              </div>

              <button
                onClick={handleStep1Next}
                disabled={loading}
                className="w-full bg-bloom-pink dark:bg-dark-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 dark:hover:bg-dark-pink/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Next: Review Fixed Bills'}
              </button>
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review Fixed Bills</h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                  These recurring expenses won't count against your weekly budget. Adjust or remove as needed.
                </p>
              </div>

              {fixedBills.length === 0 ? (
                <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-6 text-center">
                  <p className="text-gray-600 dark:text-dark-text mb-2">No fixed bills detected</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    Mark recurring expenses as "Fixed Bill" in the Recurring Expenses page first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixedBills.map((bill, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-dark-text">{bill.name}</div>
                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary">{bill.category}</div>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{currencySymbol}</span>
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
                  className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-dark-elevated"
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
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                  Review the breakdown and create your 4-week budget plan.
                </p>
              </div>

              <div className="bg-gradient-to-br from-bloom-pink to-pink-600 text-white rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="opacity-90">Debit Balance</span>
                  <span className="text-2xl font-bold">{formatCurrency(preview.debit_balance)}</span>
                </div>
                {preview.credit_allowance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-90">+ Credit Allowance</span>
                    <span className="text-xl">+{formatCurrency(preview.credit_allowance)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="opacity-90">− Fixed Bills</span>
                  <span className="text-xl">−{formatCurrency(preview.fixed_bills_total)}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between items-center">
                  <span className="opacity-90">= Total Budget</span>
                  <span className="text-2xl font-bold">{formatCurrency(preview.total_budget)}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between items-center">
                  <span className="opacity-90">÷ 4 weeks</span>
                  <span className="text-3xl font-bold">{formatCurrency(preview.weekly_budget)}</span>
                </div>
                {preview.weekly_credit_budget > 0 && (
                  <div className="text-sm opacity-90 mt-2">
                    <div className="flex justify-between">
                      <span>Debit per week:</span>
                      <span>{formatCurrency(preview.weekly_debit_budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credit per week:</span>
                      <span>{formatCurrency(preview.weekly_credit_budget)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">4-Week Schedule</h4>
                  <span className="text-sm text-gray-500">
                    {(() => { const d = new Date(preview.start_date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()} - {(() => { const d = new Date(preview.end_date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()}
                  </span>
                </div>
                <div className="space-y-2">
                  {preview.weeks.map((week) => (
                    <div key={week.week_number} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg">
                      <div className="w-8 h-8 bg-bloom-pink text-white rounded-full flex items-center justify-center font-semibold">
                        {week.week_number}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">
                          {(() => { const d = new Date(week.start_date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()} - {(() => { const d = new Date(week.end_date); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`; })()}
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
                  className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-dark-elevated"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading
                    ? `${editPeriod ? 'Updating' : 'Creating'}...`
                    : `${editPeriod ? 'Update' : 'Create'} Budget Plan`
                  }
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

