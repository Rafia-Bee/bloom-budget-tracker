import React from 'react'
/**
 * AddDebtModal Test Suite
 *
 * Tests for the Add Debt modal component covering:
 * - Form rendering with all fields
 * - Input validation (name, current balance required)
 * - Optional fields (original amount, monthly payment)
 * - Form submission with cents conversion
 * - Error handling
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { clickWithAct, typeWithAct } from './test-utils'
import AddDebtModal from '../components/AddDebtModal'

describe('AddDebtModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAdd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAdd.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('heading', { name: 'Add Debt' })).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('Debt Name')).toBeInTheDocument()
      expect(screen.getByText(/Current Balance/)).toBeInTheDocument()
      expect(screen.getByText(/Original Amount/)).toBeInTheDocument()
      expect(screen.getByText(/Monthly Payment/)).toBeInTheDocument()
    })

    it('renders Add Debt and Cancel buttons', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('button', { name: 'Add Debt' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders close X button', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Add') && !btn.textContent.includes('Cancel'))
      expect(xButton).toBeInTheDocument()
    })

    it('shows helper text for each field', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('How much you currently owe')).toBeInTheDocument()
      expect(screen.getByText(/Original debt amount/)).toBeInTheDocument()
      expect(screen.getByText('How much you pay each month')).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('has placeholder for debt name', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByPlaceholderText(/Student Loan, Credit Card/)
      expect(nameInput).toBeInTheDocument()
    })

    it('has placeholder for current balance', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByPlaceholderText('1500.00')).toBeInTheDocument()
    })

    it('has placeholder for original amount', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByPlaceholderText(/2000.00 \(optional\)/)).toBeInTheDocument()
    })

    it('has placeholder for monthly payment', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByPlaceholderText(/100.00 \(optional\)/)).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('debt name input is required', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByPlaceholderText(/Student Loan, Credit Card/)
      expect(nameInput).toBeRequired()
    })

    it('debt name has maxLength of 200', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByPlaceholderText(/Student Loan, Credit Card/)
      expect(nameInput).toHaveAttribute('maxLength', '200')
    })

    it('current balance is required', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const balanceInput = screen.getByPlaceholderText('1500.00')
      expect(balanceInput).toBeRequired()
    })

    it('current balance has min value of 0.01', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const balanceInput = screen.getByPlaceholderText('1500.00')
      expect(balanceInput).toHaveAttribute('min', '0.01')
    })

    it('current balance has step of 0.01', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const balanceInput = screen.getByPlaceholderText('1500.00')
      expect(balanceInput).toHaveAttribute('step', '0.01')
    })

    it('original amount is optional', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const originalInput = screen.getByPlaceholderText(/2000.00 \(optional\)/)
      expect(originalInput).not.toBeRequired()
    })

    it('monthly payment is optional', () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const paymentInput = screen.getByPlaceholderText(/100.00 \(optional\)/)
      expect(paymentInput).not.toBeRequired()
    })
  })

  describe('Form Interactions', () => {
    it('allows entering debt name', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const nameInput = screen.getByPlaceholderText(/Student Loan, Credit Card/)
      await typeWithAct(nameInput, 'Student Loan')

      expect(nameInput).toHaveValue('Student Loan')
    })

    it('allows entering current balance', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const balanceInput = screen.getByPlaceholderText('1500.00')
      await typeWithAct(balanceInput, '2500.50')

      expect(balanceInput).toHaveValue(2500.5)
    })

    it('allows entering original amount', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const originalInput = screen.getByPlaceholderText(/2000.00 \(optional\)/)
      await typeWithAct(originalInput, '3000')

      expect(originalInput).toHaveValue(3000)
    })

    it('allows entering monthly payment', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const paymentInput = screen.getByPlaceholderText(/100.00 \(optional\)/)
      await typeWithAct(paymentInput, '150.25')

      expect(paymentInput).toHaveValue(150.25)
    })
  })

  describe('Modal Close Actions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await clickWithAct(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Add') && !btn.textContent.includes('Cancel'))
      await clickWithAct(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('calls onAdd with debt data on submit', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Car Loan')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '5000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Car Loan',
          current_balance: 500000, // 5000 * 100 cents
        }))
      })
    })

    it('converts amounts to cents before submission', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Credit Card')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1234.56')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          current_balance: 123456 // 1234.56 * 100
        }))
      })
    })

    it('defaults original_amount to current_balance if not provided', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Loan')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          current_balance: 100000,
          original_amount: 100000 // Same as current_balance when not specified
        }))
      })
    })

    it('uses original_amount when provided', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Loan')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '500')
      await typeWithAct(screen.getByPlaceholderText(/2000.00 \(optional\)/), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          current_balance: 50000,
          original_amount: 100000
        }))
      })
    })

    it('defaults monthly_payment to 0 if not provided', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          monthly_payment: 0
        }))
      })
    })

    it('uses monthly_payment when provided', async () => {
      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '2000')
      await typeWithAct(screen.getByPlaceholderText(/100.00 \(optional\)/), '200.50')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          monthly_payment: 20050 // 200.50 * 100
        }))
      })
    })

    it('shows loading state during submission', async () => {
      let resolvePromise
      mockOnAdd.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      expect(screen.getByText('Adding...')).toBeInTheDocument()

      // Cleanup
      resolvePromise()
    })

    it('disables button while loading', async () => {
      let resolvePromise
      mockOnAdd.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()

      // Cleanup
      resolvePromise()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      mockOnAdd.mockRejectedValueOnce({
        response: { data: { error: 'Debt already exists' } }
      })

      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(screen.getByText('Debt already exists')).toBeInTheDocument()
      })
    })

    it('shows generic error when no response error message', async () => {
      mockOnAdd.mockRejectedValueOnce(new Error('Network error'))

      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to add debt')).toBeInTheDocument()
      })
    })

    it('error message is dismissible', async () => {
      mockOnAdd.mockRejectedValueOnce({
        response: { data: { error: 'Test error' } }
      })

      render(<AddDebtModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await typeWithAct(screen.getByPlaceholderText(/Student Loan, Credit Card/), 'Debt')
      await typeWithAct(screen.getByPlaceholderText('1500.00'), '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add Debt' }))

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })

      // Find and click dismiss button
      const errorDiv = screen.getByText('Test error').closest('div')
      const dismissButton = errorDiv.querySelector('button')
      await clickWithAct(dismissButton)

      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })
  })
})
