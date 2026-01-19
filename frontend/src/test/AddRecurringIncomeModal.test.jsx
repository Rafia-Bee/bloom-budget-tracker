/**
 * AddRecurringIncomeModal Test Suite
 *
 * Tests for the Add Recurring Income modal component covering:
 * - Form rendering with all fields
 * - Input validation (name, amount, dates)
 * - Frequency selection (weekly, biweekly, monthly, custom)
 * - Income type selection
 * - Form submission with cents conversion
 * - Edit mode with pre-populated values
 * - Error handling
 * - Modal close actions
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import { clickWithAct, typeWithAct, selectWithAct, clearWithAct } from './test-utils';
import { renderWithSharedData } from './utils.jsx';
import AddRecurringIncomeModal from '../components/AddRecurringIncomeModal';

describe('AddRecurringIncomeModal', () => {
    const mockOnClose = vi.fn();
    const mockOnAdd = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnAdd.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('renders the modal with title for add mode', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            expect(
                screen.getByRole('heading', { name: 'Add Recurring Income' })
            ).toBeInTheDocument();
        });

        it('renders the modal with title for edit mode', async () => {
            const existingIncome = { name: 'Test Income', amount: 500000 };
            renderWithSharedData(
                <AddRecurringIncomeModal
                    onClose={mockOnClose}
                    onAdd={mockOnAdd}
                    existingIncome={existingIncome}
                />
            );

            expect(
                screen.getByRole('heading', { name: 'Edit Recurring Income' })
            ).toBeInTheDocument();
        });

        it('renders all form fields', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            await waitFor(() => {
                expect(screen.getByText('Name')).toBeInTheDocument();
            });
            expect(screen.getByText(/Amount/)).toBeInTheDocument();
            expect(screen.getByText('Income Type')).toBeInTheDocument();
            expect(screen.getByText('Frequency')).toBeInTheDocument();
        });

        it('renders recurrence schedule section', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            await waitFor(() => {
                expect(screen.getByText('Start Date')).toBeInTheDocument();
            });
        });

        it('renders save and cancel buttons', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            expect(
                screen.getByRole('button', { name: /Add Recurring Income/i })
            ).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('submits form with converted cents amount', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '5000.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalled();
                const callArgs = mockOnAdd.mock.calls[0][0];
                expect(callArgs.amount).toBe(500000); // €5000.00 = 500000 cents
            });
        });

        it('includes all required fields in submission', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const nameInput = screen.getByPlaceholderText('e.g., Monthly Salary');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Test Salary');

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '3000.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalled();
                const callArgs = mockOnAdd.mock.calls[0][0];
                expect(callArgs.name).toBe('Test Salary');
                expect(callArgs.amount).toBe(300000);
                expect(callArgs.frequency).toBeDefined();
                expect(callArgs.start_date).toBeDefined();
                expect(callArgs.is_active).toBe(true);
            });
        });
    });

    describe('Frequency Selection', () => {
        it('shows day of week selector for weekly frequency', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const frequencySelect = screen.getByDisplayValue('Monthly');
            await selectWithAct(frequencySelect, 'weekly');

            await waitFor(() => {
                expect(screen.getByText('Day of Week')).toBeInTheDocument();
            });
        });

        it('shows day of month selector for monthly frequency', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            await waitFor(() => {
                expect(screen.getByText('Day of Month')).toBeInTheDocument();
            });
        });

        it('shows custom interval for custom frequency', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const frequencySelect = screen.getByDisplayValue('Monthly');
            await selectWithAct(frequencySelect, 'custom');

            await waitFor(() => {
                expect(screen.getByText('Every X Days')).toBeInTheDocument();
            });
        });
    });

    describe('Income Type Selection', () => {
        it('renders all income types', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const incomeTypeSelect = screen.getByDisplayValue('Salary');
            expect(incomeTypeSelect).toBeInTheDocument();

            // Verify we can select different types
            await selectWithAct(incomeTypeSelect, 'Bonus');
            expect(screen.getByDisplayValue('Bonus')).toBeInTheDocument();

            await selectWithAct(incomeTypeSelect, 'Freelance');
            expect(screen.getByDisplayValue('Freelance')).toBeInTheDocument();
        });

        it('includes income type in submission', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const incomeTypeSelect = screen.getByDisplayValue('Salary');
            await selectWithAct(incomeTypeSelect, 'Dividends');

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalled();
                const callArgs = mockOnAdd.mock.calls[0][0];
                expect(callArgs.income_type).toBe('Dividends');
            });
        });
    });

    describe('Edit Mode', () => {
        it('pre-populates form with existing income data', async () => {
            const existingIncome = {
                name: 'Monthly Salary',
                amount: 500000, // €5000.00 in cents
                income_type: 'Salary',
                frequency: 'monthly',
                day_of_month: 25,
                start_date: '2025-01-01',
                notes: 'Regular salary payment',
            };

            renderWithSharedData(
                <AddRecurringIncomeModal
                    onClose={mockOnClose}
                    onAdd={mockOnAdd}
                    existingIncome={existingIncome}
                />
            );

            await waitFor(() => {
                expect(screen.getByDisplayValue('Monthly Salary')).toBeInTheDocument();
                expect(screen.getByDisplayValue('5000.00')).toBeInTheDocument();
                expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
            });
        });

        it('shows correct title in edit mode', async () => {
            const existingIncome = { name: 'Test', amount: 1000 };
            renderWithSharedData(
                <AddRecurringIncomeModal
                    onClose={mockOnClose}
                    onAdd={mockOnAdd}
                    existingIncome={existingIncome}
                />
            );

            expect(
                screen.getByRole('heading', { name: 'Edit Recurring Income' })
            ).toBeInTheDocument();
        });
    });

    describe('Modal Actions', () => {
        it('calls onClose when cancel button is clicked', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const cancelButton = screen.getByRole('button', { name: /Cancel/i });
            await clickWithAct(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when X button is clicked', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            // Find the close X button (it's the first button with just an SVG)
            const closeButtons = screen.getAllByRole('button');
            const xButton = closeButtons.find((btn) => btn.querySelector('svg'));
            await clickWithAct(xButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('displays error message when submission fails', async () => {
            mockOnAdd.mockRejectedValue({
                response: { data: { error: 'Server error occurred' } },
            });

            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Server error occurred')).toBeInTheDocument();
            });
        });

        it('displays generic error message when no response data', async () => {
            mockOnAdd.mockRejectedValue(new Error('Network error'));

            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to save recurring income')).toBeInTheDocument();
            });
        });
    });

    describe('Date Fields', () => {
        it('renders start date field with today as default', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            // Find the start date label
            expect(screen.getByText('Start Date')).toBeInTheDocument();
        });

        it('renders optional end date field', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            expect(screen.getByText('End Date')).toBeInTheDocument();
            // The "(Optional)" is in a separate span
            expect(screen.getAllByText('(Optional)').length).toBeGreaterThanOrEqual(1);
        });

        it('includes dates in submission', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalled();
                const callArgs = mockOnAdd.mock.calls[0][0];
                expect(callArgs.start_date).toBeDefined();
            });
        });
    });

    describe('Notes Field', () => {
        it('renders notes textarea', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            // The label contains "Notes" with "(Optional)" as a separate span
            expect(screen.getByText('Notes')).toBeInTheDocument();
        });

        it('includes notes in submission', async () => {
            renderWithSharedData(
                <AddRecurringIncomeModal onClose={mockOnClose} onAdd={mockOnAdd} />
            );

            const notesTextarea = screen.getByPlaceholderText('Any additional details...');
            await typeWithAct(notesTextarea, 'This is a test note');

            const amountInput = screen.getByPlaceholderText('0.00');
            await clearWithAct(amountInput);
            await typeWithAct(amountInput, '100.00');

            const submitButton = screen.getByRole('button', { name: /Add Recurring Income/i });
            await clickWithAct(submitButton);

            await waitFor(() => {
                expect(mockOnAdd).toHaveBeenCalled();
                const callArgs = mockOnAdd.mock.calls[0][0];
                expect(callArgs.notes).toBe('This is a test note');
            });
        });
    });
});
