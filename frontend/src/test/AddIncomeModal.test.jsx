import React from 'react'
/**
 * AddIncomeModal Test Suite
 *
 * Tests for the Add Income modal component covering:
 * - Form rendering
 * - Income type selection
 * - Amount and date inputs
 * - Form submission with cents conversion
 * - Error handling
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { clickWithAct, typeWithAct, selectWithAct, clearWithAct } from './test-utils'
import AddIncomeModal from '../components/AddIncomeModal'

describe('AddIncomeModal', () => {
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
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('heading', { name: 'Add Income' })).toBeInTheDocument()
    })

    it('renders type select field', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument()
    })

    it('renders amount input field', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('renders date input field', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByText('Date')).toBeInTheDocument()
    })

    it('renders Add and Cancel buttons', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders X close button', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Add') && !btn.textContent.includes('Cancel'))
      expect(xButton).toBeInTheDocument()
    })
  })

  describe('Default Values', () => {
    it('has Salary selected by default', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      expect(typeSelect).toHaveValue('Salary')
    })

    it('has today date selected by default', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const today = new Date().toISOString().split('T')[0]
      const dateInput = screen.getByDisplayValue(today)
      expect(dateInput).toBeInTheDocument()
    })

    it('has empty amount by default', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveValue(null)
    })
  })

  describe('Income Type Options', () => {
    it('has all income type options', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      const options = typeSelect.querySelectorAll('option')
      const optionValues = Array.from(options).map(o => o.value)

      expect(optionValues).toContain('Salary')
      expect(optionValues).toContain('Bonus')
      expect(optionValues).toContain('Freelance')
      expect(optionValues).toContain('Other')
    })

    it('allows changing income type', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await selectWithAct(typeSelect, 'Bonus')

      expect(typeSelect).toHaveValue('Bonus')
    })
  })

  describe('Form Interactions', () => {
    it('allows entering amount', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1500.50')

      expect(amountInput).toHaveValue(1500.5)
    })

    it('allows changing date', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const today = new Date().toISOString().split('T')[0]
      const dateInput = screen.getByDisplayValue(today)
      await clearWithAct(dateInput)
      await typeWithAct(dateInput, '2025-12-25')

      expect(dateInput).toHaveValue('2025-12-25')
    })

    it('allows selecting Freelance type', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await selectWithAct(typeSelect, 'Freelance')

      expect(typeSelect).toHaveValue('Freelance')
    })

    it('allows selecting Other type', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await selectWithAct(typeSelect, 'Other')

      expect(typeSelect).toHaveValue('Other')
    })
  })

  describe('Modal Close Actions', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      await clickWithAct(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const buttons = screen.getAllByRole('button')
      const xButton = buttons.find(btn => btn.querySelector('svg') && !btn.textContent.includes('Add') && !btn.textContent.includes('Cancel'))
      await clickWithAct(xButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('calls onAdd with income data on submit', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '2500')

      const addButton = screen.getByRole('button', { name: 'Add' })
      await clickWithAct(addButton)

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          type: 'Salary',
          amount: 250000, // 2500 * 100 cents
        }))
      })
    })

    it('converts amount to cents before submission', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '123.45')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          amount: 12345 // 123.45 * 100
        }))
      })
    })

    it('includes selected type in submission', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const typeSelect = screen.getAllByRole('combobox')[0]
      await selectWithAct(typeSelect, 'Bonus')

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '500')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          type: 'Bonus'
        }))
      })
    })

    it('includes date in submission', async () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const today = new Date().toISOString().split('T')[0]
      const dateInput = screen.getByDisplayValue(today)
      await clearWithAct(dateInput)
      await typeWithAct(dateInput, '2025-12-25')

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
          date: '2025-12-25'
        }))
      })
    })

    it('shows loading state during submission', async () => {
      let resolvePromise
      mockOnAdd.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Adding...')).toBeInTheDocument()

      // Cleanup
      resolvePromise()
    })

    it('disables Add button while loading', async () => {
      let resolvePromise
      mockOnAdd.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      const addButton = screen.getByRole('button', { name: 'Add' })
      await clickWithAct(addButton)

      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()

      // Cleanup
      resolvePromise()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      mockOnAdd.mockRejectedValueOnce({
        response: { data: { error: 'Invalid income data' } }
      })

      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid income data')).toBeInTheDocument()
      })
    })

    it('shows generic error when no response error message', async () => {
      mockOnAdd.mockRejectedValueOnce(new Error('Network error'))

      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to add income')).toBeInTheDocument()
      })
    })

    it('error message is dismissible', async () => {
      mockOnAdd.mockRejectedValueOnce({
        response: { data: { error: 'Test error' } }
      })

      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      await typeWithAct(amountInput, '1000')

      await clickWithAct(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })

      // Find dismiss button in error area
      const errorDiv = screen.getByText('Test error').closest('div')
      const dismissButton = errorDiv.querySelector('button')
      await clickWithAct(dismissButton)

      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })
  })

  describe('Amount Validation', () => {
    it('amount input has min value of 0.01', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveAttribute('min', '0.01')
    })

    it('amount input has step of 0.01', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toHaveAttribute('step', '0.01')
    })

    it('amount input is required', () => {
      render(<AddIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />)

      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).toBeRequired()
    })
  })
})
