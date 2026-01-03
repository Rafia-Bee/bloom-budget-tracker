/**
 * CurrencySettingsModal - Dedicated currency selection modal
 *
 * Allows users to select their default/base currency for the app.
 * Moved from experimental features to be a first-class citizen.
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useCurrency } from '../contexts/CurrencyContext';
import CurrencySelector from './CurrencySelector';
import { logError } from '../utils/logger';

export default function CurrencySettingsModal({ onClose }) {
    const { defaultCurrency, updateDefaultCurrency, ratesLoading, refreshRates } = useCurrency();
    const [localCurrency, setLocalCurrency] = useState(defaultCurrency);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setLocalCurrency(defaultCurrency);
    }, [defaultCurrency]);

    const handleSave = async () => {
        if (localCurrency === defaultCurrency) {
            onClose();
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await updateDefaultCurrency(localCurrency);
            setSuccess('Currency updated successfully!');
            // Refresh exchange rates for new base currency
            await refreshRates();
            setTimeout(() => onClose(), 1000);
        } catch (err) {
            logError('updateCurrency', err);
            setError('Failed to update currency. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-modal-title"
        >
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💱</span>
                        <div>
                            <h2
                                id="currency-modal-title"
                                className="text-xl font-bold text-gray-900 dark:text-dark-text"
                            >
                                Currency Settings
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
                                Choose your default currency
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-dark-text dark:hover:text-dark-text-secondary transition-colors"
                        aria-label="Close"
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

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                            Select the currency you want to use for tracking your expenses and
                            income. All amounts will be displayed in this currency.
                        </p>

                        <CurrencySelector
                            value={localCurrency}
                            onChange={setLocalCurrency}
                            disabled={saving}
                            label="Default Currency"
                        />

                        {ratesLoading && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="animate-spin h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <div className="text-sm text-amber-700 dark:text-amber-300">
                                        <p className="font-medium">Fetching exchange rates...</p>
                                        <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                                            This may take a moment. We use free hosting and currency
                                            APIs, which can cause slight delays. Thank you for your
                                            patience! 🌸
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                            <span className="text-blue-500 dark:text-blue-400">ℹ️</span>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium mb-1">About exchange rates</p>
                                <p>
                                    Exchange rates are updated daily. Changing your currency may
                                    cause a brief delay while we fetch the latest rates.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-dark-elevated transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || localCurrency === defaultCurrency}
                            className="flex-1 px-4 py-2.5 bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

CurrencySettingsModal.propTypes = {
    onClose: PropTypes.func.isRequired,
};
