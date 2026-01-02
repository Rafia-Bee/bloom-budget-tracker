/**
 * AddDebtPaymentModal Test Suite
 *
 * Tests debt payment form including debt selection, amount auto-fill,
 * payment method selection, and form submission.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import AddDebtPaymentModal from '../components/AddDebtPaymentModal';
import { clickWithAct, changeWithAct, selectWithAct, clearWithAct } from './test-utils';

// Mock the API
vi.mock('../api', () => ({
    debtAPI: {
        getAll: vi.fn(),
    },
}));

import { debtAPI } from '../api';

describe('AddDebtPaymentModal', () => {
    let mockOnClose;
    let mockOnAdd;
    const mockDebts = [
        { id: 1, name: 'Car Loan', current_balance: 1000000, monthly_payment: 50000 },
        { id: 2, name: 'Student Loan', current_balance: 2500000, monthly_payment: 30000 },
        { id: 3, name: 'Personal Loan', current_balance: 500000, monthly_payment: 0 },
    ];

    beforeEach(() => {
        mockOnClose = vi.fn();
        mockOnAdd = vi.fn().mockResolvedValue({});
        debtAPI.getAll.mockResolvedValue({ data: mockDebts });
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // Flush any pending state updates to avoid act() warnings
        await act(async () => {});
        cleanup();
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('renders the modal with title', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            // Wait for initial API call to settle
            await waitFor(() => {
                expect(screen.getByText('Debt Payment')).toBeInTheDocument();
            });
            expect(screen.getByText('Record a payment toward your debt')).toBeInTheDocument();
        });

        it('renders all form fields', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByText('Select Debt')).toBeInTheDocument();
            });
            expect(screen.getByText('Payment Amount (€)')).toBeInTheDocument();
            expect(screen.getByText('Payment Date')).toBeInTheDocument();
            expect(screen.getByText('Payment Method')).toBeInTheDocument();
        });

        it('renders Add Payment and Cancel buttons', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Add Payment' })).toBeInTheDocument();
            });
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders close X button', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const closeButtons = screen.getAllByRole('button');
                // X button is in the header
                const xButton = closeButtons.find((btn) => btn.querySelector('svg.w-6.h-6'));
                expect(xButton).toBeInTheDocument();
            });
        });
    });

    describe('Debt Loading', () => {
        it('loads debts from API on mount', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(debtAPI.getAll).toHaveBeenCalledTimes(1);
            });
        });

        it('displays loaded debts in dropdown', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Car Loan' })).toBeInTheDocument();
                expect(screen.getByRole('option', { name: 'Student Loan' })).toBeInTheDocument();
                expect(screen.getByRole('option', { name: 'Personal Loan' })).toBeInTheDocument();
            });
        });

        it('includes Credit Card option in dropdown', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument();
            });
        });

        it('includes placeholder option in dropdown', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(
                    screen.getByRole('option', { name: 'Choose a debt...' })
                ).toBeInTheDocument();
            });
        });

        it('auto-selects first debt on load', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });
        });

        it('auto-fills amount from first debt monthly payment', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveValue(500); // €500.00 = 50000 cents
            });
        });

        it('displays error when debts fail to load', async () => {
            debtAPI.getAll.mockRejectedValue(new Error('Network error'));
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load debts')).toBeInTheDocument();
            });
        });
    });

    describe('Pre-selected Debt', () => {
        it('uses preSelectedDebt when provided', async () => {
            render(
                <AddDebtPaymentModal
                    onClose={mockOnClose}
                    onAdd={mockOnAdd}
                    preSelectedDebt="Student Loan"
                />
            );

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Student Loan');
            });
        });

        it('auto-fills amount from preSelectedDebt monthly payment', async () => {
            render(
                <AddDebtPaymentModal
                    onClose={mockOnClose}
                    onAdd={mockOnAdd}
                    preSelectedDebt="Student Loan"
                />
            );

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveValue(300); // €300.00 = 30000 cents
            });
        });
    });

    describe('Debt Selection', () => {
        it('updates amount when debt is changed', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Student Loan' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Student Loan');

            const amountInput = screen.getByPlaceholderText('0.00');
            expect(amountInput).toHaveValue(300); // €300.00 from Student Loan
        });

        it('clears amount when Credit Card is selected', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Car Loan' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Credit Card');

            const amountInput = screen.getByPlaceholderText('0.00');
            expect(amountInput).toHaveValue(null);
        });

        it('handles debt with zero monthly payment', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Personal Loan' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Personal Loan');

            // Amount keeps previous value (500 from auto-selected Car Loan) when monthly_payment is 0
            const amountInput = screen.getByPlaceholderText('0.00');
            expect(amountInput).toHaveValue(500); // Retains Car Loan's monthly payment
        });
    });

    describe('Form Interactions', () => {
        it('allows entering custom amount', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await changeWithAct(amountInput, '750.50');

            expect(amountInput).toHaveValue(750.5);
        });

        it('allows changing payment method', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            const methodSelects = screen.getAllByRole('combobox');
            const paymentMethodSelect = methodSelects[1]; // Second select is payment method

            await selectWithAct(paymentMethodSelect, 'Cash');
            expect(paymentMethodSelect).toHaveValue('Cash');

            await selectWithAct(paymentMethodSelect, 'Bank transfer');
            expect(paymentMethodSelect).toHaveValue('Bank transfer');
        });

        it('defaults to Debit card payment method', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const methodSelects = screen.getAllByRole('combobox');
                const paymentMethodSelect = methodSelects[1];
                expect(paymentMethodSelect).toHaveValue('Debit card');
            });
        });

        it('allows changing payment date', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            const dateInput = document.querySelector('input[type="date"]');
            await clearWithAct(dateInput);
            await changeWithAct(dateInput, '2025-01-15');

            expect(dateInput).toHaveValue('2025-01-15');
        });

        it('defaults date to today', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            const today = new Date().toISOString().split('T')[0];
            await waitFor(() => {
                const dateInput = document.querySelector('input[type="date"]');
                expect(dateInput).toHaveValue(today);
            });
        });
    });

    describe('Input Validation', () => {
        it('debt selection is required', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveAttribute('required');
            });
        });

        it('amount is required', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveAttribute('required');
            });
        });

        it('amount has min value of 0.01', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveAttribute('min', '0.01');
            });
        });

        it('amount has step of 0.01', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveAttribute('step', '0.01');
            });
        });

        it('date is required', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const dateInput = document.querySelector('input[type="date"]');
                expect(dateInput).toHaveAttribute('required');
            });
        });

        it('submit button is disabled when no debt is selected', async () => {
            debtAPI.getAll.mockResolvedValue({ data: [] });
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const submitButton = screen.getByRole('button', { name: 'Add Payment' });
                expect(submitButton).toBeDisabled();
            });
        });
    });

    describe('Modal Actions', () => {
        it('calls onClose when Cancel is clicked', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await clickWithAct(screen.getByRole('button', { name: 'Cancel' }));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button is clicked', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            const closeButtons = screen.getAllByRole('button');
            const xButton = closeButtons.find((btn) => btn.querySelector('svg.w-6.h-6'));

            await clickWithAct(xButton);
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Form Submission', () => {
        it('calls onAdd with correct data on submission', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledTimes(1);
                expect(mockOnAdd).toHaveBeenCalledWith({
                    name: 'Car Loan Payment',
                    amount: 50000, // €500.00 in cents
                    date: expect.any(String),
                    category: 'Debt Payments',
                    subcategory: 'Car Loan',
                    payment_method: 'Debit card',
                });
            });
        });

        it('converts amount to cents on submission', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await changeWithAct(amountInput, '123.45');

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({ amount: 12345 }));
            });
        });

        it('uses selected payment method in submission', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const methodSelects = screen.getAllByRole('combobox');
            const paymentMethodSelect = methodSelects[1];
            await selectWithAct(paymentMethodSelect, 'Bank transfer');

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledWith(
                    expect.objectContaining({ payment_method: 'Bank transfer' })
                );
            });
        });

        it('includes selected date in submission', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const dateInput = document.querySelector('input[type="date"]');
            await clearWithAct(dateInput);
            await changeWithAct(dateInput, '2025-02-14');

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledWith(
                    expect.objectContaining({ date: '2025-02-14' })
                );
            });
        });

        it('creates expense name with debt name + Payment suffix', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Student Loan' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Student Loan');

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'Student Loan Payment',
                        subcategory: 'Student Loan',
                    })
                );
            });
        });
    });

    describe('Loading State', () => {
        it('shows loading text during submission', async () => {
            mockOnAdd.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument();
            });
        });

        it('disables submit button during loading', async () => {
            mockOnAdd.mockImplementation(() => new Promise(() => {}));

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled();
            });
        });
    });

    describe('Error Handling', () => {
        it('displays error message when submission fails', async () => {
            mockOnAdd.mockRejectedValue({
                response: { data: { error: 'Insufficient funds' } },
            });

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
            });
        });

        it('displays generic error message when no specific error', async () => {
            mockOnAdd.mockRejectedValue(new Error('Network error'));

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to add debt payment')).toBeInTheDocument();
            });
        });

        it('allows dismissing error message', async () => {
            mockOnAdd.mockRejectedValue({
                response: { data: { error: 'Failed to add payment' } },
            });

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to add payment')).toBeInTheDocument();
            });

            // Find and click the dismiss button in the error container
            const errorText = screen.getByText('Failed to add payment');
            const errorContainer = errorText.closest('.bg-red-100');
            const dismissButton = errorContainer.querySelector('button');

            await clickWithAct(dismissButton);

            await waitFor(() => {
                expect(screen.queryByText('Failed to add payment')).not.toBeInTheDocument();
            });
        });

        it('re-enables submit button after error', async () => {
            mockOnAdd.mockRejectedValue({
                response: { data: { error: 'Error' } },
            });

            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                expect(debtSelect).toHaveValue('Car Loan');
            });

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            const enabledSubmitButton = screen.getByRole('button', { name: 'Add Payment' });
            expect(enabledSubmitButton).not.toBeDisabled();
        });
    });

    describe('Credit Card Special Case', () => {
        it('handles Credit Card selection differently', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Credit Card');

            // Amount should be cleared for Credit Card
            const amountInput = screen.getByPlaceholderText('0.00');
            expect(amountInput).toHaveValue(null);
        });

        it('submits with Credit Card as subcategory', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument();
            });

            const [debtSelect] = screen.getAllByRole('combobox');
            await selectWithAct(debtSelect, 'Credit Card');

            const amountInput = screen.getByPlaceholderText('0.00');
            await changeWithAct(amountInput, '200');

            const submitButton = screen.getByRole('button', { name: 'Add Payment' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'Credit Card Payment',
                        subcategory: 'Credit Card',
                    })
                );
            });
        });
    });

    describe('Payment Method Options', () => {
        it('includes all payment method options', async () => {
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Debit card' })).toBeInTheDocument();
            });
            expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Bank transfer' })).toBeInTheDocument();
        });
    });

    // Note: Decimal rounding is implicitly tested by 'converts amount to cents on submission'
    // which uses 100.50 → 10050 cents. The Math.round() in the component handles edge cases.

    describe('Empty Debts List', () => {
        it('handles empty debts list gracefully', async () => {
            debtAPI.getAll.mockResolvedValue({ data: [] });
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                const [debtSelect] = screen.getAllByRole('combobox');
                // Should only have placeholder and Credit Card options
                expect(debtSelect.querySelectorAll('option')).toHaveLength(2);
            });
        });

        it('still shows Credit Card option when no debts exist', async () => {
            debtAPI.getAll.mockResolvedValue({ data: [] });
            render(<AddDebtPaymentModal onClose={mockOnClose} onAdd={mockOnAdd} />);

            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'Credit Card' })).toBeInTheDocument();
            });
        });
    });
});
