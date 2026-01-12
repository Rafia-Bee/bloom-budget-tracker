/**
 * Bloom - Balance Mode Modal
 *
 * Modal component for selecting and changing balance calculation mode.
 * Used in Settings and Salary Period Wizard.
 *
 * Modes:
 * - "sync": Sync with Bank - balances cumulate across all periods
 * - "budget": Budget Tracker - each period has isolated balance
 *
 * Issue #149 - Phase 4
 */

import { useState, useEffect } from 'react';
import { userAPI } from '../api';
import { logError } from '../utils/logger';

export default function BalanceModeModal({ isOpen, onClose, onModeChange }) {
    const [currentMode, setCurrentMode] = useState('sync');
    const [selectedMode, setSelectedMode] = useState('sync');
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCurrentMode();
        }
    }, [isOpen]);

    const loadCurrentMode = async () => {
        try {
            setLoading(true);
            const response = await userAPI.getBalanceMode();
            const mode = response.data.balance_mode || 'sync';
            setCurrentMode(mode);
            setSelectedMode(mode);
        } catch (err) {
            logError('loadBalanceMode', err);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleModeSelect = (mode) => {
        setSelectedMode(mode);
        if (mode !== currentMode) {
            setShowConfirmation(true);
        }
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            setError('');
            await userAPI.updateBalanceMode(selectedMode);
            setCurrentMode(selectedMode);
            setShowConfirmation(false);
            if (onModeChange) {
                onModeChange(selectedMode);
            }
            onClose();
        } catch (err) {
            logError('updateBalanceMode', err);
            setError('Failed to save settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedMode(currentMode);
        setShowConfirmation(false);
    };

    if (!isOpen) return null;

    const modeInfo = {
        sync: {
            title: 'Sync with Bank',
            description: 'Your app balance mirrors your real bank balance.',
            details: [
                'All salary period balances add up cumulatively',
                'You need to add expenses to balance the books',
                'Best for: Tracking real-world finances',
            ],
            example: 'Period 1 (€1000) + Period 2 (€1500) - Expenses (€800) = €1700',
        },
        budget: {
            title: 'Budget Tracker',
            description: 'Each salary period is an isolated budget.',
            details: [
                'Each period has its own separate budget',
                'Balances do not carry over between periods',
                'Best for: Pure budgeting without bank sync',
            ],
            example: 'Period 1: €1000 budget | Period 2: €1500 budget (separate)',
        },
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-dark-overlay flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-dark-text">
                        Balance Mode
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                        Choose how your budget balances are calculated
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {loading && !showConfirmation ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-bloom-pink border-t-transparent rounded-full"></div>
                        </div>
                    ) : showConfirmation ? (
                        /* Confirmation View */
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                                    ⚠️ Confirm Mode Change
                                </h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    Changing from <strong>{modeInfo[currentMode].title}</strong> to{' '}
                                    <strong>{modeInfo[selectedMode].title}</strong>
                                </p>
                                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                    This will change how your balances are calculated. The app may
                                    take a moment to recalculate.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-2 px-4 border border-gray-300 dark:border-dark-border rounded-lg
                                             text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated
                                             transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 py-2 px-4 bg-bloom-pink hover:bg-bloom-pink-dark dark:bg-dark-pink
                                             dark:hover:bg-dark-pink-hover text-white rounded-lg transition-colors
                                             disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Confirm Change'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Mode Selection */
                        <div className="space-y-3">
                            {Object.entries(modeInfo).map(([mode, info]) => (
                                <button
                                    key={mode}
                                    onClick={() => handleModeSelect(mode)}
                                    className={`w-full p-4 rounded-lg border-2 text-left transition-all
                                        ${
                                            selectedMode === mode
                                                ? 'border-bloom-pink dark:border-dark-pink bg-bloom-light/50 dark:bg-dark-pink/10'
                                                : 'border-gray-200 dark:border-dark-border hover:border-bloom-pink/50 dark:hover:border-dark-pink/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-dark-text">
                                                {info.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                                                {info.description}
                                            </p>
                                        </div>
                                        {selectedMode === mode && (
                                            <span className="text-bloom-pink dark:text-dark-pink">
                                                ✓
                                            </span>
                                        )}
                                    </div>

                                    <ul className="mt-3 space-y-1">
                                        {info.details.map((detail, idx) => (
                                            <li
                                                key={idx}
                                                className="text-xs text-gray-500 dark:text-dark-text-secondary flex items-start gap-2"
                                            >
                                                <span className="text-bloom-pink dark:text-dark-pink mt-0.5">
                                                    •
                                                </span>
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-3 p-2 bg-gray-50 dark:bg-dark-elevated rounded text-xs text-gray-600 dark:text-dark-text-secondary">
                                        <strong>Example:</strong> {info.example}
                                    </div>

                                    {mode === currentMode && (
                                        <div className="mt-2 text-xs text-bloom-pink dark:text-dark-pink font-medium">
                                            Current mode
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!showConfirmation && (
                    <div className="p-6 border-t border-gray-200 dark:border-dark-border">
                        <button
                            onClick={onClose}
                            className="w-full py-2 px-4 border border-gray-300 dark:border-dark-border rounded-lg
                                     text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated
                                     transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
