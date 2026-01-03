import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../contexts/CurrencyContext';

const BalanceCards = ({
    currentPeriodDebitSpent,
    debitAvailable,
    currentPeriodIncome,
    totalIncome,
    creditLimit,
    currentPeriodCreditSpent,
    creditAvailable,
    creditDebt,
}) => {
    const { defaultCurrency, convertAmount } = useCurrency();

    // Convert EUR cents (from DB) to user's currency and format
    const fcEur = (cents) => {
        const converted = convertAmount ? convertAmount(cents, 'EUR', defaultCurrency) : cents;
        return formatCurrency(converted, defaultCurrency);
    };

    return (
        <>
            {/* Debit Card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-bloom-mint dark:border-bloom-mint/50">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">
                            Debit Card
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">
                            Spent this period
                        </p>
                        <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text mb-1">
                            {fcEur(currentPeriodDebitSpent * 100)}
                        </h2>
                        <p className="text-2xl font-semibold text-bloom-mint dark:text-dark-success mt-2">
                            {fcEur(debitAvailable * 100)}{' '}
                            <span className="text-sm text-gray-500 dark:text-dark-text-tertiary font-normal">
                                available
                            </span>
                        </p>
                    </div>
                    <div className="bg-bloom-mint rounded-full p-3">
                        <svg
                            className="w-6 h-6 text-green-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                        </svg>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span>Period income: {fcEur(currentPeriodIncome * 100)}</span>
                        {/* Note: Original code used debitBalance here for 'Total spent', which seemed to be the available amount.
                Preserving behavior by using debitAvailable. */}
                        <span>Total spent: {fcEur(debitAvailable * 100)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>All-time income: {fcEur(totalIncome * 100)}</span>
                        <span>
                            {totalIncome > 0
                                ? ((debitAvailable / totalIncome) * 100).toFixed(0)
                                : 0}
                            % of total
                        </span>
                    </div>
                </div>
            </div>

            {/* Credit Card */}
            {creditLimit !== null && (
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-6 border-2 border-bloom-pink dark:border-bloom-pink/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <p className="text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">
                                Credit Card
                            </p>
                            <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">
                                Spent this period
                            </p>
                            <h2 className="text-4xl font-bold text-gray-800 dark:text-dark-text mb-1">
                                {fcEur(currentPeriodCreditSpent * 100)}
                            </h2>
                            <p className="text-2xl font-semibold text-bloom-mint dark:text-dark-success mt-2">
                                {fcEur(creditAvailable * 100)}{' '}
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                                    available
                                </span>
                            </p>
                        </div>
                        <div className="bg-bloom-pink rounded-full p-3">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                            <span>Period spent: {fcEur(currentPeriodCreditSpent * 100)}</span>
                            <span>Total debt: {fcEur(creditDebt * 100)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                            <span>Credit limit: {fcEur(creditLimit * 100)}</span>
                            <span>{((creditDebt / creditLimit) * 100).toFixed(0)}% used</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BalanceCards;
