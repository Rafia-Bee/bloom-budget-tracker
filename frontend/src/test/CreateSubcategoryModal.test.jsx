/**
 * CreateSubcategoryModal Test Suite
 *
 * Tests subcategory creation form including category selection,
 * name input validation, and form submission.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateSubcategoryModal from '../components/CreateSubcategoryModal'

describe('CreateSubcategoryModal', () => {
  let mockOnClose
  let mockOnCreate

  beforeEach(() => {
    mockOnClose = vi.fn()
    mockOnCreate = vi.fn().mockResolvedValue({})
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Create Subcategory')).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Subcategory Name')).toBeInTheDocument()
    })

    it('renders Create and Cancel buttons', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders close X button', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument()
    })

    it('renders all category options in dropdown', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByRole('option', { name: 'Fixed Expenses' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Flexible Expenses' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Savings & Investments' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Debt Payments' })).toBeInTheDocument()
    })

    it('renders name input with placeholder', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      expect(screen.getByPlaceholderText('e.g., Streaming Services')).toBeInTheDocument()
    })
  })

  describe('Initial State', () => {
    it('defaults category to Fixed Expenses when no initialCategory', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const categorySelect = screen.getByRole('combobox')
      expect(categorySelect).toHaveValue('Fixed Expenses')
    })

    it('uses initialCategory when provided', () => {
      render(
        <CreateSubcategoryModal
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          initialCategory="Flexible Expenses"
        />
      )

      const categorySelect = screen.getByRole('combobox')
      expect(categorySelect).toHaveValue('Flexible Expenses')
    })

    it('starts with empty name field', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      expect(nameInput).toHaveValue('')
    })
  })

  describe('User Interactions', () => {
    it('allows category selection', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const categorySelect = screen.getByRole('combobox')
      await user.selectOptions(categorySelect, 'Debt Payments')

      expect(categorySelect).toHaveValue('Debt Payments')
    })

    it('allows name input', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Gym Membership')

      expect(nameInput).toHaveValue('Gym Membership')
    })

    it('calls onClose when Cancel button clicked', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button clicked', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      await user.click(screen.getByRole('button', { name: '✕' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const categorySelect = screen.getByRole('combobox')
      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')

      await user.selectOptions(categorySelect, 'Flexible Expenses')
      await user.type(nameInput, 'Coffee Shops')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'Coffee Shops',
        category: 'Flexible Expenses'
      })
    })

    it('trims whitespace from name', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, '  Groceries  ')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'Groceries',
        category: 'Fixed Expenses'
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Test Category')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
    })

    it('disables submit button during loading', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Test')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      const submitButton = screen.getByRole('button', { name: 'Creating...' })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Validation', () => {
    it('has required attribute on name input', () => {
      // Browser handles empty validation via required attribute
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      expect(nameInput).toBeRequired()
    })

    it('does not call onCreate when submitting empty form', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      // Browser's required validation prevents submit
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).not.toHaveBeenCalled()
    })

    it('has maxLength attribute on name input', () => {
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      expect(nameInput).toHaveAttribute('maxLength', '100')
    })
  })

  describe('Error Handling', () => {
    it('displays API error message', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockRejectedValue({
        response: { data: { error: 'Subcategory already exists' } }
      })
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Duplicate')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByText('Subcategory already exists')).toBeInTheDocument()
      })
    })

    it('displays generic error for unknown errors', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockRejectedValue(new Error('Network error'))
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Test')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to create subcategory')).toBeInTheDocument()
      })
    })

    it('re-enables submit button after error', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockRejectedValue(new Error('Error'))
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Test')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled()
      })
    })
  })

  describe('All Categories', () => {
    it('can create subcategory for Fixed Expenses', async () => {
      const user = userEvent.setup()
      render(<CreateSubcategoryModal onClose={mockOnClose} onCreate={mockOnCreate} />)

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Rent')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'Rent',
        category: 'Fixed Expenses'
      })
    })

    it('can create subcategory for Savings & Investments', async () => {
      const user = userEvent.setup()
      render(
        <CreateSubcategoryModal
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          initialCategory="Savings & Investments"
        />
      )

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Emergency Fund')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'Emergency Fund',
        category: 'Savings & Investments'
      })
    })

    it('can create subcategory for Debt Payments', async () => {
      const user = userEvent.setup()
      render(
        <CreateSubcategoryModal
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          initialCategory="Debt Payments"
        />
      )

      const nameInput = screen.getByPlaceholderText('e.g., Streaming Services')
      await user.type(nameInput, 'Student Loans')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(mockOnCreate).toHaveBeenCalledWith({
        name: 'Student Loans',
        category: 'Debt Payments'
      })
    })
  })
})
