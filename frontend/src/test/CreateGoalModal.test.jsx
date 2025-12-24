/**
 * CreateGoalModal Test Suite
 *
 * Tests for the Create Goal modal component covering:
 * - Form rendering with all fields
 * - Input validation (name, target amount, target date, description)
 * - Character limits and counts
 * - Amount formatting (currency input)
 * - Form submission with cents conversion
 * - Loading state during submission
 * - Error display and clearing
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateGoalModal from '../components/CreateGoalModal'

describe('CreateGoalModal', () => {
  const mockOnClose = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnCreate.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByRole('heading', { name: 'Create New Goal' })).toBeInTheDocument()
    })

    it('renders goal name field with label', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Goal Name *')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Emergency Fund, Vacation, New Car/)).toBeInTheDocument()
    })

    it('renders target amount field with label', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Target Amount (€) *')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('1000.00')).toBeInTheDocument()
    })

    it('renders target date field with label', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Target Date (Optional)')).toBeInTheDocument()
    })

    it('renders description field with label', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Description (Optional)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('What are you saving for?')).toBeInTheDocument()
    })

    it('renders info box explaining how goals work', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText(/How it works:/)).toBeInTheDocument()
      expect(screen.getByText(/automatically create a subcategory/)).toBeInTheDocument()
    })

    it('renders Create Goal and Cancel buttons', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByRole('button', { name: 'Create Goal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders close X button', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Create') && !btn.textContent.includes('Cancel'))
      expect(xButton).toBeInTheDocument()
    })

    it('renders euro symbol in amount field', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('€')).toBeInTheDocument()
    })
  })

  describe('Character Counts', () => {
    it('shows character count for goal name (0/50)', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('0/50 characters')).toBeInTheDocument()
    })

    it('shows character count for description (0/200)', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('0/200 characters')).toBeInTheDocument()
    })

    it('updates name character count when typing', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Vacation Fund')

      expect(screen.getByText('13/50 characters')).toBeInTheDocument()
    })

    it('updates description character count when typing', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const descInput = screen.getByPlaceholderText('What are you saving for?')
      await user.type(descInput, 'Save for summer holiday')

      expect(screen.getByText('23/200 characters')).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('shows error when name is empty on submit', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByText('Goal name is required')).toBeInTheDocument()
      expect(mockOnCreate).not.toHaveBeenCalled()
    })

    it('prevents typing more than 50 characters in name', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      const longName = 'A'.repeat(60)
      await user.type(nameInput, longName)

      // maxLength=50 prevents typing more than 50 characters
      expect(nameInput).toHaveValue('A'.repeat(50))
    })

    it('shows error when target amount is empty', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'My Goal')
      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()
    })

    it('shows error when target amount is 0', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'My Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '0')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()
    })

    it('strips negative sign from amount input', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '-100')

      // The formatCurrencyInput strips non-numeric except decimal
      expect(amountInput).toHaveValue('100')
    })

    it('shows error when target amount exceeds 1,000,000', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'My Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000001')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByText('Target amount must be less than €1,000,000')).toBeInTheDocument()
    })

    it('date input has min attribute preventing past dates', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      // Find date input by type since label doesn't have htmlFor
      const dateInput = document.querySelector('input[type="date"]')

      // min is set to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expectedMin = tomorrow.toISOString().split('T')[0]

      expect(dateInput).toHaveAttribute('min', expectedMin)
    })

    it('date input does not allow today as a valid date', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      // The min attribute is set to tomorrow, so today is not selectable
      const dateInput = document.querySelector('input[type="date"]')
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]

      // min should be tomorrow, not today
      expect(dateInput.getAttribute('min')).toBe(tomorrowString)
      expect(dateInput.getAttribute('min')).not.toBe(todayString)
    })

    it('prevents typing more than 200 characters in description', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const descInput = screen.getByPlaceholderText('What are you saving for?')

      // maxLength=200 prevents typing more than 200 characters
      expect(descInput).toHaveAttribute('maxLength', '200')
    })

    it('clears name error when user starts typing', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      // Submit empty form to trigger error
      await user.click(screen.getByRole('button', { name: 'Create Goal' }))
      expect(screen.getByText('Goal name is required')).toBeInTheDocument()

      // Start typing
      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'A')

      expect(screen.queryByText('Goal name is required')).not.toBeInTheDocument()
    })

    it('clears amount error when user types valid amount', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Goal')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))
      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '100')

      expect(screen.queryByText('Target amount must be greater than 0')).not.toBeInTheDocument()
    })
  })

  describe('Amount Formatting', () => {
    it('allows numeric input', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1234')

      expect(amountInput).toHaveValue('1234')
    })

    it('allows decimal input', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1234.56')

      expect(amountInput).toHaveValue('1234.56')
    })

    it('limits decimal to 2 places', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1234.567')

      expect(amountInput).toHaveValue('1234.56')
    })

    it('strips non-numeric characters except decimal', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1a2b3c.4d5')

      expect(amountInput).toHaveValue('123.45')
    })

    it('handles multiple decimal points by joining parts', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '12.34.56')

      // formatCurrencyInput joins multiple decimal parts and limits to 2 decimal places
      // '12.34.56' -> join parts after first decimal -> '12.3456' -> limit decimals -> '12.34'
      // But the 2 decimal limit only triggers on the next input, so we get intermediate state
      expect(amountInput).toHaveValue('12.34')
    })
  })

  describe('Form Submission', () => {
    it('calls onCreate with correct data on valid submit', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Vacation Fund')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '2500.50')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          name: 'Vacation Fund',
          description: null,
          target_amount: 250050, // Cents
          target_date: null
        })
      })
    })

    it('converts amount to cents on submit', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '99.99')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_amount: 9999
        }))
      })
    })

    it('trims name whitespace on submit', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, '  Vacation Fund  ')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Vacation Fund'
        }))
      })
    })

    it('trims description whitespace on submit', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      const descInput = screen.getByPlaceholderText('What are you saving for?')
      await user.type(descInput, '  My description  ')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          description: 'My description'
        }))
      })
    })

    it('sends null for empty description', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          description: null
        }))
      })
    })

    it('includes target date when provided', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      // Set future date
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 6)
      const dateString = futureDate.toISOString().split('T')[0]

      // Find date input by type since label doesn't have htmlFor
      const dateInput = document.querySelector('input[type="date"]')
      await user.type(dateInput, dateString)

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_date: dateString
        }))
      })
    })

    it('sends null for target date when not provided', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_date: null
        }))
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByRole('button', { name: /Creating.../ })).toBeInTheDocument()
    })

    it('disables submit button during loading', async () => {
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByRole('button', { name: /Creating.../ })).toBeDisabled()
    })

    it('shows spinner during loading', async () => {
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      // Check for the spinning div
      const submitBtn = screen.getByRole('button', { name: /Creating.../ })
      expect(submitBtn.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('resets loading state after completion', async () => {
      mockOnCreate.mockResolvedValue(undefined)

      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalled()
      })

      // Button should return to normal state
      expect(screen.getByRole('button', { name: 'Create Goal' })).toBeInTheDocument()
    })

    it('resets loading state on error', async () => {
      mockOnCreate.mockRejectedValue(new Error('Server error'))

      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Goal' })).toBeInTheDocument()
      })
    })
  })

  describe('Modal Close Actions', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Create') && !btn.textContent.includes('Cancel'))

      await user.click(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Date Input', () => {
    it('has min attribute set to tomorrow', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      // Find date input by type since label doesn't have htmlFor
      const dateInput = document.querySelector('input[type="date"]')

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expectedMin = tomorrow.toISOString().split('T')[0]

      expect(dateInput).toHaveAttribute('min', expectedMin)
    })

    it('allows future dates', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      // Set date 1 year from now
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const dateString = futureDate.toISOString().split('T')[0]

      // Find date input by type since label doesn't have htmlFor
      const dateInput = document.querySelector('input[type="date"]')
      await user.type(dateInput, dateString)

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      // Should not show error
      expect(screen.queryByText('Target date must be in the future')).not.toBeInTheDocument()
      expect(mockOnCreate).toHaveBeenCalled()
    })
  })

  describe('Input Field Properties', () => {
    it('name input has maxLength of 50', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      expect(nameInput).toHaveAttribute('maxLength', '50')
    })

    it('description textarea has maxLength of 200', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const descInput = screen.getByPlaceholderText('What are you saving for?')
      expect(descInput).toHaveAttribute('maxLength', '200')
    })

    it('description is a textarea with 3 rows', () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const descInput = screen.getByPlaceholderText('What are you saving for?')
      expect(descInput.tagName).toBe('TEXTAREA')
      expect(descInput).toHaveAttribute('rows', '3')
    })
  })

  describe('Edge Cases', () => {
    it('handles whitespace-only name as invalid', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, '   ')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      expect(screen.getByText('Goal name is required')).toBeInTheDocument()
      expect(mockOnCreate).not.toHaveBeenCalled()
    })

    it('handles small amounts correctly', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '0.01')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_amount: 1 // 1 cent
        }))
      })
    })

    it('handles amount of exactly 1,000,000', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '1000000')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_amount: 100000000 // 1 million euros in cents
        }))
      })
    })

    it('handles whole numbers without decimals', async () => {
      render(<CreateGoalModal onClose={mockOnClose} onCreate={mockOnCreate} />)
      const user = userEvent.setup()

      const nameInput = screen.getByPlaceholderText(/Emergency Fund/)
      await user.type(nameInput, 'Test Goal')

      const amountInput = screen.getByPlaceholderText('1000.00')
      await user.type(amountInput, '500')

      await user.click(screen.getByRole('button', { name: 'Create Goal' }))

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
          target_amount: 50000 // 500 euros in cents
        }))
      })
    })
  })
})
