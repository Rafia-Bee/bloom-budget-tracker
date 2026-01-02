import React from 'react';
/**
 * ThemeToggle Test Suite
 *
 * Tests the dark/light mode toggle button component.
 * Verifies theme switching functionality and correct icon/text display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { clickWithAct } from './test-utils';
import ThemeToggle from '../components/ThemeToggle';

// Mock ThemeContext
const mockToggleTheme = vi.fn();

vi.mock('../contexts/ThemeContext', () => ({
    useTheme: vi.fn(),
}));

import { useTheme } from '../contexts/ThemeContext';

describe('ThemeToggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Light Mode Display', () => {
        beforeEach(() => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
        });

        it('renders Dark Mode text when in light mode', () => {
            render(<ThemeToggle />);

            expect(screen.getByText('Dark Mode')).toBeInTheDocument();
        });

        it('renders moon icon when in light mode', () => {
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Moon icon has a specific path
            expect(svg.querySelector('path')).toHaveAttribute(
                'd',
                expect.stringContaining('20.354')
            );
        });

        it('renders as a button element', () => {
            render(<ThemeToggle />);

            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('has full width styling', () => {
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('w-full');
        });
    });

    describe('Dark Mode Display', () => {
        beforeEach(() => {
            useTheme.mockReturnValue({
                theme: 'dark',
                toggleTheme: mockToggleTheme,
            });
        });

        it('renders Light Mode text when in dark mode', () => {
            render(<ThemeToggle />);

            expect(screen.getByText('Light Mode')).toBeInTheDocument();
        });

        it('renders sun icon when in dark mode', () => {
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Sun icon has yellow color class
            expect(svg).toHaveClass('text-yellow-400');
        });
    });

    describe('Theme Toggle Functionality', () => {
        it('calls toggleTheme when clicked in light mode', async () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            await clickWithAct(screen.getByRole('button'));

            expect(mockToggleTheme).toHaveBeenCalledTimes(1);
        });

        it('calls toggleTheme when clicked in dark mode', async () => {
            useTheme.mockReturnValue({
                theme: 'dark',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            await clickWithAct(screen.getByRole('button'));

            expect(mockToggleTheme).toHaveBeenCalledTimes(1);
        });
    });

    describe('Styling', () => {
        it('has flex layout with gap', () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('flex');
            expect(button).toHaveClass('items-center');
            expect(button).toHaveClass('gap-2');
        });

        it('has transition for color changes', () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('transition-colors');
        });

        it('has hover styles', () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:text-bloom-pink');
        });

        it('text has proper font styling', () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const text = screen.getByText('Dark Mode');
            expect(text).toHaveClass('text-sm');
            expect(text).toHaveClass('font-medium');
        });
    });

    describe('Icon Sizing', () => {
        it('icon has correct dimensions in light mode', () => {
            useTheme.mockReturnValue({
                theme: 'light',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toHaveClass('w-4');
            expect(svg).toHaveClass('h-4');
        });

        it('icon has correct dimensions in dark mode', () => {
            useTheme.mockReturnValue({
                theme: 'dark',
                toggleTheme: mockToggleTheme,
            });
            render(<ThemeToggle />);

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toHaveClass('w-4');
            expect(svg).toHaveClass('h-4');
        });
    });
});
