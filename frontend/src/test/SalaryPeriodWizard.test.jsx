/**
 * Bloom - SalaryPeriodWizard Component Tests
 *
 * Tests for the multi-step budget setup wizard including:
 * - Form rendering and navigation
 * - Currency parsing and formatting
 * - Balance validation
 * - Fixed bills management
 * - Edit vs create mode
 * - Rollover data pre-fill
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SalaryPeriodWizard from '../components/SalaryPeriodWizard';
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import api from '../api';
import { clickWithAct, changeWithAct } from './test-utils';

// Wrapper component with required providers
const TestWrapper = ({ children }) => (
    <FeatureFlagProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
    </FeatureFlagProvider>
);

// Helper to render component with providers
const renderWithProviders = (component) => {
    return render(<TestWrapper>{component}</TestWrapper>);
};

// Helper to find input by its label text
const getInputByLabel = (labelText) => {
    const label = screen.getByText(labelText);
    const container = label.closest('div');
    return container.querySelector('input, select');
};

describe('SalaryPeriodWizard', () => {
    const mockOnClose = vi.fn();
    const mockOnComplete = vi.fn();

    // Default preview response from API
    const mockPreviewResponse = {
        debit_balance: 150000, // €1500.00
        credit_balance: 100000,
        credit_limit: 150000,
        credit_allowance: 0,
        fixed_bills: [],
        fixed_bills_total: 0,
        total_budget: 150000,
        weekly_budget: 37500, // €375.00
        weekly_debit_budget: 37500,
        weekly_credit_budget: 0,
        start_date: '2025-12-24',
        end_date: '2026-01-20',
        weeks: [
            {
                week_number: 1,
                start_date: '2025-12-24',
                end_date: '2025-12-30',
                budget_amount: 37500,
            },
            {
                week_number: 2,
                start_date: '2025-12-31',
                end_date: '2026-01-06',
                budget_amount: 37500,
            },
            {
                week_number: 3,
                start_date: '2026-01-07',
                end_date: '2026-01-13',
                budget_amount: 37500,
            },
            {
                week_number: 4,
                start_date: '2026-01-14',
                end_date: '2026-01-20',
                budget_amount: 37500,
            },
        ],
    };

    beforeEach(() => {
        mockOnClose.mockClear();
        mockOnComplete.mockClear();
        vi.clearAllMocks();
    });

    describe('Step 1 - Basic Rendering', () => {
        it('renders modal with setup title when creating new', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(screen.getByText(/setup weekly budget/i)).toBeInTheDocument();
            });
        });

        it('renders modal with edit title when editing', async () => {
            const editPeriod = {
                id: 1,
                initial_debit_balance: 150000,
                initial_credit_balance: 100000,
                credit_limit: 150000,
                credit_budget_allowance: 0,
                start_date: '2025-12-24',
            };

            renderWithProviders(
                <SalaryPeriodWizard
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                    editPeriod={editPeriod}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/edit weekly budget/i)).toBeInTheDocument();
            });
        });

        it('displays all step 1 form fields', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            expect(screen.getByText('Credit Card Available (Remaining Limit)')).toBeInTheDocument();
            expect(screen.getByText('Credit Card Limit (Total)')).toBeInTheDocument();
            expect(screen.getByText('Budget Period Start Date')).toBeInTheDocument();
        });

        it('loads credit limit from API', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(screen.getByText('Credit Card Limit (Total)')).toBeInTheDocument();
            });

            const creditLimitInput = getInputByLabel('Credit Card Limit (Total)');
            // Credit limit is loaded from global balances API (150000 cents = €1500.00)
            expect(creditLimitInput).toHaveValue('1500.00');
        });

        it('displays step progress indicators', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Step progress bar should be present
            await waitFor(() => {
                expect(screen.getByText(/enter your current balances/i)).toBeInTheDocument();
            });
        });
    });

    describe('Step 1 - Form Interactions', () => {
        it('updates debit balance on input', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');

            expect(debitInput).toHaveValue('1500.00');
        });

        it('updates credit available on input', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Credit Card Available (Remaining Limit)')
                ).toBeInTheDocument();
            });

            const creditInput = getInputByLabel('Credit Card Available (Remaining Limit)');
            await changeWithAct(creditInput, '1000.00');

            expect(creditInput).toHaveValue('1000.00');
        });

        it('shows credit allowance slider when credit is available', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Credit Card Available (Remaining Limit)')
                ).toBeInTheDocument();
            });

            const creditInput = getInputByLabel('Credit Card Available (Remaining Limit)');
            await changeWithAct(creditInput, '1000.00');

            await waitFor(() => {
                expect(screen.getByText('Credit Allowance (Optional)')).toBeInTheDocument();
            });
        });

        it('shows warning when credit card is maxed out', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Credit available defaults to empty (0)
            await waitFor(() => {
                expect(screen.getByText(/no credit available/i)).toBeInTheDocument();
            });
        });

        it('calculates and displays debt owed', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(screen.getByText('Credit Card Limit (Total)')).toBeInTheDocument();
            });

            // Set credit available less than limit to show debt
            const creditInput = getInputByLabel('Credit Card Available (Remaining Limit)');
            await changeWithAct(creditInput, '1000.00');

            // Limit is €1500, available is €1000, so debt is €500
            await waitFor(() => {
                expect(screen.getByText(/you currently owe €500.00/i)).toBeInTheDocument();
            });
        });
    });

    describe('Step 1 - Validation', () => {
        it('shows error when debit balance is empty', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(screen.getByText(/next: review fixed bills/i)).toBeInTheDocument();
            });

            // Try to proceed without entering debit balance
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(
                    screen.getByText(/please enter your current debit balance/i)
                ).toBeInTheDocument();
            });
        });

        it('shows error when debit balance is zero', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '0');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(
                    screen.getByText(/please enter your current debit balance/i)
                ).toBeInTheDocument();
            });
        });
    });

    describe('Step 1 - Edit Mode Pre-fill', () => {
        it('pre-fills form with edit period data', async () => {
            const editPeriod = {
                id: 1,
                initial_debit_balance: 150000, // €1500.00
                initial_credit_balance: 100000, // €1000.00
                credit_limit: 200000, // €2000.00
                credit_budget_allowance: 50000,
                start_date: '2025-12-01',
            };

            renderWithProviders(
                <SalaryPeriodWizard
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                    editPeriod={editPeriod}
                />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            expect(debitInput).toHaveValue('1500.00');

            const creditInput = getInputByLabel('Credit Card Available (Remaining Limit)');
            expect(creditInput).toHaveValue('1000.00');

            const limitInput = getInputByLabel('Credit Card Limit (Total)');
            expect(limitInput).toHaveValue('2000.00');

            const dateInput = getInputByLabel('Budget Period Start Date');
            expect(dateInput).toHaveValue('2025-12-01');
        });
    });

    describe('Step 1 - Rollover Mode Pre-fill', () => {
        it('pre-fills form with rollover data', async () => {
            const rolloverData = {
                suggestedDebitBalance: 125000, // €1250.00
                suggestedCreditAvailable: 80000, // €800.00
                creditLimit: 150000, // €1500.00
                creditAllowance: 0,
                endDate: '2025-12-23', // Next day would be 2025-12-24
            };

            renderWithProviders(
                <SalaryPeriodWizard
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                    rolloverData={rolloverData}
                />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            expect(debitInput).toHaveValue('1250.00');

            const creditInput = getInputByLabel('Credit Card Available (Remaining Limit)');
            expect(creditInput).toHaveValue('800.00');

            // Start date should be day after endDate
            const dateInput = getInputByLabel('Budget Period Start Date');
            expect(dateInput).toHaveValue('2025-12-24');
        });
    });

    describe('Step 2 - Fixed Bills', () => {
        beforeEach(() => {
            api.post.mockResolvedValue({
                data: {
                    ...mockPreviewResponse,
                    fixed_bills: [
                        { name: 'Rent', category: 'Fixed Expenses', amount: 100000 },
                        { name: 'Netflix', category: 'Fixed Expenses', amount: 1599 },
                    ],
                },
            });
        });

        it('navigates to step 2 after valid step 1', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
        });

        it('displays detected fixed bills', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText('Rent')).toBeInTheDocument();
            });
            expect(screen.getByText('Netflix')).toBeInTheDocument();
        });

        it('shows empty state when no fixed bills', async () => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/no fixed bills set up yet/i)).toBeInTheDocument();
            });
        });

        it('shows quick add presets when no fixed bills', async () => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/no fixed bills set up yet/i)).toBeInTheDocument();
            });

            // Check for preset buttons
            expect(screen.getByRole('button', { name: /\+ rent/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /\+ electricity/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /\+ netflix/i })).toBeInTheDocument();
        });

        it('opens quick add form when clicking preset', async () => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/no fixed bills set up yet/i)).toBeInTheDocument();
            });

            // Click a preset
            await clickWithAct(screen.getByRole('button', { name: /\+ rent/i }));

            // Quick add form should appear with pre-filled name
            await waitFor(() => {
                const nameInput = screen.getByPlaceholderText(/e\.g\., rent/i);
                expect(nameInput).toHaveValue('Rent');
            });
        });

        it('shows add another button when fixed bills exist', async () => {
            const responseWithBills = {
                ...mockPreviewResponse,
                fixed_bills: [{ name: 'Rent', amount: 100000, category: 'Fixed Expenses' }],
            };
            api.post.mockResolvedValue({ data: responseWithBills });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText('Rent')).toBeInTheDocument();
            });

            // Should show "Add another" button
            expect(
                screen.getByRole('button', { name: /add another fixed bill/i })
            ).toBeInTheDocument();
        });

        it('shows remaining presets in add another form', async () => {
            const responseWithBills = {
                ...mockPreviewResponse,
                fixed_bills: [{ name: 'Rent', amount: 100000, category: 'Fixed Expenses' }],
            };
            api.post.mockResolvedValue({ data: responseWithBills });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText('Rent')).toBeInTheDocument();
            });

            // Click "Add another" button
            await clickWithAct(screen.getByRole('button', { name: /add another fixed bill/i }));

            // Should show remaining presets (not Rent since it exists)
            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /\+ rent/i })).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: /\+ electricity/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /\+ netflix/i })).toBeInTheDocument();
            });
        });

        it('allows navigating back to step 1', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: /back/i }));

            await waitFor(() => {
                expect(screen.getByText(/enter your current balances/i)).toBeInTheDocument();
            });
        });
    });

    describe('Step 3 - Confirmation', () => {
        beforeEach(() => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });
        });

        it('navigates to step 3 and shows budget summary', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            // Step 1
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            // Step 2
            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            // Step 3
            await waitFor(() => {
                expect(screen.getByText(/confirm your weekly budget/i)).toBeInTheDocument();
            });
        });

        it('displays weekly budget breakdown', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            // Check budget display (€375.00 weekly = 37500 cents)
            // Use getAllByText since the amount appears multiple times
            await waitFor(() => {
                const budgetText = screen.getAllByText(/375\.00/);
                expect(budgetText.length).toBeGreaterThan(0);
            });
        });

        it('displays 4-week schedule', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(screen.getByText(/4-week schedule/i)).toBeInTheDocument();
            });
        });

        it('shows create button text for new period', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /create budget plan/i })
                ).toBeInTheDocument();
            });
        });

        it('shows update button text for edit mode', async () => {
            const editPeriod = {
                id: 1,
                initial_debit_balance: 150000,
                initial_credit_balance: 0,
                credit_limit: 150000,
                credit_budget_allowance: 0,
                start_date: '2025-12-24',
            };

            renderWithProviders(
                <SalaryPeriodWizard
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                    editPeriod={editPeriod}
                />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /update budget plan/i })
                ).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        beforeEach(() => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });
        });

        it('calls API to create new salary period', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /create budget plan/i })
                ).toBeInTheDocument();
            });

            // Submit
            await clickWithAct(screen.getByRole('button', { name: /create budget plan/i }));

            await waitFor(() => {
                // Should call /salary-periods POST
                expect(api.post).toHaveBeenCalledWith(
                    '/salary-periods',
                    expect.objectContaining({
                        debit_balance: 150000, // €1500.00 in cents
                    })
                );
            });
        });

        it('calls onComplete after successful creation', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /create budget plan/i })
                ).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: /create budget plan/i }));

            await waitFor(() => {
                expect(mockOnComplete).toHaveBeenCalled();
            });
        });

        it('calls API to update existing salary period in edit mode', async () => {
            api.put.mockResolvedValue({ data: {} });

            const editPeriod = {
                id: 42,
                initial_debit_balance: 150000,
                initial_credit_balance: 0,
                credit_limit: 150000,
                credit_budget_allowance: 0,
                start_date: '2025-12-24',
            };

            renderWithProviders(
                <SalaryPeriodWizard
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                    editPeriod={editPeriod}
                />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /update budget plan/i })
                ).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: /update budget plan/i }));

            await waitFor(() => {
                expect(api.put).toHaveBeenCalledWith('/salary-periods/42', expect.any(Object));
            });
        });

        it('shows error message on API failure', async () => {
            api.post
                .mockResolvedValueOnce({ data: mockPreviewResponse }) // preview call 1
                .mockResolvedValueOnce({ data: mockPreviewResponse }) // preview call 2
                .mockRejectedValueOnce({
                    response: { data: { error: 'Period overlaps existing' } },
                });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            // Navigate to step 3
            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.00');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                expect(screen.getByText(/review fixed bills/i)).toBeInTheDocument();
            });
            await clickWithAct(screen.getByText(/next: confirm budget/i));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /create budget plan/i })
                ).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: /create budget plan/i }));

            await waitFor(() => {
                expect(screen.getByText(/period overlaps existing/i)).toBeInTheDocument();
            });
        });
    });

    describe('Modal Actions', () => {
        it('calls onClose when X button clicked', async () => {
            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(screen.getByText(/setup weekly budget/i)).toBeInTheDocument();
            });

            // Find the X button
            await clickWithAct(screen.getByText('×'));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Currency Parsing', () => {
        it('handles various currency input formats', async () => {
            api.post.mockResolvedValue({ data: mockPreviewResponse });

            renderWithProviders(
                <SalaryPeriodWizard onClose={mockOnClose} onComplete={mockOnComplete} />
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Debit Balance (Current Bank Account)')
                ).toBeInTheDocument();
            });

            // Test decimal input
            const debitInput = getInputByLabel('Debit Balance (Current Bank Account)');
            await changeWithAct(debitInput, '1500.50');
            await clickWithAct(screen.getByText(/next: review fixed bills/i));

            await waitFor(() => {
                // Should parse as 150050 cents
                expect(api.post).toHaveBeenCalledWith(
                    '/salary-periods/preview',
                    expect.objectContaining({
                        debit_balance: 150050,
                    })
                );
            });
        });
    });
});
