/**
 * FilterTransactionsModal - Transaction filtering interface
 *
 * Provides comprehensive filtering options for transactions:
 * - Date range (start/end dates)
 * - Categories and subcategories
 * - Payment methods (Debit/Credit)
 * - Amount range (min/max)
 * - Search text (name/notes) with 500ms debounce
 * - Transaction type (Expense/Income/Both)
 *
 * Optimization: Uses SharedDataContext for cached debts/subcategories (#164)
 */

import { useState, useEffect } from 'react';
import { useSharedData } from '../contexts/SharedDataContext';
import useDebounce from '../hooks/useDebounce';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';

export default function FilterTransactionsModal({ isOpen, onClose, onApply, initialFilters }) {
    const { defaultCurrency } = useCurrency();
    const currencySymbol = getCurrencySymbol(defaultCurrency);
    const [searchInput, setSearchInput] = useState(''); // Immediate search input
    const debouncedSearch = useDebounce(searchInput, 500); // Debounced value
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        subcategory: '',
        paymentMethod: '',
        minAmount: '',
        maxAmount: '',
        search: '',
        transactionType: 'both', // 'expense', 'income', 'both'
    });

    // Use cached data from SharedDataContext
    const {
        debts,
        subcategories: subcategoriesData,
        ensureDebtsLoaded,
        ensureSubcategoriesLoaded,
    } = useSharedData();

    useEffect(() => {
        if (isOpen) {
            // Ensure data is loaded (uses cached data if already loaded)
            ensureDebtsLoaded();
            ensureSubcategoriesLoaded();
        }
    }, [isOpen, ensureDebtsLoaded, ensureSubcategoriesLoaded]);

    useEffect(() => {
        if (initialFilters) {
            setFilters(initialFilters);
            setSearchInput(initialFilters.search || ''); // Sync search input with initial filters
        }
    }, [initialFilters]);

    // Update filters when debounced search changes
    useEffect(() => {
        setFilters((prev) => ({ ...prev, search: debouncedSearch }));
    }, [debouncedSearch]);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleClear = () => {
        const clearedFilters = {
            startDate: '',
            endDate: '',
            category: '',
            subcategory: '',
            paymentMethod: '',
            minAmount: '',
            maxAmount: '',
            search: '',
            transactionType: 'both',
        };
        setFilters(clearedFilters);
        setSearchInput(''); // Clear search input
        onApply(clearedFilters);
        onClose();
    };

    const categories = [
        'Fixed Expenses',
        'Flexible Expenses',
        'Savings & Investments',
        'Debt Payments',
    ];

    const getSubcategories = () => {
        if (!filters.category || !subcategoriesData[filters.category]) return [];

        const subcats = subcategoriesData[filters.category].map((s) =>
            typeof s === 'string' ? s : s.name
        );

        // Add debts to Debt Payments category
        if (filters.category === 'Debt Payments') {
            return [...subcats, ...debts.map((d) => d.name)];
        }

        return subcats;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">
                            Filter Transactions
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:text-dark-text dark:hover:text-dark-text-secondary text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Transaction Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Transaction Type
                        </label>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button
                                onClick={() => setFilters({ ...filters, transactionType: 'both' })}
                                className={`py-2 px-2 sm:px-4 rounded-lg font-medium text-sm sm:text-base text-center transition-colors ${
                                    filters.transactionType === 'both'
                                        ? 'bg-bloom-pink dark:bg-dark-pink text-white'
                                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
                                }`}
                            >
                                Both
                            </button>
                            <button
                                onClick={() =>
                                    setFilters({ ...filters, transactionType: 'expense' })
                                }
                                className={`py-2 px-2 sm:px-4 rounded-lg font-medium text-sm sm:text-base text-center transition-colors ${
                                    filters.transactionType === 'expense'
                                        ? 'bg-bloom-pink dark:bg-dark-pink text-white'
                                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
                                }`}
                            >
                                Expenses
                            </button>
                            <button
                                onClick={() =>
                                    setFilters({ ...filters, transactionType: 'income' })
                                }
                                className={`py-2 px-2 sm:px-4 rounded-lg font-medium text-sm sm:text-base text-center transition-colors ${
                                    filters.transactionType === 'income'
                                        ? 'bg-bloom-mint text-green-800 dark:text-green-900'
                                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
                                }`}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    {/* Search (Debounced) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Search (Name/Notes)
                        </label>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search transactions..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Category (Expenses only) */}
                    {filters.transactionType !== 'income' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Category
                            </label>
                            <select
                                value={filters.category}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        category: e.target.value,
                                        subcategory: '',
                                    })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subcategory (Expenses only) */}
                    {filters.transactionType !== 'income' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Subcategory
                            </label>
                            <select
                                value={filters.subcategory || ''}
                                onChange={(e) =>
                                    setFilters({ ...filters, subcategory: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            >
                                <option value="">All Subcategories</option>
                                {getSubcategories().map((sub) => (
                                    <option key={sub} value={sub}>
                                        {sub}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Payment Method (Expenses only) */}
                    {filters.transactionType !== 'income' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Payment Method
                            </label>
                            <select
                                value={filters.paymentMethod}
                                onChange={(e) =>
                                    setFilters({ ...filters, paymentMethod: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            >
                                <option value="">All Methods</option>
                                <option value="Debit card">Debit Card</option>
                                <option value="Credit card">Credit Card</option>
                            </select>
                        </div>
                    )}

                    {/* Amount Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Min Amount ({currencySymbol})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={filters.minAmount}
                                onChange={(e) =>
                                    setFilters({ ...filters, minAmount: e.target.value })
                                }
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Max Amount ({currencySymbol})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={filters.maxAmount}
                                onChange={(e) =>
                                    setFilters({ ...filters, maxAmount: e.target.value })
                                }
                                placeholder="999.99"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 dark:bg-dark-elevated px-6 py-4 border-t border-gray-200 dark:border-dark-border rounded-b-2xl flex gap-3">
                    <button
                        onClick={handleClear}
                        className="flex-1 bg-gray-200 dark:bg-dark-base text-gray-700 dark:text-dark-text py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 bg-bloom-pink dark:bg-dark-pink text-white py-3 rounded-lg font-medium hover:bg-pink-600 dark:hover:bg-dark-pink/80 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
