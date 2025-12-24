/**
 * Bloom - Utility Function Tests
 *
 * Tests for date formatting and other utilities.
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatShortDate, formatDateRange } from "../utils/dateFormatters";

describe("Date Formatters", () => {
    describe("formatDate", () => {
        it("formats date with comma before year", () => {
            const date = new Date("2025-12-21");
            const result = formatDate(date);
            expect(result).toBe("21 Dec, 2025");
        });

        it("handles different months", () => {
            expect(formatDate(new Date("2025-01-15"))).toBe("15 Jan, 2025");
            expect(formatDate(new Date("2025-06-01"))).toBe("1 Jun, 2025");
            expect(formatDate(new Date("2025-11-30"))).toBe("30 Nov, 2025");
        });

        it("handles single-digit days", () => {
            const result = formatDate(new Date("2025-03-05"));
            expect(result).toBe("5 Mar, 2025");
        });
    });

    describe("formatShortDate", () => {
        it("formats date without year", () => {
            const date = new Date("2025-12-21");
            const result = formatShortDate(date);
            expect(result).toBe("21 Dec");
        });

        it("handles different months", () => {
            expect(formatShortDate(new Date("2025-01-15"))).toBe("15 Jan");
            expect(formatShortDate(new Date("2025-06-01"))).toBe("1 Jun");
        });
    });

    describe("formatDateRange", () => {
        it("formats date range with short start and full end date", () => {
            const start = new Date("2025-11-20");
            const end = new Date("2025-11-26");
            const result = formatDateRange(start, end);
            // formatDateRange uses formatShortDate for start, formatDate for end
            expect(result).toBe("20 Nov - 26 Nov, 2025");
        });

        it("handles cross-month ranges", () => {
            const start = new Date("2025-11-27");
            const end = new Date("2025-12-03");
            const result = formatDateRange(start, end);
            expect(result).toBe("27 Nov - 3 Dec, 2025");
        });

        it("handles cross-year ranges", () => {
            const start = new Date("2025-12-25");
            const end = new Date("2026-01-01");
            const result = formatDateRange(start, end);
            expect(result).toBe("25 Dec - 1 Jan, 2026");
        });
    });
});

describe("Currency Formatting", () => {
    // Helper to format cents to euros
    const formatCurrency = (cents) => {
        return new Intl.NumberFormat("en-IE", {
            style: "currency",
            currency: "EUR",
        }).format(cents / 100);
    };

    it("formats cents to euros correctly", () => {
        expect(formatCurrency(5000)).toBe("€50.00");
        expect(formatCurrency(100)).toBe("€1.00");
        expect(formatCurrency(1500)).toBe("€15.00");
    });

    it("handles zero", () => {
        expect(formatCurrency(0)).toBe("€0.00");
    });

    it("handles large amounts", () => {
        expect(formatCurrency(100000)).toBe("€1,000.00");
    });
});
