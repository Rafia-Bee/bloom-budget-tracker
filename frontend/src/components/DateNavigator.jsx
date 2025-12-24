/**
 * Bloom - Date Navigator Component
 *
 * Provides day-by-day navigation for browsing transactions.
 * Shows Previous/Today/Next buttons to jump between dates that have transactions.
 */

import { useMemo } from 'react'

function DateNavigator({
  transactionDates = [],
  currentViewDate,
  onDateChange,
  className = ''
}) {
  // Get today's date in ISO format
  const today = useMemo(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }, [])

  // Current date in ISO format for comparison
  const currentDateISO = useMemo(() => {
    if (!currentViewDate) return today
    return currentViewDate
  }, [currentViewDate, today])

  // Find previous and next dates with transactions
  const { prevDate, nextDate, isOnToday } = useMemo(() => {
    const sortedDates = [...transactionDates].sort()
    const currentIndex = sortedDates.indexOf(currentDateISO)

    // Check if currently viewing today
    const viewingToday = currentDateISO === today

    // Find previous date
    let prev = null
    if (currentIndex > 0) {
      prev = sortedDates[currentIndex - 1]
    } else if (currentIndex === -1) {
      // Current date not in list - find the closest previous date
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i] < currentDateISO) {
          prev = sortedDates[i]
          break
        }
      }
    }

    // Find next date
    let next = null
    if (currentIndex >= 0 && currentIndex < sortedDates.length - 1) {
      next = sortedDates[currentIndex + 1]
    } else if (currentIndex === -1) {
      // Current date not in list - find the closest next date
      for (let i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] > currentDateISO) {
          next = sortedDates[i]
          break
        }
      }
    }

    return {
      prevDate: prev,
      nextDate: next,
      isOnToday: viewingToday
    }
  }, [transactionDates, currentDateISO, today])

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handlePrevious = () => {
    if (prevDate) {
      onDateChange(prevDate)
    }
  }

  const handleNext = () => {
    if (nextDate) {
      onDateChange(nextDate)
    }
  }

  const handleToday = () => {
    onDateChange(today)
  }

  const handleClear = () => {
    onDateChange(null)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrevious}
          disabled={!prevDate}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm font-medium
            ${prevDate
              ? 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
              : 'bg-gray-50 dark:bg-dark-base text-gray-400 dark:text-dark-text-tertiary cursor-not-allowed'
            }`}
          aria-label="Previous day with transactions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className={`px-4 py-2 rounded-lg transition text-sm font-medium
              ${isOnToday
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!nextDate}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm font-medium
            ${nextDate
              ? 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
              : 'bg-gray-50 dark:bg-dark-base text-gray-400 dark:text-dark-text-tertiary cursor-not-allowed'
            }`}
          aria-label="Next day with transactions"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
  )
}

export default DateNavigator
