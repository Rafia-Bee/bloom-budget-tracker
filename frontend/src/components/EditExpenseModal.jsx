/**
 * Bloom - Edit Expense Modal
 *
 * Modal dialog for editing existing expenses with pre-filled data.
 *
 * Optimization: Uses SharedDataContext for cached debts/subcategories (#164)
 */

import { useState, useEffect } from 'react';
import { useSharedData } from '../contexts/SharedDataContext';
import PropTypes from 'prop-types';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';

function EditExpenseModal({ onClose, onEdit, expense }) {
    const { defaultCurrency } = useCurrency();
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Use cached data from SharedDataContext instead of fetching each time modal opens
    const {
        debts,
        subcategories: subcategoriesData,
        ensureDebtsLoaded,
        ensureSubcategoriesLoaded,
    } = useSharedData();

    useEffect(() => {
        // Ensure data is loaded (uses cached data if already loaded)
        ensureDebtsLoaded();
        ensureSubcategoriesLoaded();
    }, [ensureDebtsLoaded, ensureSubcategoriesLoaded]);

    const categories = [
        'Fixed Expenses',
        'Flexible Expenses',
        'Savings & Investments',
        'Debt Payments',
    ];

    const getSubcategories = () => {
        // Use API data if available, otherwise fallback to hardcoded
        if (subcategoriesData[category]) {
            const subcats = subcategoriesData[category].map((s) =>
                typeof s === 'string' ? s : s.name
            );
            // Add debts to Debt Payments category
            if (category === 'Debt Payments') {
                return [...subcats, ...debts.map((d) => d.name)];
            }
            return subcats;
        }

        // Fallback to hardcoded subcategories
        const baseSubcategories = {
            'Fixed Expenses': ['Rent', 'Utilities', 'Insurance', 'Subscriptions', 'Other'],
            'Flexible Expenses': [
                'Food',
                'Transportation',
                'Entertainment',
                'Shopping',
                'Health',
                'Other',
            ],
            'Savings & Investments': ['Emergency Fund', 'Investments', 'Savings Goals', 'Other'],
            'Debt Payments': ['Credit Card', 'Other', ...debts.map((d) => d.name)],
        };
        return baseSubcategories[category] || [];
    };

    const subcategories = getSubcategories();

    const handleSubcategoryChange = (value) => {
        setSubcategory(value);

        // If Debt Payments category and a debt is selected, autofill the amount and name
        if (category === 'Debt Payments' && value !== 'Credit Card') {
            const selectedDebt = debts.find((d) => d.name === value);
            if (selectedDebt && selectedDebt.monthly_payment) {
                setAmount((selectedDebt.monthly_payment / 100).toFixed(2));
                setName(`${value} Payment`);
            }
        }
    };

    useEffect(() => {
        if (expense) {
            setName(expense.name);
            setAmount((expense.amount / 100).toFixed(2));
            // Convert date from "dd MMM, YYYY" to "YYYY-MM-DD" for date input
            const parsedDate = parseDisplayDate(expense.date);
            setDate(parsedDate);
            setCategory(expense.category);

            // Set subcategory - get subcategories for this category
            let expenseSubcats = [];
            if (subcategoriesData[expense.category]) {
                expenseSubcats = subcategoriesData[expense.category].map((s) =>
                    typeof s === 'string' ? s : s.name
                );
                if (expense.category === 'Debt Payments') {
                    expenseSubcats = [...expenseSubcats, ...debts.map((d) => d.name)];
                }
            }
            setSubcategory(expense.subcategory || expenseSubcats[0] || '');
            setPaymentMethod(expense.payment_method);
        }
    }, [expense, debts, subcategoriesData]); // Add dependencies to re-run when data loads

    const parseDisplayDate = (dateStr) => {
        // Parse "13 Nov, 2025" format to "2025-11-13"
        try {
            const months = {
                Jan: '01',
                Feb: '02',
                Mar: '03',
                Apr: '04',
                May: '05',
                Jun: '06',
                Jul: '07',
                Aug: '08',
                Sep: '09',
                Oct: '10',
                Nov: '11',
                Dec: '12',
            };
            const parts = dateStr.split(' ');
            const day = parts[0].padStart(2, '0');
            const month = months[parts[1].replace(',', '')];
            const year = parts[2];
            return `${year}-${month}-${day}`;
        } catch (err) {
            return new Date().toISOString().split('T')[0];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const amountInCents = Math.round(parseFloat(amount) * 100);
            await onEdit(expense.id, {
                name,
                amount: amountInCents,
                date,
                category,
                subcategory,
                payment_method: paymentMethod,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update expense');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">
                        Edit Expense
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-dark-text dark:hover:text-dark-text-secondary"
                    >
                        <svg
                            className="w-6 h-6"
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
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-100 dark:bg-red-950/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-dark-danger px-4 py-2 rounded flex justify-between items-start">
                            <span>{error}</span>
                            <button
                                onClick={() => setError('')}
                                className="text-red-700 dark:text-dark-danger hover:text-red-900 dark:hover:text-red-400 ml-4 flex-shrink-0"
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
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={200}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Amount ({currencySymbol})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => {
                                const newCategory = e.target.value;
                                setCategory(newCategory);

                                // Get subcategories for the new category
                                let newSubcats = [];
                                if (subcategoriesData[newCategory]) {
                                    newSubcats = subcategoriesData[newCategory].map((s) =>
                                        typeof s === 'string' ? s : s.name
                                    );
                                    if (newCategory === 'Debt Payments') {
                                        newSubcats = [...newSubcats, ...debts.map((d) => d.name)];
                                    }
                                } else {
                                    // Fallback to hardcoded
                                    const fallback = {
                                        'Fixed Expenses': [
                                            'Rent',
                                            'Utilities',
                                            'Insurance',
                                            'Subscriptions',
                                        ],
                                        'Flexible Expenses': [
                                            'Food',
                                            'Transportation',
                                            'Entertainment',
                                            'Shopping',
                                            'Health',
                                        ],
                                        'Savings & Investments': [
                                            'Emergency Fund',
                                            'Investments',
                                            'Savings Goals',
                                        ],
                                        'Debt Payments': [
                                            'Credit Card',
                                            ...debts.map((d) => d.name),
                                        ],
                                    };
                                    newSubcats = fallback[newCategory] || [];
                                }

                                if (newSubcats.length > 0) {
                                    setSubcategory(newSubcats[0]);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Subcategory
                        </label>
                        <select
                            value={subcategory}
                            onChange={(e) => handleSubcategoryChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                        >
                            {subcategories.map((sub) => (
                                <option key={sub} value={sub}>
                                    {sub}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                        >
                            <option value="Credit card">Credit card</option>
                            <option value="Debit card">Debit card</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 transition disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

EditExpenseModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func,
    expense: PropTypes.object,
};

export default EditExpenseModal;
