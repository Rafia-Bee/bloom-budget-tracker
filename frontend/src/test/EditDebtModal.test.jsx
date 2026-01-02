import React from 'react';
/**
 * EditDebtModal Test Suite
 *
 * Tests for the Edit Debt modal component covering:
 * - Modal rendering with debt data pre-filled
 * - Form field interactions
 * - Input validation
 * - Form submission with cents conversion
 * - Error handling
 * - Loading states
 * - Modal close actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { clickWithAct, typeWithAct, clearWithAct } from './test-utils';
import EditDebtModal from '../components/EditDebtModal';

describe('EditDebtModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEdit = vi.fn();

    const mockDebt = {
        id: 1,
        name: 'Credit Card Debt',
        current_balance: 150000, // €1500.00 in cents
        original_amount: 200000, // €2000.00 in cents
        monthly_payment: 10000, // €100.00 in cents
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnEdit.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('renders the modal with title', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            expect(screen.getByRole('heading', { name: 'Edit Debt' })).toBeInTheDocument();
        });

        it('renders all form fields', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            expect(screen.getByText('Debt Name')).toBeInTheDocument();
            expect(screen.getByText(/Current Balance/)).toBeInTheDocument();
            expect(screen.getByText(/Original Amount/)).toBeInTheDocument();
            expect(screen.getByText(/Monthly Payment/)).toBeInTheDocument();
        });

        it('renders Save Changes and Cancel buttons', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders close X button', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const buttons = screen.getAllByRole('button');
            const xButton = buttons.find(
                (btn) =>
                    btn.querySelector('svg') &&
                    !btn.textContent.includes('Save') &&
                    !btn.textContent.includes('Cancel')
            );
            expect(xButton).toBeInTheDocument();
        });

        it('shows helper text for current balance', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            expect(screen.getByText('Update as you make payments')).toBeInTheDocument();
        });
    });

    describe('Pre-filled Values', () => {
        it('pre-fills debt name', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const nameInput = screen.getByDisplayValue('Credit Card Debt');
            expect(nameInput).toBeInTheDocument();
        });

        it('pre-fills current balance in euros', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            expect(balanceInput).toBeInTheDocument();
        });

        it('pre-fills original amount in euros', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const originalInput = screen.getByDisplayValue('2000.00');
            expect(originalInput).toBeInTheDocument();
        });

        it('pre-fills monthly payment in euros', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const paymentInput = screen.getByDisplayValue('100.00');
            expect(paymentInput).toBeInTheDocument();
        });
    });

    describe('Form Interactions', () => {
        it('allows editing the debt name', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const nameInput = screen.getByDisplayValue('Credit Card Debt');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Student Loan');

            expect(nameInput.value).toBe('Student Loan');
        });

        it('allows editing the current balance', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            await clearWithAct(balanceInput);
            await typeWithAct(balanceInput, '1400');

            expect(balanceInput.value).toBe('1400');
        });

        it('allows editing the original amount', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const originalInput = screen.getByDisplayValue('2000.00');
            await clearWithAct(originalInput);
            await typeWithAct(originalInput, '2500');

            expect(originalInput.value).toBe('2500');
        });

        it('allows editing the monthly payment', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const paymentInput = screen.getByDisplayValue('100.00');
            await clearWithAct(paymentInput);
            await typeWithAct(paymentInput, '150');

            expect(paymentInput.value).toBe('150');
        });
    });

    describe('Input Validation', () => {
        it('debt name is required', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const nameInput = screen.getByDisplayValue('Credit Card Debt');
            expect(nameInput).toHaveAttribute('required');
        });

        it('current balance is required', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            expect(balanceInput).toHaveAttribute('required');
        });

        it('original amount is required', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const originalInput = screen.getByDisplayValue('2000.00');
            expect(originalInput).toHaveAttribute('required');
        });

        it('monthly payment is required', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const paymentInput = screen.getByDisplayValue('100.00');
            expect(paymentInput).toHaveAttribute('required');
        });

        it('current balance has min value of 0', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            expect(balanceInput).toHaveAttribute('min', '0');
        });

        it('monthly payment has min value of 0', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const paymentInput = screen.getByDisplayValue('100.00');
            expect(paymentInput).toHaveAttribute('min', '0');
        });

        it('current balance has step of 0.01', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            expect(balanceInput).toHaveAttribute('step', '0.01');
        });

        it('debt name has maxLength of 200', () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const nameInput = screen.getByDisplayValue('Credit Card Debt');
            expect(nameInput).toHaveAttribute('maxLength', '200');
        });
    });

    describe('Modal Actions', () => {
        it('calls onClose when Cancel is clicked', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            await clickWithAct(cancelButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button is clicked', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

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
        it('calls onEdit with correct data on successful submission', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(1, {
                    name: 'Credit Card Debt',
                    current_balance: 150000,
                    original_amount: 200000,
                    monthly_payment: 10000,
                });
            });
        });

        it('converts amounts to cents on submission', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            await clearWithAct(balanceInput);
            await typeWithAct(balanceInput, '1234.56');

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        current_balance: 123456, // €1234.56 in cents
                    })
                );
            });
        });

        it('uses updated name in submission', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const nameInput = screen.getByDisplayValue('Credit Card Debt');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Updated Debt Name');

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        name: 'Updated Debt Name',
                    })
                );
            });
        });

        it('includes debt id in submission', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(1, expect.any(Object));
            });
        });
    });

    describe('Loading State', () => {
        it('shows loading text during submission', async () => {
            mockOnEdit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            expect(screen.getByText('Saving...')).toBeInTheDocument();
        });

        it('disables submit button during loading', async () => {
            mockOnEdit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            expect(submitButton).toBeDisabled();
        });
    });

    describe('Error Handling', () => {
        it('displays error message when submission fails', async () => {
            mockOnEdit.mockRejectedValue({
                response: { data: { error: 'Failed to update debt' } },
            });
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update debt')).toBeInTheDocument();
            });
        });

        it('displays generic error message when no specific error', async () => {
            mockOnEdit.mockRejectedValue(new Error());
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update debt')).toBeInTheDocument();
            });
        });

        it('allows dismissing error message', async () => {
            mockOnEdit.mockRejectedValue({
                response: { data: { error: 'Failed to update debt' } },
            });
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update debt')).toBeInTheDocument();
            });

            // The dismiss button is the one inside the error div with the X icon
            const errorText = screen.getByText('Failed to update debt');
            const errorContainer = errorText.closest('.bg-red-100');
            const dismissButton = errorContainer.querySelector('button');

            await clickWithAct(dismissButton);

            await waitFor(() => {
                expect(screen.queryByText('Failed to update debt')).not.toBeInTheDocument();
            });
        });

        it('re-enables submit button after error', async () => {
            mockOnEdit.mockRejectedValue({
                response: { data: { error: 'Failed to update debt' } },
            });
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeDisabled();
            });
        });
    });

    describe('Decimal Amount Handling', () => {
        it('handles amount with decimal places', async () => {
            const debtWithDecimals = {
                ...mockDebt,
                current_balance: 123456, // €1234.56
                original_amount: 234567,
                monthly_payment: 5050,
            };
            render(
                <EditDebtModal debt={debtWithDecimals} onClose={mockOnClose} onEdit={mockOnEdit} />
            );

            expect(screen.getByDisplayValue('1234.56')).toBeInTheDocument();
            expect(screen.getByDisplayValue('2345.67')).toBeInTheDocument();
            expect(screen.getByDisplayValue('50.50')).toBeInTheDocument();
        });

        it('rounds cents correctly on submission', async () => {
            render(<EditDebtModal debt={mockDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const balanceInput = screen.getByDisplayValue('1500.00');
            await clearWithAct(balanceInput);
            await typeWithAct(balanceInput, '99.99');

            const submitButton = screen.getByRole('button', { name: 'Save Changes' });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnEdit).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        current_balance: 9999, // €99.99 = 9999 cents
                    })
                );
            });
        });
    });

    describe('Different Debt Types', () => {
        it('handles debt with zero monthly payment', () => {
            const debtZeroPayment = {
                ...mockDebt,
                monthly_payment: 0,
            };
            render(
                <EditDebtModal debt={debtZeroPayment} onClose={mockOnClose} onEdit={mockOnEdit} />
            );

            expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
        });

        it('handles debt with zero balance (paid off)', () => {
            const paidOffDebt = {
                ...mockDebt,
                current_balance: 0,
            };
            render(<EditDebtModal debt={paidOffDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
        });

        it('handles debt with same original and current balance', () => {
            const newDebt = {
                ...mockDebt,
                current_balance: 200000,
                original_amount: 200000,
            };
            render(<EditDebtModal debt={newDebt} onClose={mockOnClose} onEdit={mockOnEdit} />);

            const inputs = screen.getAllByDisplayValue('2000.00');
            expect(inputs).toHaveLength(2); // Both current and original
        });
    });
});
