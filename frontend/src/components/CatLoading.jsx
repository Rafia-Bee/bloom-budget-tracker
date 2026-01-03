/**
 * CatLoading Component
 *
 * Displays a cute cat animation with loading message for API cold starts.
 * Randomly selects from a collection of cat animations on each load.
 */

import { useState } from 'react';

const catAnimations = [
    '/bloom-kitty-banker.mp4', // Concept A: Cat stamping and organizing coins
    '/bloom-coin-sorter.mp4', // Concept B: Cat sorting coin stacks
    '/bloom-runner-kitty.mp4', // Concept D: Cat running with money bag
    '/bloom-printer-kitty.mp4', // Concept E: Cat printing data sheets
    '/bloom-filing-kitty.mp4', // Concept F: Cat filing documents
    '/bloom-runner-kitty-2.mp4', // Concept G: Cat running with money pouch (revised)
    '/bloom-sleepy-kitty.mp4', // Concept H: Sleepy cat waking up and snoozing alarm
];

export default function CatLoading({ message = 'Waking up the server...' }) {
    const [catAnimation] = useState(
        () => catAnimations[Math.floor(Math.random() * catAnimations.length)]
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-bloom-light dark:bg-dark-base">
            <div className="text-center max-w-md px-4">
                <div className="mb-6 inline-block">
                    <video
                        src={catAnimation}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-64 h-64 object-contain"
                    />
                </div>
                <div className="text-bloom-pink dark:text-dark-pink text-2xl font-semibold mb-2">
                    {message}
                </div>
                <div className="text-gray-600 dark:text-dark-text-secondary text-sm mb-3">
                    Please wait while we fetch your data... 🐱
                </div>
                <div className="text-gray-500 dark:text-dark-text-secondary text-xs">
                    We use free hosting tiers, so the first request may take up to 30 seconds.
                    <br />
                    Thank you for your patience! 🌸
                </div>
                <div className="mt-4">
                    <div className="inline-flex space-x-2">
                        <div className="w-3 h-3 bg-bloom-pink dark:bg-dark-pink rounded-full animate-bounce"></div>
                        <div
                            className="w-3 h-3 bg-bloom-pink dark:bg-dark-pink rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                            className="w-3 h-3 bg-bloom-pink dark:bg-dark-pink rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
