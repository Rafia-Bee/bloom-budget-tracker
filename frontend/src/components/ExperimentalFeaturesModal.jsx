/**
 * Bloom - Experimental Features Settings Modal
 *
 * Allows users to enable experimental/beta features with appropriate warnings.
 */

import { useFeatureFlag } from '../contexts/FeatureFlagContext'
import PropTypes from 'prop-types';

export default function ExperimentalFeaturesModal({ onClose }) {
  const { flags, toggleFlag } = useFeatureFlag()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">⚗️ Experimental Features</h2>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Enable features in development</p>
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
            <div className="border border-dashed border-gray-300 dark:border-dark-border rounded-lg p-4 text-center text-gray-500 dark:text-dark-text-secondary">
              <p className="text-sm">No experimental features available yet</p>
              <p className="text-xs mt-1 dark:text-dark-text-secondary">New features will appear here as they're developed</p>
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

