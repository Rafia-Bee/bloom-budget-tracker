/**
 * Bloom - Scroll Navigation Buttons
 *
 * Floating scroll shortcut buttons that allow users to quickly jump to the top
 * or bottom of a long page. Positioned on the left side to avoid interfering
 * with the existing FAB on the right. Mobile-friendly with 44×44 px touch targets.
 */

import React from 'react';

function ScrollNavButtons() {
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    return (
        <div className="fixed left-4 bottom-6 z-[9998] flex flex-col gap-2">
            <button
                onClick={scrollToTop}
                className="bg-bloom-pink dark:bg-dark-pink text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 hover:scale-110 transition-transform"
                aria-label="Scroll to top"
                title="Scroll to top"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                    />
                </svg>
            </button>
            <button
                onClick={scrollToBottom}
                className="bg-bloom-pink dark:bg-dark-pink text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 hover:scale-110 transition-transform"
                aria-label="Scroll to bottom"
                title="Scroll to bottom"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>
        </div>
    );
}

export default ScrollNavButtons;
