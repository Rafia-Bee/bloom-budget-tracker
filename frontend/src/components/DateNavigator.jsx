/**
 * Bloom - Date Navigator Component
 *
 * Provides day-by-day navigation for browsing transactions.
 * Shows Previous/Today/Next buttons to jump between dates that have transactions.
 * When a period is selected, Previous navigates to transactions before the period's start,
 * and Next navigates to transactions after the period's end.
 *
 * Special behavior for CURRENT period (period that contains today):
 * - "Next" finds the next transaction date FROM TODAY (skips past dates)
 * - This helps users quickly find their next scheduled payment
 *
 * No-period mode:
 * - Shows all transactions up to today
 * - "Previous" navigates to past transaction dates
 * - "Next" navigates to scheduled transaction dates (future)
 */

import { useMemo } from 'react';

function DateNavigator({
    transactionDates = [],
    scheduledDates = [],
    currentViewDate,
    onDateChange,
    className = '',
    selectedPeriod = null,
}) {
    // Get today's date in ISO format
    const today = useMemo(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }, []);

    // Get period boundaries if a period is selected
    const periodBoundaries = useMemo(() => {
        if (!selectedPeriod) return null;
        return {
            start: selectedPeriod.start_date,
            end: selectedPeriod.end_date,
        };
    }, [selectedPeriod]);

    // Check if the selected period is the CURRENT period (contains today)
    const isCurrentPeriod = useMemo(() => {
        if (!periodBoundaries) return false;
        return today >= periodBoundaries.start && today <= periodBoundaries.end;
    }, [periodBoundaries, today]);

    // Current date in ISO format for comparison
    // If viewing a period (currentViewDate is null) and we have period boundaries,
    // use the period's start date as the reference point for navigation
    // EXCEPT for "Next" button in current period - that uses today (handled below)
    const currentDateISO = useMemo(() => {
        if (currentViewDate) return currentViewDate;
        // If no specific date selected but viewing a period, use period's start date
        if (periodBoundaries) return periodBoundaries.start;
        return today;
    }, [currentViewDate, periodBoundaries, today]);

    // Check if we're in no-period mode (no selectedPeriod)
    const isNoPeriodMode = !selectedPeriod;

    // Find previous and next dates with transactions
    const { prevDate, nextDate, isOnToday } = useMemo(() => {
        const sortedDates = [...transactionDates].sort();
        const currentIndex = sortedDates.indexOf(currentDateISO);

        // Check if currently viewing today
        const viewingToday = currentDateISO === today;

        // Find previous date
        let prev = null;
        if (currentIndex > 0) {
            prev = sortedDates[currentIndex - 1];
        } else if (currentIndex === -1) {
            // Current date not in list - find the closest previous date
            // If we have period boundaries and are before/at start, find date before period start
            if (periodBoundaries && currentDateISO <= periodBoundaries.start) {
                for (let i = sortedDates.length - 1; i >= 0; i--) {
                    if (sortedDates[i] < periodBoundaries.start) {
                        prev = sortedDates[i];
                        break;
                    }
                }
            } else {
                for (let i = sortedDates.length - 1; i >= 0; i--) {
                    if (sortedDates[i] < currentDateISO) {
                        prev = sortedDates[i];
                        break;
                    }
                }
            }
        }

        // Find next date
        // SPECIAL CASE 1: For current period with no specific date selected,
        // "Next" should find the next transaction FROM TODAY, not from period start
        // SPECIAL CASE 2: For no-period mode, "Next" should look at scheduled dates (future)
        let next = null;

        if (isNoPeriodMode) {
            // In no-period mode, "Next" looks for scheduled (future) transactions
            const sortedScheduledDates = [...scheduledDates].sort();
            const referenceDate = currentViewDate || today;

            for (let i = 0; i < sortedScheduledDates.length; i++) {
                if (sortedScheduledDates[i] > referenceDate) {
                    next = sortedScheduledDates[i];
                    break;
                }
            }
        } else {
            // Period mode: use existing logic
            const nextReferenceDate = isCurrentPeriod && !currentViewDate ? today : currentDateISO;
            const nextRefIndex = sortedDates.indexOf(nextReferenceDate);

            if (nextRefIndex >= 0 && nextRefIndex < sortedDates.length - 1) {
                next = sortedDates[nextRefIndex + 1];
            } else if (nextRefIndex === -1) {
                // Reference date not in list - find the closest next date
                // If we have period boundaries and are at/after end, find date after period end
                if (periodBoundaries && nextReferenceDate >= periodBoundaries.end) {
                    for (let i = 0; i < sortedDates.length; i++) {
                        if (sortedDates[i] > periodBoundaries.end) {
                            next = sortedDates[i];
                            break;
                        }
                    }
                } else {
                    for (let i = 0; i < sortedDates.length; i++) {
                        if (sortedDates[i] > nextReferenceDate) {
                            next = sortedDates[i];
                            break;
                        }
                    }
                }
            }
        }

        return {
            prevDate: prev,
            nextDate: next,
            isOnToday: viewingToday,
        };
    }, [
        transactionDates,
        scheduledDates,
        currentDateISO,
        today,
        isNoPeriodMode,
        periodBoundaries,
        isCurrentPeriod,
        currentViewDate,
    ]);

    // Format date for display
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const handlePrevious = () => {
        if (prevDate) {
            onDateChange(prevDate);
        }
    };

    const handleNext = () => {
        if (nextDate) {
            onDateChange(nextDate);
        }
    };

    const handleToday = () => {
        onDateChange(today);
    };

    const handleClear = () => {
        onDateChange(null);
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={!prevDate}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm font-medium
            ${
                prevDate
                    ? 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                    : 'bg-gray-50 dark:bg-dark-base text-gray-400 dark:text-dark-text-tertiary cursor-not-allowed'
            }`}
                    aria-label="Previous day with transactions"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToday}
                        className={`px-4 py-2 rounded-lg transition text-sm font-medium
              ${
                  isOnToday
                      ? 'bg-bloom-pink text-white'
                      : 'bg-bloom-pink/10 dark:bg-bloom-pink/20 text-bloom-pink hover:bg-bloom-pink/20 dark:hover:bg-bloom-pink/30'
              }`}
                    >
                        Today
                    </button>

                    {currentViewDate && (
                        <button
                            onClick={handleClear}
                            className="px-3 py-2 rounded-lg transition text-sm font-medium bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border"
                            title="Clear date filter"
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                <button
                    onClick={handleNext}
                    disabled={!nextDate}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm font-medium
            ${
                nextDate
                    ? 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                    : 'bg-gray-50 dark:bg-dark-base text-gray-400 dark:text-dark-text-tertiary cursor-not-allowed'
            }`}
                    aria-label="Next day with transactions"
                >
                    <span className="hidden sm:inline">Next</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>
            </div>

            {/* Current date display */}
            {currentViewDate && (
                <div className="text-center text-sm text-gray-600 dark:text-dark-text-secondary">
                    <span className="font-medium">Showing:</span>{' '}
                    <span className="text-bloom-pink dark:text-dark-pink">
                        {formatDisplayDate(currentViewDate)}
                    </span>
                </div>
            )}
        </div>
    );
}

export default DateNavigator;
