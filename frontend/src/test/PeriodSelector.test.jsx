import React from 'react';
/**
 * PeriodSelector Test Suite
 *
 * Tests the period selector dropdown component with calendar-like grid.
 * Verifies period selection, view toggling, edit/delete actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup, fireEvent } from '@testing-library/react';
import { clickWithAct } from './test-utils';
import PeriodSelector from '../components/PeriodSelector';

describe('PeriodSelector', () => {
    let mockOnPeriodChange;
    let mockOnCreateNew;
    let mockOnEdit;
    let mockOnDelete;

    const mockCurrentPeriod = {
        id: 1,
        start_date: '2025-12-01',
        end_date: '2025-12-28',
        weekly_budget: 50000,
        is_active: true,
    };

    const mockPeriods = [
        {
            id: 1,
            start_date: '2025-12-01',
            end_date: '2025-12-28',
            weekly_budget: 50000,
            is_active: true,
        },
        {
            id: 2,
            start_date: '2025-11-03',
            end_date: '2025-11-30',
            weekly_budget: 48000,
            is_active: false,
        },
        {
            id: 3,
            start_date: '2025-12-29',
            end_date: '2026-01-25',
            weekly_budget: 52000,
            is_active: false,
        },
    ];

    beforeEach(() => {
        mockOnPeriodChange = vi.fn();
        mockOnCreateNew = vi.fn();
        mockOnEdit = vi.fn();
        mockOnDelete = vi.fn();
        vi.clearAllMocks();
        // Set system time to be within the current period (Dec 15, 2025)
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-12-15T12:00:00Z'));
    });

    afterEach(async () => {
        vi.useRealTimers();
        // Flush any pending state updates to avoid act() warnings
        await act(async () => {});
        cleanup();
    });

    describe('No Current Period', () => {
        it('shows create button when no current period', () => {
            render(
                <PeriodSelector
                    currentPeriod={null}
                    periods={[]}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('+ Create Salary Period')).toBeInTheDocument();
        });

        it('calls onCreateNew when create button clicked (no period)', async () => {
            render(
                <PeriodSelector
                    currentPeriod={null}
                    periods={[]}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await clickWithAct(screen.getByText('+ Create Salary Period'));
            expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
        });
    });

    describe('With Current Period', () => {
        it('renders period selector button', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('4-Week Salary Period')).toBeInTheDocument();
        });

        it('displays period date range', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText(/1 Dec, 2025/)).toBeInTheDocument();
            expect(screen.getByText(/28 Dec, 2025/)).toBeInTheDocument();
        });

        it('shows Current badge for active period', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Current')).toBeInTheDocument();
        });

        it('shows chevron icon in selector button', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Calendar Dropdown', () => {
        it('opens calendar dropdown when button clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();
        });

        it('shows period description in dropdown header', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText(/each period has 4 weekly budgets/i)).toBeInTheDocument();
        });

        it('shows view mode toggle button', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText(/list/i)).toBeInTheDocument();
        });

        it('shows create new salary period button in dropdown', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('+ Create New Salary Period')).toBeInTheDocument();
        });

        it('closes calendar when clicking outside', async () => {
            render(
                <div>
                    <div data-testid="outside">Outside area</div>
                    <PeriodSelector
                        currentPeriod={mockCurrentPeriod}
                        periods={mockPeriods}
                        onPeriodChange={mockOnPeriodChange}
                        onCreateNew={mockOnCreateNew}
                        onEdit={mockOnEdit}
                        onDelete={mockOnDelete}
                    />
                </div>
            );

            // Open calendar
            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });
            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            // Click outside
            await act(async () => {
                fireEvent.mouseDown(screen.getByTestId('outside'));
            });

            expect(screen.queryByText('Salary Periods')).not.toBeInTheDocument();
        });
    });

    describe('View Mode Toggle', () => {
        it('starts in grid view by default', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            // Grid view shows "List" toggle option
            expect(screen.getByText(/list/i)).toBeInTheDocument();
        });

        it('toggles to list view when clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText(/list/i)).toBeInTheDocument();

            // Toggle to list view
            const toggleButton = screen.getByText(/list/i);
            await act(async () => {
                fireEvent.click(toggleButton);
            });

            // List view shows "Grid" toggle option
            expect(screen.getByText(/grid/i)).toBeInTheDocument();
        });
    });

    describe('Period Selection', () => {
        it('calls onPeriodChange when period is selected', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            // Find and click a different period
            const periodButtons = screen.getAllByRole('button');
            const pastPeriod = periodButtons.find((btn) => btn.textContent?.includes('Nov'));
            if (pastPeriod) {
                await act(async () => {
                    fireEvent.click(pastPeriod);
                });
                expect(mockOnPeriodChange).toHaveBeenCalled();
            }
        });
    });

    describe('Create New Period', () => {
        it('calls onCreateNew when create button is clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('+ Create New Salary Period')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByText('+ Create New Salary Period'));
            });
            expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
        });
    });

    describe('Period Type Labels', () => {
        it('shows 4-Week Salary Period label for salary periods', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('4-Week Salary Period')).toBeInTheDocument();
        });

        it('shows Week label for budget periods with week_number', () => {
            const weekPeriod = {
                id: 10,
                start_date: '2025-12-01',
                end_date: '2025-12-07',
                week_number: 1,
                salary_period_id: 1,
            };

            render(
                <PeriodSelector
                    currentPeriod={weekPeriod}
                    periods={[weekPeriod]}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Week 1')).toBeInTheDocument();
        });
    });

    describe('Period Status Badges', () => {
        it('shows Past badge for past periods', () => {
            const pastPeriod = {
                id: 2,
                start_date: '2024-01-01',
                end_date: '2024-01-28',
                weekly_budget: 50000,
            };

            render(
                <PeriodSelector
                    currentPeriod={pastPeriod}
                    periods={[pastPeriod]}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Past')).toBeInTheDocument();
        });

        it('shows Future badge for future periods', () => {
            const futurePeriod = {
                id: 3,
                start_date: '2026-01-01',
                end_date: '2026-01-28',
                weekly_budget: 50000,
            };

            render(
                <PeriodSelector
                    currentPeriod={futurePeriod}
                    periods={[futurePeriod]}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Future')).toBeInTheDocument();
        });
    });

    describe('Date Formatting', () => {
        it('formats dates correctly', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            // Check for formatted date like "1 Dec, 2025 - 28 Dec, 2025"
            const text = screen.getByText(/1 Dec, 2025/);
            expect(text).toBeInTheDocument();
        });
    });

    describe('Styling', () => {
        it('has hover styling on selector button', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:border-bloom-pink');
        });

        it('has shadow styling on selector', () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('shadow');
        });
    });

    describe('Delete Confirmation', () => {
        it('shows delete confirmation modal when delete is clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            // Open dropdown
            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            // Find and click a delete button (they appear on hover but are in DOM)
            const deleteButtons = screen.getAllByTitle(/delete/i);
            if (deleteButtons.length > 0) {
                await act(async () => {
                    fireEvent.click(deleteButtons[0]);
                });

                expect(screen.getByText('Delete Budget Period?')).toBeInTheDocument();
            }
        });

        it('shows warning about transaction deletion', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            const deleteButtons = screen.getAllByTitle(/delete/i);
            if (deleteButtons.length > 0) {
                await act(async () => {
                    fireEvent.click(deleteButtons[0]);
                });

                expect(
                    screen.getByText(/transactions in this period will be deleted/i)
                ).toBeInTheDocument();
            }
        });

        it('calls onDelete when confirmed', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            const deleteButtons = screen.getAllByTitle(/delete/i);
            if (deleteButtons.length > 0) {
                await act(async () => {
                    fireEvent.click(deleteButtons[0]);
                });

                expect(screen.getByText('Delete Budget Period?')).toBeInTheDocument();

                // Click the Delete button in modal
                const confirmDelete = screen
                    .getAllByRole('button')
                    .find((b) => b.textContent === 'Delete');
                if (confirmDelete) {
                    await act(async () => {
                        fireEvent.click(confirmDelete);
                    });
                    expect(mockOnDelete).toHaveBeenCalled();
                }
            }
        });

        it('closes modal when cancel is clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            const deleteButtons = screen.getAllByTitle(/delete/i);
            if (deleteButtons.length > 0) {
                await act(async () => {
                    fireEvent.click(deleteButtons[0]);
                });

                expect(screen.getByText('Delete Budget Period?')).toBeInTheDocument();

                // Click Cancel
                await act(async () => {
                    fireEvent.click(screen.getByText('Cancel'));
                });

                expect(screen.queryByText('Delete Budget Period?')).not.toBeInTheDocument();
            }
        });
    });

    describe('Edit Functionality', () => {
        it('calls onEdit when edit button is clicked', async () => {
            render(
                <PeriodSelector
                    currentPeriod={mockCurrentPeriod}
                    periods={mockPeriods}
                    onPeriodChange={mockOnPeriodChange}
                    onCreateNew={mockOnCreateNew}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button'));
            });

            expect(screen.getByText('Salary Periods')).toBeInTheDocument();

            const editButtons = screen.getAllByTitle(/edit/i);
            if (editButtons.length > 0) {
                await act(async () => {
                    fireEvent.click(editButtons[0]);
                });
                expect(mockOnEdit).toHaveBeenCalled();
            }
        });
    });
});
