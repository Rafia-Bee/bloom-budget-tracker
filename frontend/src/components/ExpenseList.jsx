/**
 * Bloom - Expense List Component
 *
 * Displays expenses with filtering by payment method (All/Debit/Credit).
 * Shows expense details and provides delete functionality.
 */

import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

function ExpenseList({ expenses, onDelete }) {
    const { defaultCurrency } = useCurrency();
    const fc = (cents) => formatCurrency(cents, defaultCurrency);
    const [filter, setFilter] = useState('all');

    const filteredExpenses = expenses.filter((expense) => {
        if (filter === 'all') return true;
        if (filter === 'debit') return expense.payment_method === 'Debit card';
        if (filter === 'credit') return expense.payment_method === 'Credit card';
        return true;
    });

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Recent Expenses</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg transition ${
                            filter === 'all'
                                ? 'bg-bloom-pink text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('debit')}
                        className={`px-4 py-2 rounded-lg transition ${
                            filter === 'debit'
                                ? 'bg-bloom-mint text-green-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Debit
                    </button>
                    <button
                        onClick={() => setFilter('credit')}
                        className={`px-4 py-2 rounded-lg transition ${
                            filter === 'credit'
                                ? 'bg-bloom-pink text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Credit
                    </button>
                </div>
            </div>

            {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <svg
                        className="w-16 h-16 mx-auto mb-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <p>No expenses yet. Start tracking your spending!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredExpenses.map((expense) => (
                        <div
                            key={expense.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            expense.payment_method === 'Credit card'
                                                ? 'bg-bloom-pink'
                                                : 'bg-bloom-mint'
                                        }`}
                                    ></div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {expense.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {expense.category} • {expense.subcategory}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{fc(expense.amount)}</p>
                                    <p className="text-sm text-gray-500">{expense.date}</p>
                                </div>
                                <button
                                    onClick={() => onDelete(expense.id)}
                                    className="text-red-500 hover:text-red-700 transition"
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
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ExpenseList;
