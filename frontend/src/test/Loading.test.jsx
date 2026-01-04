/**
 * Loading Test Suite
 *
 * Tests the bloom flower loading animation component.
 * Verifies animation display and message text.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from '../components/Loading';

describe('Loading', () => {
    describe('Rendering', () => {
        it('renders the component', () => {
            render(<Loading />);
            expect(
                screen.getByText(/Bloom Tracker is currently hosted on free tiers/i)
            ).toBeInTheDocument();
        });

        it('displays the full explanation text', () => {
            render(<Loading />);
            expect(
                screen.getByText(
                    /Bloom Tracker is currently hosted on free tiers of services, so there are delays in fetching data and waking up the server./i
                )
            ).toBeInTheDocument();
        });

        it('displays the apology text', () => {
            render(<Loading />);
            expect(
                screen.getByText(/Apologies for the wait, it shouldn't take longer than a minute./i)
            ).toBeInTheDocument();
        });

        it('renders the bloom logo image', () => {
            render(<Loading />);
            const img = screen.getByRole('img', { name: /loading/i });
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', '/bloomLogo2.png');
        });
    });
});
