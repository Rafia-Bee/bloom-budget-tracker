/**
 * Bloom - Testing Tools Page
 *
 * Import/Export functionality for debts and recurring expenses
 * Makes it easy to set up test accounts with sample data
 */

import { useState } from 'react'
import api from '../api'

function TestingTools() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [exportData, setExportData] = useState(null)

  const handleExportDebts = async () => {
    try {
      setError('')
      const response = await api.get('/debts/export')
      setExportData(response.data)

      // Auto-download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `debts-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMessage(`Exported ${response.data.count} debts`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export debts')
    }
  }

  const handleExportRecurring = async () => {
    try {
      setError('')
      const response = await api.get('/recurring-expenses/export')
      setExportData(response.data)

      // Auto-download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recurring-expenses-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMessage(`Exported ${response.data.count} recurring expenses`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export recurring expenses')
    }
  }

  const handleImportDebts = async (event) => {
    try {
      setError('')
      const file = event.target.files[0]
      if (!file) return

      const text = await file.text()
      const data = JSON.parse(text)

      const response = await api.post('/debts/import', data)
      setMessage(response.data.message)
      event.target.value = '' // Reset file input
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import debts')
      event.target.value = ''
    }
  }

  const handleImportRecurring = async (event) => {
    try {
      setError('')
      const file = event.target.files[0]
      if (!file) return

      const text = await file.text()
      const data = JSON.parse(text)

      const response = await api.post('/recurring-expenses/import', data)
      setMessage(response.data.message)
      event.target.value = '' // Reset file input
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import recurring expenses')
      event.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloom-light to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-bloom-pink">Testing Tools</h1>
              <p className="text-sm text-gray-600">Export and import test data</p>
            </div>
            <a
              href="/dashboard"
              className="text-bloom-pink hover:text-pink-600 font-semibold"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Debts Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">💳 Debts</h2>

            <div className="space-y-4">
              <button
                onClick={handleExportDebts}
                className="w-full bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Export Debts
              </button>

              <div>
                <label className="block w-full">
                  <span className="sr-only">Import debts</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportDebts}
                    className="hidden"
                    id="import-debts"
                  />
                  <label
                    htmlFor="import-debts"
                    className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer text-center"
                  >
                    Import Debts
                  </label>
                </label>
              </div>
            </div>
          </div>

          {/* Recurring Expenses Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🔄 Recurring Expenses</h2>

            <div className="space-y-4">
              <button
                onClick={handleExportRecurring}
                className="w-full bg-bloom-pink text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Export Recurring Expenses
              </button>

              <div>
                <label className="block w-full">
                  <span className="sr-only">Import recurring expenses</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportRecurring}
                    className="hidden"
                    id="import-recurring"
                  />
                  <label
                    htmlFor="import-recurring"
                    className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer text-center"
                  >
                    Import Recurring Expenses
                  </label>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📋 How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              <strong>Export:</strong> Click "Export" to download your current debts or recurring expenses as a JSON file
            </li>
            <li>
              <strong>Import:</strong> Click "Import" and select a previously exported JSON file to load data into a new account
            </li>
            <li>
              <strong>Testing:</strong> Use this to quickly set up test accounts with sample data without manually entering everything
            </li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Warning:</strong> Importing will ADD to existing data, not replace it. Make sure you're importing into a clean account.
            </p>
          </div>
        </div>

        {/* Show export data preview */}
        {exportData && (
          <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Export Preview</h3>
            <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(exportData, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}

export default TestingTools
