/**
 * Bloom - Settings Page
 *
 * User settings and customization options.
 * Includes subcategory management for expense categorization.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subcategoryAPI, userAPI } from '../api';
import { logError } from '../utils/logger';
import Header from '../components/Header';
import CreateSubcategoryModal from '../components/CreateSubcategoryModal';
import EditSubcategoryModal from '../components/EditSubcategoryModal';
import ExportImportModal from '../components/ExportImportModal';
import BankImportModal from '../components/BankImportModal';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';
import { useSharedData } from '../contexts/SharedDataContext';

function Settings({ setIsAuthenticated }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('preferences');
    const [subcategoriesData, setSubcategoriesData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Fixed Expenses');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Modal states for Header functionality
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('export');
    const [showBankImportModal, setShowBankImportModal] = useState(false);

    // Danger Zone state
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

    // Feature flags
    const { flags, toggleFlag } = useFeatureFlag();

    // SharedDataContext for cache invalidation
    const { refreshSubcategories: refreshSharedSubcategories } = useSharedData();

    // Preferences state
    const [recurringLookaheadDays, setRecurringLookaheadDays] = useState(14);
    const [savingLookahead, setSavingLookahead] = useState(false);
    const [lookaheadSuccess, setLookaheadSuccess] = useState('');

    // Balance Mode state (for preferences tab when feature flag enabled)
    const [balanceMode, setBalanceMode] = useState('sync');
    const [savingBalanceMode, setSavingBalanceMode] = useState(false);
    const [balanceModeSuccess, setBalanceModeSuccess] = useState('');
    const [showBalanceModeInfo, setShowBalanceModeInfo] = useState(false);

    // Payment Date Adjustment state (Issue #177 - Recurring Income)
    const [paymentDateAdjustment, setPaymentDateAdjustment] = useState('exact_date');
    const [savingPaymentDate, setSavingPaymentDate] = useState(false);
    const [paymentDateSuccess, setPaymentDateSuccess] = useState('');
    const [showPaymentDateInfo, setShowPaymentDateInfo] = useState(false);

    const categories = [
        'Fixed Expenses',
        'Flexible Expenses',
        'Savings & Investments',
        'Debt Payments',
    ];

    useEffect(() => {
        loadSubcategories();
        if (activeTab === 'preferences' || activeTab === 'experimental') {
            loadPreferences();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadPreferences = async () => {
        try {
            const [lookaheadRes] = await Promise.all([userAPI.getRecurringLookahead()]);
            setRecurringLookaheadDays(lookaheadRes.data.recurring_lookahead_days);
            // Currency is already loaded from context

            // Load balance mode if feature flag is enabled
            if (flags.balanceModeEnabled) {
                try {
                    const balanceModeRes = await userAPI.getBalanceMode();
                    setBalanceMode(balanceModeRes.data.balance_mode || 'sync');
                } catch (err) {
                    logError('loadBalanceMode', err);
                }
            }

            // Load payment date adjustment if recurring income flag is enabled
            if (flags.recurringIncomeEnabled) {
                try {
                    const paymentDateRes = await userAPI.getPaymentDateAdjustment();
                    setPaymentDateAdjustment(
                        paymentDateRes.data.payment_date_adjustment || 'exact_date'
                    );
                } catch (err) {
                    logError('loadPaymentDateAdjustment', err);
                }
            }
        } catch (err) {
            logError('loadPreferences', err);
        }
    };

    const loadSubcategories = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await subcategoryAPI.getAll();
            setSubcategoriesData(response.data.subcategories || {});
        } catch (err) {
            setError('Failed to load subcategories');
            logError('loadSubcategories', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubcategory = async (data) => {
        try {
            await subcategoryAPI.create(data);
            await loadSubcategories();
            refreshSharedSubcategories(); // Invalidate shared cache
            setShowCreateModal(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create subcategory');
        }
    };

    const handleUpdateSubcategory = async (id, data) => {
        try {
            await subcategoryAPI.update(id, data);
            await loadSubcategories();
            refreshSharedSubcategories(); // Invalidate shared cache
            setShowEditModal(false);
            setEditingSubcategory(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update subcategory');
        }
    };

    const handleDeleteSubcategory = async (subcategory) => {
        try {
            await subcategoryAPI.delete(subcategory.id, false);
            await loadSubcategories();
            refreshSharedSubcategories(); // Invalidate shared cache
            setDeleteConfirm(null);
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.can_force) {
                // Subcategory is in use - show error in modal with force option
                setDeleteConfirm({
                    ...subcategory,
                    showForce: true,
                    error: err.response.data.error,
                    expense_count: err.response.data.expense_count,
                });
            } else {
                setError(err.response?.data?.error || 'Failed to delete subcategory');
            }
        }
    };

    const handleForceDeleteSubcategory = async (subcategory) => {
        try {
            await subcategoryAPI.delete(subcategory.id, true);
            await loadSubcategories();
            refreshSharedSubcategories(); // Invalidate shared cache
            setDeleteConfirm(null);
            setError('');
        } catch (err) {
            setDeleteConfirm({
                ...deleteConfirm,
                error: err.response?.data?.error || 'Failed to delete subcategory',
            });
        }
    };
    const handleSaveLookahead = async () => {
        setSavingLookahead(true);
        setLookaheadSuccess('');
        setError('');
        try {
            await userAPI.updateRecurringLookahead(recurringLookaheadDays);
            setLookaheadSuccess('Lookahead setting saved successfully!');
            setTimeout(() => setLookaheadSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save setting');
        } finally {
            setSavingLookahead(false);
        }
    };

    const handleSaveBalanceMode = async (newMode) => {
        setSavingBalanceMode(true);
        setBalanceModeSuccess('');
        setError('');
        try {
            await userAPI.updateBalanceMode(newMode);
            setBalanceMode(newMode);
            setBalanceModeSuccess('Balance mode saved successfully!');
            setTimeout(() => setBalanceModeSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save balance mode');
        } finally {
            setSavingBalanceMode(false);
        }
    };

    const handleSavePaymentDateAdjustment = async (newMode) => {
        setSavingPaymentDate(true);
        setPaymentDateSuccess('');
        setError('');
        try {
            await userAPI.updatePaymentDateAdjustment(newMode);
            setPaymentDateAdjustment(newMode);
            setPaymentDateSuccess('Payment date setting saved successfully!');
            setTimeout(() => setPaymentDateSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save payment date setting');
        } finally {
            setSavingPaymentDate(false);
        }
    };

    const handleDeleteAllData = async () => {
        if (deleteConfirmText !== 'Delete everything') {
            setDeleteError('You must type exactly: Delete everything');
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            const response = await userAPI.deleteAllData(deleteConfirmText);

            if (response.data.success) {
                alert(`Successfully deleted ${response.data.deleted_records.total} records`);
                setShowDeleteConfirmDialog(false);
                setDeleteConfirmText('');
                navigate('/dashboard');
                window.location.reload();
            }
        } catch (error) {
            setDeleteError(error.response?.data?.error || 'Failed to delete data');
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (subcategory) => {
        setEditingSubcategory(subcategory);
        setShowEditModal(true);
    };

    const getCurrentSubcategories = () => {
        if (!subcategoriesData[selectedCategory]) return [];
        return subcategoriesData[selectedCategory].filter((s) => s.is_active !== false);
    };

    const tabs = [
        { id: 'preferences', label: 'Preferences', icon: '⚙️' },
        { id: 'subcategories', label: 'Categories', icon: '🏷️' },
        { id: 'experimental', label: 'Experimental', icon: '🧪' },
        { id: 'account', label: 'Account', icon: '👤' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
            <Header
                setIsAuthenticated={setIsAuthenticated}
                onExport={() => {
                    setShowExportModal(true);
                    setExportMode('export');
                }}
                onImport={() => {
                    setShowExportModal(true);
                    setExportMode('import');
                }}
                onBankImport={() => setShowBankImportModal(true)}
            />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Customize your Bloom experience
                    </p>
                </div>

                {/* Tab Navigation - 2x2 grid on mobile, row on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1 bg-white dark:bg-dark-elevated rounded-lg p-1 mb-8 shadow-sm">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors text-sm sm:text-base whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-bloom-pink text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
                            }`}
                        >
                            <span className="text-sm sm:text-base">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Subcategories Tab */}
                {activeTab === 'subcategories' && (
                    <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    Subcategories
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    Manage your expense subcategories
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-bloom-pink hover:bg-bloom-pink/90 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto text-center"
                            >
                                + Add Subcategory
                            </button>
                        </div>

                        {/* Help hint for new users */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start space-x-3">
                                <div className="text-blue-600 dark:text-blue-400 mt-0.5">💡</div>
                                <div>
                                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                        Pro Tip: Customize Your Categories
                                    </h3>
                                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                                        Create custom subcategories to better organize your
                                        expenses. For example, add "Gym Membership" under Fixed
                                        Expenses, or "Coffee Shops" under Flexible Expenses. You can
                                        edit, delete, and organize them by category.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Category Tabs - grid on mobile, flex on desktop */}
                        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1 bg-gray-100 dark:bg-dark-surface rounded-lg p-1 mb-6">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-2 sm:px-4 py-2 rounded-md transition-colors text-xs sm:text-sm text-center ${
                                        selectedCategory === category
                                            ? 'bg-white dark:bg-dark-elevated text-bloom-pink shadow-sm'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-dark-elevated/50'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Subcategories List */}
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bloom-pink mx-auto"></div>
                                <p className="text-gray-600 dark:text-gray-300 mt-4">
                                    Loading subcategories...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {getCurrentSubcategories().length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400">
                                            No subcategories in this category
                                        </p>
                                    </div>
                                ) : (
                                    getCurrentSubcategories().map((subcategory) => (
                                        <div
                                            key={subcategory.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {subcategory.name}
                                                    </h3>
                                                    {subcategory.is_system && (
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                                            System Default
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                {!subcategory.is_system && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                openEditModal(subcategory)
                                                            }
                                                            className="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                            title="Edit"
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
                                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setDeleteConfirm(subcategory)
                                                            }
                                                            className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                            title="Delete"
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
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                    <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            Preferences
                        </h2>

                        {/* Recurring Expenses Lookahead Setting */}
                        <div className="space-y-4">
                            <div className="border-b dark:border-gray-700 pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    Recurring Expenses Preview
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Set how far ahead you want to see upcoming recurring expenses in
                                    the Scheduled view.
                                </p>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <label
                                        htmlFor="lookahead-days"
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                                    >
                                        Look ahead:
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <select
                                            id="lookahead-days"
                                            value={recurringLookaheadDays}
                                            onChange={(e) =>
                                                setRecurringLookaheadDays(parseInt(e.target.value))
                                            }
                                            className="w-full sm:w-auto sm:max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bloom-pink"
                                        >
                                        <option value={7}>7 days (1 week)</option>
                                        <option value={14}>14 days (2 weeks)</option>
                                        <option value={21}>21 days (3 weeks)</option>
                                        <option value={30}>30 days (1 month)</option>
                                        <option value={45}>45 days (1.5 months)</option>
                                        <option value={60}>60 days (2 months)</option>
                                        <option value={90}>90 days (3 months)</option>
                                        </select>
                                        <button
                                            onClick={handleSaveLookahead}
                                            disabled={savingLookahead}
                                            className="w-full sm:w-auto px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-center"
                                        >
                                            {savingLookahead ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>

                                {lookaheadSuccess && (
                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <p className="text-green-700 dark:text-green-400 text-sm">
                                            {lookaheadSuccess}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Balance Mode Setting (only when feature flag enabled) */}
                            {flags.balanceModeEnabled && (
                                <div className="border-b dark:border-gray-700 pb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                            Balance Mode
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowBalanceModeInfo(!showBalanceModeInfo)
                                            }
                                            className="inline-flex items-center justify-center w-5 h-5 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-200 dark:bg-dark-elevated rounded-full hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
                                        >
                                            ?
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Choose how balances are calculated across budget periods.
                                    </p>

                                    {/* Balance Mode Info Box */}
                                    {showBalanceModeInfo && (
                                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowBalanceModeInfo(false)}
                                                className="absolute top-2 right-2 text-purple-400 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                                            >
                                                ✕
                                            </button>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">
                                                Balance Mode Explained
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-purple-700 dark:text-purple-300">
                                                        🔗 Sync with Bank
                                                    </span>
                                                    <p className="text-purple-600 dark:text-purple-400 mt-1">
                                                        All your budget periods share ONE running
                                                        balance. If you create a new period to track
                                                        past transactions (e.g., €500 starting
                                                        balance), that adds to your total. You're
                                                        responsible for adding matching expenses to
                                                        balance the books.
                                                    </p>
                                                    <p className="text-purple-500 dark:text-purple-500 mt-1 text-xs italic">
                                                        Note: This doesn't connect to your bank - it
                                                        just calculates balances the same way.
                                                        Future-dated periods won't affect current
                                                        balance until their date arrives.
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-purple-700 dark:text-purple-300">
                                                        📊 Budget Tracker
                                                    </span>
                                                    <p className="text-purple-600 dark:text-purple-400 mt-1">
                                                        Each budget period is completely isolated.
                                                        Creating new periods doesn't affect other
                                                        periods' balances. Good if you want to track
                                                        spending limits without worrying about your
                                                        actual bank balance.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        <label
                                            htmlFor="balance-mode"
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Mode:
                                        </label>
                                        <select
                                            id="balance-mode"
                                            value={balanceMode}
                                            onChange={(e) => handleSaveBalanceMode(e.target.value)}
                                            disabled={savingBalanceMode}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bloom-pink disabled:opacity-50"
                                        >
                                            <option value="sync">🔗 Sync with Bank</option>
                                            <option value="budget">📊 Budget Tracker</option>
                                        </select>
                                        {savingBalanceMode && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                Saving...
                                            </span>
                                        )}
                                    </div>

                                    {balanceModeSuccess && (
                                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <p className="text-green-700 dark:text-green-400 text-sm">
                                                {balanceModeSuccess}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Date Adjustment Setting (only when recurring income flag enabled) */}
                            {flags.recurringIncomeEnabled && (
                                <div className="border-b dark:border-gray-700 pb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                            Income Payment Date
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPaymentDateInfo(!showPaymentDateInfo)
                                            }
                                            className="inline-flex items-center justify-center w-5 h-5 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-200 dark:bg-dark-elevated rounded-full hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
                                        >
                                            ?
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Control how recurring income dates are adjusted when they
                                        fall on weekends.
                                    </p>

                                    {/* Payment Date Info Box */}
                                    {showPaymentDateInfo && (
                                        <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowPaymentDateInfo(false)}
                                                className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                                            >
                                                ✕
                                            </button>
                                            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
                                                Payment Date Adjustment Explained
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                                        📅 Exact Date
                                                    </span>
                                                    <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                                                        Income is scheduled on the exact date
                                                        specified, even if it falls on a weekend.
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                                        ⏪ Previous Business Day
                                                    </span>
                                                    <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                                                        If payday falls on Saturday or Sunday,
                                                        income is scheduled for the previous Friday.
                                                        Common for salary payments.
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                                        ⏩ Next Business Day
                                                    </span>
                                                    <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                                                        If payday falls on Saturday or Sunday,
                                                        income is scheduled for the following
                                                        Monday.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        <label
                                            htmlFor="payment-date-adjustment"
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Adjustment:
                                        </label>
                                        <select
                                            id="payment-date-adjustment"
                                            value={paymentDateAdjustment}
                                            onChange={(e) =>
                                                handleSavePaymentDateAdjustment(e.target.value)
                                            }
                                            disabled={savingPaymentDate}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bloom-pink disabled:opacity-50"
                                        >
                                            <option value="exact_date">📅 Exact Date</option>
                                            <option value="previous_workday">
                                                ⏪ Previous Business Day
                                            </option>
                                            <option value="next_workday">
                                                ⏩ Next Business Day
                                            </option>
                                        </select>
                                        {savingPaymentDate && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                Saving...
                                            </span>
                                        )}
                                    </div>

                                    {paymentDateSuccess && (
                                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <p className="text-green-700 dark:text-green-400 text-sm">
                                                {paymentDateSuccess}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Experimental Features Tab */}
                {activeTab === 'experimental' && (
                    <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Experimental Features
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Enable features that are under active development. These may be unstable
                            or change without notice.
                        </p>

                        {/* Warning Banner - fixed alignment */}
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-xl flex-shrink-0">⚠️</span>
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    Experimental features may have bugs, change without notice, or
                                    affect your data in unexpected ways. Use at your own risk!
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Budget Recalculation Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-500">📊</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Budget Recalculation
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded">
                                            NEW
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Auto-prompt to update weekly budget when fixed bills change
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleFlag('budgetRecalculationEnabled')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        flags.budgetRecalculationEnabled
                                            ? 'bg-amber-500 dark:bg-amber-600'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            flags.budgetRecalculationEnabled
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Flexible Sub-Periods Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-cyan-500">📅</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Flexible Sub-Periods
                                        </span>
                                        <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium rounded">
                                            NEW
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Choose custom budget duration and number of sub-periods
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleFlag('flexibleSubPeriodsEnabled')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        flags.flexibleSubPeriodsEnabled
                                            ? 'bg-cyan-500 dark:bg-cyan-600'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            flags.flexibleSubPeriodsEnabled
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Reports & Analytics Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-500">📈</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Reports & Analytics
                                        </span>
                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                                            NEW
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Access spending trends, category breakdowns, and income vs
                                        expense charts
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleFlag('reportsEnabled')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        flags.reportsEnabled
                                            ? 'bg-green-500 dark:bg-green-600'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            flags.reportsEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Balance Mode Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-purple-500">🔗</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Balance Mode Selection
                                        </span>
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                                            NEW
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Choose between syncing with real bank balance or isolated
                                        period budgeting
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleFlag('balanceModeEnabled')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        flags.balanceModeEnabled
                                            ? 'bg-purple-500 dark:bg-purple-600'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            flags.balanceModeEnabled
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Recurring Income Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">💰</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            Recurring Income
                                        </span>
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded">
                                            BETA
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Set up recurring income templates like monthly salary to
                                        automatically generate income entries
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleFlag('recurringIncomeEnabled')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        flags.recurringIncomeEnabled
                                            ? 'bg-emerald-500 dark:bg-emerald-600'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            flags.recurringIncomeEnabled
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Tab - keeping original structure from here */}
                {activeTab === 'account' && (
                    <div className="space-y-6">
                        {/* Export & Import Section */}
                        <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Export & Import
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Backup your data or restore from a previous backup
                            </p>

                            <div className="grid gap-4 md:grid-cols-3">
                                {/* Export Card */}
                                <div className="p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-surface">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">📤</span>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Export Data
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Download your financial data as JSON or CSV for backup or
                                        analysis.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowExportModal(true);
                                            setExportMode('export');
                                        }}
                                        className="w-full px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
                                    >
                                        Export Financial Data
                                    </button>
                                </div>

                                {/* Import JSON Card */}
                                <div className="p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-surface">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">📥</span>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Import Backup
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Restore your data from a previously exported JSON backup
                                        file.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowExportModal(true);
                                            setExportMode('import');
                                        }}
                                        className="w-full px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
                                    >
                                        Import JSON Backup
                                    </button>
                                </div>

                                {/* Bank Import Card */}
                                <div className="p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-surface">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">🏦</span>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Bank Import
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Paste transactions from your bank statement to import them
                                        quickly.
                                    </p>
                                    <button
                                        onClick={() => setShowBankImportModal(true)}
                                        className="w-full px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
                                    >
                                        Import Bank Transactions
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone - De-emphasized collapsible design */}
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer list-none p-4 bg-white dark:bg-dark-elevated rounded-xl shadow-sm border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors">
                                <svg
                                    className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                    Danger Zone
                                </span>
                            </summary>

                            <div className="mt-2 p-4 border border-red-200 dark:border-red-900 rounded-xl bg-red-50/50 dark:bg-red-950/10">
                                <p className="text-xs text-red-700 dark:text-red-400 mb-4">
                                    ⚠️ Actions in this section are permanent and cannot be undone.
                                </p>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-dark-elevated rounded-lg border border-red-200 dark:border-red-800">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                            Delete All Financial Data
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Removes all expenses, income, periods, debts, and goals.
                                            Your account will remain.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDeleteConfirmDialog(true)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-medium whitespace-nowrap"
                                    >
                                        Delete All
                                    </button>
                                </div>
                            </div>
                        </details>
                    </div>
                )}
            </main>

            {/* Delete All Data Confirmation Modal */}
            {showDeleteConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <svg
                                className="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            <div>
                                <h3 className="font-bold text-red-900 dark:text-red-400 text-lg">
                                    Delete All Financial Data
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800 mb-4">
                            <p className="text-sm text-red-900 dark:text-red-300 font-semibold mb-2">
                                This will permanently delete:
                            </p>
                            <ul className="text-xs text-red-800 dark:text-red-400 space-y-1 ml-4 list-disc">
                                <li>All expenses</li>
                                <li>All income entries</li>
                                <li>All salary periods & weekly budgets</li>
                                <li>All debts</li>
                                <li>All recurring expenses</li>
                                <li>All goals</li>
                            </ul>
                            <p className="text-xs text-red-900 dark:text-red-300 font-bold mt-3">
                                ⚠️ Your login will remain but all financial data will be gone
                                forever!
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Type{' '}
                                <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">
                                    Delete everything
                                </span>{' '}
                                to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => {
                                    setDeleteConfirmText(e.target.value);
                                    setDeleteError('');
                                }}
                                disabled={isDeleting}
                                placeholder="Delete everything"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-dark-surface text-gray-900 dark:text-white disabled:opacity-50"
                            />
                            {deleteError && (
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                    {deleteError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirmDialog(false);
                                    setDeleteConfirmText('');
                                    setDeleteError('');
                                }}
                                disabled={isDeleting}
                                className="flex-1 bg-gray-200 dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-border text-gray-900 dark:text-white py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAllData}
                                disabled={isDeleting || deleteConfirmText !== 'Delete everything'}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Deleting...
                                    </>
                                ) : (
                                    'Confirm Delete All'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                                <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Delete Subcategory
                            </h3>

                            {deleteConfirm.error ? (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                                    <p className="text-red-700 dark:text-red-400 text-sm">
                                        {deleteConfirm.error}
                                    </p>
                                    {deleteConfirm.expense_count && (
                                        <p className="text-red-600 dark:text-red-300 text-xs mt-2">
                                            Force Delete will move {deleteConfirm.expense_count}{' '}
                                            expense(s) to "Other" subcategory instead of deleting
                                            them.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    Are you sure you want to delete "{deleteConfirm.name}"? This
                                    action cannot be undone.
                                </p>
                            )}

                            <div className="flex space-x-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-surface rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                >
                                    Cancel
                                </button>
                                {!deleteConfirm.showForce && (
                                    <button
                                        onClick={() => handleDeleteSubcategory(deleteConfirm)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                                {deleteConfirm.showForce && (
                                    <button
                                        onClick={() => handleForceDeleteSubcategory(deleteConfirm)}
                                        className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg transition-colors"
                                    >
                                        Force Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Subcategory Modal */}
            {showCreateModal && (
                <CreateSubcategoryModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateSubcategory}
                    initialCategory={selectedCategory}
                />
            )}

            {/* Edit Subcategory Modal */}
            {showEditModal && editingSubcategory && (
                <EditSubcategoryModal
                    subcategory={editingSubcategory}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingSubcategory(null);
                    }}
                    onUpdate={handleUpdateSubcategory}
                />
            )}

            {/* Header Modal Components */}
            {showExportModal && (
                <ExportImportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    mode={exportMode}
                />
            )}

            {showBankImportModal && (
                <BankImportModal
                    isOpen={showBankImportModal}
                    onClose={() => setShowBankImportModal(false)}
                />
            )}
        </div>
    );
}

export default Settings;
