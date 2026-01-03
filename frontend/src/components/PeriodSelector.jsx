/**
 * Bloom - Period Selector
 *
 * Component for selecting and switching between budget periods.
 * Shows salary periods in a list with expandable sub-periods.
 */

import { useState, useEffect } from 'react';

function PeriodSelector({ currentPeriod, periods, onPeriodChange, onCreateNew, onEdit, onDelete }) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [expandedPeriods, setExpandedPeriods] = useState({});

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    };

    const formatShortDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        return `${day} ${month}`;
    };

    const getPeriodLabel = (period) => {
        return `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`;
    };

    const getPeriodShortLabel = (period) => {
        return `${formatShortDate(period.start_date)} - ${formatShortDate(period.end_date)}`;
    };

    const getPeriodTypeLabel = (period) => {
        // Salary periods have weekly_budget field and optional num_sub_periods
        if (period.weekly_budget !== undefined) {
            const numPeriods = period.num_sub_periods || 4;
            if (numPeriods === 1) {
                return 'Single Period';
            } else if (numPeriods === 4) {
                return '4-Week Salary Period';
            } else {
                return `${numPeriods}-Period Salary Cycle`;
            }
        }
        // Budget periods with week number
        if (period.week_number) {
            return `Period ${period.week_number}`;
        }
        // Budget periods (old system)
        if (!period.period_type) return 'Weekly';
        return period.period_type.charAt(0).toUpperCase() + period.period_type.slice(1);
    };

    // Helper to get human-readable sub-period description
    const getSubPeriodDescription = () => {
        if (!currentPeriod) return 'Each period has 4 weekly budgets';

        // Find the salary period that matches (either current is salary period or its parent)
        const salaryPeriod =
            currentPeriod.weekly_budget !== undefined
                ? currentPeriod
                : periods.find(
                      (p) =>
                          p.id === currentPeriod.salary_period_id && p.weekly_budget !== undefined
                  );

        const numPeriods = salaryPeriod?.num_sub_periods || 4;
        if (numPeriods === 1) {
            return 'Single budget period';
        } else if (numPeriods === 4) {
            return 'Each period has 4 weekly budgets';
        } else {
            return `Each period has ${numPeriods} sub-periods`;
        }
    };

    const isPeriodCurrent = (period) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(period.start_date + 'T00:00:00');
        const end = new Date(period.end_date + 'T00:00:00');
        return today >= start && today <= end;
    };

    const isPeriodPast = (period) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(period.end_date + 'T00:00:00');
        return end < today;
    };

    const isPeriodFuture = (period) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(period.start_date + 'T00:00:00');
        return start > today;
    };

    const getCurrentPeriodFromList = () => {
        return periods.find((p) => isPeriodCurrent(p));
    };

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.period-selector')) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentPeriod) {
        return (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow px-4 py-2">
                <button
                    onClick={onCreateNew}
                    className="text-bloom-pink dark:text-dark-pink font-semibold hover:underline"
                >
                    + Create Salary Period
                </button>
            </div>
        );
    }

    return (
        <div className="period-selector relative">
            <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="bg-white dark:bg-dark-surface border-2 border-gray-300 dark:border-dark-border rounded-lg shadow px-4 py-2 hover:border-bloom-pink dark:hover:border-dark-pink hover:shadow-md transition flex items-center gap-3"
            >
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-bloom-pink dark:text-dark-pink font-semibold uppercase">
                            {getPeriodTypeLabel(currentPeriod)}
                        </p>
                        {isPeriodCurrent(currentPeriod) && (
                            <span className="bg-bloom-mint text-green-800 text-xs px-2 py-0.5 rounded-full">
                                Current
                            </span>
                        )}
                        {isPeriodPast(currentPeriod) && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                Past
                            </span>
                        )}
                        {isPeriodFuture(currentPeriod) && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                Future
                            </span>
                        )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-dark-text">
                        {getPeriodLabel(currentPeriod)}
                    </p>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-500 dark:text-dark-text-tertiary transition-transform ${showCalendar ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {showCalendar && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-dark-border w-[95vw] sm:w-auto sm:min-w-[500px] max-w-[500px] z-50">
                    {/* Header with quick actions */}
                    <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-dark-text">
                                    Salary Periods
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-0.5">
                                    {getSubPeriodDescription()}
                                </p>
                            </div>
                            {getCurrentPeriodFromList() &&
                                currentPeriod.id !== getCurrentPeriodFromList().id && (
                                    <button
                                        onClick={() => {
                                            onPeriodChange(getCurrentPeriodFromList());
                                            setShowCalendar(false);
                                        }}
                                        className="text-xs text-white bg-green-600 hover:bg-green-700 transition px-3 py-1 rounded"
                                    >
                                        ← Current Period
                                    </button>
                                )}
                        </div>
                    </div>

                    {/* Period list */}
                    <div className="p-2 max-h-[400px] overflow-y-auto">
                        <div className="space-y-3">
                            {/* Group by salary periods - only show salary periods, not weeks */}
                            {periods
                                .filter((p) => p.weekly_budget !== undefined)
                                .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                                .map((salaryPeriod) => {
                                    const isCurrent = isPeriodCurrent(salaryPeriod);
                                    const isPast = isPeriodPast(salaryPeriod);
                                    const isFuture = isPeriodFuture(salaryPeriod);
                                    const isSelected = currentPeriod.id === salaryPeriod.id;

                                    // Find weeks that belong to this salary period
                                    const relatedWeeks = periods
                                        .filter(
                                            (p) =>
                                                p.salary_period_id === salaryPeriod.id &&
                                                p.week_number
                                        )
                                        .sort((a, b) => a.week_number - b.week_number);

                                    return (
                                        <div
                                            key={`salary-${salaryPeriod.id}`}
                                            className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden"
                                        >
                                            {/* Salary Period Header */}
                                            <div
                                                className={`group transition ${
                                                    isSelected
                                                        ? 'bg-pink-100 dark:bg-dark-pink/20 border-b-2 border-pink-300 dark:border-dark-pink'
                                                        : isCurrent
                                                          ? 'bg-green-100 dark:bg-green-950/30 border-b-2 border-green-300 dark:border-green-700 hover:bg-green-150'
                                                          : 'bg-gray-50 dark:bg-dark-elevated border-b border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-elevated/80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <button
                                                        onClick={() => {
                                                            onPeriodChange(salaryPeriod);
                                                            setShowCalendar(false);
                                                        }}
                                                        className="flex-1 text-left"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs font-bold text-bloom-pink dark:text-dark-pink uppercase">
                                                                        {getPeriodTypeLabel(
                                                                            salaryPeriod
                                                                        )}
                                                                    </p>
                                                                    {isCurrent && (
                                                                        <span className="text-xs bg-bloom-mint text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                                                                            Now
                                                                        </span>
                                                                    )}
                                                                    {isPast && (
                                                                        <span className="text-xs bg-gray-400 dark:bg-gray-700 text-white px-2 py-0.5 rounded-full">
                                                                            Past
                                                                        </span>
                                                                    )}
                                                                    {isFuture && (
                                                                        <span className="text-xs bg-blue-600 dark:bg-blue-800 text-white px-2 py-0.5 rounded-full">
                                                                            Future
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="font-bold text-gray-900 dark:text-dark-text">
                                                                    {getPeriodLabel(salaryPeriod)}
                                                                </p>
                                                            </div>
                                                            {isSelected && (
                                                                <svg
                                                                    className="w-5 h-5 text-bloom-pink"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </button>
                                                    <div className="flex gap-1 ml-2">
                                                        {/* Expand/collapse button */}
                                                        {relatedWeeks.length > 0 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedPeriods((prev) => ({
                                                                        ...prev,
                                                                        [salaryPeriod.id]:
                                                                            !prev[salaryPeriod.id],
                                                                    }));
                                                                }}
                                                                className="p-1 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text transition"
                                                                title={
                                                                    expandedPeriods[salaryPeriod.id]
                                                                        ? 'Collapse sub-periods'
                                                                        : 'Expand sub-periods'
                                                                }
                                                            >
                                                                <svg
                                                                    className={`w-4 h-4 transition-transform ${expandedPeriods[salaryPeriod.id] ? 'rotate-180' : ''}`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 9l-7 7-7-7"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEdit(salaryPeriod);
                                                                    setShowCalendar(false);
                                                                }}
                                                                className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                                                                title="Edit salary period"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteConfirm({
                                                                        period: salaryPeriod,
                                                                        closeCalendar: true,
                                                                    });
                                                                }}
                                                                className="p-1 text-red-600 dark:text-dark-danger hover:text-red-800 dark:hover:text-red-500 transition"
                                                                title="Delete salary period"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Weekly Budget Periods - collapsible */}
                                            {relatedWeeks.length > 0 &&
                                                expandedPeriods[salaryPeriod.id] && (
                                                    <div className="bg-white dark:bg-dark-surface">
                                                        {relatedWeeks.map((week) => {
                                                            const weekCurrent =
                                                                isPeriodCurrent(week);
                                                            const weekSelected =
                                                                currentPeriod.id === week.id;

                                                            return (
                                                                <div
                                                                    key={`week-${week.id}`}
                                                                    className={`group border-t border-gray-100 dark:border-dark-border transition ${
                                                                        weekSelected
                                                                            ? 'bg-pink-50 dark:bg-dark-pink/20'
                                                                            : weekCurrent
                                                                              ? 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/40'
                                                                              : 'hover:bg-gray-50 dark:hover:bg-dark-elevated/50'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between px-4 py-2 pl-8">
                                                                        <button
                                                                            onClick={() => {
                                                                                onPeriodChange(
                                                                                    week
                                                                                );
                                                                                setShowCalendar(
                                                                                    false
                                                                                );
                                                                            }}
                                                                            className="flex-1 text-left"
                                                                        >
                                                                            <div className="flex justify-between items-center">
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs text-gray-600 dark:text-dark-text-secondary font-semibold">
                                                                                            {getPeriodTypeLabel(
                                                                                                week
                                                                                            )}
                                                                                        </span>
                                                                                        {weekCurrent && (
                                                                                            <span className="text-xs bg-bloom-mint text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                                                                                                Now
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-sm text-gray-700 dark:text-dark-text">
                                                                                        {getPeriodLabel(
                                                                                            week
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                                {weekSelected && (
                                                                                    <svg
                                                                                        className="w-4 h-4 text-bloom-pink"
                                                                                        fill="currentColor"
                                                                                        viewBox="0 0 20 20"
                                                                                    >
                                                                                        <path
                                                                                            fillRule="evenodd"
                                                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                                            clipRule="evenodd"
                                                                                        />
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Footer with create button */}
                    <div className="border-t border-gray-200 p-2">
                        <button
                            onClick={() => {
                                onCreateNew();
                                setShowCalendar(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-elevated transition text-bloom-pink dark:text-dark-pink font-semibold"
                        >
                            + Create New Salary Period
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">
                            Delete Budget Period?
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-2">
                            Are you sure you want to delete the period:
                        </p>
                        <p className="text-gray-800 dark:text-dark-text font-semibold mb-4">
                            {getPeriodLabel(deleteConfirm.period)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-6">
                            This action cannot be undone. All transactions in this period will be
                            deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-dark-elevated/80 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(deleteConfirm.period.id);
                                    if (deleteConfirm.closeCalendar) {
                                        setShowCalendar(false);
                                    }
                                    setDeleteConfirm(null);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PeriodSelector;
