/**
 * FilterTransactionsModal Test Suite
 *
 * Tests transaction filtering interface including date range,
 * categories, payment methods, amount range, search with debounce,
 * and transaction type filtering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterTransactionsModal from '../components/FilterTransactionsModal'

// Mock the APIs
vi.mock('../api', () => ({
  subcategoryAPI: {
    getAll: vi.fn()
  },
  debtAPI: {
    getAll: vi.fn()
  }
}))

import { subcategoryAPI, debtAPI } from '../api'

describe('FilterTransactionsModal', () => {
  let mockOnClose
  let mockOnApply
  const mockSubcategories = {
    'Fixed Expenses': ['Rent', 'Utilities', 'Insurance'],
    'Flexible Expenses': ['Groceries', 'Entertainment', 'Dining'],
    'Savings & Investments': ['Emergency Fund', 'Retirement'],
    'Debt Payments': ['Credit Card']
  }
  const mockDebts = [
    { id: 1, name: 'Car Loan' },
    { id: 2, name: 'Student Loan' }
  ]

  beforeEach(() => {
    mockOnClose = vi.fn()
    mockOnApply = vi.fn()
    subcategoryAPI.getAll.mockResolvedValue({ data: { subcategories: mockSubcategories } })
    debtAPI.getAll.mockResolvedValue({ data: mockDebts })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <FilterTransactionsModal
          isOpen={false}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.queryByText('Filter Transactions')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.getByText('Filter Transactions')).toBeInTheDocument()
    })

    it('renders all filter sections', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.getByText('Transaction Type')).toBeInTheDocument()
      expect(screen.getByText('Search (Name/Notes)')).toBeInTheDocument()
      expect(screen.getByText('Start Date')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Subcategory')).toBeInTheDocument()
      expect(screen.getByText('Payment Method')).toBeInTheDocument()
      expect(screen.getByText(/Min Amount/)).toBeInTheDocument()
      expect(screen.getByText(/Max Amount/)).toBeInTheDocument()
    })

    it('renders Apply Filters and Clear All buttons', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument()
    })

    it('renders close X button', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument()
    })
  })

  describe('Transaction Type Buttons', () => {
    it('defaults to Both selected', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const bothButton = screen.getByRole('button', { name: 'Both' })
      expect(bothButton).toHaveClass('bg-bloom-pink')
    })

    it('allows selecting Expenses', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Expenses' }))

      const expensesButton = screen.getByRole('button', { name: 'Expenses' })
      expect(expensesButton).toHaveClass('bg-bloom-pink')
    })

    it('allows selecting Income', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Income' }))

      const incomeButton = screen.getByRole('button', { name: 'Income' })
      expect(incomeButton).toHaveClass('bg-bloom-mint')
    })

    it('hides expense-specific filters when Income is selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Income' }))

      expect(screen.queryByText('Category')).not.toBeInTheDocument()
      expect(screen.queryByText('Subcategory')).not.toBeInTheDocument()
      expect(screen.queryByText('Payment Method')).not.toBeInTheDocument()
    })
  })

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument()
    })

    it('allows typing in search field', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search transactions...')
      await user.type(searchInput, 'groceries')

      expect(searchInput).toHaveValue('groceries')
    })

    it('debounces search input (500ms)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search transactions...')
      await user.type(searchInput, 'test')

      // Apply immediately after typing
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

      // Search should not be in filters yet (not debounced)
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' })
      )

      mockOnApply.mockClear()

      // Advance time for debounce
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

      // Now search should be in filters
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      )
    })
  })

  describe('Date Filters', () => {
    it('allows setting start date', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      // Use getAllByDisplayValue for type=date inputs
      const allInputs = document.querySelectorAll('input[type="date"]')
      const startDate = allInputs[0]
      await user.type(startDate, '2025-01-01')

      expect(startDate).toHaveValue('2025-01-01')
    })

    it('allows setting end date', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const allInputs = document.querySelectorAll('input[type="date"]')
      const endDate = allInputs[1]
      await user.type(endDate, '2025-12-31')

      expect(endDate).toHaveValue('2025-12-31')
    })
  })

  describe('Category Filter', () => {
    it('shows all category options', async () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalled()
      })

      // Get all comboboxes - category is first, subcategory is second, payment is third
      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[0]
      expect(categorySelect).toBeInTheDocument()

      expect(screen.getByRole('option', { name: 'All Categories' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Fixed Expenses' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Flexible Expenses' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Savings & Investments' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Debt Payments' })).toBeInTheDocument()
    })

    it('allows selecting a category', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalled()
      })

      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[0]
      await user.selectOptions(categorySelect, 'Fixed Expenses')

      expect(categorySelect).toHaveValue('Fixed Expenses')
    })

    it('clears subcategory when category changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalled()
      })

      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[0]
      const subcategorySelect = selects[1]
      await user.selectOptions(categorySelect, 'Fixed Expenses')

      // Select subcategory
      await user.selectOptions(subcategorySelect, 'Rent')

      // Change category
      await user.selectOptions(categorySelect, 'Flexible Expenses')

      // Subcategory should be reset
      expect(subcategorySelect).toHaveValue('')
    })
  })

  describe('Subcategory Filter', () => {
    it('shows subcategories for selected category', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalled()
      })

      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[0]
      await user.selectOptions(categorySelect, 'Fixed Expenses')

      // Check subcategories appear
      expect(screen.getByRole('option', { name: 'Rent' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Utilities' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Insurance' })).toBeInTheDocument()
    })

    it('includes debts in Debt Payments subcategories', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(debtAPI.getAll).toHaveBeenCalled()
      })

      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[0]
      await user.selectOptions(categorySelect, 'Debt Payments')

      // Should show debts in subcategory dropdown
      // Check that debts appear in the subcategory options
      const subcategorySelect = selects[1]
      const options = Array.from(subcategorySelect.querySelectorAll('option'))
      const optionNames = options.map(opt => opt.textContent)

      expect(optionNames).toContain('Car Loan')
      expect(optionNames).toContain('Student Loan')
    })
  })

  describe('Payment Method Filter', () => {
    it('shows payment method options', () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      // Payment method is the third select (after category and subcategory)
      const selects = screen.getAllByRole('combobox')
      const paymentSelect = selects[2]
      expect(paymentSelect).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'All Methods' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Debit Card' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument()
    })

    it('allows selecting payment method', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const selects = screen.getAllByRole('combobox')
      const paymentSelect = selects[2]
      await user.selectOptions(paymentSelect, 'Debit card')

      expect(paymentSelect).toHaveValue('Debit card')
    })
  })

  describe('Amount Range', () => {
    it('allows setting min amount', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const minAmount = screen.getByPlaceholderText('0.00')
      await user.type(minAmount, '10.50')

      expect(minAmount).toHaveValue(10.5)
    })

    it('allows setting max amount', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      const maxAmount = screen.getByPlaceholderText('999.99')
      await user.type(maxAmount, '500')

      expect(maxAmount).toHaveValue(500)
    })
  })

  describe('Initial Filters', () => {
    it('pre-fills filters from initialFilters', () => {
      const initialFilters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        category: 'Fixed Expenses',
        subcategory: '',
        paymentMethod: 'Debit card',
        minAmount: '10',
        maxAmount: '100',
        search: 'rent',
        transactionType: 'expense'
      }

      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
          initialFilters={initialFilters}
        />
      )

      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs[0]).toHaveValue('2025-01-01')
      expect(dateInputs[1]).toHaveValue('2025-01-31')
      expect(screen.getByPlaceholderText('Search transactions...')).toHaveValue('rent')
    })
  })

  describe('Apply Filters', () => {
    it('calls onApply with all filters', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(mockOnApply).toHaveBeenCalledWith({
        startDate: '',
        endDate: '',
        category: '',
        subcategory: '',
        paymentMethod: '',
        minAmount: '',
        maxAmount: '',
        search: '',
        transactionType: 'both'
      })
    })

    it('calls onClose after applying', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Clear All', () => {
    it('clears all filters', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const initialFilters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        category: 'Fixed Expenses',
        subcategory: '',
        paymentMethod: 'Debit card',
        minAmount: '10',
        maxAmount: '100',
        search: 'test',
        transactionType: 'expense'
      }

      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
          initialFilters={initialFilters}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Clear All' }))

      expect(mockOnApply).toHaveBeenCalledWith({
        startDate: '',
        endDate: '',
        category: '',
        subcategory: '',
        paymentMethod: '',
        minAmount: '',
        maxAmount: '',
        search: '',
        transactionType: 'both'
      })
    })

    it('calls onClose after clearing', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Clear All' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Close Modal', () => {
    it('calls onClose when X button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await user.click(screen.getByRole('button', { name: '×' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('API Loading', () => {
    it('loads subcategories on open', async () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalledTimes(1)
      })
    })

    it('loads debts on open', async () => {
      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      await waitFor(() => {
        expect(debtAPI.getAll).toHaveBeenCalledTimes(1)
      })
    })

    it('handles API errors gracefully', async () => {
      subcategoryAPI.getAll.mockRejectedValue(new Error('API error'))

      render(
        <FilterTransactionsModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      )

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Filter Transactions')).toBeInTheDocument()
      })
    })
  })
})
