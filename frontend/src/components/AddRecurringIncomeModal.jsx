/**
 * Bloom - Add Recurring Income Modal (Issue #177)
 *
 * Modal dialog for creating recurring income templates with frequency scheduling.
 * Supports weekly, biweekly, monthly, and custom day intervals.
 */

import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';

function AddRecurringIncomeModal({ onClose, onAdd, existingIncome = null }) {
    const { defaultCurrency } = useCurrency();
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const isEditing = !!existingIncome;

    const [name, setName] = useState(existingIncome?.name || 'Monthly Salary');
    const [amount, setAmount] = useState(
        existingIncome?.amount ? (existingIncome.amount / 100).toFixed(2) : ''
    );
    const [incomeType, setIncomeType] = useState(existingIncome?.income_type || 'Salary');
    const [currency, setCurrency] = useState(existingIncome?.currency || 'EUR');
    const [frequency, setFrequency] = useState(existingIncome?.frequency || 'monthly');
    const [frequencyValue, setFrequencyValue] = useState(existingIncome?.frequency_value || 30);
    const [dayOfMonth, setDayOfMonth] = useState(
        existingIncome?.day_of_month || new Date().getDate()
    );
    const [dayOfWeek, setDayOfWeek] = useState(existingIncome?.day_of_week || 0);
    const [startDate, setStartDate] = useState(
        existingIncome?.start_date || new Date().toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(existingIncome?.end_date || '');
    const [notes, setNotes] = useState(existingIncome?.notes || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const incomeTypes = ['Salary', 'Bonus', 'Freelance', 'Rental', 'Dividends', 'Other'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const amountInCents = Math.round(parseFloat(amount) * 100);
            const data = {
                name,
                amount: amountInCents,
                income_type: incomeType,
                currency,
                frequency,
                frequency_value: frequency === 'custom' ? frequencyValue : null,
                day_of_month: frequency === 'monthly' ? dayOfMonth : null,
                day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
                start_date: startDate,
                end_date: endDate || null,
                notes: notes || null,
                is_active: true,
            };

            await onAdd(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save recurring income');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-2xl my-8 p-6 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-bloom-mint dark:text-bloom-mint">
                        {isEditing ? 'Edit Recurring Income' : 'Add Recurring Income'}
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

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-dark-danger text-sm flex-shrink-0">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={200}
                                placeholder="e.g., Monthly Salary"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Amount ({currencySymbol})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Income Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Income Type
                            </label>
                            <select
                                value={incomeType}
                                onChange={(e) => setIncomeType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                            >
                                {incomeTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Currency */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                            >
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>

                        {/* Frequency */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Frequency
                            </label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                            >
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Biweekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {/* Day of Week (for weekly/biweekly) */}
                        {(frequency === 'weekly' || frequency === 'biweekly') && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                    Day of Week
                                </label>
                                <select
                                    value={dayOfWeek}
                                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                >
                                    {weekDays.map((day, index) => (
                                        <option key={day} value={index}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Day of Month (for monthly) */}
                        {frequency === 'monthly' && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                    Day of Month
                                </label>
                                <select
                                    value={dayOfMonth}
                                    onChange={(e) => {
                                        const newDay = parseInt(e.target.value);
                                        setDayOfMonth(newDay);
                                        // Update start date to use the selected day
                                        const currentDate = new Date(startDate);
                                        currentDate.setDate(newDay);
                                        setStartDate(currentDate.toISOString().split('T')[0]);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                >
                                    {[...Array(31)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {i + 1}
                                            {getDaySuffix(i + 1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Custom Days (for custom frequency) */}
                        {frequency === 'custom' && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                    Every X Days
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={frequencyValue}
                                    onChange={(e) => setFrequencyValue(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    // For monthly frequency, also update day_of_month
                                    if (frequency === 'monthly') {
                                        const selectedDate = new Date(e.target.value);
                                        setDayOfMonth(selectedDate.getDate());
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                                required
                            />
                        </div>

                        {/* End Date (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                End Date{' '}
                                <span className="text-gray-400 dark:text-dark-text-tertiary text-xs">
                                    (Optional)
                                </span>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent"
                            />
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                                Notes{' '}
                                <span className="text-gray-400 dark:text-dark-text-tertiary text-xs">
                                    (Optional)
                                </span>
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Any additional details..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-mint dark:focus:ring-bloom-mint focus:border-transparent resize-none"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-bloom-mint text-green-800 rounded-lg hover:bg-green-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? 'Saving...'
                                : isEditing
                                  ? 'Update Income'
                                  : 'Add Recurring Income'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
}

export default AddRecurringIncomeModal;
