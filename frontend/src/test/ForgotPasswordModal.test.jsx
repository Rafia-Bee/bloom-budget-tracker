import React from 'react';
/**
 * Bloom - ForgotPasswordModal Tests
 *
 * Tests for the forgot password modal component that handles
 * password reset email requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { clickWithAct, typeWithAct, clearWithAct, focusWithAct } from './test-utils';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api from '../api';

// Mock the API module
vi.mock('../api', () => ({
    default: {
        post: vi.fn(),
    },
}));

// Helper to get the email input (label doesn't have htmlFor)
const getEmailInput = () => screen.getByPlaceholderText('your.email@example.com');

describe('ForgotPasswordModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        api.post.mockResolvedValue({
            data: { message: 'Password reset email sent successfully' },
        });
    });

    describe('Rendering', () => {
        it('renders the modal with title', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(screen.getByText('Forgot Password')).toBeInTheDocument();
        });

        it('renders instruction text', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(
                screen.getByText(/enter your email address and we'll send you a link/i)
            ).toBeInTheDocument();
        });

        it('renders email input field with label', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(screen.getByText('Email Address')).toBeInTheDocument();
            expect(getEmailInput()).toBeInTheDocument();
        });

        it('renders Cancel and Send Reset Link buttons', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
        });

        it('renders close X button', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            // Close button is the SVG button without explicit text
            const closeButtons = screen.getAllByRole('button');
            expect(closeButtons.length).toBeGreaterThanOrEqual(3); // X, Cancel, Submit
        });

        it('email input has required attribute', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(getEmailInput()).toBeRequired();
        });

        it('email input has correct type', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            expect(getEmailInput()).toHaveAttribute('type', 'email');
        });
    });

    describe('Email Input', () => {
        it('allows typing in email field', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const emailInput = getEmailInput();
            await typeWithAct(emailInput, 'test@example.com');

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('clears and retypes email correctly', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const emailInput = getEmailInput();
            await typeWithAct(emailInput, 'wrong@email.com');
            await clearWithAct(emailInput);
            await typeWithAct(emailInput, 'correct@email.com');

            expect(emailInput).toHaveValue('correct@email.com');
        });
    });

    describe('Form Submission', () => {
        it('submits with correct email', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
                    email: 'test@example.com',
                });
            });
        });

        it('trims whitespace from email', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), '  test@example.com  ');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
                    email: 'test@example.com',
                });
            });
        });

        it('calls onSuccess with message after successful submission', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalledWith(
                    'Password reset email sent successfully'
                );
            });
        });

        it('calls onClose after successful submission', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('Loading State', () => {
        it('shows loading text during submission', async () => {
            api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument();
        });

        it('disables submit button during loading', async () => {
            api.post.mockImplementation(() => new Promise(() => {}));

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
        });

        it('disables Cancel button during loading', async () => {
            api.post.mockImplementation(() => new Promise(() => {}));

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        });

        it('disables email input during loading', async () => {
            api.post.mockImplementation(() => new Promise(() => {}));

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            expect(getEmailInput()).toBeDisabled();
        });
    });

    describe('Error Handling', () => {
        it('displays API error message', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Email not found' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'unknown@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Email not found')).toBeInTheDocument();
            });
        });

        it('displays generic error when no API message', async () => {
            api.post.mockRejectedValue(new Error('Network error'));

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Unable to connect to server')).toBeInTheDocument();
            });
        });

        it('displays rate limit error', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Too many requests. Please try again later.' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(
                    screen.getByText('Too many requests. Please try again later.')
                ).toBeInTheDocument();
            });
        });

        it('allows dismissing error message', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Some error' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Some error')).toBeInTheDocument();
            });

            // Find the small dismiss button within error container (has w-4 h-4 SVG)
            const errorContainer = screen.getByText('Some error').parentElement;
            const dismissButton = errorContainer.querySelector('button');

            // Use fireEvent for buttons inside form without type="button"
            const { fireEvent } = await import('@testing-library/react');
            fireEvent.click(dismissButton);

            await waitFor(() => {
                expect(screen.queryByText('Some error')).not.toBeInTheDocument();
            });
        });

        it('does not call onSuccess on error', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Error' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('does not call onClose on error', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Error' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('re-enables form after error', async () => {
            api.post.mockRejectedValue({
                response: { data: { error: 'Error' } },
            });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            // Form should be enabled again
            expect(getEmailInput()).not.toBeDisabled();
            expect(screen.getByRole('button', { name: 'Send Reset Link' })).not.toBeDisabled();
        });
    });

    describe('Modal Close Actions', () => {
        it('calls onClose when Cancel button clicked', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await clickWithAct(screen.getByRole('button', { name: 'Cancel' }));

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when X button clicked', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            // Find the close X button (first button in header area)
            const buttons = screen.getAllByRole('button');
            const closeButton = buttons.find(
                (btn) =>
                    btn.querySelector('svg') &&
                    !btn.textContent.includes('Cancel') &&
                    !btn.textContent.includes('Send')
            );
            await clickWithAct(closeButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Retry After Error', () => {
        it('allows retry after error', async () => {
            // First call fails, second succeeds
            api.post
                .mockRejectedValueOnce({
                    response: { data: { error: 'Error' } },
                })
                .mockResolvedValueOnce({
                    data: { message: 'Success!' },
                });

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            // Retry
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalledWith('Success!');
            });
        });

        it('clears previous error on new submission', async () => {
            api.post
                .mockRejectedValueOnce({
                    response: { data: { error: 'First Error' } },
                })
                .mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            await typeWithAct(getEmailInput(), 'test@example.com');
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            await waitFor(() => {
                expect(screen.getByText('First Error')).toBeInTheDocument();
            });

            // Start new submission
            await clickWithAct(screen.getByRole('button', { name: 'Send Reset Link' }));

            // Error should be cleared
            expect(screen.queryByText('First Error')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has email label element', () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const label = screen.getByText('Email Address');
            expect(label.tagName).toBe('LABEL');
        });

        it('email input can receive focus', async () => {
            render(<ForgotPasswordModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const emailInput = getEmailInput();
            await focusWithAct(emailInput);

            expect(document.activeElement).toBe(emailInput);
        });
    });
});
