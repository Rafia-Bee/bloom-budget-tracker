/**
 * Bloom - Weekly Budget Card
 *
 * Displays current week's budget information (week number, budget, spent, remaining).
 * Shows progress bar and prompts user to create salary period if none exists.
 * Supports flexible sub-periods when experimental feature is enabled.
 */

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import api from '../api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';
import { formatCurrency } from '../utils/formatters';

const WeeklyBudgetCard = forwardRef(({ onSetupClick, onAllocateClick, onWeekChange }, ref) => {
    const [weeklyData, setWeeklyData] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Currency context for multi-currency support
    const { defaultCurrency, convertAmount } = useCurrency();

    // Feature flag for flexible sub-periods
    const { isEnabled } = useFeatureFlag();
    const flexibleSubPeriodsEnabled = isEnabled('flexibleSubPeriodsEnabled');

    // Helper function to format EUR amounts (stored in DB) converted to user's currency
    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    // Helper to get label for period (Week vs Period based on feature flag)
    const getPeriodLabel = (singular = false) => {
        if (flexibleSubPeriodsEnabled) {
            return singular ? 'Period' : 'Periods';
        }
        return singular ? 'Week' : 'Weeks';
    };

    // Get total number of periods
    const getTotalPeriods = () => {
        return weeklyData?.salary_period?.weeks?.length || 4;
    };

    useEffect(() => {
        loadWeeklyData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Expose refresh method to parent via ref
    useImperativeHandle(ref, () => ({
        refresh: loadWeeklyData,
    }));

    const loadWeeklyData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/salary-periods/current');
            setWeeklyData(response.data);
            // Default to current week if no week selected
            if (!selectedWeek && response.data?.current_week) {
                setSelectedWeek(response.data.current_week.week_number);
            }
            setError(null);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('no_period');
            } else {
                setError('failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleWeekChange = (weekNumber) => {
        setSelectedWeek(weekNumber);
        if (onWeekChange) {
            // Find the budget period for this week
            const weekPeriod = weeklyData.salary_period.weeks?.find(
                (w) => w.week_number === weekNumber
            );
            if (weekPeriod) {
                onWeekChange(weekPeriod);
            }
        }
    };

    const getDisplayWeek = () => {
        if (!weeklyData?.salary_period?.weeks) return weeklyData?.current_week;
        return (
            weeklyData.salary_period.weeks.find((w) => w.week_number === selectedWeek) ||
            weeklyData.current_week
        );
    };

    const getProgress = () => {
        const displayWeek = getDisplayWeek();
        if (!displayWeek) return 0;
        const { spent, adjusted_budget, budget_amount } = displayWeek;
        const budget = adjusted_budget || budget_amount;
        return Math.min((spent / budget) * 100, 100);
    };

    const getProgressColor = () => {
        const progress = getProgress();
        if (progress >= 90) return 'bg-red-500';
        if (progress >= 75) return 'bg-yellow-500';
        return 'bg-bloom-mint';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-bloom-pink dark:border-dark-pink animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-dark-elevated rounded" />
            </div>
        );
    }

    if (error === 'no_period') {
        return (
            <div className="bg-gradient-to-br from-bloom-pink to-pink-600 dark:from-dark-pink dark:to-dark-pink-hover rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-white/20 dark:bg-black/20 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                        Set Up {flexibleSubPeriodsEnabled ? 'Budget Periods' : 'Weekly Budget'}
                    </h3>
                    <p className="text-sm opacity-90 mb-4">
                        Divide your salary into{' '}
                        {flexibleSubPeriodsEnabled ? 'budget periods' : '4 weekly budgets'}
                    </p>
                    <button
                        onClick={onSetupClick}
                        className="bg-white dark:bg-dark-surface text-bloom-pink dark:text-dark-pink px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        );
    }

    if (error === 'failed') {
        return (
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-red-200 dark:border-dark-danger">
                <p className="text-red-600 dark:text-dark-danger text-center">
                    Failed to load weekly budget
                </p>
            </div>
        );
    }

    const { salary_period, current_week } = weeklyData;
    const displayWeek = getDisplayWeek();
    const progress = getProgress();
    const isCurrentWeek = displayWeek?.week_number === current_week?.week_number;

    return (
        <div className="bg-gradient-to-br from-bloom-pink to-pink-600 dark:from-dark-pink-surface dark:to-dark-surface rounded-2xl shadow-lg p-6 text-white dark:border-2 dark:border-dark-border">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 dark:bg-black/20 rounded-full flex items-center justify-center font-bold text-xl">
                        {displayWeek?.week_number || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold">
                                {getPeriodLabel(true)} {displayWeek?.week_number || '?'} of{' '}
                                {getTotalPeriods()}
                            </h2>
                            {isCurrentWeek && (
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                                    Current
                                </span>
                            )}
                        </div>
                        <p className="text-xs opacity-75 mt-0.5">
                            {displayWeek?.start_date &&
                                (() => {
                                    const d = new Date(displayWeek.start_date);
                                    return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                })()}{' '}
                            -{' '}
                            {displayWeek?.end_date &&
                                (() => {
                                    const d = new Date(displayWeek.end_date);
                                    return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                })()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Week Navigation Dropdown */}
                    {salary_period?.weeks && salary_period.weeks.length > 1 && (
                        <select
                            value={selectedWeek || ''}
                            onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                            className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/30 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
                        >
                            {salary_period.weeks.map((week) => (
                                <option
                                    key={week.week_number}
                                    value={week.week_number}
                                    className="text-gray-800"
                                >
                                    {getPeriodLabel(true)} {week.week_number}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={onSetupClick}
                        className="text-white/80 hover:text-white transition"
                        title="Manage salary period"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {/* Show carryover if exists */}
                {displayWeek?.carryover !== undefined && displayWeek.carryover !== 0 && (
                    <div
                        className={`flex justify-between items-baseline text-sm ${displayWeek.carryover < 0 ? 'text-red-200' : 'text-green-200'}`}
                    >
                        <span className="opacity-90">
                            {displayWeek.carryover < 0
                                ? `⚠️ Overspent from previous ${flexibleSubPeriodsEnabled ? 'periods' : 'weeks'}`
                                : `✨ Leftover from previous ${flexibleSubPeriodsEnabled ? 'periods' : 'weeks'}`}
                        </span>
                        <span className="font-semibold">
                            {fcEur(Math.abs(displayWeek.carryover))}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-baseline">
                    <span className="text-sm opacity-90">Base Budget</span>
                    <span className="text-xl font-semibold">
                        {fcEur(displayWeek?.budget_amount || 0)}
                    </span>
                </div>

                {displayWeek?.adjusted_budget !== displayWeek?.budget_amount && (
                    <div className="flex justify-between items-baseline border-t border-white/20 pt-2">
                        <span className="text-sm opacity-90 font-semibold">Adjusted Budget</span>
                        <span className="text-2xl font-bold">
                            {fcEur(displayWeek?.adjusted_budget || 0)}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-baseline">
                    <span className="text-sm opacity-90">Spent</span>
                    <span className="text-xl font-semibold">{fcEur(displayWeek?.spent || 0)}</span>
                </div>

                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${getProgressColor()}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex justify-between items-baseline pt-2">
                    <span className="text-sm opacity-90">Remaining</span>
                    <span
                        className={`text-2xl font-bold ${displayWeek?.remaining < 0 ? 'text-red-200' : ''}`}
                    >
                        {fcEur(displayWeek?.remaining || 0)}
                    </span>
                </div>
            </div>

            {progress >= 90 && (
                <div className="mt-4 bg-white/20 rounded-lg p-3">
                    <p className="text-xs font-medium">
                        ⚠️ You've spent {progress.toFixed(0)}% of your{' '}
                        {flexibleSubPeriodsEnabled ? 'period' : 'weekly'} budget
                    </p>
                </div>
            )}

            {displayWeek?.remaining > 0 && (
                <button
                    onClick={() =>
                        onAllocateClick(weeklyData.salary_period.id, displayWeek.week_number)
                    }
                    className="mt-4 w-full bg-white text-bloom-pink py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
                >
                    💰 Allocate Leftover ({fcEur(displayWeek.remaining)})
                </button>
            )}
        </div>
    );
});

WeeklyBudgetCard.displayName = 'WeeklyBudgetCard';

export default WeeklyBudgetCard;
