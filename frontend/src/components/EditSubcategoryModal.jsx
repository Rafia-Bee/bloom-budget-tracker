/**
 * Bloom - Edit Subcategory Modal
 *
 * Modal for editing existing custom subcategories.
 * System subcategories cannot be edited.
 */

import { useState } from 'react'
import PropTypes from 'prop-types'

function EditSubcategoryModal({ subcategory, onClose, onUpdate }) {
  const [name, setName] = useState(subcategory.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (name.trim() === subcategory.name) {
      onClose()
      return
    }

    setLoading(true)
    setError('')

    try {
      await onUpdate(subcategory.id, {
        name: name.trim()
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subcategory')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 pb-4 border-b dark:border-dark-border">
          <h2 className="text-2xl font-bold text-bloom-pink dark:text-dark-pink">
            Edit Subcategory
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-dark-text dark:hover:text-dark-text-secondary"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
              Category
            </label>
            <div className="px-4 py-2 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text rounded-lg">
              {subcategory.category}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Category cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">
              Subcategory Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink"
              required
              maxLength={100}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-dark-text bg-gray-100 dark:bg-dark-surface rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-bloom-pink hover:bg-bloom-pink/90 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

EditSubcategoryModal.propTypes = {
  subcategory: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired
}

export default EditSubcategoryModal