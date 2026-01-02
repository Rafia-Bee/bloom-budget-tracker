/**
 * Bloom - Add Debt Payment Modal
 *
 * Simplified modal for adding debt payments with pre-filled category.
 * Shows dropdown of existing debts and autofills payment amounts.
 */

import { useState, useEffect } from 'react';
import { debtAPI } from '../api';
import { logError } from '../utils/logger';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';

function AddDebtPaymentModal({ onClose, onAdd, preSelectedDebt }) {
    const { defaultCurrency } = useCurrency();
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const [selectedDebt, setSelectedDebt] = useState(preSelectedDebt || '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Debit card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [debts, setDebts] = useState([]);

    useEffect(() => {
        loadDebts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadDebts = async () => {
        try {
            const response = await debtAPI.getAll();
            setDebts(response.data);

            // If preSelectedDebt is provided, use it and set amount
            if (preSelectedDebt) {
                const debt = response.data.find((d) => d.name === preSelectedDebt);
                if (debt && debt.monthly_payment) {
                    setAmount((debt.monthly_payment / 100).toFixed(2));
                }
            } else if (response.data.length > 0) {
                // Otherwise, default to first debt
                const firstDebt = response.data[0];
                setSelectedDebt(firstDebt.name);
                setAmount((firstDebt.monthly_payment / 100).toFixed(2));
            }
        } catch (error) {
            logError('loadDebts', error);
            setError('Failed to load debts');
        }
    };

    const handleDebtChange = (debtName) => {
        setSelectedDebt(debtName);

        if (debtName === 'Credit Card') {
            setAmount('');
        } else {
            const debt = debts.find((d) => d.name === debtName);
            if (debt && debt.monthly_payment) {
                setAmount((debt.monthly_payment / 100).toFixed(2));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const amountInCents = Math.round(parseFloat(amount) * 100);
            await onAdd({
                name: `${selectedDebt} Payment`,
                amount: amountInCents,
                date,
                category: 'Debt Payments',
                subcategory: selectedDebt,
                payment_method: paymentMethod,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add debt payment');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">
                            Debt Payment
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                            Record a payment toward your debt
                        </p>
                    </div>
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
                                type="button"
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
                            Select Debt
                        </label>
                        <select
                            value={selectedDebt}
                            onChange={(e) => handleDebtChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                            required
                        >
                            <option value="">Choose a debt...</option>
                            <option value="Credit Card">Credit Card</option>
                            {debts.map((debt) => (
                                <option key={debt.id} value={debt.name}>
                                    {debt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Payment Amount ({currencySymbol})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                            placeholder="0.00"
                            required
                            min="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Payment Date
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
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
                        >
                            <option value="Debit card">Debit card</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank transfer">Bank transfer</option>
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
                            disabled={loading || !selectedDebt}
                            className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 transition disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddDebtPaymentModal;
