/**
 * Bloom - Leftover Budget Allocation Modal
 *
 * Prompts user to allocate remaining weekly budget to debt or savings.
 * Prevents budget carryover - ensures intentional allocation of unspent funds.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../utils/formatters';

function LeftoverBudgetModal({ salaryPeriodId, weekNumber, onClose, onAllocate }) {
    const { defaultCurrency, convertAmount } = useCurrency();
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const [leftoverData, setLeftoverData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allocating, setAllocating] = useState(false);
    const [allocationType, setAllocationType] = useState('debts'); // 'debts' or 'goals'
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadLeftoverData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLeftoverData = async () => {
        try {
            const response = await api.get(
                `/salary-periods/${salaryPeriodId}/week/${weekNumber}/leftover`
            );
            setLeftoverData(response.data);
            if (response.data.leftover > 0) {
                // Convert EUR leftover to user's currency for display
                const leftoverInUserCurrency = convertAmount
                    ? convertAmount(response.data.leftover, 'EUR', defaultCurrency)
                    : response.data.leftover;
                setCustomAmount((leftoverInUserCurrency / 100).toFixed(2));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load leftover data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents) => {
        if (cents == null || isNaN(cents)) return formatCurrencyUtil(0, defaultCurrency);
        return formatCurrencyUtil(cents, defaultCurrency);
    };

    // Convert EUR cents (from DB) to user's currency cents
    const fromEur = (eurCents) => {
        return convertAmount ? convertAmount(eurCents, 'EUR', defaultCurrency) : eurCents;
    };

    // Format EUR amounts converted to user's currency
    const fcEur = (cents) => {
        return formatCurrency(fromEur(cents));
    };

    // Convert user's currency cents to EUR cents for storage
    const toEur = (userCents) => {
        return convertAmount ? convertAmount(userCents, defaultCurrency, 'EUR') : userCents;
    };

    const parseCurrency = (value) => {
        const cleaned = value.replace(/[^0-9.]/g, '');
        const dollars = parseFloat(cleaned) || 0;
        return Math.round(dollars * 100);
    };

    const handleAllocate = async () => {
        const amountInUserCurrency = parseCurrency(customAmount);
        const leftoverInUserCurrency = fromEur(leftoverData.leftover);

        if (amountInUserCurrency <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amountInUserCurrency > leftoverInUserCurrency) {
            setError(`Amount cannot exceed leftover budget of ${fcEur(leftoverData.leftover)}`);
            return;
        }

        if (allocationType === 'debts' && !selectedDebt) {
            setError('Please select a debt to pay');
            return;
        }

        if (allocationType === 'goals' && !selectedGoal) {
            setError('Please select a goal to contribute to');
            return;
        }

        setError('');
        setAllocating(true);

        try {
            // Use the week's end date for allocation (not today's date)
            const allocationDate = leftoverData.end_date;
            // Convert user's currency input to EUR for backend storage
            const amountInEur = toEur(amountInUserCurrency);

            if (allocationType === 'debts') {
                await api.post('/debts/pay', {
                    debt_id: selectedDebt,
                    amount: amountInEur,
                    date: allocationDate,
                });
            } else if (allocationType === 'goals') {
                // Find the selected goal to get its subcategory name
                const goal = leftoverData.allocation_options.goals.find(
                    (g) => g.id === selectedGoal
                );

                // Create an expense with the goal's subcategory
                await api.post('/expenses', {
                    name: `${goal.name} Contribution`,
                    amount: amountInEur,
                    date: allocationDate,
                    category: 'Savings & Investments',
                    subcategory: goal.subcategory_name,
                    payment_method: 'Debit card', // Default for leftover allocation
                });
            }

            onAllocate();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to allocate funds');
            setAllocating(false);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 dark:bg-dark-elevated rounded w-3/4" />
                        <div className="h-32 bg-gray-200 dark:bg-dark-elevated rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!leftoverData || leftoverData.leftover <= 0) {
        return (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md p-6">
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-2">
                            Week Complete!
                        </h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                            You've used your entire weekly budget. Great job staying on track!
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-bloom-pink dark:bg-dark-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 dark:hover:bg-dark-pink/80"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-br from-bloom-pink to-pink-600 text-white px-6 py-4 rounded-t-2xl">
                    <h2 className="text-2xl font-bold mb-1">Week {weekNumber} Complete! 🎉</h2>
                    <p className="text-sm opacity-90">You have leftover budget to allocate</p>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-dark-danger rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                            Leftover Budget
                        </p>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                            {fcEur(leftoverData.leftover)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">
                            from {fcEur(leftoverData.budget_amount)} budget
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-700 dark:text-dark-text mb-4">
                            💡 <strong>Important:</strong> Leftover budget doesn't carry over.
                            Allocate it now to debt payments or savings goals!
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">
                            Allocate To
                        </label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => {
                                    setAllocationType('debts');
                                    setSelectedGoal(null);
                                }}
                                className={`p-4 rounded-xl border-2 transition ${
                                    allocationType === 'debts'
                                        ? 'border-bloom-pink dark:border-dark-pink bg-bloom-pink/10 dark:bg-dark-pink/20'
                                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-text-secondary'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-2">💳</div>
                                    <div className="font-semibold text-gray-800 dark:text-dark-text">
                                        Debt Payments
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        Pay down your debts
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setAllocationType('goals');
                                    setSelectedDebt(null);
                                }}
                                className={`p-4 rounded-xl border-2 transition ${
                                    allocationType === 'goals'
                                        ? 'border-bloom-pink dark:border-dark-pink bg-bloom-pink/10 dark:bg-dark-pink/20'
                                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-text-secondary'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-2">🎯</div>
                                    <div className="font-semibold text-gray-800 dark:text-dark-text">
                                        Savings Goals
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        Contribute to your goals
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {allocationType === 'debts' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Select Debt
                            </label>
                            {leftoverData.allocation_options.debts.length === 0 ? (
                                <div className="p-4 bg-gray-50 dark:bg-dark-elevated rounded-lg text-center text-sm text-gray-600 dark:text-dark-text-secondary">
                                    No active debts. Try allocating to savings goals instead!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {leftoverData.allocation_options.debts.map((debt) => (
                                        <button
                                            key={debt.id}
                                            onClick={() => setSelectedDebt(debt.id)}
                                            className={`w-full p-3 rounded-lg border-2 text-left transition ${
                                                selectedDebt === debt.id
                                                    ? 'border-bloom-pink dark:border-dark-pink bg-bloom-pink/10 dark:bg-dark-pink/20'
                                                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-text-secondary'
                                            }`}
                                        >
                                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-gray-800 dark:text-dark-text truncate">
                                                        {debt.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                        Balance: {fcEur(debt.current_balance)}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-dark-text-secondary whitespace-nowrap text-right">
                                                    Min: {fcEur(debt.monthly_payment)}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Select Goal
                            </label>
                            {leftoverData.allocation_options.goals.length === 0 ? (
                                <div className="p-4 bg-gray-50 dark:bg-dark-elevated rounded-lg text-center text-sm text-gray-600 dark:text-dark-text-secondary">
                                    No active goals. Create goals in the Goals page to start
                                    tracking your savings!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {leftoverData.allocation_options.goals.map((goal) => {
                                        // Issue #187 fix: progress is an object with current_amount, percentage, etc.
                                        const currentAmount =
                                            goal.progress?.current_amount ?? 0;
                                        const targetAmount = goal.target_amount || 1;
                                        const progressPercent =
                                            goal.progress?.percentage ?? 0;
                                        return (
                                            <button
                                                key={goal.id}
                                                onClick={() => setSelectedGoal(goal.id)}
                                                className={`w-full p-3 rounded-lg border-2 text-left transition ${
                                                    selectedGoal === goal.id
                                                        ? 'border-bloom-pink dark:border-dark-pink bg-bloom-pink/10 dark:bg-dark-pink/20'
                                                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-text-secondary'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="font-semibold text-gray-800 dark:text-dark-text">
                                                            {goal.name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                            {progressPercent.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 mb-1">
                                                        <div
                                                            className="bg-bloom-pink dark:bg-dark-pink h-2 rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min(progressPercent, 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                        {fcEur(currentAmount)} / {fcEur(targetAmount)}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-secondary">
                                {currencySymbol}
                            </span>
                            <input
                                type="text"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                        <button
                            onClick={() =>
                                setCustomAmount((fromEur(leftoverData.leftover) / 100).toFixed(2))
                            }
                            className="text-sm text-bloom-pink dark:text-dark-pink hover:underline mt-1"
                        >
                            Use full amount ({fcEur(leftoverData.leftover)})
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSkip}
                            className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-dark-elevated"
                        >
                            Skip for Now
                        </button>
                        <button
                            onClick={handleAllocate}
                            disabled={
                                allocating ||
                                (allocationType === 'debts' ? !selectedDebt : !selectedGoal)
                            }
                            className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 dark:hover:bg-dark-pink/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {allocating ? 'Allocating...' : 'Allocate Funds'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LeftoverBudgetModal;
