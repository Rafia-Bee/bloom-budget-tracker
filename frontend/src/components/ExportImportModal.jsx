/**
 * Bloom - Export/Import Modal
 *
 * Modal for exporting and importing data (debts, recurring expenses).
 */

import React, { useState } from 'react'
import api from '../api'

function ExportImportModal({ onClose, mode = 'export' }) {
  const [exportTypes, setExportTypes] = useState({
    debts: true,
    recurring_expenses: true,
    salary_periods: true,
    expenses: true,
    income: true
  })
  const [exportFormat, setExportFormat] = useState('json') // 'json' or 'csv'
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ]
    return csvRows.join('\n')
  }

  const handleExport = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const selectedTypes = Object.keys(exportTypes).filter(key => exportTypes[key])

      if (selectedTypes.length === 0) {
        setError('Please select at least one data type to export')
        setLoading(false)
        return
      }

      const response = await api.post(
        '/data/export',
        { types: selectedTypes }
      )

      if (exportFormat === 'json') {
        // Download as JSON file with descriptive name
        const dateStr = new Date().toISOString().split('T')[0]
        const typeAbbreviations = {
          debts: 'debts',
          recurring_expenses: 'recurring',
          salary_periods: 'periods',
          expenses: 'expenses',
          income: 'income'
        }
        const typesStr = selectedTypes.map(t => typeAbbreviations[t] || t).join('-')

        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bloom-${typesStr}-${dateStr}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        // Download as CSV files (one per type)
        const exportData = response.data.data
        const dateStr = new Date().toISOString().split('T')[0]

        for (const type of selectedTypes) {
          if (exportData[type] && exportData[type].length > 0) {
            const csv = convertToCSV(exportData[type], type)
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `bloom-${type}-${dateStr}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
          }
        }
      }

      setMessage('Data exported successfully!')
    } catch (err) {
      setError(err.response?.data?.error || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const fileContent = await file.text()
      const importData = JSON.parse(fileContent)

      const response = await api.post(
        '/data/import',
        importData
      )

      const counts = response.data.imported
      const skipped = response.data.skipped
      const summary = []

      if (counts.debts > 0) summary.push(`${counts.debts} debt(s)`)
      if (counts.recurring_expenses > 0) summary.push(`${counts.recurring_expenses} recurring expense(s)`)
      if (counts.salary_periods > 0) summary.push(`${counts.salary_periods} salary period(s)`)
      if (counts.expenses > 0) summary.push(`${counts.expenses} expense(s)`)
      if (counts.income > 0) summary.push(`${counts.income} income(s)`)

      let message = summary.length > 0 ? `Successfully imported: ${summary.join(', ')}` : 'No new data imported'

      // Add skipped items info
      const skippedSummary = []
      if (skipped?.debts > 0) skippedSummary.push(`${skipped.debts} debt(s)`)
      if (skipped?.recurring_expenses > 0) skippedSummary.push(`${skipped.recurring_expenses} recurring expense(s)`)
      if (skipped?.salary_periods > 0) skippedSummary.push(`${skipped.salary_periods} salary period(s)`)
      if (skipped?.expenses > 0) skippedSummary.push(`${skipped.expenses} expense(s)`)
      if (skipped?.income > 0) skippedSummary.push(`${skipped.income} income(s)`)

      if (skippedSummary.length > 0) {
        message += `\n\nSkipped ${skippedSummary.join(', ')} (already exists)`
      }

      setMessage(message + '\n\nPlease close this dialog and refresh the page to see imported data.')
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Please check file format.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'export' ? 'Export Data' : 'Import Data'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex justify-between items-start">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-green-700 hover:text-green-900 ml-4 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-start">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900 ml-4 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {mode === 'export' ? (
          <div>
            <p className="text-gray-600 mb-4">
              Select what you want to export:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTypes.debts}
                  onChange={(e) => setExportTypes({ ...exportTypes, debts: e.target.checked })}
                  className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink"
                />
                <span className="text-gray-700">Debts</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTypes.recurring_expenses}
                  onChange={(e) => setExportTypes({ ...exportTypes, recurring_expenses: e.target.checked })}
                  className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink"
                />
                <span className="text-gray-700">Recurring Expenses</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTypes.salary_periods}
                  onChange={(e) => setExportTypes({ ...exportTypes, salary_periods: e.target.checked })}
                  className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink"
                />
                <span className="text-gray-700">Salary Periods</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTypes.expenses}
                  onChange={(e) => setExportTypes({ ...exportTypes, expenses: e.target.checked })}
                  className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink"
                />
                <span className="text-gray-700">Expenses</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTypes.income}
                  onChange={(e) => setExportTypes({ ...exportTypes, income: e.target.checked })}
                  className="w-5 h-5 text-bloom-pink rounded focus:ring-bloom-pink"
                />
                <span className="text-gray-700">Income</span>
              </label>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 font-semibold mb-3">Export Format:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-bloom-pink focus:ring-bloom-pink"
                  />
                  <span className="text-gray-700">JSON (for import)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-bloom-pink focus:ring-bloom-pink"
                  />
                  <span className="text-gray-700">CSV (for Excel)</span>
                </label>
              </div>
              {exportFormat === 'csv' && (
                <p className="text-sm text-gray-500 mt-2">
                  Note: CSV exports create separate files for each data type
                </p>
              )}
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full bg-bloom-pink text-white font-semibold py-3 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Select a Bloom export file to import. The system will automatically detect and import debts, recurring expenses, salary periods, expenses, and income.
            </p>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Importing will add new items without removing existing data.
              </p>
            </div>

            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={loading}
              className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-bloom-pink file:text-white hover:file:bg-bloom-pink/90 file:cursor-pointer cursor-pointer disabled:opacity-50"
            />
          </div>
        )}

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-4 text-gray-600 font-semibold py-2 hover:text-gray-800 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ExportImportModal
