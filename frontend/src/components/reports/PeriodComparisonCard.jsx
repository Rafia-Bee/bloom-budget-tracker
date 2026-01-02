/**
 * Bloom - Period Comparison Card Component
 *
 * Displays comparison metrics between two user-selected date ranges.
 * Shows spending/income changes with visual indicators.
 */

import { useState } from 'react';
import { analyticsAPI } from '../../api';
import { formatCurrency } from '../../utils/formatters';

// Arrow icons for change indicators
const UpArrow = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
);

const DownArrow = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

function PeriodComparisonCard({ currencyFormatter = formatCurrency }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // Initialize with empty dates - user must select their own periods
    const [currentPeriod, setCurrentPeriod] = useState({
        start: '',
        end: '',
    });

    const [previousPeriod, setPreviousPeriod] = useState({
        start: '',
        end: '',
    });

    const fetchComparison = async () => {
        // Validate all dates are set
        if (
            !currentPeriod.start ||
            !currentPeriod.end ||
            !previousPeriod.start ||
            !previousPeriod.end
        ) {
            setError('Please select dates for both periods');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await analyticsAPI.getPeriodComparison({
                current_start: currentPeriod.start,
                current_end: currentPeriod.end,
                previous_start: previousPeriod.start,
                previous_end: previousPeriod.end,
            });
            setData(response.data);
        } catch (err) {
            console.error('Failed to load comparison data:', err);
            setError('Failed to load comparison data');
        } finally {
            setLoading(false);
        }
    };

    // Format date range for display
    const formatDateRange = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    };

    // Render change indicator with color
    const ChangeIndicator = ({ change, changePercent, invertColors = false }) => {
        const isPositive = change > 0;
        const isNegative = change < 0;
        const isNeutral = change === 0;

        // For spending, down is good (green) and up is bad (red)
        // For income, up is good (green) and down is bad (red)
        let colorClass;
        if (invertColors) {
            // For spending: decrease is good
            colorClass = isNegative
                ? 'text-green-600 dark:text-green-400'
                : isPositive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400';
        } else {
            // For income: increase is good
            colorClass = isPositive
                ? 'text-green-600 dark:text-green-400'
                : isNegative
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400';
        }

        return (
            <div className={`flex items-center gap-1 text-sm font-medium ${colorClass}`}>
                {isPositive && <UpArrow />}
                {isNegative && <DownArrow />}
                {isNeutral ? (
                    <span>No change</span>
                ) : (
                    <span>
                        {currencyFormatter(Math.abs(change))} ({changePercent > 0 ? '+' : ''}
                        {changePercent}%)
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 mb-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📊 Period Comparison
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Compare spending and income between two date ranges (e.g., your salary periods)
                </p>
            </div>

            {/* Date Range Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Period B - on the left */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <label className="block text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                        Period B
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="date"
                            value={previousPeriod.start}
                            onChange={(e) =>
                                setPreviousPeriod((prev) => ({ ...prev, start: e.target.value }))
                            }
                            className="px-2 py-1 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-dark-elevated text-gray-900 dark:text-white flex-1 min-w-[120px]"
                        />
                        <span className="text-gray-500 self-center">to</span>
                        <input
                            type="date"
                            value={previousPeriod.end}
                            onChange={(e) =>
                                setPreviousPeriod((prev) => ({ ...prev, end: e.target.value }))
                            }
                            className="px-2 py-1 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-dark-elevated text-gray-900 dark:text-white flex-1 min-w-[120px]"
                        />
                    </div>
                </div>

                {/* Period A - on the right */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                        Period A
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="date"
                            value={currentPeriod.start}
                            onChange={(e) =>
                                setCurrentPeriod((prev) => ({ ...prev, start: e.target.value }))
                            }
                            className="px-2 py-1 text-sm rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-dark-elevated text-gray-900 dark:text-white flex-1 min-w-[120px]"
                        />
                        <span className="text-gray-500 self-center">to</span>
                        <input
                            type="date"
                            value={currentPeriod.end}
                            onChange={(e) =>
                                setCurrentPeriod((prev) => ({ ...prev, end: e.target.value }))
                            }
                            className="px-2 py-1 text-sm rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-dark-elevated text-gray-900 dark:text-white flex-1 min-w-[120px]"
                        />
                    </div>
                </div>
            </div>

            {/* Compare Button */}
            <div className="flex justify-center mb-4">
                <button
                    onClick={fetchComparison}
                    disabled={loading}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                    {loading ? 'Comparing...' : 'Compare Periods'}
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Results */}
            {data && !loading && (
                <>
                    {/* Period Labels */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Period B:
                        </span>{' '}
                        {formatDateRange(data.previous_period.start, data.previous_period.end)}
                        <span className="mx-2">vs</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Period A:
                        </span>{' '}
                        {formatDateRange(data.current_period.start, data.current_period.end)}
                    </div>

                    {/* Summary Comparison */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Income Comparison - on the left */}
                        <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Total Income
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {currencyFormatter(data.current_period.total_income)}
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                        vs {currencyFormatter(data.previous_period.total_income)}
                                    </p>
                                </div>
                                <ChangeIndicator
                                    change={data.comparison.income_change}
                                    changePercent={data.comparison.income_change_percent}
                                />
                            </div>
                        </div>

                        {/* Spending Comparison - on the right */}
                        <div className="bg-gray-50 dark:bg-dark-elevated rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Total Spending
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {currencyFormatter(data.current_period.total_spending)}
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                        vs {currencyFormatter(data.previous_period.total_spending)}
                                    </p>
                                </div>
                                <ChangeIndicator
                                    change={data.comparison.spending_change}
                                    changePercent={data.comparison.spending_change_percent}
                                    invertColors={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Changes */}
                    {data.comparison.category_changes.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Category Changes
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {data.comparison.category_changes.map((cat) => (
                                    <div
                                        key={cat.name}
                                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-dark-elevated last:border-0"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {cat.name}
                                            </p>
                                            <p className="text-xs">
                                                <span className="text-purple-600 dark:text-purple-400">
                                                    {currencyFormatter(cat.previous)}
                                                </span>
                                                <span className="text-gray-400"> → </span>
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    {currencyFormatter(cat.current)}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <ChangeIndicator
                                                change={cat.change}
                                                changePercent={cat.change_percent}
                                                invertColors={true}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Data State */}
                    {data.previous_period.total_spending === 0 &&
                        data.previous_period.total_income === 0 &&
                        data.current_period.total_spending === 0 &&
                        data.current_period.total_income === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                No data available for the selected periods
                            </p>
                        )}
                </>
            )}

            {/* Initial State - no data yet */}
            {!data && !loading && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Select your salary period dates above and click "Compare Periods"
                </p>
            )}
        </div>
    );
}

export default PeriodComparisonCard;
