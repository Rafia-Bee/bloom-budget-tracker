/**
 * Bloom - Reports Page
 *
 * Analytics dashboard with spending trends and category breakdown charts.
 * Behind experimental feature flag (reportsEnabled).
 */

import { useState, useEffect } from 'react'
import { analyticsAPI, salaryPeriodAPI } from '../api'
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

  // Load current salary period on mount to set default date range
  useEffect(() => {
    const loadDefaultPeriod = async () => {
      try {
        const response = await salaryPeriodAPI.getCurrent()
        // Use salary period (cycle) dates instead of current week
        if (response.data?.salary_period) {
          const { start_date, end_date } = response.data.salary_period
          setDateRange({
            start: start_date,
            end: end_date
          })
          setGranularity('daily') // Default to daily for current cycle
        }
      } catch (err) {
        console.error('Failed to load current period:', err)
        // Fallback to 30 days (already set in initial state)
      }
    }
    loadDefaultPeriod()
  }, [])

  // Analytics data
  const [spendingByCategory, setSpendingByCategory] = useState(null)
  const [spendingBySubcategory, setSpendingBySubcategory] = useState(null)
  const [spendingTrends, setSpendingTrends] = useState(null)
  const [incomeVsExpense, setIncomeVsExpense] = useState(null)

  // Drill-down state: null = category view, 'Food' = show Food subcategories
  const [selectedCategory, setSelectedCategory] = useState(null)

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

      const [categoryRes, trendsRes, incomeExpenseRes] = await Promise.all([
        analyticsAPI.getSpendingByCategory(params),
        analyticsAPI.getSpendingTrends({ ...params, granularity }),
        analyticsAPI.getAllTimeStats() // Fetch all-time stats for summary cards
      ])

      setSpendingByCategory(categoryRes.data)
      setSpendingTrends(trendsRes.data)
      setIncomeVsExpense(incomeExpenseRes.data)
      // Reset drill-down when date range changes
      setSelectedCategory(null)
      setSpendingBySubcategory(null)
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load subcategory data when a category is selected
  const handleCategoryClick = async (categoryName) => {
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        category: categoryName
      }
      const subcategoryRes = await analyticsAPI.getSpendingBySubcategory(params)
      setSpendingBySubcategory(subcategoryRes.data)
      setSelectedCategory(categoryName)
    } catch (err) {
      console.error('Failed to load subcategory data:', err)
    }
  }

  // Go back to category view
  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setSpendingBySubcategory(null)
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    setGranularity('weekly') // Switch to weekly when manually changing dates
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

        {/* Summary Cards (All Time) */}
        {incomeVsExpense && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Income (All Time)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fcEur(incomeVsExpense.total_income)}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Spending (All Time)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {fcEur(incomeVsExpense.total_expense)}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Savings (All Time)</p>
              <p className={`text-2xl font-bold ${incomeVsExpense.net_savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {fcEur(incomeVsExpense.net_savings)}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Savings Rate (All Time)</p>
              <p className={`text-2xl font-bold ${incomeVsExpense.savings_rate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {incomeVsExpense.savings_rate}%
              </p>
            </div>
          </div>
        )}

        {/* Date Range Controls */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-end">
            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
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

              {/* Category Breakdown Chart with drill-down */}
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    {selectedCategory && (
                      <button
                        onClick={handleBackToCategories}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors"
                        title="Back to categories"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      🌸 {selectedCategory ? `${selectedCategory} Subcategories` : 'Spending by Category'}
                    </h2>
                  </div>
                </div>
                {/* Category view (default) - clickable to drill down */}
                {!selectedCategory && spendingByCategory && (
                  <CategoryBreakdownChart
                    data={spendingByCategory.categories}
                    total={spendingByCategory.total_spending}
                    currencyFormatter={fcEur}
                    clickable={true}
                    onCategoryClick={handleCategoryClick}
                  />
                )}
                {/* Subcategory view - shows breakdown for selected category */}
                {selectedCategory && spendingBySubcategory && (
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
