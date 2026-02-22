/**
 * Bloom - Top Merchants Card Component
 *
 * Displays a ranked list of top merchants by spending amount or frequency.
 * Features a toggle to switch between sorting by amount or frequency.
 * Shows top 5 by default with a "View more" button to expand to all.
 */

import { useState } from 'react';

// Category emoji map for visual indication
const CATEGORY_EMOJI = {
    Food: '🍔',
    Transport: '🚗',
    Shopping: '🛍️',
    Entertainment: '🎬',
    Bills: '📄',
    Health: '💊',
    Subscriptions: '📺',
    Other: '📦',
};

const DEFAULT_VISIBLE_COUNT = 5;

function TopMerchantsCard({ data, currencyFormatter, onSortChange, sortBy = 'amount' }) {
    const [localSortBy, setLocalSortBy] = useState(sortBy);
    const [showAll, setShowAll] = useState(false);

    if (!data) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                Loading merchant data...
            </div>
        );
    }

    const { merchants, total_spending, total_transactions } = data;

    if (!merchants || merchants.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                No spending data for this period
            </div>
        );
    }

    const handleSortChange = (newSortBy) => {
        setLocalSortBy(newSortBy);
        if (onSortChange) {
            onSortChange(newSortBy);
        }
    };

    // Sort locally for visual update (server will re-fetch with correct order)
    const sortedMerchants = [...merchants].sort((a, b) => {
        if (localSortBy === 'frequency') {
            return b.count - a.count;
        }
        return b.total - a.total;
    });

    // Limit visible merchants
    const visibleMerchants = showAll
        ? sortedMerchants
        : sortedMerchants.slice(0, DEFAULT_VISIBLE_COUNT);
    const hasMoreMerchants = sortedMerchants.length > DEFAULT_VISIBLE_COUNT;

    return (
        <div className="space-y-4">
            {/* Header with sort toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{total_transactions} transactions</span>
                    <span>•</span>
                    <span>{currencyFormatter(total_spending)} total</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-elevated rounded-lg p-1">
                    <button
                        onClick={() => handleSortChange('amount')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            localSortBy === 'amount'
                                ? 'bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        By Amount
                    </button>
                    <button
                        onClick={() => handleSortChange('frequency')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            localSortBy === 'frequency'
                                ? 'bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        By Frequency
                    </button>
                </div>
            </div>

            {/* Merchants List */}
            <div className="space-y-2">
                {visibleMerchants.map((merchant, index) => (
                    <MerchantRow
                        key={`${merchant.name}-${index}`}
                        merchant={merchant}
                        rank={index + 1}
                        currencyFormatter={currencyFormatter}
                        totalSpending={total_spending}
                    />
                ))}
            </div>

            {/* View More / View Less Button */}
            {hasMoreMerchants && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-2 text-sm text-pink-600 dark:text-dark-pink hover:text-pink-700 dark:hover:text-pink-400 font-medium transition-colors flex items-center justify-center gap-1"
                >
                    {showAll ? (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Show less
                        </>
                    ) : (
                        <>
                            View {sortedMerchants.length - DEFAULT_VISIBLE_COUNT} more
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

function MerchantRow({ merchant, rank, currencyFormatter, totalSpending }) {
    const emoji = CATEGORY_EMOJI[merchant.category] || '📦';
    const percentage = totalSpending > 0 ? ((merchant.total / totalSpending) * 100).toFixed(1) : 0;

    // Rank badge colors
    const rankColors = {
        1: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        2: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
        3: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    };
    const rankClass =
        rankColors[rank] || 'bg-gray-50 dark:bg-dark-elevated text-gray-500 dark:text-gray-400';

    return (
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors">
            {/* Rank Badge */}
            <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${rankClass}`}
            >
                {rank}
            </div>

            {/* Merchant Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-base">{emoji}</span>
                    <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {merchant.name}
                    </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="truncate max-w-[60px] sm:max-w-none">{merchant.category}</span>
                    <span>•</span>
                    <span className="whitespace-nowrap">{merchant.count}x</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
                        avg {currencyFormatter(merchant.average)}
                    </span>
                </div>
            </div>

            {/* Amount & Percentage */}
            <div className="text-right flex-shrink-0">
                <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    {currencyFormatter(merchant.total)}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {percentage}%
                </div>
            </div>

            {/* Progress Bar (visual indicator) */}
            <div className="hidden sm:block w-20">
                <div className="h-2 bg-gray-200 dark:bg-dark-surface rounded-full overflow-hidden">
                    <div
                        className="h-full bg-pink-500 dark:bg-dark-pink rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default TopMerchantsCard;
