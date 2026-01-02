/**
 * Bloom - CurrencySelector Component Tests
 *
 * Tests for the currency dropdown selector component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CurrencySelector from '../components/CurrencySelector';

// Mock the API
vi.mock('../api', () => ({
    currencyAPI: {
        getSupportedCurrencies: vi.fn(),
    },
}));

// Mock logger to prevent console output
vi.mock('../utils/logger', () => ({
    logWarn: vi.fn(),
}));

// Import after mocking
import { currencyAPI } from '../api';

describe('CurrencySelector', () => {
    const mockCurrencies = [
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        currencyAPI.getSupportedCurrencies.mockResolvedValue({
            data: { currencies: mockCurrencies },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // LOADING STATE
    // =========================================================================

    describe('Loading State', () => {
        it('shows loading placeholder initially', () => {
            // Don't resolve immediately to see loading state
            currencyAPI.getSupportedCurrencies.mockReturnValue(new Promise(() => {}));

            render(<CurrencySelector />);

            const loadingElement = document.querySelector('.animate-pulse');
            expect(loadingElement).toBeTruthy();
        });

        it('removes loading placeholder after currencies load', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                const loadingElement = document.querySelector('.animate-pulse');
                expect(loadingElement).toBeFalsy();
            });
        });
    });

    // =========================================================================
    // SUCCESSFUL LOAD
    // =========================================================================

    describe('Successful Currency Load', () => {
        it('renders currency options after loading', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();
            expect(select.options.length).toBe(3);
        });

        it('displays currency code and name in options', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                expect(screen.getByText('EUR - Euro')).toBeInTheDocument();
            });

            expect(screen.getByText('USD - US Dollar')).toBeInTheDocument();
            expect(screen.getByText('GBP - British Pound')).toBeInTheDocument();
        });

        it('sets default value to EUR', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.value).toBe('EUR');
            });
        });

        it('sets custom value when provided', async () => {
            render(<CurrencySelector value="USD" />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.value).toBe('USD');
            });
        });
    });

    // =========================================================================
    // API FAILURE FALLBACK
    // =========================================================================

    describe('API Failure Fallback', () => {
        it('falls back to local currency info on API error', async () => {
            currencyAPI.getSupportedCurrencies.mockRejectedValue(new Error('Network error'));

            render(<CurrencySelector />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.options.length).toBeGreaterThan(0);
            });

            // Should have loaded from CURRENCY_INFO fallback
            // The local info has many currencies
            const select = screen.getByRole('combobox');
            expect(select.options.length).toBeGreaterThan(5);
        });

        it('logs warning on API failure', async () => {
            const { logWarn } = await import('../utils/logger');
            currencyAPI.getSupportedCurrencies.mockRejectedValue(new Error('Network error'));

            render(<CurrencySelector />);

            await waitFor(() => {
                expect(logWarn).toHaveBeenCalledWith(
                    'Failed to load currencies from API, using fallback',
                    expect.any(Error)
                );
            });
        });
    });

    // =========================================================================
    // CHANGE HANDLING
    // =========================================================================

    describe('Change Handling', () => {
        it('calls onChange when selection changes', async () => {
            const handleChange = vi.fn();
            render(<CurrencySelector onChange={handleChange} />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'USD' } });

            expect(handleChange).toHaveBeenCalledWith('USD');
        });

        it('does not crash if onChange is not provided', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            const select = screen.getByRole('combobox');

            // Should not throw
            expect(() => {
                fireEvent.change(select, { target: { value: 'USD' } });
            }).not.toThrow();
        });
    });

    // =========================================================================
    // DISABLED STATE
    // =========================================================================

    describe('Disabled State', () => {
        it('disables select when disabled prop is true', async () => {
            render(<CurrencySelector disabled={true} />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select).toBeDisabled();
            });
        });

        it('enables select by default', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select).not.toBeDisabled();
            });
        });
    });

    // =========================================================================
    // COMPACT MODE
    // =========================================================================

    describe('Compact Mode', () => {
        it('renders only currency code in compact mode', async () => {
            render(<CurrencySelector compact={true} />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            // In compact mode, options should show only code, not full name
            const options = screen.getAllByRole('option');
            const firstOption = options[0];

            // Compact mode shows just the code
            expect(firstOption.textContent).toBe('EUR');
        });

        it('hides label in compact mode', async () => {
            render(<CurrencySelector compact={true} label="Currency" />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            // Label should not be rendered in compact mode
            expect(screen.queryByText('Currency')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // FULL MODE WITH LABEL
    // =========================================================================

    describe('Full Mode with Label', () => {
        it('shows label by default', async () => {
            render(<CurrencySelector />);

            await waitFor(() => {
                expect(screen.getByText('Currency')).toBeInTheDocument();
            });
        });

        it('uses custom label when provided', async () => {
            render(<CurrencySelector label="Select Payment Currency" />);

            await waitFor(() => {
                expect(screen.getByText('Select Payment Currency')).toBeInTheDocument();
            });
        });

        it('hides label when showLabel is false', async () => {
            render(<CurrencySelector showLabel={false} />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            expect(screen.queryByText('Currency')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // STYLING
    // =========================================================================

    describe('Styling', () => {
        it('applies custom className', async () => {
            render(<CurrencySelector className="my-custom-class" />);

            await waitFor(() => {
                const container = document.querySelector('.my-custom-class');
                expect(container).toBeTruthy();
            });
        });

        it('applies disabled styles when disabled', async () => {
            render(<CurrencySelector disabled={true} />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.className).toContain('disabled');
            });
        });
    });

    // =========================================================================
    // EMPTY CURRENCIES RESPONSE
    // =========================================================================

    describe('Empty Response Handling', () => {
        it('handles empty currencies array', async () => {
            currencyAPI.getSupportedCurrencies.mockResolvedValue({
                data: { currencies: [] },
            });

            render(<CurrencySelector />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.options.length).toBe(0);
            });
        });

        it('handles missing currencies in response', async () => {
            currencyAPI.getSupportedCurrencies.mockResolvedValue({
                data: {},
            });

            render(<CurrencySelector />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.options.length).toBe(0);
            });
        });
    });
});
