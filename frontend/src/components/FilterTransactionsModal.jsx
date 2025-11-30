/**
 * FilterTransactionsModal - Transaction filtering interface
 *
 * Provides comprehensive filtering options for transactions:
 * - Date range (start/end dates)
 * - Categories and subcategories
 * - Payment methods (Debit/Credit)
 * - Amount range (min/max)
 * - Search text (name/notes)
 * - Transaction type (Expense/Income/Both)
 */

import { useState, useEffect } from 'react'

export default function FilterTransactionsModal({ isOpen, onClose, onApply, initialFilters }) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    subcategory: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    transactionType: 'both' // 'expense', 'income', 'both'
  })

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleClear = () => {
    const clearedFilters = {
      startDate: '',
      endDate: '',
      category: '',
      subcategory: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: '',
      search: '',
      transactionType: 'both'
    }
    setFilters(clearedFilters)
    onApply(clearedFilters)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Filter Transactions</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFilters({ ...filters, transactionType: 'both' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  filters.transactionType === 'both'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setFilters({ ...filters, transactionType: 'expense' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  filters.transactionType === 'expense'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilters({ ...filters, transactionType: 'income' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  filters.transactionType === 'income'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search (Name/Notes)
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search transactions..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              />
            </div>
          </div>

          {/* Category (Expenses only) */}
          {filters.transactionType !== 'income' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="Flexible Expenses">Flexible Expenses</option>
                <option value="Fixed Expenses">Fixed Expenses</option>
                <option value="Debt Payments">Debt Payments</option>
                <option value="Debt">Debt</option>
              </select>
            </div>
          )}

          {/* Subcategory (Expenses only) */}
          {filters.transactionType !== 'income' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                value={filters.subcategory || ''}
                onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                <option value="">All Subcategories</option>
                <option value="Transportation">Transportation</option>
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Utilities">Utilities</option>
                <option value="Insurance">Insurance</option>
                <option value="Rent">Rent</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
          )}

          {/* Payment Method (Expenses only) */}
          {filters.transactionType !== 'income' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              >
                <option value="">All Methods</option>
                <option value="Debit card">Debit Card</option>
                <option value="credit">Credit Card</option>
              </select>
            </div>
          )}

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Amount (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Amount (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="999.99"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 bg-bloom-pink text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
