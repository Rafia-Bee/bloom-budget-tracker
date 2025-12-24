/**
 * Bloom - TransactionCard Component Tests
 *
 * Tests for the memoized transaction display component including:
 * - Expense vs Income display
 * - Payment method indicator (debit/credit)
 * - Future transaction badge
 * - Recurring expense badge
 * - Selection mode and checkbox
 * - Edit/Delete button callbacks
 * - Amount formatting and sign (+/-)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionCard from '../components/TransactionCard'

describe('TransactionCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnToggleSelection = vi.fn()
  const mockFormatCurrency = (amount) => (amount / 100).toFixed(2)

  // Sample expense transaction
  const mockExpense = {
    id: 1,
    transactionType: 'expense',
    name: 'Groceries',
    amount: 5000, // €50.00
    date: '2025-12-20',
    category: 'Flexible Expenses',
    subcategory: 'Food',
    payment_method: 'Debit card'
  }

  // Sample income transaction
  const mockIncome = {
    id: 2,
    transactionType: 'income',
    type: 'Salary',
    amount: 300000, // €3000.00
    date: '2025-12-24'
  }

  // Sample credit card expense
  const mockCreditExpense = {
    id: 3,
    transactionType: 'expense',
    name: 'Online Shopping',
    amount: 7500, // €75.00
    date: '2025-12-22',
    category: 'Flexible Expenses',
    subcategory: 'Shopping',
    payment_method: 'Credit card'
  }

  // Sample recurring expense
  const mockRecurringExpense = {
    id: 4,
    transactionType: 'expense',
    name: 'Netflix',
    amount: 1599, // €15.99
    date: '2025-12-15',
    category: 'Fixed Expenses',
    subcategory: 'Subscriptions',
    payment_method: 'Credit card',
    recurring_template_id: 42
  }

  // Future expense (date in future)
  const mockFutureExpense = {
    id: 5,
    transactionType: 'expense',
    name: 'Scheduled Payment',
    amount: 10000, // €100.00
    date: '2026-01-15', // Future date
    category: 'Fixed Expenses',
    subcategory: 'Bills',
    payment_method: 'Debit card'
  }

  beforeEach(() => {
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
    mockOnToggleSelection.mockClear()
  })

  describe('Expense Display', () => {
    it('renders expense name', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    it('displays category and subcategory', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Flexible Expenses • Food')).toBeInTheDocument()
    })

    it('displays amount with minus sign', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText(/-.*50\.00/)).toBeInTheDocument()
    })

    it('displays payment method for expense', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Debit card')).toBeInTheDocument()
    })

    it('displays formatted date', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('20 Dec, 2025')).toBeInTheDocument()
    })
  })

  describe('Income Display', () => {
    it('renders income type instead of name', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Salary')).toBeInTheDocument()
    })

    it('displays "Income" as category', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Income')).toBeInTheDocument()
    })

    it('displays amount with plus sign', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText(/\+.*3000\.00/)).toBeInTheDocument()
    })

    it('has green text for income amount', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const amountElement = screen.getByText(/\+.*3000\.00/)
      expect(amountElement).toHaveClass('text-green-600')
    })

    it('does not show payment method for income', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByText('Debit card')).not.toBeInTheDocument()
      expect(screen.queryByText('Credit card')).not.toBeInTheDocument()
    })
  })

  describe('Payment Method Indicator', () => {
    it('shows pink dot for credit card expense', () => {
      render(
        <TransactionCard
          transaction={mockCreditExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const dot = document.querySelector('.bg-bloom-pink')
      expect(dot).toBeInTheDocument()
    })

    it('shows mint dot for debit card expense', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const dot = document.querySelector('.bg-bloom-mint')
      expect(dot).toBeInTheDocument()
    })

    it('shows mint dot for income', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const dot = document.querySelector('.bg-bloom-mint')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('Future Transaction Badge', () => {
    it('shows "Scheduled" badge for future transactions', () => {
      render(
        <TransactionCard
          transaction={mockFutureExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })

    it('applies dashed border for future transactions', () => {
      const { container } = render(
        <TransactionCard
          transaction={mockFutureExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('border-dashed')
    })

    it('does not show "Scheduled" badge for past transactions', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByText('Scheduled')).not.toBeInTheDocument()
    })
  })

  describe('Recurring Expense Badge', () => {
    it('shows "Recurring" badge for recurring expenses', () => {
      render(
        <TransactionCard
          transaction={mockRecurringExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByText('Recurring')).toBeInTheDocument()
    })

    it('does not show "Recurring" badge for one-time expenses', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByText('Recurring')).not.toBeInTheDocument()
    })

    it('does not show "Recurring" badge for income', () => {
      render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByText('Recurring')).not.toBeInTheDocument()
    })
  })

  describe('Selection Mode', () => {
    it('shows checkbox when in selection mode', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('checkbox is checked when isSelected is true', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={true}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('checkbox is unchecked when isSelected is false', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('calls onToggleSelection when checkbox clicked', async () => {
      const user = userEvent.setup()

      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      await user.click(screen.getByRole('checkbox'))

      expect(mockOnToggleSelection).toHaveBeenCalledWith('expense', 1)
    })

    it('shows ring highlight when selected', () => {
      const { container } = render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={true}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('ring-2', 'ring-bloom-pink')
    })

    it('hides edit/delete buttons in selection mode', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
    })

    it('does not show checkbox when not in selection mode', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('Edit and Delete Buttons', () => {
    it('shows edit button', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByTitle('Edit')).toBeInTheDocument()
    })

    it('shows delete button', () => {
      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      expect(screen.getByTitle('Delete')).toBeInTheDocument()
    })

    it('calls onEdit with transaction when edit clicked', async () => {
      const user = userEvent.setup()

      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      await user.click(screen.getByTitle('Edit'))

      expect(mockOnEdit).toHaveBeenCalledWith(mockExpense)
    })

    it('calls onDelete with transaction when delete clicked', async () => {
      const user = userEvent.setup()

      render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      await user.click(screen.getByTitle('Delete'))

      expect(mockOnDelete).toHaveBeenCalledWith(mockExpense)
    })
  })

  describe('Background Colors', () => {
    it('has mint background for income transactions', () => {
      const { container } = render(
        <TransactionCard
          transaction={mockIncome}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('bg-bloom-mint/20')
    })

    it('has gray background for expense transactions', () => {
      const { container } = render(
        <TransactionCard
          transaction={mockExpense}
          isSelected={false}
          selectionMode={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onToggleSelection={mockOnToggleSelection}
          formatCurrency={mockFormatCurrency}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('bg-gray-50')
    })
  })
})
