import React from 'react';
/**
 * BankImportModal Test Suite
 *
 * Tests for the Bank Import modal component covering:
 * - Initial rendering and instructions
 * - Payment method selection
 * - Fixed bills checkbox
 * - Preview step API call
 * - Preview table display
 * - Import confirmation
 * - Column mapping step (fallback when auto-detection fails)
 * - Error handling
 * - Example data paste
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { clickWithAct, typeWithAct, selectWithAct } from './test-utils';
import BankImportModal from '../components/BankImportModal';
import api from '../api';

// Mock the API module
vi.mock('../api', () => ({
    default: {
        post: vi.fn(),
    },
}));

// Sample preview response
const mockPreviewResponse = {
    total_count: 3,
    skipped_count: 0,
    errors: [],
    transactions: [
        { date: '2025-11-22', name: 'Wise Europe SA', subcategory: 'Other', amount: 42.33 },
        { date: '2025-11-24', name: 'Wise', subcategory: 'Other', amount: 38.88 },
        { date: '2025-11-24', name: 'UBER *TRIP', subcategory: 'Transportation', amount: 0.18 },
    ],
};

// Sample import response
const mockImportResponse = {
    message: 'Successfully imported 3 transactions',
    imported_count: 3,
    created_expenses: [
        { name: 'Wise Europe SA', amount: 42.33 },
        { name: 'Wise', amount: 38.88 },
        { name: 'UBER *TRIP', amount: 0.18 },
    ],
    errors: [],
};

describe('BankImportModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering - Input Step', () => {
        it('renders the modal with title', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(
                screen.getByRole('heading', { name: 'Import Bank Transactions' })
            ).toBeInTheDocument();
        });

        it('renders import instructions', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(screen.getByText(/How to Import/)).toBeInTheDocument();
            expect(screen.getByText(/Copy transaction data from your bank/)).toBeInTheDocument();
        });

        it('renders payment method radio buttons', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(screen.getByLabelText(/Debit Card/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Credit Card/)).toBeInTheDocument();
        });

        it('has Debit Card selected by default', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const debitRadio = screen.getByLabelText(/Debit Card/);
            expect(debitRadio).toBeChecked();
        });

        it('renders fixed bills checkbox', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(screen.getByText(/Mark as Fixed Bills/)).toBeInTheDocument();
        });

        it('renders textarea for transaction data', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(
                screen.getByPlaceholderText(/Paste your bank transactions here/)
            ).toBeInTheDocument();
        });

        it('renders Preview button (disabled when empty)', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const previewButton = screen.getByRole('button', { name: /Preview Transactions/ });
            expect(previewButton).toBeInTheDocument();
            expect(previewButton).toBeDisabled();
        });

        it('renders Cancel button', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders smart features section', () => {
            render(<BankImportModal onClose={mockOnClose} />);

            expect(screen.getByText(/Smart Features/)).toBeInTheDocument();
            expect(screen.getByText(/Automatically categorizes transactions/)).toBeInTheDocument();
        });
    });

    describe('Input Step - Interactions', () => {
        it('allows switching to Credit Card payment method', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const creditRadio = screen.getByLabelText(/Credit Card/);
            await clickWithAct(creditRadio);

            expect(creditRadio).toBeChecked();
        });

        it('allows checking fixed bills option', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).not.toBeChecked();

            await clickWithAct(checkbox);
            expect(checkbox).toBeChecked();
        });

        it('allows entering transaction text', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test transaction data');

            expect(textarea).toHaveValue('test transaction data');
        });

        it('enables Preview button when text is entered', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');

            const previewButton = screen.getByRole('button', { name: /Preview Transactions/ });
            expect(previewButton).not.toBeDisabled();
        });

        it('calls onClose when Cancel is clicked', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            await clickWithAct(screen.getByRole('button', { name: 'Cancel' }));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button is clicked', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const buttons = screen.getAllByRole('button');
            const xButton = buttons.find((btn) => btn.querySelector('svg') && !btn.textContent);
            await clickWithAct(xButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('pastes example data when link is clicked', async () => {
            render(<BankImportModal onClose={mockOnClose} />);

            const exampleLink = screen.getByText(/Click here to paste example data/);
            await clickWithAct(exampleLink);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            expect(textarea.value).toContain('Wise Europe SA');
            expect(textarea.value).toContain('-42,33');
        });
    });

    describe('Preview API Call', () => {
        it('calls preview API with transaction data', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test transaction data');

            const previewButton = screen.getByRole('button', { name: /Preview Transactions/ });
            await clickWithAct(previewButton);

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/data/preview-bank-transactions', {
                    transactions: 'test transaction data',
                    payment_method: 'Debit card',
                    mark_as_fixed_bills: false,
                });
            });
        });

        it('sends Credit card payment method when selected', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            // Switch to Credit card
            await clickWithAct(screen.getByLabelText(/Credit Card/));

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');

            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith(
                    '/data/preview-bank-transactions',
                    expect.objectContaining({
                        payment_method: 'Credit card',
                    })
                );
            });
        });

        it('sends mark_as_fixed_bills when checked', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            // Check fixed bills
            await clickWithAct(screen.getByRole('checkbox'));

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');

            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith(
                    '/data/preview-bank-transactions',
                    expect.objectContaining({
                        mark_as_fixed_bills: true,
                    })
                );
            });
        });

        it('shows loading state during preview', async () => {
            let resolvePromise;
            api.post.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolvePromise = resolve;
                    })
            );

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');

            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            expect(screen.getByText('Previewing...')).toBeInTheDocument();

            // Cleanup
            resolvePromise({ data: mockPreviewResponse });
        });

        it('shows error when preview fails', async () => {
            api.post.mockRejectedValueOnce({
                response: { data: { error: 'Invalid format' } },
            });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'invalid data');

            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText('Invalid format')).toBeInTheDocument();
            });
        });
    });

    describe('Preview Step - Display', () => {
        it('shows preview step after successful API call', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/3 transaction\(s\) ready to import/)).toBeInTheDocument();
            });
        });

        it('shows transaction table in preview', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText('Wise Europe SA')).toBeInTheDocument();
                expect(screen.getByText('€42.33')).toBeInTheDocument();
            });
        });

        it('shows table headers in preview', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText('Date')).toBeInTheDocument();
                expect(screen.getByText('Merchant')).toBeInTheDocument();
                expect(screen.getByText('Category')).toBeInTheDocument();
                expect(screen.getByText('Amount')).toBeInTheDocument();
            });
        });

        it('shows Confirm Import button in preview', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import 3 Transaction/ })
                ).toBeInTheDocument();
            });
        });

        it('shows Back to Edit button in preview', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
            });
        });

        it('returns to input step when Back is clicked', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: 'Back' }));

            // Should be back on input step
            expect(
                screen.getByRole('button', { name: /Preview Transactions/ })
            ).toBeInTheDocument();
        });

        it('shows skipped count when transactions are skipped', async () => {
            api.post.mockResolvedValueOnce({
                data: {
                    ...mockPreviewResponse,
                    skipped_count: 2,
                },
            });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/2 skipped/)).toBeInTheDocument();
            });
        });

        it('shows warnings when preview has errors', async () => {
            api.post.mockResolvedValueOnce({
                data: {
                    ...mockPreviewResponse,
                    errors: ['Row 5: Invalid date format'],
                },
            });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/Warnings/)).toBeInTheDocument();
                expect(screen.getByText(/Row 5: Invalid date format/)).toBeInTheDocument();
            });
        });
    });

    describe('Import Confirmation', () => {
        it('calls import API when confirmed', async () => {
            api.post
                .mockResolvedValueOnce({ data: mockPreviewResponse })
                .mockResolvedValueOnce({ data: mockImportResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            // Go to preview
            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import/ })
                ).toBeInTheDocument();
            });

            // Confirm import
            await clickWithAct(screen.getByRole('button', { name: /Confirm & Import/ }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith(
                    '/data/import-bank-transactions',
                    expect.objectContaining({
                        transactions: 'test data',
                        payment_method: 'Debit card',
                    })
                );
            });
        });

        it('shows success message after import', async () => {
            api.post
                .mockResolvedValueOnce({ data: mockPreviewResponse })
                .mockResolvedValueOnce({ data: mockImportResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            // Go to preview
            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import/ })
                ).toBeInTheDocument();
            });

            // Confirm import
            await clickWithAct(screen.getByRole('button', { name: /Confirm & Import/ }));

            await waitFor(() => {
                expect(
                    screen.getByText('Successfully imported 3 transactions')
                ).toBeInTheDocument();
            });
        });

        it('shows loading state during import', async () => {
            let resolveImport;
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse }).mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveImport = resolve;
                    })
            );

            render(<BankImportModal onClose={mockOnClose} />);

            // Go to preview
            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import/ })
                ).toBeInTheDocument();
            });

            // Confirm import
            await clickWithAct(screen.getByRole('button', { name: /Confirm & Import/ }));

            expect(screen.getByText('Importing...')).toBeInTheDocument();

            // Cleanup
            resolveImport({ data: mockImportResponse });
        });

        it('shows imported expenses in result', async () => {
            api.post
                .mockResolvedValueOnce({ data: mockPreviewResponse })
                .mockResolvedValueOnce({ data: mockImportResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            // Go to preview and confirm
            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import/ })
                ).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: /Confirm & Import/ }));

            await waitFor(() => {
                // Check for the "Imported transactions:" label which only appears in the result
                expect(screen.getByText('Imported transactions:')).toBeInTheDocument();
            });
        });

        it('shows error when import fails', async () => {
            api.post.mockResolvedValueOnce({ data: mockPreviewResponse }).mockRejectedValueOnce({
                response: { data: { error: 'Import failed - database error' } },
            });

            render(<BankImportModal onClose={mockOnClose} />);

            // Go to preview
            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /Confirm & Import/ })
                ).toBeInTheDocument();
            });

            // Confirm import
            await clickWithAct(screen.getByRole('button', { name: /Confirm & Import/ }));

            await waitFor(() => {
                expect(screen.getByText('Import failed - database error')).toBeInTheDocument();
            });
        });
    });

    describe('Error Dismissal', () => {
        it('allows dismissing error messages', async () => {
            api.post.mockRejectedValueOnce({
                response: { data: { error: 'Test error' } },
            });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test data');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText('Test error')).toBeInTheDocument();
            });

            // Find and click dismiss button
            const errorDiv = screen.getByText('Test error').closest('div');
            const dismissButton = errorDiv.querySelector('button');
            await clickWithAct(dismissButton);

            expect(screen.queryByText('Test error')).not.toBeInTheDocument();
        });
    });

    describe('Column Mapping Step', () => {
        const needsMappingResponse = {
            needs_mapping: true,
            headers: ['Datum', 'Bedrag', 'Naam'],
            headers_key: 'bedrag,datum,naam',
            error: 'Could not detect column names. Please map them manually.',
        };

        it('shows mapping step when server returns needs_mapping', async () => {
            api.post.mockResolvedValueOnce({ data: needsMappingResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'Datum;Bedrag;Naam\n2025-11-22;-10,00;Winkel');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/Map Your Columns/)).toBeInTheDocument();
            });
        });

        it('shows the detected headers as dropdown options', async () => {
            api.post.mockResolvedValueOnce({ data: needsMappingResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'Datum;Bedrag;Naam\n2025-11-22;-10,00;Winkel');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByTestId('date-column-select')).toBeInTheDocument();
                expect(screen.getByTestId('amount-column-select')).toBeInTheDocument();
                expect(screen.getByTestId('name-column-select')).toBeInTheDocument();
            });

            // Each select should contain the detected headers
            const dateSelect = screen.getByTestId('date-column-select');
            expect(dateSelect).toHaveTextContent('Datum');
            expect(dateSelect).toHaveTextContent('Bedrag');
            expect(dateSelect).toHaveTextContent('Naam');
        });

        it('sends column_mapping when user confirms mapping', async () => {
            api.post
                .mockResolvedValueOnce({ data: needsMappingResponse })
                .mockResolvedValueOnce({ data: mockPreviewResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'Datum;Bedrag;Naam\n2025-11-22;-10,00;Winkel');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByTestId('date-column-select')).toBeInTheDocument();
            });

            // Select columns
            await selectWithAct(screen.getByTestId('date-column-select'), 'Datum');
            await selectWithAct(screen.getByTestId('amount-column-select'), 'Bedrag');
            await selectWithAct(screen.getByTestId('name-column-select'), 'Naam');

            // Submit mapping (click the Preview Transactions button in the mapping step)
            const previewBtns = screen.getAllByRole('button', {
                name: /Preview Transactions/,
            });
            await clickWithAct(previewBtns[0]);

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith(
                    '/data/preview-bank-transactions',
                    expect.objectContaining({
                        column_mapping: { date: 'Datum', amount: 'Bedrag', name: 'Naam' },
                    })
                );
            });
        });

        it('shows Back to Edit button on mapping step', async () => {
            api.post.mockResolvedValueOnce({ data: needsMappingResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/Map Your Columns/)).toBeInTheDocument();
            });

            expect(screen.getByRole('button', { name: 'Back to Edit' })).toBeInTheDocument();
        });

        it('returns to input when Back to Edit is clicked from mapping step', async () => {
            api.post.mockResolvedValueOnce({ data: needsMappingResponse });

            render(<BankImportModal onClose={mockOnClose} />);

            const textarea = screen.getByPlaceholderText(/Paste your bank transactions here/);
            await typeWithAct(textarea, 'test');
            await clickWithAct(screen.getByRole('button', { name: /Preview Transactions/ }));

            await waitFor(() => {
                expect(screen.getByText(/Map Your Columns/)).toBeInTheDocument();
            });

            await clickWithAct(screen.getByRole('button', { name: 'Back to Edit' }));

            expect(
                screen.getByPlaceholderText(/Paste your bank transactions here/)
            ).toBeInTheDocument();
        });
    });
});
