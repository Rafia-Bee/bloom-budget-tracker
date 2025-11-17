/**
 * Bloom - Weekly Budget Card
 *
 * Displays current week's budget information (week number, budget, spent, remaining).
 * Shows progress bar and prompts user to create salary period if none exists.
 */

import { useState, useEffect } from 'react'
import api from '../api'

function WeeklyBudgetCard({ onSetupClick, onAllocateClick }) {
  const [weeklyData, setWeeklyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWeeklyData()
  }, [])

  const loadWeeklyData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/salary-periods/current')
      setWeeklyData(response.data)
      setError(null)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('no_period')
      } else {
        setError('failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getProgress = () => {
    if (!weeklyData?.current_week) return 0
    const { spent, budget_amount } = weeklyData.current_week
    return Math.min((spent / budget_amount) * 100, 100)
  }

  const getProgressColor = () => {
    const progress = getProgress()
    if (progress >= 90) return 'bg-red-500'
    if (progress >= 75) return 'bg-yellow-500'
    return 'bg-bloom-mint'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-pink animate-pulse">
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error === 'no_period') {
    return (
      <div className="bg-gradient-to-br from-bloom-pink to-pink-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Set Up Weekly Budget</h3>
          <p className="text-sm opacity-90 mb-4">
            Divide your salary into 4 weekly budgets
          </p>
          <button
            onClick={onSetupClick}
            className="bg-white text-bloom-pink px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  if (error === 'failed') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
        <p className="text-red-600 text-center">Failed to load weekly budget</p>
      </div>
    )
  }

  const { salary_period, current_week } = weeklyData
  const progress = getProgress()

  return (
    <div className="bg-gradient-to-br from-bloom-pink to-pink-600 rounded-2xl shadow-lg p-6 text-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
              {current_week?.week_number || '?'}
            </div>
            <div>
              <p className="text-sm opacity-90">Week {current_week?.week_number || '?'} of 4</p>
              <p className="text-xs opacity-75">
                {current_week?.start_date && new Date(current_week.start_date).toLocaleDateString()} - {current_week?.end_date && new Date(current_week.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onSetupClick}
          className="text-white/80 hover:text-white transition"
          title="Manage salary period"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm opacity-90">Weekly Budget</span>
          <span className="text-2xl font-bold">{formatCurrency(current_week?.budget_amount || 0)}</span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-sm opacity-90">Spent</span>
          <span className="text-xl font-semibold">{formatCurrency(current_week?.spent || 0)}</span>
        </div>

        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-baseline pt-2">
          <span className="text-sm opacity-90">Remaining</span>
          <span className={`text-2xl font-bold ${current_week?.remaining < 0 ? 'text-red-200' : ''}`}>
            {formatCurrency(current_week?.remaining || 0)}
          </span>
        </div>
      </div>

      {progress >= 90 && (
        <div className="mt-4 bg-white/20 rounded-lg p-3">
          <p className="text-xs font-medium">
            ⚠️ You've spent {progress.toFixed(0)}% of your weekly budget
          </p>
        </div>
      )}

      {current_week?.remaining > 0 && (
        <button
          onClick={() => onAllocateClick(weeklyData.salary_period.id, current_week.week_number)}
          className="mt-4 w-full bg-white text-bloom-pink py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
        >
          💰 Allocate Leftover ({formatCurrency(current_week.remaining)})
        </button>
      )}
    </div>
  )
}

export default WeeklyBudgetCard
