/**
 * Bloom - Experimental Features Settings Modal
 *
 * Allows users to enable experimental/beta features with appropriate warnings.
 */

import { useState } from 'react'
import { useFeatureFlag } from '../contexts/FeatureFlagContext'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { userAPI } from '../api'

export default function ExperimentalFeaturesModal({ onClose }) {
  const { flags, toggleFlag } = useFeatureFlag()
  const navigate = useNavigate()
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'Delete everything') {
      setDeleteError('You must type exactly: Delete everything')
      return
    }

    setIsDeleting(true)
    setDeleteError('')

    try {
      const response = await userAPI.deleteAllData(deleteConfirmText)

      if (response.data.success) {
        // Show success briefly then redirect to dashboard (which shows setup wizard)
        alert(`Successfully deleted ${response.data.deleted_records.total} records`)
        onClose()
        navigate('/dashboard')
        window.location.reload() // Force full reload to clear state
      }
    } catch (error) {
      setDeleteError(error.response?.data?.error || 'Failed to delete data')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-500 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Experimental Features</h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Enable features in development</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-dark-text dark:hover:text-dark-text-secondary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-1">Important Notice</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Experimental features are under active development and may:
              </p>
              <ul className="text-sm text-amber-800 dark:text-amber-300 mt-2 space-y-1 ml-4 list-disc">
                <li>Have bugs or incomplete functionality</li>
                <li>Change or be removed without notice</li>
                <li>Affect your data in unexpected ways</li>
              </ul>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-2 font-medium">
                Use at your own risk. Always keep backups!
              </p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="p-6 space-y-4">
          <div className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-dark-elevated">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text">Experimental Features</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    BETA
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Enable all experimental features currently in development
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={flags.experimentalFeaturesEnabled}
                  onChange={() => toggleFlag('experimentalFeaturesEnabled')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Future feature toggles can be added here */}
          {flags.experimentalFeaturesEnabled && (
            <div className="space-y-4">
              {/* Multi-Currency Support Toggle */}
              <div className="border border-gray-200 dark:border-dark-border rounded-lg p-4 bg-white dark:bg-dark-elevated">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text">Multi-Currency Support</h3>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                        NEW
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                      Enable currency selection for expenses and income. When disabled, all amounts use EUR.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={flags.multiCurrencyEnabled || false}
                      onChange={() => toggleFlag('multiCurrencyEnabled')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* Reports & Analytics Toggle */}
              <div className="border border-gray-200 dark:border-dark-border rounded-lg p-4 bg-white dark:bg-dark-elevated">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text">Reports & Analytics</h3>
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                        NEW
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                      Access spending trends, category breakdowns, and income vs expense charts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={flags.reportsEnabled || false}
                      onChange={() => toggleFlag('reportsEnabled')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              {/* Danger Zone - Delete All Data */}
              <div className="border-2 border-red-300 dark:border-red-800 rounded-lg p-5 bg-red-50 dark:bg-red-950/20">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 dark:text-red-400 text-lg">⚠️ Danger Zone</h4>
                    <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                      Delete all your financial data permanently
                    </p>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete All Data
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-dark-elevated rounded-lg p-4 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-900 dark:text-red-300 font-semibold mb-2">
                        This will permanently delete:
                      </p>
                      <ul className="text-xs text-red-800 dark:text-red-400 space-y-1 ml-4 list-disc">
                        <li>All expenses</li>
                        <li>All income entries</li>
                        <li>All salary periods & weekly budgets</li>
                        <li>All debts</li>
                        <li>All recurring expenses</li>
                      </ul>
                      <p className="text-xs text-red-900 dark:text-red-300 font-bold mt-3">
                        ⚠️ YOUR LOGIN WILL REMAIN but all financial data will be gone forever!
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-red-900 dark:text-red-400 mb-2">
                        Type <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">Delete everything</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => {
                          setDeleteConfirmText(e.target.value)
                          setDeleteError('')
                        }}
                        disabled={isDeleting}
                        placeholder="Delete everything"
                        className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text disabled:opacity-50"
                      />
                      {deleteError && (
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                          {deleteError}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                          setDeleteError('')
                        }}
                        disabled={isDeleting}
                        className="flex-1 bg-gray-200 dark:bg-dark-elevated hover:bg-gray-300 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
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
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Confirm Delete All
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-dark-elevated border-t border-gray-200 dark:border-dark-border px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

ExperimentalFeaturesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

