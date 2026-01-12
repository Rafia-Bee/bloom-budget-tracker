/**
 * SalaryPeriodRolloverPrompt Test Suite
 *
 * Tests the rollover prompt banner that appears at end of salary periods.
 * Verifies loading states, messages, and rollover actions.
 *
 * Note: Tests pass salaryPeriodData prop directly to component (bypasses context).
 * This tests the component's rendering logic without needing context mocking.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { clickWithAct } from './test-utils';
import { renderWithSalaryPeriod } from './utils.jsx';
import SalaryPeriodRolloverPrompt from '../components/SalaryPeriodRolloverPrompt';

describe('SalaryPeriodRolloverPrompt', () => {
    let mockOnCreateNext;
    let mockOnDismiss;

    beforeEach(() => {
        mockOnCreateNext = vi.fn();
        mockOnDismiss = vi.fn();
        vi.clearAllMocks();
    });

    // Helper to create mock salary period data
    const createMockPeriodData = (overrides = {}) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);

        return {
            salary_period: {
                id: 1,
                start_date: '2025-12-01',
                end_date: futureDate.toISOString().split('T')[0],
                display_debit_balance: 75000,
                display_credit_available: 120000,
                credit_limit: 150000,
                credit_budget_allowance: 5000,
                ...overrides,
            },
        };
    };

    describe('Loading State', () => {
        it('renders nothing while loading', () => {
            // Component without salaryPeriodData prop and no context = loading
            const { container } = renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Error State', () => {
        it('renders nothing when no salary period found', async () => {
            // Pass null salary_period data
            const { container } = renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={{ salary_period: null }}
                />
            );

            await waitFor(() => {
                expect(container.firstChild).toBeNull();
            });
        });
    });

    describe('Ending Soon Banner (Yellow)', () => {
        let mockPeriodData;

        beforeEach(() => {
            // Period ending in 3 days
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);

            mockPeriodData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
            });
        });

        it('renders the banner with ending soon message', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Week 4 Ending Soon')).toBeInTheDocument();
            });
        });

        it('shows days remaining in message', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/ends in \d+ day/i)).toBeInTheDocument();
            });
        });

        it('displays suggested debit balance', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/€750\.00/)).toBeInTheDocument();
            });
        });

        it('displays suggested credit available and limit', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/€1,200\.00/)).toBeInTheDocument();
                expect(screen.getByText(/€1,500\.00/)).toBeInTheDocument();
            });
        });

        it('has yellow background for ending soon', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                const banner = document.querySelector('.rounded-xl');
                expect(banner).toHaveClass('bg-yellow-50');
            });
        });

        it('shows Create Next Period button', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Create Next Period')).toBeInTheDocument();
            });
        });

        it('shows Remind Me Later button', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Remind Me Later')).toBeInTheDocument();
            });
        });
    });

    describe('Overdue Banner (Red)', () => {
        let mockOverduePeriodData;

        beforeEach(() => {
            // Period ended 2 days ago
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 2);

            mockOverduePeriodData = createMockPeriodData({
                end_date: pastDate.toISOString().split('T')[0],
                display_debit_balance: 50000,
                display_credit_available: 100000,
                credit_budget_allowance: 0,
            });
        });

        it('renders the banner with overdue message', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockOverduePeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Salary Period Ended')).toBeInTheDocument();
            });
        });

        it('shows how many days ago period ended', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockOverduePeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/ended \d+ days? ago/i)).toBeInTheDocument();
            });
        });

        it('has red background for overdue', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockOverduePeriodData}
                />
            );

            await waitFor(() => {
                const banner = document.querySelector('.rounded-xl');
                expect(banner).toHaveClass('bg-red-50');
            });
        });

        it('has red border for overdue', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockOverduePeriodData}
                />
            );

            await waitFor(() => {
                const banner = document.querySelector('.rounded-xl');
                expect(banner).toHaveClass('border-red-300');
            });
        });
    });

    describe('User Actions', () => {
        let mockActionPeriodData;

        beforeEach(() => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);

            mockActionPeriodData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
                display_debit_balance: 80000,
                display_credit_available: 130000,
                credit_budget_allowance: 10000,
            });
        });

        it('calls onCreateNext with rollover data when Create Next Period clicked', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockActionPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Create Next Period')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Create Next Period'));

            expect(mockOnCreateNext).toHaveBeenCalledTimes(1);
            expect(mockOnCreateNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    suggestedDebitBalance: 80000,
                    suggestedCreditAvailable: 130000,
                    creditLimit: 150000,
                })
            );
        });

        it('calls onDismiss when Remind Me Later clicked', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockActionPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Remind Me Later')).toBeInTheDocument();
            });

            await clickWithAct(screen.getByText('Remind Me Later'));

            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });

        it('calls onDismiss when X button clicked', async () => {
            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockActionPeriodData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Create Next Period')).toBeInTheDocument();
            });

            const closeButton = screen.getByLabelText('Close');
            await clickWithAct(closeButton);

            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });
    });

    describe('Balance Display', () => {
        it('formats balances from cents to euros', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);

            const mockData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
                display_debit_balance: 123456,
                display_credit_available: 98765,
                credit_limit: 200000,
            });

            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/€1,234\.56/)).toBeInTheDocument();
                expect(screen.getByText(/€987\.65/)).toBeInTheDocument();
                expect(screen.getByText(/€2,000\.00/)).toBeInTheDocument();
            });
        });

        it('shows balance labels', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);

            const mockData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
                display_debit_balance: 50000,
                display_credit_available: 100000,
                credit_budget_allowance: 0,
            });

            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockData}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/debit:/i)).toBeInTheDocument();
                expect(screen.getByText(/credit available:/i)).toBeInTheDocument();
            });
        });
    });

    describe('Icon Display', () => {
        it('shows warning icon', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);

            const mockData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
            });

            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockData}
                />
            );

            await waitFor(() => {
                const svg = document.querySelector('svg.w-6.h-6');
                expect(svg).toBeInTheDocument();
            });
        });
    });

    describe('Margin and Layout', () => {
        it('has bottom margin for spacing', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);

            const mockData = createMockPeriodData({
                end_date: futureDate.toISOString().split('T')[0],
            });

            renderWithSalaryPeriod(
                <SalaryPeriodRolloverPrompt
                    onCreateNext={mockOnCreateNext}
                    onDismiss={mockOnDismiss}
                    salaryPeriodData={mockData}
                />
            );

            await waitFor(() => {
                const banner = screen.getByText('Week 4 Ending Soon').closest('.rounded-xl');
                expect(banner).toHaveClass('mb-6');
            });
        });
    });
});
