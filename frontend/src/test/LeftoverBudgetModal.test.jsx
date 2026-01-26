import React from 'react';
/**
 * LeftoverBudgetModal Test Suite
 *
 * Tests budget leftover allocation modal including debt payment,
 * goal contributions, amount selection, and allocation flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { clickWithAct, typeWithAct, clearWithAct } from './test-utils';
import LeftoverBudgetModal from '../components/LeftoverBudgetModal';

// Mock the API
vi.mock('../api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import api from '../api';

describe('LeftoverBudgetModal', () => {
    let mockOnClose;
    let mockOnAllocate;

    const mockLeftoverData = {
        leftover: 5000, // $50.00
        budget_amount: 25000, // $250.00
        end_date: '2025-01-07',
        allocation_options: {
            debts: [
                { id: 1, name: 'Car Loan', current_balance: 500000, monthly_payment: 30000 },
                { id: 2, name: 'Student Loan', current_balance: 1000000, monthly_payment: 25000 },
            ],
            goals: [
                {
                    id: 1,
                    name: 'Emergency Fund',
                    target_amount: 100000,
                    progress: { current_amount: 25000, percentage: 25 },
                    subcategory_name: 'Emergency Fund',
                },
                {
                    id: 2,
                    name: 'Vacation',
                    target_amount: 200000,
                    progress: { current_amount: 50000, percentage: 25 },
                    subcategory_name: 'Vacation Fund',
                },
            ],
        },
    };

    beforeEach(() => {
        mockOnClose = vi.fn();
        mockOnAllocate = vi.fn();
        api.get.mockResolvedValue({ data: mockLeftoverData });
        api.post.mockResolvedValue({});
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Loading State', () => {
        it('shows loading state initially', () => {
            api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            // Should show loading skeleton
            expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
        });

        it('loads leftover data on mount', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={2}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith('/salary-periods/1/week/2/leftover');
            });
        });
    });

    describe('No Leftover State', () => {
        it('shows week complete message when leftover is zero', async () => {
            api.get.mockResolvedValue({
                data: { leftover: 0, budget_amount: 25000 },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Week Complete!')).toBeInTheDocument();
            });
            expect(
                screen.getByText(
                    "You've used your entire weekly budget. Great job staying on track!"
                )
            ).toBeInTheDocument();
        });

        it('shows Continue button when no leftover', async () => {
            api.get.mockResolvedValue({
                data: { leftover: 0, budget_amount: 25000 },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
            });
        });

        it('calls onClose when Continue is clicked (no leftover)', async () => {
            api.get.mockResolvedValue({
                data: { leftover: 0, budget_amount: 25000 },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: 'Continue' }));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Rendering with Leftover', () => {
        it('shows week number in header', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={3}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Week 3 Complete!/)).toBeInTheDocument();
            });
        });

        it('displays leftover amount', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('€50.00')).toBeInTheDocument();
            });
        });

        it('displays budget amount', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('from €250.00 budget')).toBeInTheDocument();
            });
        });

        it('shows allocation type buttons', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Debt Payments')).toBeInTheDocument();
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });
        });

        it('shows Skip for Now and Allocate Funds buttons', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Skip for Now' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Allocate Funds' })).toBeInTheDocument();
            });
        });

        it('shows important notice about carryover', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Leftover budget doesn't carry over/)).toBeInTheDocument();
            });
        });
    });

    describe('Debt Selection', () => {
        it('defaults to debts allocation type', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Select Debt')).toBeInTheDocument();
            });
        });

        it('displays available debts', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
                expect(screen.getByText('Student Loan')).toBeInTheDocument();
            });
        });

        it('shows debt balances', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                // formatCurrency now uses Intl formatter with locale-specific separators
                expect(screen.getByText(/Balance:.*€5,000\.00/)).toBeInTheDocument();
                expect(screen.getByText(/Balance:.*€10,000\.00/)).toBeInTheDocument();
            });
        });

        it('allows selecting a debt', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            // Find and click the Car Loan button
            const carLoanButton = screen.getByText('Car Loan').closest('button');
            await clickWithAct(carLoanButton);

            // Should be selected (has pink border class)
            expect(carLoanButton).toHaveClass('border-bloom-pink');
        });

        it('shows no debts message when empty', async () => {
            api.get.mockResolvedValue({
                data: {
                    ...mockLeftoverData,
                    allocation_options: {
                        debts: [],
                        goals: mockLeftoverData.allocation_options.goals,
                    },
                },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/No active debts/)).toBeInTheDocument();
            });
        });
    });

    describe('Goal Selection', () => {
        it('switches to goals when clicked', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Savings Goals'));

            expect(screen.getByText('Select Goal')).toBeInTheDocument();
        });

        it('displays available goals', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Savings Goals'));

            expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
            expect(screen.getByText('Vacation')).toBeInTheDocument();
        });

        it('shows goal progress', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Savings Goals'));

            // Emergency Fund: 25000/100000 = 25%
            // Vacation: 50000/200000 = 25%
            // Both goals have 25% progress
            const progressElements = screen.getAllByText('25%');
            expect(progressElements.length).toBe(2);
        });

        it('shows no goals message when empty', async () => {
            api.get.mockResolvedValue({
                data: {
                    ...mockLeftoverData,
                    allocation_options: {
                        debts: mockLeftoverData.allocation_options.debts,
                        goals: [],
                    },
                },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Savings Goals'));

            expect(screen.getByText(/No active goals/)).toBeInTheDocument();
        });
    });

    describe('Amount Input', () => {
        it('pre-fills amount with leftover', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                const amountInput = screen.getByPlaceholderText('0.00');
                expect(amountInput).toHaveValue('50.00');
            });
        });

        it('allows editing amount', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
            });

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '25.00');

            expect(amountInput).toHaveValue('25.00');
        });

        it('shows use full amount button', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Use full amount/)).toBeInTheDocument();
            });
        });

        it('clicking use full amount sets amount to leftover', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
            });

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '10');

            await clickWithAct(screen.getByText(/Use full amount/));

            expect(amountInput).toHaveValue('50.00');
        });
    });

    describe('Validation', () => {
        it('shows error for zero amount', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            // Select a debt first
            await clickWithAct(screen.getByText('Car Loan').closest('button'));

            // Clear and set zero amount
            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '0');

            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
        });

        it('shows error for amount exceeding leftover', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            // Select a debt
            await clickWithAct(screen.getByText('Car Loan').closest('button'));

            // Set amount higher than leftover
            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100');

            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            expect(screen.getByText(/Amount cannot exceed leftover/)).toBeInTheDocument();
        });

        it('disables allocate button when no debt selected', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Allocate Funds' })).toBeDisabled();
            });
        });

        it('disables allocate button when no goal selected', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Savings Goals'));

            expect(screen.getByRole('button', { name: 'Allocate Funds' })).toBeDisabled();
        });
    });

    describe('Allocation - Debts', () => {
        it('allocates to debt successfully', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            // Select debt
            await clickWithAct(screen.getByText('Car Loan').closest('button'));

            // Allocate
            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/debts/pay', {
                    debt_id: 1,
                    amount: 5000,
                    date: '2025-01-07',
                });
            });
        });

        it('calls onAllocate after successful debt payment', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Car Loan').closest('button'));
            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            await waitFor(() => {
                expect(mockOnAllocate).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Allocation - Goals', () => {
        it('allocates to goal successfully', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Savings Goals')).toBeInTheDocument();
            });

            // Switch to goals
            await clickWithAct(screen.getByText('Savings Goals'));

            // Select goal
            await clickWithAct(screen.getByText('Emergency Fund').closest('button'));

            // Allocate
            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/expenses', {
                    name: 'Emergency Fund Contribution',
                    amount: 5000,
                    date: '2025-01-07',
                    category: 'Savings & Investments',
                    subcategory: 'Emergency Fund',
                    payment_method: 'Debit card',
                });
            });
        });
    });

    describe('Skip and Close', () => {
        it('calls onClose when Skip is clicked', async () => {
            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Skip for Now' })).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: 'Skip for Now' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Handling', () => {
        it('shows Week Complete when API fails to load leftover data', async () => {
            // When API fails, leftoverData is null, so component shows "Week Complete" state
            api.get.mockRejectedValue(new Error('Network error'));

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            // When loading fails, leftoverData stays null, showing "Week Complete" view
            await waitFor(() => {
                expect(screen.getByText('Week Complete!')).toBeInTheDocument();
            });
        });

        it('displays error when allocation fails', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Payment failed' } },
            });

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Car Loan').closest('button'));
            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            await waitFor(() => {
                expect(screen.getByText('Payment failed')).toBeInTheDocument();
            });
        });

        it('shows loading state during allocation', async () => {
            api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(
                <LeftoverBudgetModal
                    salaryPeriodId={1}
                    weekNumber={1}
                    onClose={mockOnClose}
                    onAllocate={mockOnAllocate}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Car Loan')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Car Loan').closest('button'));
            await clickWithAct(screen.getByRole('button', { name: 'Allocate Funds' }));

            expect(screen.getByRole('button', { name: 'Allocating...' })).toBeInTheDocument();
        });
    });
});
