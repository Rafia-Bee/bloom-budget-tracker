/**
 * Bloom - Category Breakdown Chart Component
 *
 * Pie/donut chart showing spending distribution by category.
 * Uses Recharts library for visualization.
 */

import { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Color palette for categories
const COLORS = [
  '#EC4899', // Pink
  '#10B981', // Green
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

function CategoryBreakdownChart({ data, total, currencyFormatter, onCategoryClick, clickable = false }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [isAnimating, setIsAnimating] = useState(true)

  // Reset animation state when data changes (e.g., drill-down)
  useEffect(() => {
    setIsAnimating(true)
    setActiveIndex(null)
  }, [data])

  // Handle click on pie slice
  const handleClick = (data, index) => {
    if (clickable && onCategoryClick && data?.name && !isAnimating) {
      onCategoryClick(data.name)
    }
  }

  // Handle mouse events only after animation completes
  const handleMouseEnter = (_, index) => {
    if (!isAnimating) {
      setActiveIndex(index)
    }
  }

  const handleMouseLeave = () => {
    if (!isAnimating) {
      setActiveIndex(null)
    }
  }

  // Animation complete callback
  const handleAnimationEnd = () => {
    setIsAnimating(false)
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white dark:bg-dark-elevated p-3 rounded-lg shadow-lg border border-gray-200 dark:border-dark-surface">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {item.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {currencyFormatter(item.total)} ({item.percentage}%)
          </p>
          <p className="text-xs text-gray-400">
            {item.count} transaction{item.count !== 1 ? 's' : ''}
          </p>
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

  // Add color to each category
  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }))

  // Custom legend renderer
  const renderLegend = (props) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{ backgroundColor: `${entry.color}20` }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Calculate dynamic height based on number of items
  // Base: 320px for chart, add ~24px per row of legend items (approximately 4-5 items per row)
  const legendRows = Math.ceil(data.length / 4)
  const baseHeight = 280
  const legendHeight = Math.max(40, legendRows * 28)
  const totalHeight = baseHeight + legendHeight

  return (
    <div style={{ height: `${totalHeight}px`, minHeight: '320px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100} debounce={50}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy={baseHeight / 2}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="total"
            nameKey="name"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            style={{ cursor: clickable && !isAnimating ? 'pointer' : 'default' }}
            animationBegin={0}
            animationDuration={400}
            animationEasing="ease-out"
            onAnimationEnd={handleAnimationEnd}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={entry.color}
                strokeWidth={activeIndex === index ? 3 : 1}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                style={{ cursor: clickable && !isAnimating ? 'pointer' : 'default' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
          {/* Center label showing total */}
          <text
            x="50%"
            y={baseHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-900 dark:fill-white"
          >
            <tspan x="50%" dy="-8" fontSize="12" fill="#9CA3AF">Total</tspan>
            <tspan x="50%" dy="20" fontSize="16" fontWeight="bold" fill="#EC4899">
              {currencyFormatter(total)}
            </tspan>
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CategoryBreakdownChart
