import React from 'react';
/**
 * Bloom - DateNavigator Component Tests
 *
 * Tests for the day-by-day transaction navigation component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { clickWithAct } from './test-utils';
import DateNavigator from '../components/DateNavigator';

describe('DateNavigator', () => {
    const mockOnDateChange = vi.fn();

    // Mock today's date for consistent testing
    const mockToday = '2024-12-24';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-12-24T12:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
        mockOnDateChange.mockClear();
    });

    describe('Rendering', () => {
        it('renders navigation buttons', () => {
            render(
                <DateNavigator
                    transactionDates={[]}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        });

        it('shows date display when currentViewDate is set', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-22']}
                    currentViewDate="2024-12-22"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByText(/showing:/i)).toBeInTheDocument();
            expect(screen.getByText(/22/)).toBeInTheDocument();
        });

        it('does not show date display when currentViewDate is null', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20']}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.queryByText(/showing:/i)).not.toBeInTheDocument();
        });

        it('applies custom className', () => {
            const { container } = render(
                <DateNavigator
                    transactionDates={[]}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                    className="custom-class"
                />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('Button States', () => {
        it('disables Previous button when no previous dates exist', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-24', '2024-12-25']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
        });

        it('enables Previous button when previous dates exist', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
        });

        it('disables Next button when no next dates exist', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        it('enables Next button when next dates exist', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-24', '2024-12-26']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
        });

        it('highlights Today button when viewing today', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            const todayButton = screen.getByRole('button', { name: /today/i });
            expect(todayButton).toHaveClass('bg-bloom-pink');
            expect(todayButton).toHaveClass('text-white');
        });

        it('does not highlight Today button when viewing other date', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-24']}
                    currentViewDate="2024-12-20"
                    onDateChange={mockOnDateChange}
                />
            );

            const todayButton = screen.getByRole('button', { name: /today/i });
            expect(todayButton).not.toHaveClass('text-white');
        });

        it('shows clear button when date is selected', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20']}
                    currentViewDate="2024-12-20"
                    onDateChange={mockOnDateChange}
                />
            );

            // Clear button has title "Clear date filter"
            expect(screen.getByTitle(/clear date filter/i)).toBeInTheDocument();
        });

        it('hides clear button when no date selected', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20']}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.queryByTitle(/clear date filter/i)).not.toBeInTheDocument();
        });
    });

    describe('Navigation Logic', () => {
        it('navigates to previous date on Previous click', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-22', '2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            await clickWithAct(screen.getByRole('button', { name: /previous/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-22');
        });

        it('navigates to next date on Next click', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-22', '2024-12-24', '2024-12-26']}
                    currentViewDate="2024-12-22"
                    onDateChange={mockOnDateChange}
                />
            );

            await clickWithAct(screen.getByRole('button', { name: /next/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-24');
        });

        it('navigates to today on Today click', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-24']}
                    currentViewDate="2024-12-20"
                    onDateChange={mockOnDateChange}
                />
            );

            await clickWithAct(screen.getByRole('button', { name: /today/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith(mockToday);
        });

        it('clears date filter on clear button click', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20']}
                    currentViewDate="2024-12-20"
                    onDateChange={mockOnDateChange}
                />
            );

            await clickWithAct(screen.getByTitle(/clear date filter/i));
            expect(mockOnDateChange).toHaveBeenCalledWith(null);
        });

        it('skips dates without transactions when navigating', async () => {
            // Dec 20, 22 have transactions, Dec 21, 23 do not
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-22', '2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            // First Previous click should go to Dec 22 (skipping Dec 23)
            await clickWithAct(screen.getByRole('button', { name: /previous/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-22');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty transaction dates array', () => {
            render(
                <DateNavigator
                    transactionDates={[]}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        it('handles viewing date not in transaction list', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-26']}
                    currentViewDate="2024-12-23"
                    onDateChange={mockOnDateChange}
                />
            );

            // Should find closest previous date
            await clickWithAct(screen.getByRole('button', { name: /previous/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-20');
        });

        it('handles viewing date between transaction dates', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-26']}
                    currentViewDate="2024-12-23"
                    onDateChange={mockOnDateChange}
                />
            );

            // Should find closest next date
            await clickWithAct(screen.getByRole('button', { name: /next/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-26');
        });

        it('does not call onDateChange when Previous is disabled', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            const prevButton = screen.getByRole('button', { name: /previous/i });
            expect(prevButton).toBeDisabled();

            // Click should do nothing
            await clickWithAct(prevButton);
            expect(mockOnDateChange).not.toHaveBeenCalled();
        });

        it('handles single date in transaction list', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-24']}
                    currentViewDate="2024-12-24"
                    onDateChange={mockOnDateChange}
                />
            );

            expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        it('works with null currentViewDate (default to today)', async () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20', '2024-12-22']}
                    currentViewDate={null}
                    onDateChange={mockOnDateChange}
                />
            );

            // Previous should find dates before today
            await clickWithAct(screen.getByRole('button', { name: /previous/i }));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-12-22');
        });
    });

    describe('Date Formatting', () => {
        it('formats date in European format', () => {
            render(
                <DateNavigator
                    transactionDates={['2024-12-20']}
                    currentViewDate="2024-12-20"
                    onDateChange={mockOnDateChange}
                />
            );

            // Should show day, month, year
            const showingText = screen.getByText(/showing:/i).parentElement;
            expect(showingText).toHaveTextContent('20');
            expect(showingText).toHaveTextContent('Dec');
            expect(showingText).toHaveTextContent('2024');
        });
    });
});
