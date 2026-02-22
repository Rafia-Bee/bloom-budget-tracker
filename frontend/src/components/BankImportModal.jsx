/**
 * Bloom - Bank Import Modal
 *
 * Modal for importing transactions directly from bank statements.
 * Supports pasting tab-separated or multi-space separated data.
 */

import React, { useState } from 'react';
import api from '../api';
import PropTypes from 'prop-types';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

function BankImportModal({ onClose /* onImportComplete */ }) {
    const { defaultCurrency } = useCurrency();
    const fc = (cents) => formatCurrency(cents, defaultCurrency);
    const [transactionsText, setTransactionsText] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Debit card');
    const [markAsFixedBills, setMarkAsFixedBills] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [step, setStep] = useState('input'); // 'input' or 'preview'

    const exampleData = `Transaction Date\tAmount\tName
2025/11/22\t-42,33\tWise Europe SA
2025/11/24\t-38,88\tWise
2025/11/24\t-0,18\tUBER   *TRIP`;

    const handlePreview = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPreviewData(null);

        try {
            const response = await api.post('/data/preview-bank-transactions', {
                transactions: transactionsText,
                payment_method: paymentMethod,
                mark_as_fixed_bills: markAsFixedBills,
            });

            setPreviewData(response.data);
            setStep('preview');
        } catch (err) {
            setError(err.response?.data?.error || 'Preview failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await api.post('/data/import-bank-transactions', {
                transactions: transactionsText,
                payment_method: paymentMethod,
                mark_as_fixed_bills: markAsFixedBills,
            });

            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToEdit = () => {
        setStep('input');
        setPreviewData(null);
        setError('');
    };

    const handlePasteExample = () => {
        setTransactionsText(exampleData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">
                            Import Bank Transactions
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:text-dark-text-secondary dark:hover:text-dark-text transition"
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
                </div>

                <div className="p-6">
                    {result && (
                        <div
                            className={`mb-4 p-4 rounded-lg border ${
                                result.imported_count > 0
                                    ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                                    : 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold text-gray-800 dark:text-dark-text">
                                    {result.message}
                                </p>
                                <button
                                    onClick={() => setResult(null)}
                                    className={`ml-4 flex-shrink-0 ${
                                        result.imported_count > 0
                                            ? 'text-green-800 hover:text-green-900 dark:text-green-300 dark:hover:text-green-200'
                                            : 'text-yellow-800 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-200'
                                    }`}
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

                            {result.created_expenses && result.created_expenses.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium mb-2">
                                        Imported transactions:
                                    </p>
                                    <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                                        {result.created_expenses.map((exp, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>{exp.name}</span>
                                                <span className="font-medium">
                                                    {fc(exp.amount * 100)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.errors && result.errors.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium mb-2">Warnings/Errors:</p>
                                    <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 px-4 py-3 rounded flex justify-between items-start">
                            <span>{error}</span>
                            <button
                                onClick={() => setError('')}
                                className="text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200 ml-4 flex-shrink-0"
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

                    {step === 'input' ? (
                        <form onSubmit={handlePreview}>
                            {/* Instructions */}
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                    How to Import
                                </h3>
                                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                                    <li>
                                        1. Copy transaction data from your bank (including headers)
                                    </li>
                                    <li>2. Paste it in the text area below</li>
                                    <li>3. Select whether it's debit or credit card</li>
                                    <li>4. Click Import Transactions</li>
                                </ol>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    Expected format:{' '}
                                    <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                                        Transaction Date, Amount, Name
                                    </code>
                                </p>
                                <button
                                    type="button"
                                    onClick={handlePasteExample}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                >
                                    Click here to paste example data
                                </button>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Payment Method
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="Debit card"
                                            checked={paymentMethod === 'Debit card'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-bloom-pink focus:ring-bloom-pink"
                                        />
                                        <span className="text-gray-700 dark:text-dark-text">
                                            Debit Card
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="Credit card"
                                            checked={paymentMethod === 'Credit card'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-bloom-pink focus:ring-bloom-pink"
                                        />
                                        <span className="text-gray-700 dark:text-dark-text">
                                            Credit Card
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Fixed Bills Option */}
                            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 rounded-lg">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={markAsFixedBills}
                                        onChange={(e) => setMarkAsFixedBills(e.target.checked)}
                                        className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink mt-0.5"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-dark-text">
                                            Mark as Fixed Bills
                                        </span>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                            Check this to exclude these transactions from your
                                            weekly budget calculations. Useful for importing
                                            historical transactions that were already accounted for
                                            in your starting balance.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Transaction Data Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                    Bank Transaction Data
                                </label>
                                <textarea
                                    value={transactionsText}
                                    onChange={(e) => setTransactionsText(e.target.value)}
                                    maxLength={50000}
                                    placeholder="Paste your bank transactions here...&#10;&#10;Example:&#10;Transaction Date	Amount	Name&#10;2025/11/22	-42,33	Wise Europe SA&#10;2025/11/24	-38,88	Wise"
                                    rows={12}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text rounded-lg focus:ring-2 focus:ring-bloom-pink focus:border-transparent font-mono text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                />
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    Supports tab-separated or multi-space separated values. Only
                                    negative amounts (expenses) will be imported.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !transactionsText.trim()}
                                    className="flex-1 bg-bloom-pink text-white font-semibold py-3 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Previewing...
                                        </span>
                                    ) : (
                                        'Preview Transactions'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-6 text-gray-600 dark:text-dark-text-secondary font-semibold py-3 hover:text-gray-800 dark:hover:text-dark-text transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Preview Step */
                        <div>
                            {previewData && (
                                <>
                                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                            Preview
                                        </h3>
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            {previewData.total_count} transaction(s) ready to import
                                            {previewData.skipped_count > 0 &&
                                                `, ${previewData.skipped_count} skipped`}
                                        </p>
                                    </div>

                                    {previewData.errors && previewData.errors.length > 0 && (
                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                                                Warnings:
                                            </p>
                                            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 max-h-32 overflow-y-auto">
                                                {previewData.errors.map((err, idx) => (
                                                    <li key={idx}>• {err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Transaction Table */}
                                    <div className="mb-4 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 dark:bg-dark-bg sticky top-0">
                                                    <tr>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-dark-text">
                                                            Date
                                                        </th>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-dark-text">
                                                            Merchant
                                                        </th>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-dark-text">
                                                            Category
                                                        </th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-dark-text">
                                                            Amount
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                                    {previewData.transactions.map((txn, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className="hover:bg-gray-50 dark:hover:bg-dark-hover"
                                                        >
                                                            <td className="px-3 py-2 text-gray-600 dark:text-dark-text-secondary">
                                                                {txn.date}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-800 dark:text-dark-text font-medium">
                                                                {txn.name}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className="text-xs bg-gray-100 dark:bg-dark-bg px-2 py-1 rounded">
                                                                    {txn.subcategory}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-dark-text">
                                                                {fc(txn.amount * 100)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleConfirmImport}
                                            disabled={loading || previewData.total_count === 0}
                                            className="flex-1 bg-bloom-pink text-white font-semibold py-3 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg
                                                        className="animate-spin h-5 w-5"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                            fill="none"
                                                        />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        />
                                                    </svg>
                                                    Importing...
                                                </span>
                                            ) : (
                                                `Confirm & Import ${previewData.total_count} Transaction(s)`
                                            )}
                                        </button>
                                        <button
                                            onClick={handleBackToEdit}
                                            disabled={loading}
                                            className="px-6 text-gray-600 dark:text-dark-text-secondary font-semibold py-3 hover:text-gray-800 dark:hover:text-dark-text transition disabled:opacity-50"
                                        >
                                            Back to Edit
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Format Help - only show on input step */}
                    {step === 'input' && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg">
                            <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-2">
                                Smart Features
                            </h4>
                            <ul className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
                                <li>
                                    • Automatically categorizes transactions based on merchant name
                                </li>
                                <li>
                                    • Skips duplicate transactions (same date, amount, and merchant)
                                </li>
                                <li>• Skips income transactions (positive amounts)</li>
                                <li>
                                    • Assigns to correct budget period based on transaction date
                                </li>
                                <li>• Supports comma decimal separator (42,33 → 42.33)</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

BankImportModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onImportComplete: PropTypes.func,
};

export default BankImportModal;
