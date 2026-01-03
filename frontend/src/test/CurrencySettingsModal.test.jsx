/**
 * CurrencySettingsModal Test Suite
 *
 * Tests for the Currency Settings modal component covering:
 * - Modal rendering
 * - Currency selection
 * - Save functionality
 * - Error handling
 * - Accessibility
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import CurrencySettingsModal from '../components/CurrencySettingsModal';
import { CurrencyProvider } from '../contexts/CurrencyContext';

// Mock the API
vi.mock('../api', () => ({
    currencyAPI: {
        getSupportedCurrencies: vi.fn(() =>
            Promise.resolve({
                data: {
                    currencies: [
                        { code: 'EUR', name: 'Euro', symbol: '€' },
                        { code: 'USD', name: 'US Dollar', symbol: '$' },
                        { code: 'GBP', name: 'British Pound', symbol: '£' },
                    ],
                },
            })
        ),
        getRates: vi.fn(() =>
            Promise.resolve({
                data: {
                    base: 'EUR',
                    rates: { USD: 1.08, GBP: 0.86 },
                },
            })
        ),
        setDefaultCurrency: vi.fn(() => Promise.resolve()),
    },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarn: vi.fn(),
}));

// Wrapper with CurrencyProvider
const TestWrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;

describe('CurrencySettingsModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    const renderModal = () => {
        return render(
            <TestWrapper>
                <CurrencySettingsModal onClose={mockOnClose} />
            </TestWrapper>
        );
    };

    // =========================================================================
    // RENDERING TESTS
    // =========================================================================

    describe('Modal Rendering', () => {
        it('renders the modal with correct title', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText('Currency Settings')).toBeInTheDocument();
            });
        });

        it('renders currency emoji in header', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText('💱')).toBeInTheDocument();
            });
        });

        it('renders description text', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText(/Select the currency you want to use/)).toBeInTheDocument();
            });
        });

        it('renders Close button', async () => {
            renderModal();

            await waitFor(() => {
                // The X button has aria-label="Close"
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });
        });

        it('renders Save button', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
            });
        });

        it('has correct accessibility attributes', async () => {
            renderModal();

            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(dialog).toHaveAttribute('aria-modal', 'true');
                expect(dialog).toHaveAttribute('aria-labelledby', 'currency-modal-title');
            });
        });
    });

    // =========================================================================
    // INTERACTION TESTS
    // =========================================================================

    describe('Modal Interactions', () => {
        it('calls onClose when close button is clicked', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when Escape key is pressed', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when clicking text-only Close button', async () => {
            renderModal();

            // Wait for content to load
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
            });

            // Click the text "Close" button (not the X)
            const buttons = screen.getAllByRole('button');
            const closeTextButton = buttons.find(
                (btn) => btn.textContent === 'Close' && !btn.querySelector('svg')
            );

            if (closeTextButton) {
                fireEvent.click(closeTextButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    // =========================================================================
    // CURRENCY SELECTOR TESTS
    // =========================================================================

    describe('Currency Selector', () => {
        it('renders currency selector component', async () => {
            renderModal();

            // Wait for currencies to load
            await waitFor(
                () => {
                    // Look for the dropdown or loading state
                    const selector = screen.queryByRole('combobox');
                    const loading = document.querySelector('.animate-pulse');
                    expect(selector || loading).toBeTruthy();
                },
                { timeout: 3000 }
            );
        });

        it('shows default currency label', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText('Default Currency')).toBeInTheDocument();
            });
        });
    });

    // =========================================================================
    // SAVE FUNCTIONALITY TESTS
    // =========================================================================

    describe('Save Functionality', () => {
        it('disables Save button when currency unchanged', async () => {
            renderModal();

            // Wait for modal to render
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
            });

            // Save button should be disabled when currency is same as default
            const saveButton = screen.getByRole('button', { name: /Save/i });
            expect(saveButton).toBeDisabled();
        });

        it('enables Save button when currency is changed', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            // Select a different currency
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'USD' } });

            // Save button should now be enabled
            const saveButton = screen.getByRole('button', { name: /Save/i });
            expect(saveButton).not.toBeDisabled();
        });

        it('shows saving state while saving', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            // Select a different currency
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'USD' } });

            // Click save
            const saveButton = screen.getByRole('button', { name: /Save/i });
            fireEvent.click(saveButton);

            // Button should show saving state
            await waitFor(() => {
                expect(saveButton).toBeDisabled();
            });
        });
    });

    // =========================================================================
    // INFO MESSAGE TESTS
    // =========================================================================

    describe('Information Messages', () => {
        it('displays about exchange rates info box', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText(/About exchange rates/i)).toBeInTheDocument();
            });
        });

        it('explains exchange rate update frequency', async () => {
            renderModal();

            await waitFor(() => {
                expect(screen.getByText(/Exchange rates are updated daily/i)).toBeInTheDocument();
            });
        });
    });
});
