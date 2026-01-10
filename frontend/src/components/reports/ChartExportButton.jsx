/**
 * Bloom - Chart Export Button Component
 *
 * Dropdown button that allows exporting chart containers as PNG or PDF.
 * Uses html2canvas for image capture and jspdf for PDF generation.
 */

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function ChartExportButton({ targetRef, filename = 'chart', title = 'Chart' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const captureChart = async () => {
        if (!targetRef?.current) {
            console.error('Chart reference not found');
            return null;
        }

        const element = targetRef.current;

        // Temporarily hide the export button and dropdown during capture
        const exportButton = dropdownRef.current;
        if (exportButton) {
            exportButton.style.visibility = 'hidden';
        }

        // Small delay to ensure dropdown is hidden
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Capture with high quality settings
        const canvas = await html2canvas(element, {
            scale: 2, // Higher resolution
            useCORS: true,
            backgroundColor: null, // Preserve background
            logging: false,
        });

        // Restore export button visibility
        if (exportButton) {
            exportButton.style.visibility = 'visible';
        }

        return canvas;
    };

    const exportAsPNG = async () => {
        setExporting(true);
        setIsOpen(false);

        // Wait for dropdown to close
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            const canvas = await captureChart();
            if (!canvas) return;

            // Create download link
            const link = document.createElement('a');
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('PNG export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    const exportAsPDF = async () => {
        setExporting(true);
        setIsOpen(false);

        // Wait for dropdown to close
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            const canvas = await captureChart();
            if (!canvas) return;

            const imgData = canvas.toDataURL('image/png');

            // Calculate PDF dimensions (A4 landscape for charts)
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;

            // Use landscape if chart is wider than tall
            const orientation = ratio > 1 ? 'landscape' : 'portrait';
            const pdf = new jsPDF(orientation, 'mm', 'a4');

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Add title (without emoji for PDF compatibility)
            const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
            pdf.setFontSize(16);
            pdf.setTextColor(80, 80, 80);
            pdf.text(cleanTitle, pageWidth / 2, 15, { align: 'center' });

            // Calculate image dimensions to fit page with margins
            const margin = 15;
            const maxWidth = pageWidth - margin * 2;
            const maxHeight = pageHeight - 30 - margin; // 30 for title area

            let finalWidth = maxWidth;
            let finalHeight = maxWidth / ratio;

            if (finalHeight > maxHeight) {
                finalHeight = maxHeight;
                finalWidth = maxHeight * ratio;
            }

            // Center the image
            const x = (pageWidth - finalWidth) / 2;
            const y = 25; // Below title

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

            // Add footer with date
            pdf.setFontSize(10);
            pdf.setTextColor(128, 128, 128);
            pdf.text(
                `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );

            pdf.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={exporting}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-50"
                title="Export chart"
            >
                {exporting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-dark-elevated rounded-lg shadow-lg border border-gray-200 dark:border-dark-surface z-50">
                    <button
                        onClick={exportAsPNG}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-t-lg flex items-center gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        Export PNG
                    </button>
                    <button
                        onClick={exportAsPDF}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-b-lg flex items-center gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        Export PDF
                    </button>
                </div>
            )}
        </div>
    );
}

export default ChartExportButton;
