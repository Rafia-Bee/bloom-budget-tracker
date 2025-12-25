/**
 * EditGoalModal Test Suite
 *
 * Tests for the Edit Goal modal component covering:
 * - Modal rendering with goal data pre-filled
 * - Current progress display
 * - Form field interactions
 * - Input validation (name, amount, date, description)
 * - Character count displays
 * - Warning for target amount reduction
 * - Form submission with cents conversion
 * - Error handling
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditGoalModal from '../components/EditGoalModal'

describe('EditGoalModal', () => {
  const mockOnClose = vi.fn()
  const mockOnUpdate = vi.fn()

  const mockGoal = {
    id: 1,
    name: 'Emergency Fund',
    description: 'For unexpected expenses',
    target_amount: 100000, // €1000.00 in cents
    initial_amount: 10000, // €100.00 in cents
    target_date: '2025-12-31',
    subcategory_name: 'Savings',
    progress: {
      current_amount: 25000, // €250.00 saved
      percentage: 25.0,
      contribution_count: 5
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUpdate.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByRole('heading', { name: 'Edit Goal' })).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Goal Name *')).toBeInTheDocument()
      expect(screen.getByText('Target Amount (€) *')).toBeInTheDocument()
      expect(screen.getByText('Target Date (Optional)')).toBeInTheDocument()
      expect(screen.getByText('Description (Optional)')).toBeInTheDocument()
    })

    it('renders Update Goal and Cancel buttons', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByRole('button', { name: 'Update Goal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('returns null when no goal is provided', () => {
      const { container } = render(<EditGoalModal goal={null} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Current Progress Display', () => {
    it('shows current progress section', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Current Progress')).toBeInTheDocument()
    })

    it('displays saved amount', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('€250.00 saved')).toBeInTheDocument()
    })

    it('displays percentage progress', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('25.0%')).toBeInTheDocument()
    })

    it('displays subcategory name', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Subcategory: Savings')).toBeInTheDocument()
    })

    it('displays contribution count', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('5 contributions')).toBeInTheDocument()
    })

    it('handles goal with no progress', () => {
      const goalNoProgress = { ...mockGoal, progress: null }
      render(<EditGoalModal goal={goalNoProgress} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('€0.00 saved')).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('Pre-filled Values', () => {
    it('pre-fills name field', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      expect(nameInput).toBeInTheDocument()
    })

    it('pre-fills description field', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const descriptionInput = screen.getByDisplayValue('For unexpected expenses')
      expect(descriptionInput).toBeInTheDocument()
    })

    it('pre-fills target amount in euros', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      expect(amountInput).toBeInTheDocument()
    })

    it('pre-fills target date', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const dateInput = document.querySelector('input[type="date"]')
      expect(dateInput.value).toBe('2025-12-31')
    })

    it('handles goal without optional fields', () => {
      const minimalGoal = {
        id: 2,
        name: 'Vacation',
        target_amount: 50000,
        progress: { current_amount: 0, percentage: 0, contribution_count: 0 }
      }
      render(<EditGoalModal goal={minimalGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByDisplayValue('Vacation')).toBeInTheDocument()
      expect(screen.getByDisplayValue('500.00')).toBeInTheDocument()
    })

    it('pre-fills initial amount in euros', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const initialAmountInput = screen.getByDisplayValue('100.00')
      expect(initialAmountInput).toBeInTheDocument()
    })

    it('handles goal without initial amount', () => {
      const goalNoInitial = { ...mockGoal, initial_amount: 0 }
      render(<EditGoalModal goal={goalNoInitial} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      // Should render empty field for 0 initial amount
      const initialAmountInputs = screen.getAllByRole('textbox')
      const hasEmptyInitial = initialAmountInputs.some(input => input.value === '')
      expect(hasEmptyInitial).toBe(true)
    })
  })

  describe('Form Interactions', () => {
    it('allows editing the name', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)
      await user.type(nameInput, 'New Emergency Fund')

      expect(nameInput.value).toBe('New Emergency Fund')
    })

    it('allows editing the target amount', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '2000')

      expect(amountInput.value).toBe('2000')
    })

    it('allows editing the description', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const descriptionInput = screen.getByDisplayValue('For unexpected expenses')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      expect(descriptionInput.value).toBe('Updated description')
    })

    it('allows editing the target date', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const dateInput = document.querySelector('input[type="date"]')
      await user.clear(dateInput)
      await user.type(dateInput, '2026-06-15')

      expect(dateInput.value).toBe('2026-06-15')
    })
  })

  describe('Character Counts', () => {
    it('shows name character count', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.getByText(/14.*\/50 characters/)).toBeInTheDocument()
    })

    it('shows description character count', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      // Description is "For unexpected expenses" = 23 chars (trimmed in textarea)
      expect(screen.getByText(/\d+.*\/200 characters/)).toBeInTheDocument()
    })

    it('updates name character count on input', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test')

      expect(screen.getByText(/4.*\/50 characters/)).toBeInTheDocument()
    })

    it('updates description character count on input', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const descriptionInput = screen.getByDisplayValue('For unexpected expenses')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Hi')

      expect(screen.getByText(/2.*\/200 characters/)).toBeInTheDocument()
    })
  })

  describe('Amount Formatting', () => {
    it('formats amount with two decimal places', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '99.99')

      expect(amountInput.value).toBe('99.99')
    })

    it('strips non-numeric characters', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, 'abc123def')

      expect(amountInput.value).toBe('123')
    })

    it('limits to two decimal places', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '100.999')

      expect(amountInput.value).toBe('100.99')
    })

    it('handles only one decimal point', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '100.50.25')

      // Second decimal point and digits after are handled by formatter
      // The formatter keeps the first decimal point and limits to 2 places
      expect(amountInput.value).toBe('100.50')
    })
  })

  describe('Validation - Name', () => {
    it('shows error when name is empty', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Goal name is required')).toBeInTheDocument()
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })

    it('shows error when name is only whitespace', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)
      await user.type(nameInput, '   ')

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Goal name is required')).toBeInTheDocument()
    })

    it('name field has maxLength attribute', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      expect(nameInput).toHaveAttribute('maxLength', '50')
    })
  })

  describe('Validation - Target Amount', () => {
    it('shows error when amount is empty', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()
    })

    it('shows error when amount is 0', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '0')

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()
    })

    it('shows error when amount exceeds 1 million', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '1000001')

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Target amount must be less than 1,000,000')).toBeInTheDocument()
    })

    it('clears amount error on input change', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()

      await user.type(amountInput, '500')

      expect(screen.queryByText('Target amount must be greater than 0')).not.toBeInTheDocument()
    })
  })

  describe('Validation - Target Date', () => {
    it('date input has min attribute set to tomorrow', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const dateInput = document.querySelector('input[type="date"]')
      expect(dateInput).toHaveAttribute('min')
      // The min attribute is set to tomorrow's date
      const minDate = new Date(dateInput.getAttribute('min'))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      expect(minDate > today).toBe(true)
    })

    it('allows empty date (optional field)', async () => {
      const user = userEvent.setup()
      const goalNoDate = { ...mockGoal, target_date: '' }
      render(<EditGoalModal goal={goalNoDate} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.queryByText('Target date must be in the future')).not.toBeInTheDocument()
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  describe('Validation - Description', () => {
    it('description field has maxLength attribute', () => {
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const descriptionInput = screen.getByDisplayValue('For unexpected expenses')
      expect(descriptionInput).toHaveAttribute('maxLength', '200')
    })
  })

  describe('Target Reduction Warning', () => {
    it('shows warning when target is set below current savings', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      // Current savings is €250, set target to €200
      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '200')

      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
      expect(screen.getByText(/Setting the target below your current savings/)).toBeInTheDocument()
    })

    it('does not show warning when target is above current savings', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      // Current savings is €250, set target to €500
      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '500')

      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument()
    })

    it('does not show warning when goal has no progress', () => {
      const goalNoProgress = { ...mockGoal, progress: { current_amount: 0, percentage: 0, contribution_count: 0 } }
      render(<EditGoalModal goal={goalNoProgress} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument()
    })
  })

  describe('Modal Actions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Update') && !btn.textContent.includes('Cancel'))
      await user.click(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('calls onUpdate with correct data on successful submission', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          name: 'Emergency Fund',
          description: 'For unexpected expenses',
          target_amount: 100000, // €1000.00 in cents
          initial_amount: 10000, // €100.00 in cents
          target_date: '2025-12-31'
        })
      })
    })

    it('converts amount to cents on submission', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)
      await user.type(amountInput, '1500.50')

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            target_amount: 150050 // €1500.50 in cents
          })
        )
      })
    })

    it('trims name and description on submission', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)
      await user.type(nameInput, '  Trimmed Name  ')

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Trimmed Name'
          })
        )
      })
    })

    it('sends null for empty optional fields', async () => {
      const user = userEvent.setup()
      const goalNoOptionals = {
        id: 3,
        name: 'Test',
        target_amount: 10000,
        description: '',
        target_date: '',
        progress: { current_amount: 0, percentage: 0, contribution_count: 0 }
      }
      render(<EditGoalModal goal={goalNoOptionals} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
            target_date: null
          })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner during submission', async () => {
      const user = userEvent.setup()
      mockOnUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })

    it('disables submit button during loading', async () => {
      const user = userEvent.setup()
      mockOnUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
    })

    it('re-enables submit button after submission completes', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Update Goal' })).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles error from onUpdate gracefully', async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockOnUpdate.mockRejectedValue(new Error('Update failed'))

      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        // Logger uses format: [operation] Error:
        expect(consoleError).toHaveBeenCalledWith('[updateGoal] Error:', expect.any(Error))
      })

      consoleError.mockRestore()
    })

    it('re-enables submit button after error', async () => {
      const user = userEvent.setup()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mockOnUpdate.mockRejectedValue(new Error('Update failed'))

      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Update Goal' })).not.toBeDisabled()
      })
    })
  })

  describe('Error Clearing', () => {
    it('clears name error when user types', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Emergency Fund')
      await user.clear(nameInput)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Goal name is required')).toBeInTheDocument()

      await user.type(nameInput, 'N')

      expect(screen.queryByText('Goal name is required')).not.toBeInTheDocument()
    })

    it('clears amount error when user types', async () => {
      const user = userEvent.setup()
      render(<EditGoalModal goal={mockGoal} onClose={mockOnClose} onUpdate={mockOnUpdate} />)

      const amountInput = screen.getByDisplayValue('1000.00')
      await user.clear(amountInput)

      const submitButton = screen.getByRole('button', { name: 'Update Goal' })
      await user.click(submitButton)

      expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument()

      await user.type(amountInput, '100')

      expect(screen.queryByText('Target amount must be greater than 0')).not.toBeInTheDocument()
    })
  })
})
