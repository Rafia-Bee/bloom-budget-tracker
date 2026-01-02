import React from 'react';
/**
 * EditSubcategoryModal Test Suite
 *
 * Tests subcategory editing form including pre-filled values,
 * name validation, unchanged name handling, and form submission.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { clickWithAct, typeWithAct, clearWithAct } from './test-utils';
import EditSubcategoryModal from '../components/EditSubcategoryModal';

describe('EditSubcategoryModal', () => {
    let mockOnClose;
    let mockOnUpdate;
    const mockSubcategory = {
        id: 1,
        name: 'Streaming Services',
        category: 'Flexible Expenses',
    };

    beforeEach(() => {
        mockOnClose = vi.fn();
        mockOnUpdate = vi.fn().mockResolvedValue({});
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the modal with title', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Edit Subcategory')).toBeInTheDocument();
        });

        it('renders all form fields', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Category')).toBeInTheDocument();
            expect(screen.getByText('Subcategory Name')).toBeInTheDocument();
        });

        it('renders Save Changes and Cancel buttons', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders close X button', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument();
        });

        it('shows category cannot be changed message', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Category cannot be changed')).toBeInTheDocument();
        });
    });

    describe('Pre-filled Values', () => {
        it('pre-fills name from subcategory', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            expect(nameInput).toHaveValue('Streaming Services');
        });

        it('displays category as read-only', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Flexible Expenses')).toBeInTheDocument();
        });

        it('displays different categories correctly', () => {
            const debtSubcategory = {
                id: 2,
                name: 'Car Loan',
                category: 'Debt Payments',
            };

            render(
                <EditSubcategoryModal
                    subcategory={debtSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Debt Payments')).toBeInTheDocument();
            expect(screen.getByRole('textbox')).toHaveValue('Car Loan');
        });
    });

    describe('User Interactions', () => {
        it('allows name editing', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Music Subscriptions');

            expect(nameInput).toHaveValue('Music Subscriptions');
        });

        it('calls onClose when Cancel button clicked', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            await clickWithAct(screen.getByRole('button', { name: 'Cancel' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when X button clicked', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            await clickWithAct(screen.getByRole('button', { name: '✕' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Form Submission', () => {
        it('submits form with updated name', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Video Streaming');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            expect(mockOnUpdate).toHaveBeenCalledWith(1, {
                name: 'Video Streaming',
            });
        });

        it('trims whitespace from name', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, '  New Name  ');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            expect(mockOnUpdate).toHaveBeenCalledWith(1, {
                name: 'New Name',
            });
        });

        it('closes without updating when name unchanged', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            // Don't change anything, just submit
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            expect(mockOnUpdate).not.toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('shows loading state during submission', async () => {
            mockOnUpdate.mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'New Name');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
        });

        it('disables submit button during loading', async () => {
            mockOnUpdate.mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'New Name');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            const submitButton = screen.getByRole('button', { name: 'Saving...' });
            expect(submitButton).toBeDisabled();
        });
    });

    describe('Validation', () => {
        it('has required attribute on name input', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            expect(nameInput).toBeRequired();
        });

        it('has maxLength attribute on name input', () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            expect(nameInput).toHaveAttribute('maxLength', '100');
        });

        it('does not call onUpdate when name is cleared', async () => {
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            // Browser's required validation prevents submit
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('displays API error message', async () => {
            mockOnUpdate.mockRejectedValue({
                response: { data: { error: 'Name already exists' } },
            });
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Duplicate Name');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => {
                expect(screen.getByText('Name already exists')).toBeInTheDocument();
            });
        });

        it('displays generic error for unknown errors', async () => {
            mockOnUpdate.mockRejectedValue(new Error('Network error'));
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'New Name');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => {
                expect(screen.getByText('Failed to update subcategory')).toBeInTheDocument();
            });
        });

        it('re-enables submit button after error', async () => {
            mockOnUpdate.mockRejectedValue(new Error('Error'));
            render(
                <EditSubcategoryModal
                    subcategory={mockSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'New Name');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeDisabled();
            });
        });
    });

    describe('Different Subcategory Types', () => {
        it('handles Fixed Expenses subcategory', () => {
            const fixedSubcategory = {
                id: 3,
                name: 'Rent',
                category: 'Fixed Expenses',
            };

            render(
                <EditSubcategoryModal
                    subcategory={fixedSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Fixed Expenses')).toBeInTheDocument();
            expect(screen.getByRole('textbox')).toHaveValue('Rent');
        });

        it('handles Savings & Investments subcategory', () => {
            const savingsSubcategory = {
                id: 4,
                name: 'Emergency Fund',
                category: 'Savings & Investments',
            };

            render(
                <EditSubcategoryModal
                    subcategory={savingsSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            expect(screen.getByText('Savings & Investments')).toBeInTheDocument();
            expect(screen.getByRole('textbox')).toHaveValue('Emergency Fund');
        });

        it('passes correct ID to onUpdate', async () => {
            const differentSubcategory = {
                id: 99,
                name: 'Original',
                category: 'Debt Payments',
            };

            render(
                <EditSubcategoryModal
                    subcategory={differentSubcategory}
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
            );

            const nameInput = screen.getByRole('textbox');
            await clearWithAct(nameInput);
            await typeWithAct(nameInput, 'Updated');
            await clickWithAct(screen.getByRole('button', { name: 'Save Changes' }));

            expect(mockOnUpdate).toHaveBeenCalledWith(99, { name: 'Updated' });
        });
    });
});
