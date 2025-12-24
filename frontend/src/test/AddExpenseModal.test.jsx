/**
 * Bloom - AddExpenseModal Component Tests
 *
 * Tests for expense creation modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddExpenseModal from '../components/AddExpenseModal'

describe('AddExpenseModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSuccess.mockClear()
  })

  it('renders modal when shown', () => {
    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/add expense/i)).toBeInTheDocument()
  })

  it('closes modal when cancel button clicked', async () => {
    const user = userEvent.setup()

    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const closeButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('displays category select with options', () => {
    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Check that category options exist
    expect(screen.getByText('Fixed Expenses')).toBeInTheDocument()
    expect(screen.getByText('Flexible Expenses')).toBeInTheDocument()
    expect(screen.getByText('Savings & Investments')).toBeInTheDocument()
  })

  it('displays payment method options', () => {
    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Credit card')).toBeInTheDocument()
    expect(screen.getByText('Debit card')).toBeInTheDocument()
  })

  it('has recurring expense checkbox', () => {
    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/recurring expense/i)).toBeInTheDocument()
  })
})
