/**
 * Bloom - Admin Page
 *
 * Hidden admin page for maintenance tasks.
 * Access via: /admin
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Admin() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleRemoveDuplicates = async () => {
    if (!confirm('Remove duplicate Initial Balance entries? This will keep only the earliest one for each user.')) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}/admin/remove-duplicate-initial-balances`,
        {
          method: 'POST',
          credentials: 'include', // Send cookies (JWT)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove duplicates')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Admin Tasks</h1>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="space-y-6">
            {/* Remove Duplicate Initial Balances */}
            <div className="border dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
                Remove Duplicate Initial Balance Entries
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Removes duplicate "Initial Balance" income entries, keeping only the earliest one for each user.
                This is a one-time cleanup for a bug that was fixed in commit 76fb0c0.
              </p>
              <button
                onClick={handleRemoveDuplicates}
                disabled={loading}
                className="bg-bloom-pink hover:bg-bloom-pink/90 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Remove Duplicates'}
              </button>

              {/* Result */}
              {result && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    ✓ {result.message}
                  </h3>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>Deleted: {result.deleted_count} entries</li>
                    <li>Users affected: {result.users_affected}</li>
                  </ul>

                  {result.details && result.details.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-green-900 dark:text-green-100">
                        Show details
                      </summary>
                      <div className="mt-2 space-y-3 text-xs">
                        {result.details.map((detail, idx) => (
                          <div key={idx} className="pl-4 border-l-2 border-green-300 dark:border-green-700">
                            <div className="font-medium">User {detail.user_id}:</div>
                            <div className="text-green-700 dark:text-green-300">
                              ✓ Kept: €{(detail.kept.amount / 100).toFixed(2)} ({detail.kept.date})
                            </div>
                            {detail.deleted.map((del, delIdx) => (
                              <div key={delIdx} className="text-red-700 dark:text-red-400">
                                ✗ Deleted: €{(del.amount / 100).toFixed(2)} ({del.date})
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
