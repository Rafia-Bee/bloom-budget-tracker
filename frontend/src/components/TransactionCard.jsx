/**
 * TransactionCard - Memoized transaction display component
 *
 * Displays a single transaction (expense or income) with:
 * - Type indicator (income/debit/credit)
 * - Name and category/subcategory
 * - Amount with proper formatting
 * - Date
 * - Edit/Delete actions
 * - Optional selection checkbox
 * - Future transaction indicator
 * - Recurring expense indicator
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */

import { memo } from 'react'

const TransactionCard = memo(function TransactionCard({
  transaction,
  isSelected,
  selectionMode,
  onEdit,
  onDelete,
  onToggleSelection,
  formatCurrency
}) {
  const isFuture = new Date(transaction.date) > new Date()

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg hover:opacity-80 transition ${
        transaction.transactionType === 'income'
          ? 'bg-bloom-mint/20 dark:bg-bloom-mint/10'
          : 'bg-gray-50 dark:bg-dark-elevated'
      } ${isFuture ? 'opacity-60 border-2 border-dashed border-gray-300 dark:border-gray-600' : ''} ${
        isSelected ? 'ring-2 ring-bloom-pink' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(transaction.transactionType, transaction.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-bloom-pink rounded focus:ring-bloom-pink cursor-pointer"
          />
        )}

        <div
          className={`w-2 h-2 rounded-full ${
            transaction.transactionType === 'income'
              ? 'bg-bloom-mint'
              : transaction.payment_method === 'Credit card'
              ? 'bg-bloom-pink'
              : 'bg-bloom-mint'
          }`}
        ></div>
      </div>

      <div className="flex-1 ml-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 dark:text-dark-text">
            {transaction.transactionType === 'income' ? transaction.type : transaction.name}
          </h3>
          {isFuture && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          )}
          {transaction.transactionType === 'expense' && transaction.recurring_template_id && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Recurring
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {transaction.transactionType === 'expense'
            ? `${transaction.category} • ${transaction.subcategory}`
            : 'Income'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(transaction.date + 'T00:00:00').toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p
            className={`font-bold ${
              transaction.transactionType === 'income'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-dark-text'
            }`}
          >
            {transaction.transactionType === 'income' ? '+' : '-'}€{formatCurrency(transaction.amount)}
          </p>
          {transaction.transactionType === 'expense' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.payment_method}</p>
          )}
        </div>

        {!selectionMode && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(transaction)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => onDelete(transaction)}
              className="text-red-600 dark:text-dark-danger hover:text-red-800 dark:hover:text-red-400"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default TransactionCard
