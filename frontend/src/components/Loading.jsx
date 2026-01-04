import React from 'react';

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bloom-light dark:bg-dark-base p-4">
            {/* Spinning Bloom Flower */}
            <div className="mb-8 animate-[spin_3s_linear_infinite]">
                <img
                    src="/bloomLogo2.png"
                    alt="Loading..."
                    className="w-[120px] h-[120px] rounded-full object-cover"
                />
            </div>

            {/* Text */}
            <div className="text-center max-w-md space-y-4">
                <p className="text-gray-700 dark:text-dark-text text-base font-medium leading-relaxed">
                    Bloom Tracker is currently hosted on free tiers of services, so there are delays
                    in fetching data and waking up the server.
                </p>
                <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
                    Apologies for the wait, it shouldn't take longer than a minute.
                </p>
            </div>
        </div>
    );
}
