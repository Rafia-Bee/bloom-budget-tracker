/**
 * ExportImportModal Test Suite
 *
 * Tests for the Export/Import modal component covering:
 * - Export mode: checkbox selection, format selection, API call
 * - Import mode: file upload, success/error handling
 * - UI interactions: close button, loading states
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import ExportImportModal from '../components/ExportImportModal';
import api from '../api';
import { clickWithAct, uploadWithAct } from './test-utils';

// Mock the API module
vi.mock('../api', () => ({
    default: {
        post: vi.fn(),
    },
}));

describe('ExportImportModal', () => {
    const mockOnClose = vi.fn();
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
        vi.clearAllMocks();
        // Store original URL methods
        originalCreateObjectURL = global.URL.createObjectURL;
        originalRevokeObjectURL = global.URL.revokeObjectURL;
        // Mock URL methods
        global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        // Restore URL methods
        global.URL.createObjectURL = originalCreateObjectURL;
        global.URL.revokeObjectURL = originalRevokeObjectURL;
        cleanup();
    });

    describe('Export Mode - Rendering', () => {
        it('renders export modal with all checkboxes', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            // Use heading role to find the title
            expect(screen.getByRole('heading', { name: 'Export Data' })).toBeInTheDocument();
            expect(screen.getByText('Debts')).toBeInTheDocument();
            expect(screen.getByText('Recurring Expenses')).toBeInTheDocument();
            expect(screen.getByText('Recurring Income')).toBeInTheDocument();
            expect(screen.getByText('Salary Periods')).toBeInTheDocument();
            expect(screen.getByText('Expenses')).toBeInTheDocument();
            expect(screen.getByText('Income')).toBeInTheDocument();
            expect(screen.getByText('Goals')).toBeInTheDocument();
        });

        it('renders format radio buttons', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            expect(screen.getByText('JSON (for import)')).toBeInTheDocument();
            expect(screen.getByText('CSV (for Excel)')).toBeInTheDocument();
        });

        it('has all checkboxes checked by default', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const checkboxes = screen.getAllByRole('checkbox');
            checkboxes.forEach((checkbox) => {
                expect(checkbox).toBeChecked();
            });
        });

        it('has JSON format selected by default', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const jsonRadio = screen.getByLabelText('JSON (for import)');
            const csvRadio = screen.getByLabelText('CSV (for Excel)');

            expect(jsonRadio).toBeChecked();
            expect(csvRadio).not.toBeChecked();
        });

        it('shows Export Data button', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            expect(screen.getByRole('button', { name: 'Export Data' })).toBeInTheDocument();
        });
    });

    describe('Export Mode - Interactions', () => {
        it('allows unchecking export types', async () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const debtsCheckbox = screen.getByRole('checkbox', { name: /debts/i });
            await clickWithAct(debtsCheckbox);

            expect(debtsCheckbox).not.toBeChecked();
        });

        it('allows switching to CSV format', async () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const csvRadio = screen.getByLabelText('CSV (for Excel)');
            await clickWithAct(csvRadio);

            expect(csvRadio).toBeChecked();
            expect(screen.getByText(/Note: CSV exports create separate files/)).toBeInTheDocument();
        });

        it('calls onClose when close button is clicked', async () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const closeButton = screen.getByRole('button', { name: 'Cancel' });
            await clickWithAct(closeButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button is clicked', async () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            // Find the X button (svg close icon button)
            const buttons = screen.getAllByRole('button');
            const xButton = buttons.find((btn) => btn.querySelector('svg'));
            await clickWithAct(xButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Export Mode - API Integration', () => {
        it('calls API with selected types on export', async () => {
            api.post.mockResolvedValueOnce({ data: { data: {} } });

            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            // Uncheck some options
            const goalsCheckbox = screen.getByRole('checkbox', { name: /goals/i });
            await clickWithAct(goalsCheckbox);

            const exportButton = screen.getByRole('button', { name: 'Export Data' });
            await clickWithAct(exportButton);

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/data/export', {
                    types: [
                        'debts',
                        'recurring_expenses',
                        'recurring_income',
                        'salary_periods',
                        'expenses',
                        'income',
                    ],
                });
            });
        });

        it('shows error when no types selected', async () => {
            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            // Uncheck all options
            const checkboxes = screen.getAllByRole('checkbox');
            for (const checkbox of checkboxes) {
                await clickWithAct(checkbox);
            }

            const exportButton = screen.getByRole('button', { name: 'Export Data' });
            await clickWithAct(exportButton);

            expect(
                screen.getByText('Please select at least one data type to export')
            ).toBeInTheDocument();
        });

        it('shows success message after export', async () => {
            api.post.mockResolvedValueOnce({ data: { data: { debts: [] } } });

            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const exportButton = screen.getByRole('button', { name: 'Export Data' });
            await clickWithAct(exportButton);

            await waitFor(() => {
                expect(screen.getByText('Data exported successfully!')).toBeInTheDocument();
            });
        });

        it('shows loading state during export', async () => {
            // Make the API call hang
            let resolvePromise;
            api.post.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolvePromise = resolve;
                    })
            );

            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const exportButton = screen.getByRole('button', { name: 'Export Data' });
            await clickWithAct(exportButton);

            expect(screen.getByText('Exporting...')).toBeInTheDocument();

            // Cleanup - resolve the promise
            resolvePromise({ data: { data: {} } });
        });

        it('shows error message on API failure', async () => {
            api.post.mockRejectedValueOnce({
                response: { data: { error: 'Export failed - server error' } },
            });

            render(<ExportImportModal onClose={mockOnClose} mode="export" />);

            const exportButton = screen.getByRole('button', { name: 'Export Data' });
            await clickWithAct(exportButton);

            await waitFor(() => {
                expect(screen.getByText('Export failed - server error')).toBeInTheDocument();
            });
        });
    });

    describe('Import Mode - Rendering', () => {
        it('renders import modal with file input', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            expect(screen.getByRole('heading', { name: 'Import Data' })).toBeInTheDocument();
            expect(screen.getByText(/Select a Bloom export file/)).toBeInTheDocument();
        });

        it('shows warning note about importing', () => {
            render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            expect(screen.getByText(/Importing will add new items/)).toBeInTheDocument();
        });

        it('has file input that accepts JSON', () => {
            const { container } = render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            const fileInput = container.querySelector('input[type="file"]');
            expect(fileInput).toHaveAttribute('accept', '.json');
        });
    });

    describe('Import Mode - File Upload', () => {
        it('shows file input for JSON files', () => {
            const { container } = render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            const fileInput = container.querySelector('input[type="file"]');
            expect(fileInput).toBeInTheDocument();
            expect(fileInput).toHaveAttribute('accept', '.json');
        });

        it('shows error on invalid JSON file upload', async () => {
            const { container } = render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            const file = new File(['invalid json content'], 'test.json', {
                type: 'application/json',
            });
            const fileInput = container.querySelector('input[type="file"]');

            await uploadWithAct(fileInput, file);

            // Wait for the error message (JSON parse error shows "Import failed")
            await waitFor(() => {
                expect(screen.getByText(/Import failed/)).toBeInTheDocument();
            });
        });
    });

    describe('Message/Error Dismissal', () => {
        it('shows dismissible error messages', async () => {
            const { container } = render(<ExportImportModal onClose={mockOnClose} mode="import" />);

            const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
            const fileInput = container.querySelector('input[type="file"]');

            await uploadWithAct(fileInput, file);

            await waitFor(() => {
                expect(screen.getByText(/Import failed/)).toBeInTheDocument();
            });

            // Error message area should have a dismiss button
            const errorArea = screen.getByText(/Import failed/).closest('div');
            const dismissButton = errorArea.querySelector('button');
            expect(dismissButton).toBeInTheDocument();

            // Click dismiss
            await clickWithAct(dismissButton);

            // Error should be gone
            expect(screen.queryByText(/Import failed/)).not.toBeInTheDocument();
        });
    });
});
