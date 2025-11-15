/**
 * Bloom - Debts Page
 *
 * Manage and track debts with payoff projections.
 * Shows debt list, balances, monthly payments, and estimated payoff dates.
 */

import { useState, useEffect } from 'react'
import { debtAPI } from '../api'
import AddDebtModal from '../components/AddDebtModal'
import EditDebtModal from '../components/EditDebtModal'

function Debts({ setIsAuthenticated }) {
  const [debts, setDebts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)

  useEffect(() => {
    loadDebts()
  }, [])

  const loadDebts = async () => {
    try {
      const response = await debtAPI.getAll()
      setDebts(response.data)
    } catch (error) {
      console.error('Failed to load debts:', error)
    }
  }

  const handleAddDebt = async (debtData) => {
    try {
      await debtAPI.create(debtData)
      loadDebts()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add debt:', error)
      throw error
    }
  }

  const handleEditDebt = async (id, debtData) => {
    try {
      await debtAPI.update(id, debtData)
      loadDebts()
      setShowEditModal(false)
      setSelectedDebt(null)
    } catch (error) {
      console.error('Failed to update debt:', error)
      throw error
    }
  }

  const handleDeleteDebt = async (id) => {
    if (window.confirm('Are you sure you want to delete this debt?')) {
      try {
        await debtAPI.delete(id)
        loadDebts()
      } catch (error) {
        console.error('Failed to delete debt:', error)
      }
    }
  }

  const calculatePayoffMonths = (balance, monthlyPayment) => {
    if (monthlyPayment <= 0) return null
    return Math.ceil(balance / monthlyPayment)
  }

  const getTotalDebt = () => {
    return debts.reduce((sum, debt) => sum + (debt.current_balance / 100), 0)
  }

  const getTotalMonthlyPayment = () => {
    return debts.reduce((sum, debt) => sum + (debt.monthly_payment / 100), 0)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-bloom-pink">Bloom - Debt Tracker</h1>
            <p className="text-sm text-gray-600">Manage your debts and track payoff progress</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-bloom-pink transition">
              ← Back to Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-bloom-pink transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-semibold mb-1">Total Debt</p>
                <h2 className="text-4xl font-bold text-gray-800">
                  €{getTotalDebt().toFixed(2)}
                </h2>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Across {debts.length} {debts.length === 1 ? 'debt' : 'debts'}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-semibold mb-1">Monthly Payments</p>
                <h2 className="text-4xl font-bold text-gray-800">
                  €{getTotalMonthlyPayment().toFixed(2)}
                </h2>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Debts List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Debts</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-bloom-pink text-white px-4 py-2 rounded-lg hover:bg-bloom-pink/90 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Debt
            </button>
          </div>

          {debts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No debts tracked</h3>
              <p className="text-gray-600 mb-4">Add your debts to track payoff progress</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-bloom-pink text-white px-6 py-2 rounded-lg hover:bg-bloom-pink/90 transition"
              >
                Add Your First Debt
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map(debt => {
                const balance = debt.current_balance / 100
                const original = debt.original_amount / 100
                const monthly = debt.monthly_payment / 100
                const progress = ((original - balance) / original) * 100
                const monthsLeft = calculatePayoffMonths(balance, monthly)

                return (
                  <div key={debt.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{debt.name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Current Balance</p>
                            <p className="font-semibold text-gray-800">€{balance.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Original Amount</p>
                            <p className="font-semibold text-gray-800">€{original.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Payment</p>
                            <p className="font-semibold text-gray-800">€{monthly.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payoff Time</p>
                            <p className="font-semibold text-gray-800">
                              {monthsLeft ? `${monthsLeft} ${monthsLeft === 1 ? 'month' : 'months'}` : 'Set payment'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedDebt(debt)
                            setShowEditModal(true)
                          }}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress: {progress.toFixed(1)}% paid off</span>
                        <span>€{(original - balance).toFixed(2)} / €{original.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-bloom-mint rounded-full h-3 transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Debt Modal */}
      {showAddModal && (
        <AddDebtModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDebt}
        />
      )}

      {/* Edit Debt Modal */}
      {showEditModal && selectedDebt && (
        <EditDebtModal
          onClose={() => {
            setShowEditModal(false)
            setSelectedDebt(null)
          }}
          onEdit={handleEditDebt}
          debt={selectedDebt}
        />
      )}
    </div>
  )
}

export default Debts
