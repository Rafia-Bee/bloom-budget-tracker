/**
 * Bloom - Goals Page
 *
 * Manage savings goals and financial targets.
 * Goals are linked to subcategories for automatic progress tracking.
 */

import { useState, useEffect } from 'react'
import { goalAPI } from '../api'
import Header from '../components/Header'
import CreateGoalModal from '../components/CreateGoalModal'
import EditGoalModal from '../components/EditGoalModal'
import ExportImportModal from '../components/ExportImportModal'
import BankImportModal from '../components/BankImportModal'
import ExperimentalFeaturesModal from '../components/ExperimentalFeaturesModal'

function Goals({ setIsAuthenticated }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Modal states for Header functionality
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('export')
  const [showBankImportModal, setShowBankImportModal] = useState(false)
  const [showExperimentalModal, setShowExperimentalModal] = useState(false)

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await goalAPI.getAll()
      setGoals(response.data.goals || [])
    } catch (err) {
      setError('Failed to load goals')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async (data) => {
    try {
      await goalAPI.create(data)
      await loadGoals()
      setShowCreateModal(false)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal')
    }
  }

  const handleUpdateGoal = async (data) => {
    try {
      await goalAPI.update(editingGoal.id, data)
      await loadGoals()
      setShowEditModal(false)
      setEditingGoal(null)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal')
    }
  }

  const handleDeleteGoal = async (goal) => {
    try {
      await goalAPI.delete(goal.id, false)
      await loadGoals()
      setDeleteConfirm(null)
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.can_force) {
        // Goal has contributions - show error in modal with force option
        setDeleteConfirm({
          ...goal,
          showForce: true,
          error: err.response.data.error,
          contribution_count: err.response.data.contribution_count
        })
      } else {
        setError(err.response?.data?.error || 'Failed to delete goal')
      }
    }
  }

  const handleForceDeleteGoal = async (goal) => {
    try {
      await goalAPI.delete(goal.id, true)
      await loadGoals()
      setDeleteConfirm(null)
      setError('')
    } catch (err) {
      setDeleteConfirm({
        ...deleteConfirm,
        error: err.response?.data?.error || 'Failed to delete goal'
      })
    }
  }

  const openEditModal = (goal) => {
    setEditingGoal(goal)
    setShowEditModal(true)
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100)
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getDaysUntilTarget = (targetDate) => {
    if (!targetDate) return null
    const target = new Date(targetDate)
    const today = new Date()
    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Goals & Savings</h1>
              <p className="text-gray-600 dark:text-gray-300">Track your savings goals and financial targets</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-bloom-pink hover:bg-bloom-pink/90 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Goal
            </button>
          </div>

          {/* Help hint for new users */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                🎯
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">How Goals Work</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Create a goal with a target amount and deadline. When you add expenses in "Savings & Investments" →
                  your goal's subcategory, they automatically count toward your progress. Track multiple goals simultaneously!
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-bloom-pink mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading your goals...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No goals yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Start by creating your first savings goal to track your financial progress
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-bloom-pink hover:bg-bloom-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Create Your First Goal
                </button>
              </div>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className="bg-white dark:bg-dark-elevated rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-md transition-shadow">
                  {/* Goal Header */}
                  <div className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">
                        {goal.name}
                      </h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditModal(goal)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Edit goal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(goal)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Delete goal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span>{formatCurrency(goal.progress.current_amount)} saved</span>
                        <span>{goal.progress.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(goal.progress.percentage)}`}
                          style={{ width: `${Math.min(100, goal.progress.percentage)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Goal Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Target:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(goal.progress.remaining)}
                        </span>
                      </div>
                      {goal.target_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Due:</span>
                          <span className={`font-medium ${
                            getDaysUntilTarget(goal.target_date) < 30
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {formatDate(goal.target_date)}
                            {getDaysUntilTarget(goal.target_date) !== null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                ({getDaysUntilTarget(goal.target_date)} days)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Achievement Badge */}
                  {goal.progress.percentage >= 100 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 px-6 py-3">
                      <div className="flex items-center text-green-700 dark:text-green-400">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Goal Achieved! 🎉</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Delete Goal
                </h3>

                {deleteConfirm.error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                    <p className="text-red-700 dark:text-red-400 text-sm">
                      {deleteConfirm.error}
                    </p>
                    {deleteConfirm.contribution_count && (
                      <p className="text-red-600 dark:text-red-300 text-xs mt-2">
                        Force Delete will move {deleteConfirm.contribution_count} contribution(s) to "Other" subcategory.
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
                      onClick={() => handleDeleteGoal(deleteConfirm)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  {deleteConfirm.showForce && (
                    <button
                      onClick={() => handleForceDeleteGoal(deleteConfirm)}
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

        {/* Create Goal Modal */}
        {showCreateModal && (
          <CreateGoalModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateGoal}
          />
        )}

        {/* Edit Goal Modal */}
        {showEditModal && editingGoal && (
          <EditGoalModal
            goal={editingGoal}
            onClose={() => {
              setShowEditModal(false)
              setEditingGoal(null)
            }}
            onUpdate={handleUpdateGoal}
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
    </div>
  )
}

export default Goals