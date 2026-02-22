/**
 * Bloom - Period Info Modal
 *
 * Informational modal shown when creating past or future salary periods.
 * Explains how the period will affect balances based on current balance mode.
 *
 * Context-aware messaging:
 * - Past Period + Sync Mode: Balance adds to cumulative total
 * - Past Period + Budget Mode: Period is isolated
 * - Future Period + Sync Mode: Explains income timing (handled by separate prompt)
 *
 * Issue #149 - Phase 5
 */

import { useState } from 'react';
import { userAPI } from '../api';
import { logError } from '../utils/logger';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatters';

export default function PeriodInfoModal({
    isOpen,
    onContinue,
    periodType, // 'past' or 'future'
    balanceMode, // 'sync' or 'budget'
    periodBalance, // Balance in cents (user's currency)
    periodStartDate, // Period start date string
}) {
    const { defaultCurrency } = useCurrency();
    const [showModeExplanation, setShowModeExplanation] = useState(false);
    const [changingMode, setChangingMode] = useState(false);
    const [error, setError] = useState('');

    const formatCurrency = (cents) => formatCurrencyUtil(cents, defaultCurrency);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (!isOpen) return null;

    const alternateMode = balanceMode === 'sync' ? 'budget' : 'sync';

    const modeInfo = {
        sync: {
            name: 'Sync with Bank',
            shortName: 'Sync Mode',
            icon: '🏦',
            description: 'Your app balance mirrors your real bank balance.',
            pastPeriodEffect: [
                `This period's ${formatCurrency(periodBalance)} balance will be added to your cumulative total.`,
                'Add expenses in this period to "balance the books" with your real bank statement.',
                'Your current balance will increase by this amount.',
            ],
            futurePeriodEffect: [
                'This period starts in the future.',
                'Before this period starts, make sure to add any expected income (salary, etc.).',
                'Your balance will update when income is recorded.',
            ],
        },
        budget: {
            name: 'Budget Tracker',
            shortName: 'Budget Mode',
            icon: '📊',
            description: 'Each salary period has its own isolated budget.',
            pastPeriodEffect: [
                `This period will have its own isolated ${formatCurrency(periodBalance)} budget.`,
                "It will NOT affect your current period's balance.",
                'Useful for tracking past spending separately.',
            ],
            futurePeriodEffect: [
                'This period starts in the future.',
                'It will have its own isolated budget when the time comes.',
                'It will NOT affect your current balance.',
            ],
        },
    };

    const currentModeInfo = modeInfo[balanceMode];
    const alternateModeInfo = modeInfo[alternateMode];
    const effectList =
        periodType === 'past'
            ? currentModeInfo.pastPeriodEffect
            : currentModeInfo.futurePeriodEffect;

    const handleChangeMode = async () => {
        setChangingMode(true);
        setError('');

        try {
            await userAPI.updateBalanceMode(alternateMode);
            setShowModeExplanation(false);
            // Continue with the new mode - parent will reload mode and continue
            onContinue(alternateMode);
        } catch (err) {
            logError('changeBalanceMode', err);
            setError('Failed to change mode. Please try again.');
        } finally {
            setChangingMode(false);
        }
    };

    // Mode explanation view (shown when user clicks "Change to X Mode")
    if (showModeExplanation) {
        const alternateEffectList =
            periodType === 'past'
                ? alternateModeInfo.pastPeriodEffect
                : alternateModeInfo.futurePeriodEffect;

        return (
            <div className="fixed inset-0 bg-black/50 dark:bg-dark-overlay flex items-center justify-center z-[60] p-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-200 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                            {alternateModeInfo.icon} Switch to {alternateModeInfo.name}?
                        </h3>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <p className="text-gray-600 dark:text-dark-text-secondary">
                            {alternateModeInfo.description}
                        </p>

                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                                With {alternateModeInfo.shortName}, this period will:
                            </p>
                            <ul className="space-y-2">
                                {alternateEffectList.map((effect, index) => (
                                    <li
                                        key={index}
                                        className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2"
                                    >
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        {effect}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                <strong>Note:</strong> This changes your balance mode for ALL
                                periods, not just this one. You can change it back anytime in
                                Settings.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-200 dark:border-dark-border flex gap-3">
                        <button
                            onClick={() => setShowModeExplanation(false)}
                            disabled={changingMode}
                            className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text
                                     py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-elevated
                                     disabled:opacity-50 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={handleChangeMode}
                            disabled={changingMode}
                            className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white py-2.5 rounded-lg font-medium
                                     hover:bg-pink-600 dark:hover:bg-dark-pink-hover disabled:opacity-50 transition-colors"
                        >
                            {changingMode
                                ? 'Switching...'
                                : `Switch to ${alternateModeInfo.shortName}`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main informational view
    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-dark-overlay flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                        {periodType === 'past' ? 'Adding Past Period' : 'Adding Future Period'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary">
                        Starting {formatDate(periodStartDate)}
                    </p>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Current mode indicator */}
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-dark-text-secondary">
                            Current mode:
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-dark-elevated rounded-full font-medium text-gray-700 dark:text-dark-text">
                            {currentModeInfo.icon} {currentModeInfo.name}
                        </span>
                    </div>

                    {/* Effect explanation */}
                    <div
                        className={`rounded-lg p-4 ${
                            balanceMode === 'sync'
                                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                                : 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                        }`}
                    >
                        <p
                            className={`text-sm font-medium mb-3 ${
                                balanceMode === 'sync'
                                    ? 'text-green-800 dark:text-green-300'
                                    : 'text-purple-800 dark:text-purple-300'
                            }`}
                        >
                            What will happen:
                        </p>
                        <ul className="space-y-2">
                            {effectList.map((effect, index) => (
                                <li
                                    key={index}
                                    className={`text-sm flex items-start gap-2 ${
                                        balanceMode === 'sync'
                                            ? 'text-green-700 dark:text-green-400'
                                            : 'text-purple-700 dark:text-purple-400'
                                    }`}
                                >
                                    <span
                                        className={
                                            balanceMode === 'sync'
                                                ? 'text-green-500'
                                                : 'text-purple-500'
                                        }
                                    >
                                        •
                                    </span>
                                    {effect}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-200 dark:border-dark-border flex gap-3">
                    <button
                        onClick={() => setShowModeExplanation(true)}
                        className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text
                                 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors"
                    >
                        Change to {alternateModeInfo.shortName}
                    </button>
                    <button
                        onClick={() => onContinue(balanceMode)}
                        className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white py-2.5 rounded-lg font-medium
                                 hover:bg-pink-600 dark:hover:bg-dark-pink-hover transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
