/**
 * EditIncomeModal Test Suite
 *
 * Tests for the Edit Income modal component covering:
 * - Form rendering with pre-filled data
 * - Income type selection (Salary, Bonus, Freelance, Other)
 * - Amount and date editing
 * - Form submission with cents conversion
 * - Error handling
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditIncomeModal from '../components/EditIncomeModal'

describe('EditIncomeModal', () => {
  const mockOnClose = vi.fn()
  const mockOnEdit = vi.fn()

  const mockIncome = {
    id: 1,
    type: 'Salary',
    amount: 250000, // €2500.00 in cents
    date: '13 Nov, 2025'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnEdit.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      expect(screen.getByRole('heading', { name: 'Edit Income' })).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Amount (€)')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
    })

    it('renders Save and Cancel buttons', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders close X button', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Save') && !btn.textContent.includes('Cancel'))
      expect(xButton).toBeInTheDocument()
    })
  })

  describe('Pre-filled Data', () => {
    it('pre-fills type from income object', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      expect(typeSelect).toHaveValue('Salary')
    })

    it('converts amount from cents to euros with 2 decimals', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveValue(2500)
    })

    it('converts date from display format to YYYY-MM-DD', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const dateInput = screen.getByLabelText('Date')
      expect(dateInput).toHaveValue('2025-11-13')
    })

    it('handles different date formats correctly', () => {
      const altIncome = { ...mockIncome, date: '01 Jan, 2025' }
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={altIncome} />)

      const dateInput = screen.getByLabelText('Date')
      expect(dateInput).toHaveValue('2025-01-01')
    })

    it('handles invalid date format gracefully', () => {
      const invalidIncome = { ...mockIncome, date: 'invalid' }
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={invalidIncome} />)

      const dateInput = screen.getByLabelText('Date')
      // Should fall back to current date
      expect(dateInput.value).toMatch(/\d{4}-\d{2}-\d{2}/)
    })
  })

  describe('Income Types', () => {
    it('provides all income type options', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      const options = Array.from(typeSelect.querySelectorAll('option')).map(o => o.value)

      expect(options).toEqual(['Salary', 'Bonus', 'Freelance', 'Other'])
    })

    it('allows changing income type', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(typeSelect, 'Bonus')

      expect(typeSelect).toHaveValue('Bonus')
    })
  })

  describe('Form Editing', () => {
    it('allows editing amount', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '3000.50')

      expect(amountInput).toHaveValue(3000.5)
    })

    it('allows editing date', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const dateInput = screen.getByLabelText('Date')
      await user.clear(dateInput)
      await user.type(dateInput, '2025-12-25')

      expect(dateInput).toHaveValue('2025-12-25')
    })

    it('amount field requires at least 0.01', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveAttribute('min', '0.01')
    })

    it('amount field has step of 0.01', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveAttribute('step', '0.01')
    })

    it('amount field is required', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toBeRequired()
    })

    it('date field is required', () => {
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const dateInput = screen.getByLabelText('Date')
      expect(dateInput).toBeRequired()
    })
  })

  describe('Modal Close Actions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Save') && !btn.textContent.includes('Cancel'))
      await user.click(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('calls onEdit with income ID and updated data', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(typeSelect, 'Bonus')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith(1, expect.objectContaining({
          type: 'Bonus',
          amount: 250000,
          date: '2025-11-13'
        }))
      })
    })

    it('converts edited amount from euros to cents', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '1234.56')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith(1, expect.objectContaining({
          amount: 123456 // 1234.56 * 100
        }))
      })
    })

    it('submits with edited date', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      const dateInput = screen.getByLabelText('Date')
      await user.clear(dateInput)
      await user.type(dateInput, '2025-12-31')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith(1, expect.objectContaining({
          date: '2025-12-31'
        }))
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise
      mockOnEdit.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('Saving...')).toBeInTheDocument()

      // Cleanup
      resolvePromise()
    })

    it('disables button while loading', async () => {
      const user = userEvent.setup()
      let resolvePromise
      mockOnEdit.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()

      // Cleanup
      resolvePromise()
    })

    it('submits without editing when no changes made', async () => {
      const user = userEvent.setup()
      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith(1, {
          type: 'Salary',
          amount: 250000,
          date: '2025-11-13'
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup()
      mockOnEdit.mockRejectedValueOnce({
        response: { data: { error: 'Income update failed' } }
      })

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Income update failed')).toBeInTheDocument()
      })
    })

    it('shows generic error when no response error message', async () => {
      const user = userEvent.setup()
      mockOnEdit.mockRejectedValueOnce(new Error('Network error'))

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to update income')).toBeInTheDocument()
      })
    })

    it('error message is dismissible', async () => {
      const user = userEvent.setup()
      mockOnEdit.mockRejectedValueOnce({
        response: { data: { error: 'Test error' } }
      })

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })

      // Find and click dismiss button
      const errorDiv = screen.getByText('Test error').closest('div')
      const dismissButton = errorDiv.querySelector('button')
      await user.click(dismissButton)

      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })

    it('resets loading state after error', async () => {
      const user = userEvent.setup()
      mockOnEdit.mockRejectedValueOnce({
        response: { data: { error: 'Update failed' } }
      })

      render(<EditIncomeModal onClose={mockOnClose} onEdit={mockOnEdit} income={mockIncome} />)

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
    })
  })
})
