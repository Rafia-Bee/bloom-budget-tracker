/**
 * Bloom - Spending Trends Chart Component
 *
 * Line chart showing spending over time with debit/credit breakdown.
 * Uses Recharts library for visualization.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function SpendingTrendsChart({ data, granularity, currencyFormatter }) {
  // Format date labels based on granularity
  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr)
    if (granularity === 'monthly') {
      return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    } else if (granularity === 'weekly') {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-dark-elevated p-3 rounded-lg shadow-lg border border-gray-200 dark:border-dark-surface">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {formatDateLabel(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {currencyFormatter(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        No spending data for this period
      </div>
    )
  }

  // Transform data for chart - convert cents to display values
  const chartData = data.map(item => ({
    ...item,
    displayDate: formatDateLabel(item.date)
  }))

  return (
    <div className="h-64 min-h-[256px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="displayDate"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => currencyFormatter(value).replace(/[€$£]/g, '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#EC4899"
            strokeWidth={2}
            dot={{ fill: '#EC4899', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="debit"
            name="Debit"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="credit"
            name="Credit"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: '#6366F1', strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SpendingTrendsChart
