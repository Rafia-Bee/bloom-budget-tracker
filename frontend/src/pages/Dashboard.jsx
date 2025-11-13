/**
 * Bloom - Dashboard Page
 *
 * Main dashboard displaying debit and credit card balances with expense tracking.
 * Shows balance cards, expense list with filters, and floating action button for adding expenses.
 */

import { useState, useEffect } from 'react'
import { expenseAPI, incomeAPI } from '../api'
import AddExpenseModal from '../components/AddExpenseModal'
import AddIncomeModal from '../components/AddIncomeModal'

function Dashboard({ setIsAuthenticated }) {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'income', 'expense', 'debit', 'credit'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [modalType, setModalType] = useState(null) // 'expense' or 'income'
  const [debitBalance, setDebitBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const creditLimit = 1500

  useEffect(() => {
    loadExpenses()
    loadIncome()
  }, [])

  useEffect(() => {
    // Combine and sort transactions whenever expenses or income change
    const combined = [
      ...expenses.map(e => ({ ...e, transactionType: 'expense' })),
      ...income.map(i => ({ ...i, transactionType: 'income' }))
    ]
    // Sort by date (most recent first)
    combined.sort((a, b) => new Date(b.date) - new Date(a.date))
    setTransactions(combined)
  }, [expenses, income])

  const loadExpenses = async () => {
    try {
      const response = await expenseAPI.getAll()
      setExpenses(response.data)
      calculateBalances(response.data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  const loadIncome = async () => {
    try {
      const response = await incomeAPI.getAll()
      setIncome(response.data)
      calculateTotalIncome(response.data)
    } catch (error) {
      console.error('Failed to load income:', error)
    }
  }

  const calculateBalances = (expenseList) => {
    let debit = 0
    let credit = 0

    expenseList.forEach(expense => {
      const amount = expense.amount / 100 // Convert cents to euros

      // Check if this is a credit card payment (reduces credit balance)
      if (expense.category === 'Debt Payments' && expense.subcategory === 'Credit Card' && expense.payment_method === 'Debit card') {
        credit -= amount // Payment reduces credit card debt
        debit += amount  // Payment comes from debit card
      } else if (expense.payment_method === 'Debit card') {
        debit += amount
      } else if (expense.payment_method === 'Credit card') {
        credit += amount
      }
    })

    setDebitBalance(debit)
    setCreditBalance(credit)
  }

  const calculateTotalIncome = (incomeList) => {
    const total = incomeList.reduce((sum, inc) => sum + (inc.amount / 100), 0)
    setTotalIncome(total)
  }

  const getDebitAvailable = () => {
    return totalIncome - debitBalance
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
      setModalType(null)
    } catch (error) {
      console.error('Failed to add expense:', error)
      throw error
    }
  }

  const handleAddIncome = async (incomeData) => {
    try {
      await incomeAPI.create(incomeData)
      setShowAddModal(false)
      setModalType(null)
      loadIncome() // Reload income list
    } catch (error) {
      console.error('Failed to add income:', error)
      throw error
    }
  }

  const handleDeleteIncome = async (id) => {
    try {
      await incomeAPI.delete(id)
      loadIncome()
    } catch (error) {
      console.error('Failed to delete income:', error)
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
              <div className="flex-1">
                <p className="text-gray-600 font-semibold mb-1">Debit Card</p>
                <p className="text-sm text-gray-500 mb-3">Spent this period</p>
                <h2 className="text-4xl font-bold text-gray-800 mb-1">
                  €{debitBalance.toFixed(2)}
                </h2>
                <p className="text-2xl font-semibold text-bloom-mint mt-2">
                  €{getDebitAvailable().toFixed(2)} <span className="text-sm text-gray-500 font-normal">available</span>
                </p>
              </div>
              <div className="bg-bloom-mint rounded-full p-3">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Income: €{totalIncome.toFixed(2)}</span>
                <span>{totalIncome > 0 ? ((debitBalance / totalIncome) * 100).toFixed(0) : 0}% used</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-bloom-mint rounded-full h-2 transition-all"
                  style={{ width: `${totalIncome > 0 ? (debitBalance / totalIncome) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Credit Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-bloom-pink">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-gray-600 font-semibold mb-1">Credit Card</p>
                <p className="text-sm text-gray-500 mb-3">Spent this period</p>
                <h2 className="text-4xl font-bold text-gray-800 mb-1">
                  €{creditBalance.toFixed(2)}
                </h2>
                <p className="text-2xl font-semibold text-bloom-mint mt-2">
                  €{(creditLimit - creditBalance).toFixed(2)} <span className="text-sm text-gray-500 font-normal">available</span>
                </p>
              </div>
              <div className="bg-bloom-pink rounded-full p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Credit limit: €{creditLimit}</span>
                <span>{((creditBalance / creditLimit) * 100).toFixed(0)}% used</span>
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

        {/* Transactions Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'all'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'income'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'expense'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilter('debit')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'debit'
                    ? 'bg-bloom-mint text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Debit
              </button>
              <button
                onClick={() => setFilter('credit')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'credit'
                    ? 'bg-bloom-pink text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Credit
              </button>
            </div>
          </div>

          {transactions.filter(t => {
            if (filter === 'all') return true
            if (filter === 'income') return t.transactionType === 'income'
            if (filter === 'expense') return t.transactionType === 'expense'
            if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
            if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
            return true
          }).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No transactions yet. Start tracking your finances!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.filter(t => {
                if (filter === 'all') return true
                if (filter === 'income') return t.transactionType === 'income'
                if (filter === 'expense') return t.transactionType === 'expense'
                if (filter === 'debit') return t.transactionType === 'expense' && t.payment_method === 'Debit card'
                if (filter === 'credit') return t.transactionType === 'expense' && t.payment_method === 'Credit card'
                return true
              }).map(transaction => {
                const isFuture = new Date(transaction.date) > new Date()
                return (
                <div
                  key={`${transaction.transactionType}-${transaction.id}`}
                  className={`flex items-center justify-between p-4 rounded-lg hover:opacity-80 transition ${
                    transaction.transactionType === 'income' ? 'bg-bloom-mint/20' : 'bg-gray-50'
                  } ${isFuture ? 'opacity-60 border-2 border-dashed border-gray-300' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.transactionType === 'income'
                          ? 'bg-bloom-mint'
                          : transaction.payment_method === 'Credit card'
                            ? 'bg-bloom-pink'
                            : 'bg-bloom-mint'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">
                            {transaction.transactionType === 'income' ? transaction.type : transaction.name}
                          </h3>
                          {isFuture && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Scheduled
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {transaction.transactionType === 'expense'
                            ? `${transaction.category} • ${transaction.subcategory}`
                            : 'Income'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.transactionType === 'income' ? 'text-green-700' : 'text-gray-800'
                      }`}>
                        {transaction.transactionType === 'income' ? '+' : ''}€{(transaction.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                    <button
                      onClick={() => transaction.transactionType === 'income'
                        ? handleDeleteIncome(transaction.id)
                        : handleDeleteExpense(transaction.id)
                      }
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>

      {/* Floating Add Button with Menu */}
      <div className="fixed bottom-8 right-8">
        {showAddMenu && (
          <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl p-2 mb-2 min-w-[150px]">
            <button
              onClick={() => {
                setModalType('expense')
                setShowAddModal(true)
                setShowAddMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <span className="text-2xl">💸</span>
              <span className="font-semibold text-gray-700">Add Expense</span>
            </button>
            <button
              onClick={() => {
                setModalType('income')
                setShowAddModal(true)
                setShowAddMenu(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <span className="text-2xl">💰</span>
              <span className="font-semibold text-gray-700">Add Income</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="bg-bloom-pink text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 transition-transform hover:scale-110"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Modals */}
      {showAddModal && modalType === 'expense' && (
        <AddExpenseModal
          onClose={() => {
            setShowAddModal(false)
            setModalType(null)
          }}
          onAdd={handleAddExpense}
        />
      )}
      {showAddModal && modalType === 'income' && (
        <AddIncomeModal
          onClose={() => {
            setShowAddModal(false)
            setModalType(null)
          }}
          onAdd={handleAddIncome}
        />
      )}
    </div>
  )
}

export default Dashboard
