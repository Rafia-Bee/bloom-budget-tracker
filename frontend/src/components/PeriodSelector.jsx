/**
 * Bloom - Period Selector
 *
 * Component for selecting and switching between budget periods.
 * Shows current period dates and allows creation of new periods.
 */

import { useState, useEffect } from 'react'

function PeriodSelector({ currentPeriod, periods, onPeriodChange, onCreateNew, onEdit, onDelete }) {
  const [showDropdown, setShowDropdown] = useState(false)

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getPeriodLabel = (period) => {
    return `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`
  }

  const getPeriodTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.period-selector')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!currentPeriod) {
    return (
      <div className="bg-white rounded-lg shadow px-4 py-2">
        <button
          onClick={onCreateNew}
          className="text-bloom-pink font-semibold hover:underline"
        >
          + Create First Budget Period
        </button>
      </div>
    )
  }

  return (
    <div className="period-selector relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50 transition flex items-center gap-3"
      >
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase">{getPeriodTypeLabel(currentPeriod.period_type)} Period</p>
          <p className="font-semibold text-gray-800">{getPeriodLabel(currentPeriod)}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[300px] z-50">
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {periods.map((period) => (
              <div
                key={period.id}
                className={`group rounded-lg hover:bg-gray-50 transition ${
                  currentPeriod.id === period.id ? 'bg-bloom-light' : ''
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => {
                      onPeriodChange(period)
                      setShowDropdown(false)
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">{getPeriodTypeLabel(period.period_type)}</p>
                        <p className="font-semibold text-gray-800">{getPeriodLabel(period)}</p>
                      </div>
                      {currentPeriod.id === period.id && (
                        <svg className="w-5 h-5 text-bloom-pink" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(period)
                        setShowDropdown(false)
                      }}
                      className="p-1 text-blue-500 hover:text-blue-700 transition"
                      title="Edit period"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete period ${getPeriodLabel(period)}?`)) {
                          onDelete(period.id)
                          setShowDropdown(false)
                        }
                      }}
                      className="p-1 text-red-500 hover:text-red-700 transition"
                      title="Delete period"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={() => {
                onCreateNew()
                setShowDropdown(false)
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition text-bloom-pink font-semibold"
            >
              + Create New Period
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeriodSelector
