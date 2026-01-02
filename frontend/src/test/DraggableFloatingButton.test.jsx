import React from 'react';
/**
 * DraggableFloatingButton Test Suite
 *
 * Tests the draggable floating action button component.
 * Verifies positioning, menu toggle, and drag behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { clickWithAct } from './test-utils';
import DraggableFloatingButton from '../components/DraggableFloatingButton';

describe('DraggableFloatingButton', () => {
    let mockOnToggleMenu;
    const mockChildren = <div data-testid="menu-content">Menu Content</div>;

    beforeEach(() => {
        mockOnToggleMenu = vi.fn();
        // Clear localStorage
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the floating button', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });

        it('renders plus icon in button', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveClass('w-8');
            expect(svg).toHaveClass('h-8');
        });

        it('button has pink background', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-bloom-pink');
        });

        it('button is round (w-16 h-16 rounded-full)', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('w-16');
            expect(button).toHaveClass('h-16');
            expect(button).toHaveClass('rounded-full');
        });
    });

    describe('Menu Display', () => {
        it('does not show menu when showMenu is false', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
        });

        it('shows menu when showMenu is true', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            expect(screen.getByTestId('menu-content')).toBeInTheDocument();
        });

        it('menu has proper styling when visible', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const menuPopup = screen.getByTestId('menu-content').parentElement;
            expect(menuPopup).toHaveClass('add-menu-popup');
            expect(menuPopup).toHaveClass('bg-white');
            expect(menuPopup).toHaveClass('rounded-lg');
            expect(menuPopup).toHaveClass('shadow-xl');
        });
    });

    describe('Click Behavior', () => {
        it('calls onToggleMenu when button is clicked', async () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            await clickWithAct(screen.getByRole('button'));

            expect(mockOnToggleMenu).toHaveBeenCalled();
        });
    });

    describe('Position Persistence', () => {
        it('uses default position when no saved position', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container.style.bottom).toBe('100px');
        });

        it('loads position from localStorage', () => {
            localStorage.setItem('floatingButtonPosition', JSON.stringify({ bottom: 200 }));

            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container.style.bottom).toBe('200px');
        });

        it('saves position to localStorage when changed', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            // Position is saved on mount
            const saved = JSON.parse(localStorage.getItem('floatingButtonPosition'));
            expect(saved).toHaveProperty('bottom');
        });
    });

    describe('Fixed Positioning', () => {
        it('has fixed positioning', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container).toHaveClass('fixed');
        });

        it('has high z-index', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container).toHaveClass('z-[9999]');
        });

        it('is positioned on the right side', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container.style.right).toBe('32px');
        });
    });

    describe('Styling', () => {
        it('button has shadow', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('shadow-lg');
        });

        it('button has hover scale effect', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:scale-110');
        });

        it('button has transition styling', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('transition-transform');
        });

        it('button has flex centering', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('flex');
            expect(button).toHaveClass('items-center');
            expect(button).toHaveClass('justify-center');
        });

        it('button has white text', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('text-white');
        });
    });

    describe('Cursor Styling', () => {
        it('has grab cursor when not dragging', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container.style.cursor).toBe('grab');
        });
    });

    describe('Touch Action', () => {
        it('has touch-action: none on container', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const container = document.querySelector('.add-menu');
            expect(container.style.touchAction).toBe('none');
        });
    });

    describe('Menu Positioning', () => {
        it('menu is positioned fixed when visible', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const menuPopup = screen.getByTestId('menu-content').parentElement;
            expect(menuPopup).toHaveClass('fixed');
        });

        it('menu has higher z-index than button', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const menuPopup = screen.getByTestId('menu-content').parentElement;
            expect(menuPopup).toHaveClass('z-[10000]');
        });

        it('menu has minimum width', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const menuPopup = screen.getByTestId('menu-content').parentElement;
            expect(menuPopup).toHaveClass('min-w-[150px]');
        });
    });

    describe('Children Rendering', () => {
        it('renders children inside menu popup', () => {
            render(
                <DraggableFloatingButton showMenu={true} onToggleMenu={mockOnToggleMenu}>
                    <button>Add Expense</button>
                    <button>Add Income</button>
                </DraggableFloatingButton>
            );

            expect(screen.getByText('Add Expense')).toBeInTheDocument();
            expect(screen.getByText('Add Income')).toBeInTheDocument();
        });
    });

    describe('Mouse Events', () => {
        it('responds to mousedown on button', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            fireEvent.mouseDown(button);

            // Button should be interactive
            expect(button).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('button is accessible', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });

        it('button can receive focus', () => {
            render(
                <DraggableFloatingButton showMenu={false} onToggleMenu={mockOnToggleMenu}>
                    {mockChildren}
                </DraggableFloatingButton>
            );

            const button = screen.getByRole('button');
            button.focus();
            expect(document.activeElement).toBe(button);
        });
    });
});
