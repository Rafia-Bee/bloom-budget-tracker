/**
 * Bloom - ExpenseList Component Tests
 *
 * Tests for the expense list component including:
 * - Expense rendering
 * - Payment method filtering (All/Debit/Credit)
 * - Empty state display
 * - Delete functionality
 * - Payment method indicator colors
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpenseList from '../components/ExpenseList';
import { clickWithAct } from './test-utils';

describe('ExpenseList', () => {
    const mockOnDelete = vi.fn();

    // Sample expenses
    const mockExpenses = [
        {
            id: 1,
            name: 'Groceries',
            amount: 5000, // €50.00
            date: '2025-12-20',
            category: 'Flexible Expenses',
            subcategory: 'Food',
            payment_method: 'Debit card',
        },
        {
            id: 2,
            name: 'Netflix',
            amount: 1599, // €15.99
            date: '2025-12-15',
            category: 'Fixed Expenses',
            subcategory: 'Subscriptions',
            payment_method: 'Credit card',
        },
        {
            id: 3,
            name: 'Gas',
            amount: 4500, // €45.00
            date: '2025-12-18',
            category: 'Flexible Expenses',
            subcategory: 'Transport',
            payment_method: 'Debit card',
        },
        {
            id: 4,
            name: 'Online Shopping',
            amount: 7500, // €75.00
            date: '2025-12-22',
            category: 'Flexible Expenses',
            subcategory: 'Shopping',
            payment_method: 'Credit card',
        },
    ];

    beforeEach(() => {
        mockOnDelete.mockClear();
    });

    describe('Basic Rendering', () => {
        it('renders title "Recent Expenses"', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
        });

        it('renders all filter buttons', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Debit' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Credit' })).toBeInTheDocument();
        });

        it('renders all expenses by default', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByText('Groceries')).toBeInTheDocument();
            expect(screen.getByText('Netflix')).toBeInTheDocument();
            expect(screen.getByText('Gas')).toBeInTheDocument();
            expect(screen.getByText('Online Shopping')).toBeInTheDocument();
        });

        it('displays expense amounts formatted correctly', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByText('€50.00')).toBeInTheDocument();
            expect(screen.getByText('€15.99')).toBeInTheDocument();
            expect(screen.getByText('€45.00')).toBeInTheDocument();
            expect(screen.getByText('€75.00')).toBeInTheDocument();
        });

        it('displays expense dates', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByText('2025-12-20')).toBeInTheDocument();
            expect(screen.getByText('2025-12-15')).toBeInTheDocument();
        });

        it('displays category and subcategory', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            expect(screen.getByText('Flexible Expenses • Food')).toBeInTheDocument();
            expect(screen.getByText('Fixed Expenses • Subscriptions')).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('shows empty state when no expenses', () => {
            render(<ExpenseList expenses={[]} onDelete={mockOnDelete} />);

            expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
        });

        it('shows encouraging message in empty state', () => {
            render(<ExpenseList expenses={[]} onDelete={mockOnDelete} />);

            expect(screen.getByText(/start tracking your spending/i)).toBeInTheDocument();
        });
    });

    describe('Filtering', () => {
        it('All filter is active by default', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            const allButton = screen.getByRole('button', { name: 'All' });
            expect(allButton).toHaveClass('bg-bloom-pink');
        });

        it('filters to show only debit card expenses', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            await clickWithAct(screen.getByRole('button', { name: 'Debit' }));

            // Debit expenses should be visible
            expect(screen.getByText('Groceries')).toBeInTheDocument();
            expect(screen.getByText('Gas')).toBeInTheDocument();

            // Credit expenses should not be visible
            expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
            expect(screen.queryByText('Online Shopping')).not.toBeInTheDocument();
        });

        it('filters to show only credit card expenses', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            await clickWithAct(screen.getByRole('button', { name: 'Credit' }));

            // Credit expenses should be visible
            expect(screen.getByText('Netflix')).toBeInTheDocument();
            expect(screen.getByText('Online Shopping')).toBeInTheDocument();

            // Debit expenses should not be visible
            expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
            expect(screen.queryByText('Gas')).not.toBeInTheDocument();
        });

        it('shows all expenses when All filter clicked', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // First filter by debit
            await clickWithAct(screen.getByRole('button', { name: 'Debit' }));
            expect(screen.queryByText('Netflix')).not.toBeInTheDocument();

            // Then click All to show everything
            await clickWithAct(screen.getByRole('button', { name: 'All' }));

            expect(screen.getByText('Groceries')).toBeInTheDocument();
            expect(screen.getByText('Netflix')).toBeInTheDocument();
        });

        it('shows empty state when filter yields no results', async () => {
            // Only debit expenses
            const debitOnlyExpenses = mockExpenses.filter((e) => e.payment_method === 'Debit card');
            render(<ExpenseList expenses={debitOnlyExpenses} onDelete={mockOnDelete} />);

            await clickWithAct(screen.getByRole('button', { name: 'Credit' }));

            expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
        });

        it('updates button styles when filter changes', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // Initially All is active
            expect(screen.getByRole('button', { name: 'All' })).toHaveClass('bg-bloom-pink');
            expect(screen.getByRole('button', { name: 'Debit' })).toHaveClass('bg-gray-100');

            // Click Debit
            await clickWithAct(screen.getByRole('button', { name: 'Debit' }));

            // Now Debit is active
            expect(screen.getByRole('button', { name: 'Debit' })).toHaveClass('bg-bloom-mint');
            expect(screen.getByRole('button', { name: 'All' })).toHaveClass('bg-gray-100');
        });
    });

    describe('Payment Method Indicator', () => {
        it('shows pink dot for credit card expenses', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // Credit card expenses have pink dots
            const dots = document.querySelectorAll('.bg-bloom-pink.rounded-full');
            expect(dots.length).toBeGreaterThan(0);
        });

        it('shows mint dot for debit card expenses', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // Debit card expenses have mint dots
            const dots = document.querySelectorAll('.bg-bloom-mint.rounded-full');
            expect(dots.length).toBeGreaterThan(0);
        });
    });

    describe('Delete Functionality', () => {
        it('renders delete button for each expense', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // Should have 4 delete buttons (one per expense)
            const deleteButtons = screen
                .getAllByRole('button')
                .filter((btn) => btn.querySelector('svg'));
            // Filter buttons + delete buttons
            expect(deleteButtons.length).toBeGreaterThanOrEqual(4);
        });

        it('calls onDelete with expense id when delete clicked', async () => {
            render(<ExpenseList expenses={[mockExpenses[0]]} onDelete={mockOnDelete} />);

            // Find the delete button (the one without text, just an svg)
            const buttons = screen.getAllByRole('button');
            const deleteButton = buttons.find(
                (btn) => btn.querySelector('svg') && !btn.textContent.trim()
            );

            await clickWithAct(deleteButton);

            expect(mockOnDelete).toHaveBeenCalledWith(1);
        });

        it('calls onDelete with correct id for each expense', async () => {
            render(<ExpenseList expenses={mockExpenses.slice(0, 2)} onDelete={mockOnDelete} />);

            // Get all buttons without text (delete buttons)
            const allButtons = screen.getAllByRole('button');
            const deleteButtons = allButtons.filter(
                (btn) => btn.querySelector('svg') && !btn.textContent.trim()
            );

            // Click first delete button
            await clickWithAct(deleteButtons[0]);
            expect(mockOnDelete).toHaveBeenCalledWith(1);

            // Click second delete button
            await clickWithAct(deleteButtons[1]);
            expect(mockOnDelete).toHaveBeenCalledWith(2);
        });
    });

    describe('Expense Count', () => {
        it('shows correct count of expenses when All filter', () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            // All 4 expenses should have their names visible
            const expenseNames = ['Groceries', 'Netflix', 'Gas', 'Online Shopping'];
            expenseNames.forEach((name) => {
                expect(screen.getByText(name)).toBeInTheDocument();
            });
        });

        it('shows correct count when filtered by Debit', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            await clickWithAct(screen.getByRole('button', { name: 'Debit' }));

            // Only 2 debit expenses
            expect(screen.getByText('Groceries')).toBeInTheDocument();
            expect(screen.getByText('Gas')).toBeInTheDocument();
        });

        it('shows correct count when filtered by Credit', async () => {
            render(<ExpenseList expenses={mockExpenses} onDelete={mockOnDelete} />);

            await clickWithAct(screen.getByRole('button', { name: 'Credit' }));

            // Only 2 credit expenses
            expect(screen.getByText('Netflix')).toBeInTheDocument();
            expect(screen.getByText('Online Shopping')).toBeInTheDocument();
        });
    });
});
