/**
 * AddRecurringExpenseModal Test Suite
 *
 * Tests for the Add Recurring Expense modal component covering:
 * - Form rendering with all fields
 * - Input validation (name, amount, dates)
 * - Frequency selection (weekly, biweekly, monthly, custom)
 * - Category/subcategory selection with debt/goal autofill
 * - Fixed bill toggle functionality
 * - Form submission with cents conversion
 * - Edit mode with pre-populated values
 * - Error handling
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddRecurringExpenseModal from '../components/AddRecurringExpenseModal'
import { debtAPI, goalAPI, subcategoryAPI } from '../api'

// Mock the API modules
vi.mock('../api', () => ({
  debtAPI: {
    getAll: vi.fn()
  },
  goalAPI: {
    getAll: vi.fn()
  },
  subcategoryAPI: {
    getAll: vi.fn()
  }
}))

describe('AddRecurringExpenseModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAdd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAdd.mockResolvedValue(undefined)

    // Default mock responses
    debtAPI.getAll.mockResolvedValue({ data: [] })
    goalAPI.getAll.mockResolvedValue({ data: { goals: [] } })
    subcategoryAPI.getAll.mockResolvedValue({ data: { subcategories: {} } })
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders the modal with title for add mode', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('heading', { name: 'Add Recurring Expense' })).toBeInTheDocument()
    })

    it('renders the modal with title for edit mode', async () => {
      const existingExpense = { name: 'Test Expense', amount: 1500 }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      expect(screen.getByRole('heading', { name: 'Edit Recurring Expense' })).toBeInTheDocument()
    })

    it('renders all form fields', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument()
      })
      expect(screen.getByText('Amount ($)')).toBeInTheDocument()
      expect(screen.getByText('Payment Method')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Subcategory')).toBeInTheDocument()
    })

    it('renders recurrence schedule section', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Recurrence Schedule')).toBeInTheDocument()
      })
      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })

    it('renders Create and Cancel buttons in add mode', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Update button in edit mode', async () => {
      const existingExpense = { name: 'Test', amount: 1000 }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
    })

    it('renders close X button', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Create') && !btn.textContent.includes('Cancel'))
      expect(xButton).toBeInTheDocument()
    })

    it('renders notes field', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Notes (Optional)')).toBeInTheDocument()
      })
      expect(screen.getByPlaceholderText('Add any additional details...')).toBeInTheDocument()
    })

    it('renders fixed bill checkbox', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText(/Fixed Bill/)).toBeInTheDocument()
      })
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })
  })

  describe('Default Values', () => {
    it('has default name of Netflix', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByDisplayValue('Netflix')
      expect(nameInput).toBeInTheDocument()
    })

    it('has default category of Fixed Expenses', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        // Category is the second select (index 1): Payment Method, Category, Subcategory, Frequency
        const categorySelect = screen.getAllByRole('combobox')[1]
        expect(categorySelect).toHaveValue('Fixed Expenses')
      })
    })

    it('has default frequency of monthly', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        const frequencySelect = screen.getByDisplayValue('Monthly')
        expect(frequencySelect).toBeInTheDocument()
      })
    })

    it('has default payment method of Credit card', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Credit Card')).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode Pre-Population', () => {
    it('pre-populates name from existing expense', async () => {
      const existingExpense = { name: 'Gym Membership', amount: 2500 }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      expect(screen.getByDisplayValue('Gym Membership')).toBeInTheDocument()
    })

    it('pre-populates amount from existing expense (converts from cents)', async () => {
      const existingExpense = { name: 'Test', amount: 2500 }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      expect(screen.getByDisplayValue('25.00')).toBeInTheDocument()
    })

    it('pre-populates category from existing expense', async () => {
      const existingExpense = { name: 'Test', amount: 1000, category: 'Flexible Expenses' }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Flexible Expenses')).toBeInTheDocument()
      })
    })

    it('pre-populates frequency from existing expense', async () => {
      const existingExpense = { name: 'Test', amount: 1000, frequency: 'weekly' }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument()
      })
    })

    it('pre-populates is_fixed_bill from existing expense', async () => {
      const existingExpense = { name: 'Rent', amount: 100000, is_fixed_bill: true }
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} existingExpense={existingExpense} />)

      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })

  describe('Frequency Selection', () => {
    it('shows all frequency options', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        const frequencySelect = screen.getByDisplayValue('Monthly')
        expect(frequencySelect).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const frequencySelect = screen.getByDisplayValue('Monthly')
      await user.click(frequencySelect)

      expect(screen.getByText('Weekly')).toBeInTheDocument()
      expect(screen.getByText('Biweekly (Every 2 weeks)')).toBeInTheDocument()
      expect(screen.getByText('Monthly')).toBeInTheDocument()
      expect(screen.getByText('Custom (Every X days)')).toBeInTheDocument()
    })

    it('shows day of week selector for weekly frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'weekly')

      await waitFor(() => {
        expect(screen.getByText('Day of Week')).toBeInTheDocument()
      })
      expect(screen.getByText('Monday')).toBeInTheDocument()
    })

    it('shows day of week selector for biweekly frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'biweekly')

      await waitFor(() => {
        expect(screen.getByText('Day of Week')).toBeInTheDocument()
      })
    })

    it('shows day of month selector for monthly frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Due Date (Day of Month)')).toBeInTheDocument()
      })
    })

    it('shows custom day interval input for custom frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'custom')

      await waitFor(() => {
        expect(screen.getByText('Repeat every X days')).toBeInTheDocument()
      })
    })

    it('shows all weekday options', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'weekly')

      await waitFor(() => {
        expect(screen.getByText('Day of Week')).toBeInTheDocument()
      })

      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      weekdays.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })
  })

  describe('Category Selection', () => {
    it('shows all category options', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('Fixed Expenses')
        expect(categorySelect).toBeInTheDocument()
      })

      expect(screen.getByText('Fixed Expenses')).toBeInTheDocument()
      expect(screen.getByText('Flexible Expenses')).toBeInTheDocument()
      expect(screen.getByText('Savings & Investments')).toBeInTheDocument()
      expect(screen.getByText('Debt Payments')).toBeInTheDocument()
    })

    it('shows default subcategories for Fixed Expenses', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Rent')).toBeInTheDocument()
      })
      expect(screen.getByText('Utilities')).toBeInTheDocument()
      expect(screen.getByText('Insurance')).toBeInTheDocument()
      expect(screen.getByText('Subscriptions')).toBeInTheDocument()
    })

    it('updates subcategories when category changes', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Flexible Expenses')

      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument()
      })
      expect(screen.getByText('Transportation')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
    })

    it('shows credit card option for Debt Payments', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      // Wait for API calls to complete
      await waitFor(() => {
        expect(debtAPI.getAll).toHaveBeenCalled()
      })

      // Find category select and change it
      const categorySelect = screen.getByDisplayValue('Fixed Expenses')
      await user.selectOptions(categorySelect, 'Debt Payments')

      // Wait for the category to be changed
      await waitFor(() => {
        expect(screen.getByDisplayValue('Debt Payments')).toBeInTheDocument()
      })

      // Credit Card appears in both Payment Method and Subcategory selects
      // Check that there are 2 elements with Credit Card display value
      const creditCardSelects = screen.getAllByDisplayValue('Credit Card')
      expect(creditCardSelects).toHaveLength(2)
    })
  })

  describe('Debt Integration', () => {
    it('loads debts on mount', async () => {
      const mockDebts = [
        { id: 1, name: 'Student Loan', monthly_payment: 25000 },
        { id: 2, name: 'Car Loan', monthly_payment: 30000 }
      ]
      debtAPI.getAll.mockResolvedValue({ data: mockDebts })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(debtAPI.getAll).toHaveBeenCalled()
      })
    })

    it('shows debt names as subcategory options', async () => {
      const mockDebts = [
        { id: 1, name: 'Student Loan', monthly_payment: 25000 }
      ]
      debtAPI.getAll.mockResolvedValue({ data: mockDebts })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Debt Payments')

      await waitFor(() => {
        expect(screen.getByText('Student Loan')).toBeInTheDocument()
      })
    })

    it('autofills amount when debt is selected', async () => {
      const mockDebts = [
        { id: 1, name: 'Student Loan', monthly_payment: 25000 }
      ]
      debtAPI.getAll.mockResolvedValue({ data: mockDebts })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Debt Payments')

      await waitFor(() => {
        expect(screen.getByText('Student Loan')).toBeInTheDocument()
      })

      // Find the subcategory select and change it
      const subcategorySelects = screen.getAllByRole('combobox')
      const subcategorySelect = subcategorySelects.find(s => s.value === 'Credit Card')
      await user.selectOptions(subcategorySelect, 'Student Loan')

      await waitFor(() => {
        expect(screen.getByDisplayValue('250.00')).toBeInTheDocument()
      })
    })

    it('autofills name with Payment suffix when debt is selected', async () => {
      const mockDebts = [
        { id: 1, name: 'Car Loan', monthly_payment: 30000 }
      ]
      debtAPI.getAll.mockResolvedValue({ data: mockDebts })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Debt Payments')

      await waitFor(() => {
        expect(screen.getByText('Car Loan')).toBeInTheDocument()
      })

      const subcategorySelects = screen.getAllByRole('combobox')
      const subcategorySelect = subcategorySelects.find(s => s.value === 'Credit Card')
      await user.selectOptions(subcategorySelect, 'Car Loan')

      await waitFor(() => {
        expect(screen.getByDisplayValue('Car Loan Payment')).toBeInTheDocument()
      })
    })
  })

  describe('Goal Integration', () => {
    it('loads goals on mount', async () => {
      const mockGoals = [
        { id: 1, name: 'Emergency Fund', subcategory_name: 'Emergency Fund' }
      ]
      goalAPI.getAll.mockResolvedValue({ data: { goals: mockGoals } })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(goalAPI.getAll).toHaveBeenCalled()
      })
    })

    it('shows goal names as subcategory options for Savings', async () => {
      const mockGoals = [
        { id: 1, name: 'Emergency Fund', subcategory_name: 'Emergency Fund' },
        { id: 2, name: 'Vacation', subcategory_name: 'Vacation' }
      ]
      goalAPI.getAll.mockResolvedValue({ data: { goals: mockGoals } })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Savings & Investments')

      await waitFor(() => {
        expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
        expect(screen.getByText('Vacation')).toBeInTheDocument()
      })
    })

    it('shows info text when no goals exist', async () => {
      goalAPI.getAll.mockResolvedValue({ data: { goals: [] } })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Savings & Investments')

      await waitFor(() => {
        expect(screen.getByText(/Create goals in the Goals page/)).toBeInTheDocument()
      })
    })

    it('autofills name with Contribution suffix when goal is selected', async () => {
      const mockGoals = [
        { id: 1, name: 'Emergency Fund', subcategory_name: 'Emergency Fund' }
      ]
      goalAPI.getAll.mockResolvedValue({ data: { goals: mockGoals } })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fixed Expenses')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Fixed Expenses'), 'Savings & Investments')

      await waitFor(() => {
        expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
      })

      const subcategorySelects = screen.getAllByRole('combobox')
      const subcategorySelect = subcategorySelects.find(s => s.value === 'Other')
      await user.selectOptions(subcategorySelect, 'Emergency Fund')

      await waitFor(() => {
        expect(screen.getByDisplayValue('Emergency Fund Contribution')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Subcategories', () => {
    it('loads subcategories on mount', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(subcategoryAPI.getAll).toHaveBeenCalled()
      })
    })

    it('merges custom subcategories with defaults', async () => {
      subcategoryAPI.getAll.mockResolvedValue({
        data: {
          subcategories: {
            'Fixed Expenses': [{ name: 'Custom Bill' }]
          }
        }
      })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Custom Bill')).toBeInTheDocument()
      })
      // Still shows default subcategories
      expect(screen.getByText('Rent')).toBeInTheDocument()
    })
  })

  describe('Fixed Bill Toggle', () => {
    it('checkbox is unchecked by default', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('can toggle fixed bill checkbox', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('shows explanation text for fixed bill', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText(/exclude from weekly budget/)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls onAdd with correct data on submit', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      // Clear and type new amount
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '15.99')

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Netflix',
          amount: 1599, // Cents
          category: 'Fixed Expenses',
          subcategory: 'Subscriptions',
          payment_method: 'Credit card',
          frequency: 'monthly',
          is_active: true,
          is_fixed_bill: false
        }))
      })
    })

    it('converts amount to cents', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '99.99')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          amount: 9999
        }))
      })
    })

    it('shows loading state during submission', async () => {
      mockOnAdd.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '10')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    })

    it('disables buttons during submission', async () => {
      mockOnAdd.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '10')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })

    it('includes day_of_week for weekly frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'weekly')

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '20')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          frequency: 'weekly',
          day_of_week: 0, // Monday
          day_of_month: null
        }))
      })
    })

    it('includes day_of_month for monthly frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '15')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          frequency: 'monthly',
          day_of_month: expect.any(Number),
          day_of_week: null
        }))
      })
    })

    it('includes frequency_value for custom frequency', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Monthly'), 'custom')

      await waitFor(() => {
        expect(screen.getByText('Repeat every X days')).toBeInTheDocument()
      })

      const frequencyValueInput = screen.getByDisplayValue('30')
      await user.clear(frequencyValueInput)
      await user.type(frequencyValueInput, '45')

      // When custom is selected, there are 2 spinbuttons: amount and frequency_value
      // Amount input is the first one (required, step 0.01)
      const spinbuttons = screen.getAllByRole('spinbutton')
      const amountInput = spinbuttons.find(el => el.hasAttribute('step'))
      await user.clear(amountInput)
      await user.type(amountInput, '25')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          frequency: 'custom',
          frequency_value: 45
        }))
      })
    })

    it('includes is_fixed_bill when checked', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '50')

      await user.click(screen.getByRole('checkbox'))

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          is_fixed_bill: true
        }))
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      mockOnAdd.mockRejectedValue({
        response: { data: { error: 'Failed to create recurring expense' } }
      })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '10')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to create recurring expense')).toBeInTheDocument()
      })
    })

    it('shows generic error if no specific message', async () => {
      mockOnAdd.mockRejectedValue({})

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '10')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to save recurring expense')).toBeInTheDocument()
      })
    })

    it('resets loading state on error', async () => {
      mockOnAdd.mockRejectedValue({
        response: { data: { error: 'Error' } }
      })

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      })

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '10')

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
      })
    })

    it('handles API load failures gracefully', async () => {
      debtAPI.getAll.mockRejectedValue(new Error('Network error'))
      goalAPI.getAll.mockRejectedValue(new Error('Network error'))
      subcategoryAPI.getAll.mockRejectedValue(new Error('Network error'))

      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Add Recurring Expense')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Close Actions', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Create') && !btn.textContent.includes('Cancel'))

      await user.click(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Input Validation', () => {
    it('name input is required', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByDisplayValue('Netflix')
      expect(nameInput).toBeRequired()
    })

    it('name input has maxLength of 200', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByDisplayValue('Netflix')
      expect(nameInput).toHaveAttribute('maxLength', '200')
    })

    it('amount input is required', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toBeRequired()
    })

    it('notes textarea has maxLength of 1000', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const notesTextarea = screen.getByPlaceholderText('Add any additional details...')
      expect(notesTextarea).toHaveAttribute('maxLength', '1000')
    })

    it('shows character count for notes', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('0/1000 characters')).toBeInTheDocument()
    })

    it('updates character count when typing notes', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      const notesTextarea = screen.getByPlaceholderText('Add any additional details...')
      await user.type(notesTextarea, 'Test note')

      expect(screen.getByText('9/1000 characters')).toBeInTheDocument()
    })

    it('start date is required', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('Start Date')).toBeInTheDocument()
      })

      const dateInputs = screen.getAllByRole('textbox', { hidden: true })
      // Find the start date input which should be required
      const startDateLabel = screen.getByText('Start Date')
      const startDateInput = startDateLabel.closest('div').querySelector('input')
      expect(startDateInput).toBeRequired()
    })

    it('end date min is set to start date', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByText('End Date (Optional)')).toBeInTheDocument()
      })

      const endDateLabel = screen.getByText('End Date (Optional)')
      const endDateInput = endDateLabel.closest('div').querySelector('input[type="date"]')
      expect(endDateInput).toHaveAttribute('min')
    })
  })

  describe('Payment Method Selection', () => {
    it('shows all payment method options', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Credit Card')).toBeInTheDocument()
      })

      const paymentSelect = screen.getByDisplayValue('Credit Card')
      expect(paymentSelect.querySelector('option[value="Credit card"]')).toBeInTheDocument()
      expect(paymentSelect.querySelector('option[value="Debit card"]')).toBeInTheDocument()
      expect(paymentSelect.querySelector('option[value="Cash"]')).toBeInTheDocument()
    })

    it('can change payment method', async () => {
      render(<AddRecurringExpenseModal onClose={mockOnClose} onAdd={mockOnAdd} />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByDisplayValue('Credit Card')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByDisplayValue('Credit Card'), 'Debit card')

      expect(screen.getByDisplayValue('Debit Card')).toBeInTheDocument()
    })
  })
})
