/**
 * Bloom - Dashboard Page
 *
 * Main dashboard displaying debit and credit card balances with expense tracking.
 * Shows balance cards, expense list with filters, and floating action button for adding expenses.
 */

import { useState, useEffect } from 'react'
import { expenseAPI } from '../api'
import AddExpenseModal from '../components/AddExpenseModal'
import ExpenseList from '../components/ExpenseList'

function Dashboard({ setIsAuthenticated }) {
  const [expenses, setExpenses] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [debitBalance, setDebitBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const creditLimit = 1500

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      const response = await expenseAPI.getAll()
      setExpenses(response.data)
      calculateBalances(response.data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  const calculateBalances = (expenseList) => {
    let debit = 0
    let credit = 0

    expenseList.forEach(expense => {
      const amount = expense.amount / 100 // Convert cents to euros
      if (expense.payment_method === 'Debit card') {
        debit += amount
      } else if (expense.payment_method === 'Credit card') {
        credit += amount
      }
    })

    setDebitBalance(debit)
    setCreditBalance(credit)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
  }

  const handleAddExpense = async (expenseData) => {
    try {
      await expenseAPI.create(expenseData)
      loadExpenses()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add expense:', error)
      throw error
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      await expenseAPI.delete(id)
      loadExpenses()
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-bloom-pink">Bloom</h1>
            <p className="text-sm text-gray-600">Financial Habits That Grow With You</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-600 hover:text-bloom-pink transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Debit Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-mint">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 font-semibold">Debit Card</p>
                <h2 className="text-3xl font-bold text-gray-800 mt-2">
                  €{debitBalance.toFixed(2)}
                </h2>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500">Total spent this period</p>
          </div>

          {/* Credit Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-pink">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 font-semibold">Credit Card</p>
                <h2 className="text-3xl font-bold text-gray-800 mt-2">
                  €{creditBalance.toFixed(2)}
                </h2>
              </div>
              <div className="bg-bloom-pink rounded-full p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Available</span>
                <span>€{(creditLimit - creditBalance).toFixed(2)} / €{creditLimit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-bloom-pink rounded-full h-2 transition-all"
                  style={{ width: `${(creditBalance / creditLimit) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 bg-bloom-pink text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 transition-transform hover:scale-110"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExpense}
        />
      )}
    </div>
  )
}

export default Dashboard
