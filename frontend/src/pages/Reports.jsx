/**
 * Bloom - Reports Page
 *
 * Analytics dashboard with spending trends and category breakdown charts.
 * Behind experimental feature flag (reportsEnabled).
 */

import { useState, useEffect } from 'react'
import { analyticsAPI } from '../api'
import { formatCurrency } from '../utils/formatters'
import { useCurrency } from '../contexts/CurrencyContext'
import Header from '../components/Header'
import SpendingTrendsChart from '../components/reports/SpendingTrendsChart'
import CategoryBreakdownChart from '../components/reports/CategoryBreakdownChart'

function Reports({ setIsAuthenticated }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  })
  const [granularity, setGranularity] = useState('daily')

  // Analytics data
  const [spendingByCategory, setSpendingByCategory] = useState(null)
  const [spendingBySubcategory, setSpendingBySubcategory] = useState(null)
  const [spendingTrends, setSpendingTrends] = useState(null)
  const [incomeVsExpense, setIncomeVsExpense] = useState(null)

  // View mode for category breakdown (category vs subcategory)
  const [categoryViewMode, setCategoryViewMode] = useState('category')

  const { defaultCurrency, convertAmount } = useCurrency()

  // Helper to convert EUR amounts to user's currency and format
  const fcEur = (cents) => {
    const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents
    return formatCurrency(converted, defaultCurrency)
  }

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange, granularity])

  const loadAnalyticsData = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end
      }

      const [categoryRes, subcategoryRes, trendsRes, incomeExpenseRes] = await Promise.all([
        analyticsAPI.getSpendingByCategory(params),
        analyticsAPI.getSpendingBySubcategory(params),
        analyticsAPI.getSpendingTrends({ ...params, granularity }),
        analyticsAPI.getIncomeVsExpense(params)
      ])

      setSpendingByCategory(categoryRes.data)
      setSpendingBySubcategory(subcategoryRes.data)
      setSpendingTrends(trendsRes.data)
      setIncomeVsExpense(incomeExpenseRes.data)
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  // Quick date range presets
  const setQuickRange = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <Header setIsAuthenticated={setIsAuthenticated} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 Reports & Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visualize your spending patterns and track your financial progress
          </p>
        </div>

        {/* Date Range Controls */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Range Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setQuickRange(7)}
                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-surface"
              >
                7 days
              </button>
              <button
                onClick={() => setQuickRange(30)}
                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-surface"
              >
                30 days
              </button>
              <button
                onClick={() => setQuickRange(90)}
                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-surface"
              >
                90 days
              </button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-gray-500 dark:text-gray-400">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-dark-elevated bg-white dark:bg-dark-elevated text-gray-900 dark:text-white"
              />
              <label className="text-sm text-gray-500 dark:text-gray-400">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-dark-elevated bg-white dark:bg-dark-elevated text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading analytics...</p>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && !error && (
          <div className="space-y-6">
            {/* Summary Cards */}
            {incomeVsExpense && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {fcEur(incomeVsExpense.total_income)}
                  </p>
                </div>
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Spending</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {fcEur(incomeVsExpense.total_expense)}
                  </p>
                </div>
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Savings</p>
                  <p className={`text-2xl font-bold ${incomeVsExpense.net_savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {fcEur(incomeVsExpense.net_savings)}
                  </p>
                </div>
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Savings Rate</p>
                  <p className={`text-2xl font-bold ${incomeVsExpense.savings_rate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {incomeVsExpense.savings_rate}%
                  </p>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending Trends Chart */}
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📈 Spending Trends
                  </h2>
                  <select
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value)}
                    className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-dark-elevated bg-white dark:bg-dark-elevated text-gray-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {spendingTrends && (
                  <SpendingTrendsChart
                    data={spendingTrends.trends}
                    granularity={granularity}
                    currencyFormatter={fcEur}
                  />
                )}
              </div>

              {/* Category Breakdown Chart */}
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    🥧 Spending by {categoryViewMode === 'category' ? 'Category' : 'Subcategory'}
                  </h2>
                  {/* Toggle between Category and Subcategory view */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => setCategoryViewMode('category')}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${
                        categoryViewMode === 'category'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-base'
                      }`}
                    >
                      Category
                    </button>
                    <button
                      onClick={() => setCategoryViewMode('subcategory')}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${
                        categoryViewMode === 'subcategory'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-base'
                      }`}
                    >
                      Subcategory
                    </button>
                  </div>
                </div>
                {categoryViewMode === 'category' && spendingByCategory && (
                  <CategoryBreakdownChart
                    data={spendingByCategory.categories}
                    total={spendingByCategory.total_spending}
                    currencyFormatter={fcEur}
                  />
                )}
                {categoryViewMode === 'subcategory' && spendingBySubcategory && (
                  <CategoryBreakdownChart
                    data={spendingBySubcategory.subcategories}
                    total={spendingBySubcategory.total_spending}
                    currencyFormatter={fcEur}
                  />
                )}
              </div>
            </div>

            {/* No Data State */}
            {spendingByCategory?.categories?.length === 0 && spendingTrends?.trends?.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No spending data for the selected period
                </p>
                <p className="text-gray-400 dark:text-gray-500 mt-2">
                  Try selecting a different date range
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Reports
