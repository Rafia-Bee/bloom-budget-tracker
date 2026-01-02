/**
 * Bloom - Budget vs Actual Chart Component
 *
 * Pie chart comparing planned budget vs actual spending by category.
 * Shows budget utilization with a progress indicator and category breakdown.
 * Uses Recharts library for visualization.
 */

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Color palette matching CategoryBreakdownChart
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
];

function BudgetVsActualChart({ data, currencyFormatter }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const [isAnimating, setIsAnimating] = useState(true);

    // Reset animation state when data changes
    useEffect(() => {
        setIsAnimating(true);
        setActiveIndex(null);
    }, [data]);

    if (!data) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                Loading budget data...
            </div>
        );
    }

    const {
        planned_budget,
        actual_spending,
        remaining,
        utilization_percent,
        by_category,
        salary_period,
    } = data;

    // Handle no budget period
    if (!salary_period) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                    <p>No budget period found for selected dates</p>
                    <p className="text-sm mt-2">Create a salary period to track budget vs actual</p>
                </div>
            </div>
        );
    }

    // Handle empty spending data
    if (!by_category || by_category.length === 0) {
        return (
            <div className="space-y-4">
                {/* Budget Overview Card */}
                <BudgetOverviewCard
                    plannedBudget={planned_budget}
                    actualSpending={actual_spending}
                    remaining={remaining}
                    utilizationPercent={utilization_percent}
                    currencyFormatter={currencyFormatter}
                />
                <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    No spending data for this period
                </div>
            </div>
        );
    }

    // Prepare chart data - add colors and format for pie chart
    const chartData = by_category.map((item, index) => ({
        name: item.name,
        value: item.actual,
        actual: item.actual,
        count: item.count,
        percentage_of_spending: item.percentage_of_spending,
        percentage_of_budget: item.percentage_of_budget,
        color: COLORS[index % COLORS.length],
    }));

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-white dark:bg-dark-elevated p-3 rounded-lg shadow-lg border border-gray-200 dark:border-dark-surface">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {currencyFormatter(item.actual)}
                    </p>
                    <p className="text-xs text-gray-400">
                        {item.percentage_of_spending}% of spending
                    </p>
                    <p className="text-xs text-gray-400">{item.percentage_of_budget}% of budget</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {item.count} transaction{item.count !== 1 ? 's' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Handle mouse events only after animation completes
    const handleMouseEnter = (_, index) => {
        if (!isAnimating) {
            setActiveIndex(index);
        }
    };

    const handleMouseLeave = () => {
        if (!isAnimating) {
            setActiveIndex(null);
        }
    };

    // Animation complete callback
    const handleAnimationEnd = () => {
        setIsAnimating(false);
    };

    // Custom legend renderer
    const renderLegend = (props) => {
        const { payload } = props;
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
        );
    };

    return (
        <div className="space-y-4">
            {/* Budget Overview Card */}
            <BudgetOverviewCard
                plannedBudget={planned_budget}
                actualSpending={actual_spending}
                remaining={remaining}
                utilizationPercent={utilization_percent}
                currencyFormatter={currencyFormatter}
            />

            {/* Category Breakdown Pie Chart */}
            <div className="h-64 min-h-[256px] w-full">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={100}
                    minHeight={100}
                    debounce={50}
                >
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                            paddingAngle={2}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onAnimationEnd={handleAnimationEnd}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    stroke={activeIndex === index ? entry.color : 'transparent'}
                                    strokeWidth={activeIndex === index ? 3 : 0}
                                    style={{
                                        filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={renderLegend} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/**
 * Budget Overview Card with progress bar
 */
function BudgetOverviewCard({
    plannedBudget,
    actualSpending,
    remaining,
    utilizationPercent,
    currencyFormatter,
}) {
    // Determine status color based on utilization
    const getStatusColor = () => {
        if (utilizationPercent <= 75) return 'green';
        if (utilizationPercent <= 90) return 'yellow';
        if (utilizationPercent <= 100) return 'orange';
        return 'red'; // Over budget
    };

    const statusColor = getStatusColor();
    const colorClasses = {
        green: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            bar: 'bg-green-500',
            text: 'text-green-600 dark:text-green-400',
        },
        yellow: {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            bar: 'bg-yellow-500',
            text: 'text-yellow-600 dark:text-yellow-400',
        },
        orange: {
            bg: 'bg-orange-100 dark:bg-orange-900/30',
            bar: 'bg-orange-500',
            text: 'text-orange-600 dark:text-orange-400',
        },
        red: {
            bg: 'bg-red-100 dark:bg-red-900/30',
            bar: 'bg-red-500',
            text: 'text-red-600 dark:text-red-400',
        },
    };

    const colors = colorClasses[statusColor];
    const isOverBudget = remaining < 0;

    return (
        <div className={`p-4 rounded-lg ${colors.bg}`}>
            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">Budget Utilization</span>
                    <span className={`font-medium ${colors.text}`}>{utilizationPercent}%</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-dark-elevated rounded-full overflow-hidden">
                    <div
                        className={`h-full ${colors.bar} transition-all duration-500 ease-out rounded-full`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Planned</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currencyFormatter(plannedBudget)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currencyFormatter(actualSpending)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isOverBudget ? 'Over' : 'Remaining'}
                    </p>
                    <p
                        className={`text-sm font-semibold ${isOverBudget ? colors.text : 'text-green-600 dark:text-green-400'}`}
                    >
                        {isOverBudget
                            ? `-${currencyFormatter(Math.abs(remaining))}`
                            : currencyFormatter(remaining)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default BudgetVsActualChart;
