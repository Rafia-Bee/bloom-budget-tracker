/**
 * Bloom - Settings Page
 *
 * User settings and customization options.
 * Includes subcategory management for expense categorization.
 */

import { useState, useEffect } from 'react'
import { subcategoryAPI, userAPI } from '../api'
import { logError } from '../utils/logger'
import Header from '../components/Header'
import CreateSubcategoryModal from '../components/CreateSubcategoryModal'
import EditSubcategoryModal from '../components/EditSubcategoryModal'
import ExportImportModal from '../components/ExportImportModal'
import BankImportModal from '../components/BankImportModal'
import ExperimentalFeaturesModal from '../components/ExperimentalFeaturesModal'
import CurrencySelector from '../components/CurrencySelector'
import { useCurrency } from '../contexts/CurrencyContext'

function Settings({ setIsAuthenticated }) {
  const [activeTab, setActiveTab] = useState('subcategories')
  const [subcategoriesData, setSubcategoriesData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Fixed Expenses')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Modal states for Header functionality
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const [showBankImportModal, setShowBankImportModal] = useState(false)
  const [showExperimentalModal, setShowExperimentalModal] = useState(false)

  // Preferences state
  const [recurringLookaheadDays, setRecurringLookaheadDays] = useState(14)
  const [savingLookahead, setSavingLookahead] = useState(false)
  const [lookaheadSuccess, setLookaheadSuccess] = useState('')
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [currencySuccess, setCurrencySuccess] = useState('')

  // Use CurrencyContext for global currency state
  const { defaultCurrency, updateDefaultCurrency } = useCurrency()
  const [localCurrency, setLocalCurrency] = useState(defaultCurrency)

  const categories = [
    'Fixed Expenses',
    'Flexible Expenses',
    'Savings & Investments',
    'Debt Payments'
  ]

  // Sync local currency state when context changes
  useEffect(() => {
    setLocalCurrency(defaultCurrency)
  }, [defaultCurrency])

  useEffect(() => {
    loadSubcategories()
    if (activeTab === 'preferences') {
      loadPreferences()
    }
  }, [activeTab])

  const loadPreferences = async () => {
    try {
      const [lookaheadRes] = await Promise.all([
        userAPI.getRecurringLookahead()
      ])
      setRecurringLookaheadDays(lookaheadRes.data.recurring_lookahead_days)
      // Currency is already loaded from context
    } catch (err) {
      logError('loadPreferences', err)
    }
  }

  const loadSubcategories = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await subcategoryAPI.getAll()
      setSubcategoriesData(response.data.subcategories || {})
    } catch (err) {
      setError('Failed to load subcategories')
      logError('loadSubcategories', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubcategory = async (data) => {
    try {
      await subcategoryAPI.create(data)
      await loadSubcategories()
      setShowCreateModal(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subcategory')
    }
  }

  const handleUpdateSubcategory = async (id, data) => {
    try {
      await subcategoryAPI.update(id, data)
      await loadSubcategories()
      setShowEditModal(false)
      setEditingSubcategory(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subcategory')
    }
  }

  const handleDeleteSubcategory = async (subcategory) => {
    try {
      await subcategoryAPI.delete(subcategory.id, false)
      await loadSubcategories()
      setDeleteConfirm(null)
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.can_force) {
        // Subcategory is in use - show error in modal with force option
        setDeleteConfirm({
          ...subcategory,
          showForce: true,
          error: err.response.data.error,
          expense_count: err.response.data.expense_count
        })
      } else {
        setError(err.response?.data?.error || 'Failed to delete subcategory')
      }
    }
  }

  const handleForceDeleteSubcategory = async (subcategory) => {
    try {
      await subcategoryAPI.delete(subcategory.id, true)
      await loadSubcategories()
      setDeleteConfirm(null)
      setError('')
    } catch (err) {
      setDeleteConfirm({
        ...deleteConfirm,
        error: err.response?.data?.error || 'Failed to delete subcategory'
      })
    }
  }
  const handleSaveLookahead = async () => {
    setSavingLookahead(true)
    setLookaheadSuccess('')
    setError('')
    try {
      await userAPI.updateRecurringLookahead(recurringLookaheadDays)
      setLookaheadSuccess('Lookahead setting saved successfully!')
      setTimeout(() => setLookaheadSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save setting')
    } finally {
      setSavingLookahead(false)
    }
  }

  const handleSaveCurrency = async () => {
    setSavingCurrency(true)
    setCurrencySuccess('')
    setError('')
    try {
      await updateDefaultCurrency(localCurrency)
      setCurrencySuccess('Default currency saved successfully!')
      setTimeout(() => setCurrencySuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save currency')
    } finally {
      setSavingCurrency(false)
    }
  }
  const openEditModal = (subcategory) => {
    setEditingSubcategory(subcategory)
    setShowEditModal(true)
  }

  const getCurrentSubcategories = () => {
    if (!subcategoriesData[selectedCategory]) return []
    return subcategoriesData[selectedCategory].filter(s => s.is_active !== false)
  }

  const tabs = [
    { id: 'subcategories', label: 'Categories', icon: '🏷️' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'account', label: 'Account', icon: '👤' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white dark:from-dark-base dark:to-dark-surface">
      <Header
        setIsAuthenticated={setIsAuthenticated}
        onExport={() => { setShowExportModal(true); setExportMode('export'); }}
        onImport={() => { setShowExportModal(true); setExportMode('import'); }}
        onBankImport={() => setShowBankImportModal(true)}
        onShowExperimental={() => setShowExperimentalModal(true)}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Customize your Bloom experience</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white dark:bg-dark-elevated rounded-lg p-1 mb-8 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-bloom-pink text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
            >
              <span>{tab.icon}</span>
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subcategories</h2>
                <p className="text-gray-600 dark:text-gray-300">Manage your expense subcategories</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-bloom-pink hover:bg-bloom-pink/90 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Add Subcategory
              </button>
            </div>

            {/* Help hint for new users */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  💡
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Pro Tip: Customize Your Categories</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Create custom subcategories to better organize your expenses. For example, add "Gym Membership" under Fixed Expenses,
                    or "Coffee Shops" under Flexible Expenses. You can edit, delete, and organize them by category.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-dark-surface rounded-lg p-1 mb-6">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md transition-colors text-sm ${
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
                <p className="text-gray-600 dark:text-gray-300 mt-4">Loading subcategories...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getCurrentSubcategories().length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No subcategories in this category</p>
                  </div>
                ) : (
                  getCurrentSubcategories().map(subcategory => (
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
                              onClick={() => openEditModal(subcategory)}
                              className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(subcategory)}
                              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                            >
                              🗑️
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h2>

            {/* Recurring Expenses Lookahead Setting */}
            <div className="space-y-4">
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Recurring Expenses Preview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set how far ahead you want to see upcoming recurring expenses in the Scheduled view.
                </p>

                <div className="flex items-center gap-4">
                  <label htmlFor="lookahead-days" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Look ahead:
                  </label>
                  <select
                    id="lookahead-days"
                    value={recurringLookaheadDays}
                    onChange={(e) => setRecurringLookaheadDays(parseInt(e.target.value))}
                    className="flex-1 max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bloom-pink"
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
                    className="px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {savingLookahead ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {lookaheadSuccess && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-700 dark:text-green-400 text-sm">{lookaheadSuccess}</p>
                  </div>
                )}
              </div>

              {/* Default Currency Setting */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Default Currency
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set your preferred currency for displaying balances and totals.
                </p>

                {/* Warning about API delay */}
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                    <p className="text-amber-700 dark:text-amber-400 text-sm">
                      Changing currency may take up to a minute while exchange rates are fetched. The app may appear unresponsive during this time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label htmlFor="default-currency" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Currency:
                  </label>
                  <CurrencySelector
                    value={localCurrency}
                    onChange={setLocalCurrency}
                    showLabel={false}
                    className="flex-1 max-w-xs"
                  />
                  <button
                    onClick={handleSaveCurrency}
                    disabled={savingCurrency}
                    className="px-4 py-2 bg-bloom-pink text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {savingCurrency ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {currencySuccess && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-700 dark:text-green-400 text-sm">{currencySuccess}</p>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  Rates by{' '}
                  <a
                    href="https://www.exchangerate-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    Exchange Rate API
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="bg-white dark:bg-dark-elevated rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account</h2>
            <div className="space-y-6">
              <div className="text-gray-600 dark:text-gray-300">
                <p>Account settings coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
                      Force Delete will move {deleteConfirm.expense_count} expense(s) to "Other" subcategory instead of deleting them.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
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
            setShowEditModal(false)
            setEditingSubcategory(null)
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

      {showExperimentalModal && (
        <ExperimentalFeaturesModal
          isOpen={showExperimentalModal}
          onClose={() => setShowExperimentalModal(false)}
        />
      )}
    </div>
  )
}

export default Settings