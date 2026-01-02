import React from 'react';
/**
 * EditExpenseModal Test Suite
 *
 * Tests for the Edit Expense modal component covering:
 * - Pre-filling form with expense data
 * - Form field interactions and updates
 * - Category/subcategory changes
 * - Debt payment autofill
 * - Form submission (update API call)
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { clickWithAct, typeWithAct, selectWithAct, clearWithAct } from './test-utils';
import EditExpenseModal from '../components/EditExpenseModal';

// Mock the API module
vi.mock('../api', () => ({
    debtAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
    },
    subcategoryAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: { subcategories: {} } })),
    },
}));

// Sample expense data for testing
const mockExpense = {
    id: 1,
    name: 'Grocery Shopping',
    amount: 5000, // 50.00 in cents
    date: '13 Nov, 2025',
    category: 'Flexible Expenses',
    subcategory: 'Food',
    payment_method: 'Debit card',
};

describe('EditExpenseModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEdit = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnEdit.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('renders the edit modal with title', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            expect(screen.getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
        });

        it('renders all form fields', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            expect(screen.getByText('Name')).toBeInTheDocument();
            expect(screen.getByText('Amount (€)')).toBeInTheDocument();
            expect(screen.getByText('Date')).toBeInTheDocument();
            expect(screen.getByText('Category')).toBeInTheDocument();
            expect(screen.getByText('Subcategory')).toBeInTheDocument();
            expect(screen.getByText('Payment Method')).toBeInTheDocument();
        });

        it('shows Save and Cancel buttons', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });
    });

    describe('Pre-fill Expense Data', () => {
        it('pre-fills name from expense', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                const nameInput = screen.getByDisplayValue('Grocery Shopping');
                expect(nameInput).toBeInTheDocument();
            });
        });

        it('pre-fills amount from expense (converted from cents)', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                const amountInput = screen.getByDisplayValue('50.00');
                expect(amountInput).toBeInTheDocument();
            });
        });

        it('pre-fills date from expense (parsed from display format)', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                const dateInput = screen.getByDisplayValue('2025-11-13');
                expect(dateInput).toBeInTheDocument();
            });
        });

        it('pre-fills category from expense', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                // The select should have Flexible Expenses selected
                const categorySelect = screen.getAllByRole('combobox')[0];
                expect(categorySelect).toHaveValue('Flexible Expenses');
            });
        });

        it('pre-fills payment method from expense', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                // Find the payment method select (last combobox)
                const comboboxes = screen.getAllByRole('combobox');
                const paymentMethodSelect = comboboxes[comboboxes.length - 1];
                expect(paymentMethodSelect).toHaveValue('Debit card');
            });
        });
    });

    describe('Form Interactions', () => {
        it('allows updating the name', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Grocery Shopping')).toBeInTheDocument();
            });

            const nameInput = screen.getByDisplayValue('Grocery Shopping');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Weekly Groceries');

            expect(nameInput).toHaveValue('Weekly Groceries');
        });

        it('allows updating the amount', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('50.00')).toBeInTheDocument();
            });

            const amountInput = screen.getByDisplayValue('50.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '75.50');

            expect(amountInput).toHaveValue(75.5);
        });

        it('allows changing category', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getAllByRole('combobox')[0]).toHaveValue('Flexible Expenses');
            });

            const categorySelect = screen.getAllByRole('combobox')[0];
            await selectWithAct(categorySelect, 'Fixed Expenses');

            expect(categorySelect).toHaveValue('Fixed Expenses');
        });

        it('allows changing payment method', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getAllByRole('combobox')).toHaveLength(3);
            });

            const comboboxes = screen.getAllByRole('combobox');
            const paymentMethodSelect = comboboxes[comboboxes.length - 1];
            await selectWithAct(paymentMethodSelect, 'Credit card');

            expect(paymentMethodSelect).toHaveValue('Credit card');
        });
    });

    describe('Modal Actions', () => {
        it('calls onClose when Cancel button is clicked', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            await clickWithAct(cancelButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button is clicked', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            // Find the X button (svg close icon button in header)
            const buttons = screen.getAllByRole('button');
            const xButton = buttons.find(
                (btn) =>
                    btn.querySelector('svg') &&
                    !btn.textContent.includes('Save') &&
                    !btn.textContent.includes('Cancel')
            );
            await clickWithAct(xButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Form Submission', () => {
        it('calls onEdit with updated expense data', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Grocery Shopping')).toBeInTheDocument();
            });

            const saveButton = screen.getByRole('button', { name: 'Save' });
            await clickWithAct(saveButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        name: 'Grocery Shopping',
                        amount: 5000, // cents
                        date: '2025-11-13',
                        category: 'Flexible Expenses',
                        payment_method: 'Debit card',
                    })
                );
            });
        });

        it('converts amount to cents before submission', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('50.00')).toBeInTheDocument();
            });

            const amountInput = screen.getByDisplayValue('50.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '123.45');

            const saveButton = screen.getByRole('button', { name: 'Save' });
            await clickWithAct(saveButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        amount: 12345, // 123.45 * 100
                    })
                );
            });
        });

        it('shows loading state while saving', async () => {
            // Make the API call hang
            let resolvePromise;
            mockOnEdit.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolvePromise = resolve;
                    })
            );

            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Grocery Shopping')).toBeInTheDocument();
            });

            const saveButton = screen.getByRole('button', { name: 'Save' });
            await clickWithAct(saveButton);

            expect(screen.getByText('Saving...')).toBeInTheDocument();

            // Cleanup - resolve the promise
            resolvePromise();
        });
    });

    describe('Error Handling', () => {
        it('displays error message when save fails', async () => {
            mockOnEdit.mockRejectedValueOnce({
                response: { data: { error: 'Failed to update expense' } },
            });

            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Grocery Shopping')).toBeInTheDocument();
            });

            const saveButton = screen.getByRole('button', { name: 'Save' });
            await clickWithAct(saveButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update expense')).toBeInTheDocument();
            });
        });

        it('shows generic error when response has no error message', async () => {
            mockOnEdit.mockRejectedValueOnce(new Error('Network error'));

            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Grocery Shopping')).toBeInTheDocument();
            });

            const saveButton = screen.getByRole('button', { name: 'Save' });
            await clickWithAct(saveButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update expense')).toBeInTheDocument();
            });
        });
    });

    describe('Category Options', () => {
        it('has all category options', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            expect(screen.getByText('Fixed Expenses')).toBeInTheDocument();
            expect(screen.getByText('Flexible Expenses')).toBeInTheDocument();
            expect(screen.getByText('Savings & Investments')).toBeInTheDocument();
            expect(screen.getByText('Debt Payments')).toBeInTheDocument();
        });
    });

    describe('Payment Method Options', () => {
        it('has Credit card and Debit card options', async () => {
            render(
                <EditExpenseModal onClose={mockOnClose} onEdit={mockOnEdit} expense={mockExpense} />
            );

            // Check for payment method options in the last select
            const comboboxes = screen.getAllByRole('combobox');
            const paymentMethodSelect = comboboxes[comboboxes.length - 1];
            const options = paymentMethodSelect.querySelectorAll('option');
            const optionValues = Array.from(options).map((o) => o.value);

            expect(optionValues).toContain('Credit card');
            expect(optionValues).toContain('Debit card');
        });
    });
});
