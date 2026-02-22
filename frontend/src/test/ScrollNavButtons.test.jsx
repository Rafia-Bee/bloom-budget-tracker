/**
 * ScrollNavButtons Test Suite
 *
 * Tests the floating scroll navigation buttons component.
 * Verifies rendering, accessibility labels, and scroll behavior.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScrollNavButtons from '../components/ScrollNavButtons';

describe('ScrollNavButtons', () => {
    beforeEach(() => {
        // Mock window.scrollTo
        window.scrollTo = vi.fn();
        // Reset document scroll height
        Object.defineProperty(document.documentElement, 'scrollHeight', {
            configurable: true,
            value: 2000,
        });
    });

    describe('Rendering', () => {
        it('renders both scroll buttons', () => {
            render(<ScrollNavButtons />);
            expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
            expect(screen.getByLabelText('Scroll to bottom')).toBeInTheDocument();
        });

        it('renders scroll to top button with chevron-up icon', () => {
            render(<ScrollNavButtons />);
            const topButton = screen.getByLabelText('Scroll to top');
            const svg = topButton.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        it('renders scroll to bottom button with chevron-down icon', () => {
            render(<ScrollNavButtons />);
            const bottomButton = screen.getByLabelText('Scroll to bottom');
            const svg = bottomButton.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        it('buttons have correct title attributes', () => {
            render(<ScrollNavButtons />);
            expect(screen.getByTitle('Scroll to top')).toBeInTheDocument();
            expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
        });

        it('buttons have bloom-pink background class', () => {
            render(<ScrollNavButtons />);
            const topButton = screen.getByLabelText('Scroll to top');
            expect(topButton).toHaveClass('bg-bloom-pink');
        });

        it('container is fixed positioned with correct z-index', () => {
            render(<ScrollNavButtons />);
            const topButton = screen.getByLabelText('Scroll to top');
            const container = topButton.closest('div');
            expect(container).toHaveClass('fixed');
            expect(container).toHaveClass('z-[9998]');
        });

        it('buttons meet minimum touch target size', () => {
            render(<ScrollNavButtons />);
            const topButton = screen.getByLabelText('Scroll to top');
            expect(topButton).toHaveClass('w-11');
            expect(topButton).toHaveClass('h-11');
        });
    });

    describe('Scroll Behavior', () => {
        it('scrolls to top when top button is clicked', () => {
            render(<ScrollNavButtons />);
            fireEvent.click(screen.getByLabelText('Scroll to top'));
            expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        });

        it('scrolls to bottom when bottom button is clicked', () => {
            render(<ScrollNavButtons />);
            fireEvent.click(screen.getByLabelText('Scroll to bottom'));
            expect(window.scrollTo).toHaveBeenCalledWith({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth',
            });
        });
    });
});
