/**
 * Bloom - Add Income Modal
 *
 * Modal dialog for adding income entries (salary, bonus, freelance, other).
 * Supports creating one-time income or recurring income templates.
 * Recurring option only visible when recurringIncomeEnabled feature flag is on.
 */

import { useState } from 'react';
import { recurringIncomeAPI } from '../api';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';
import CurrencySelector from './CurrencySelector';

function AddIncomeModal({ onClose, onAdd }) {
    const [type, setType] = useState('Salary');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Recurring income states
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState('monthly');
    const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());
    const [dayOfWeek, setDayOfWeek] = useState(0);
    const [frequencyValue, setFrequencyValue] = useState(30);

    const { isEnabled } = useFeatureFlag();
    const recurringIncomeEnabled = isEnabled('recurringIncomeEnabled');

    const incomeTypes = ['Salary', 'Bonus', 'Freelance', 'Rental', 'Dividends', 'Other'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const amountInCents = Math.round(parseFloat(amount) * 100);

            if (isRecurring && recurringIncomeEnabled) {
                // Create recurring income template
                const recurringData = {
                    name: type, // Use type as name for recurring income
                    amount: amountInCents,
                    income_type: type,
                    frequency,
                    frequency_value: frequency === 'custom' ? frequencyValue : null,
                    day_of_month: frequency === 'monthly' ? dayOfMonth : null,
                    day_of_week:
                        frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
                    start_date: date,
                    is_active: true,
                };

                await recurringIncomeAPI.create(recurringData);
                onClose();
            } else {
                // Create one-time income
                await onAdd({
                    type,
                    amount: amountInCents,
                    currency,
                    date,
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add income');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 pb-4 border-b dark:border-dark-border">
                    <h2 className="text-2xl font-bold text-bloom-mint dark:text-bloom-mint">
                        Add Income
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

                <form
                    id="add-income-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
                >
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
                            Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint"
                        >
                            {incomeTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Amount
                        </label>
                        <div className="flex gap-2 w-full">
                            <CurrencySelector
                                value={currency}
                                onChange={setCurrency}
                                compact={true}
                                showLabel={false}
                                className="w-20 sm:w-24 flex-shrink-0"
                            />
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                // For recurring monthly, sync day of month
                                if (isRecurring && frequency === 'monthly') {
                                    const selectedDate = new Date(e.target.value);
                                    setDayOfMonth(selectedDate.getDate());
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint"
                            placeholder="DD/MM/YYYY"
                            required
                        />
                    </div>

                    {/* Recurring Income Toggle - only shown when feature enabled */}
                    {recurringIncomeEnabled && (
                        <div className="border-t dark:border-dark-border pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="w-5 h-5 text-bloom-mint focus:ring-bloom-mint rounded"
                                />
                                <span className="text-gray-700 dark:text-dark-text font-semibold">
                                    Make this a recurring income
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Recurring Income Options */}
                    {isRecurring && recurringIncomeEnabled && (
                        <div className="bg-emerald-50 dark:bg-dark-elevated border border-emerald-200 dark:border-dark-border rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-emerald-900 dark:text-bloom-mint mb-2">
                                Recurrence Schedule
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                    Frequency
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint text-sm"
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Biweekly (Every 2 weeks)</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="custom">Custom (Every X days)</option>
                                </select>
                            </div>

                            {(frequency === 'weekly' || frequency === 'biweekly') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                        Day of Week
                                    </label>
                                    <select
                                        value={dayOfWeek}
                                        onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint text-sm"
                                    >
                                        {weekDays.map((day, index) => (
                                            <option key={index} value={index}>
                                                {day}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                        Day of Month
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={dayOfMonth}
                                        onChange={(e) => {
                                            const newDay = parseInt(e.target.value);
                                            setDayOfMonth(newDay);
                                            // Update date to use the selected day
                                            const currentDate = new Date(date);
                                            currentDate.setDate(newDay);
                                            setDate(currentDate.toISOString().split('T')[0]);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint text-sm"
                                    />
                                </div>
                            )}

                            {frequency === 'custom' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                        Repeat every X days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={frequencyValue}
                                        onChange={(e) =>
                                            setFrequencyValue(parseInt(e.target.value))
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-mint text-sm"
                                    />
                                </div>
                            )}

                            <p className="text-xs text-emerald-700 dark:text-dark-text-secondary mt-2">
                                Start date will be:{' '}
                                {(() => {
                                    const d = new Date(date);
                                    return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
                                })()}
                            </p>
                        </div>
                    )}
                </form>

                <div className="border-t dark:border-dark-border p-6 pt-4">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-income-form"
                            disabled={loading}
                            className="flex-1 bg-bloom-mint text-green-800 dark:text-green-900 px-4 py-2 rounded-lg hover:bg-bloom-mint/80 transition disabled:opacity-50 font-semibold"
                        >
                            {loading
                                ? 'Adding...'
                                : isRecurring && recurringIncomeEnabled
                                  ? 'Create Template'
                                  : 'Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddIncomeModal;
