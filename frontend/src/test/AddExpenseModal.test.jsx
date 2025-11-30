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

  it('does not render when show is false', () => {
    render(
      <AddExpenseModal
        show={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByText(/add expense/i)).not.toBeInTheDocument()
  })

  it('closes modal when close button clicked', async () => {
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

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()

    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Try to submit without filling fields
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)

    // Form validation should prevent submission
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('displays category options', () => {
    render(
      <AddExpenseModal
        show={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Check that category select exists
    const categorySelect = screen.getByLabelText(/category/i)
    expect(categorySelect).toBeInTheDocument()
  })
})
