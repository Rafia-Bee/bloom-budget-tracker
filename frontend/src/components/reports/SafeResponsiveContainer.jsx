/**
 * Bloom - Safe Responsive Container Component
 *
 * Replaces Recharts ResponsiveContainer to prevent console warnings.
 * Uses ResizeObserver to measure container dimensions and passes them
 * directly to child charts as explicit width/height props.
 *
 * This fixes the "width(-1) and height(-1)" warning that occurs because
 * ResponsiveContainer calculates negative dimensions before layout completes.
 */

import { useState, useEffect, useRef, cloneElement, Children } from 'react';

function SafeResponsiveContainer({ children, className, style }) {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                if (width > 0 && height > 0) {
                    setDimensions({ width: Math.floor(width), height: Math.floor(height) });
                }
            }
        };

        // Initial measurement after a frame to ensure layout is complete
        const rafId = requestAnimationFrame(updateDimensions);

        // Use ResizeObserver for responsive updates
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width: Math.floor(width), height: Math.floor(height) });
                }
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, []);

    const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;

    // Clone the child chart and pass explicit dimensions
    const renderChart = () => {
        if (!hasValidDimensions) return null;

        const child = Children.only(children);
        return cloneElement(child, {
            width: dimensions.width,
            height: dimensions.height,
        });
    };

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', height: '100%', ...style }}
        >
            {renderChart()}
        </div>
    );
}

export default SafeResponsiveContainer;
