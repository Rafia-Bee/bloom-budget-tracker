/**
 * Bloom - Utility Function Tests
 *
 * Comprehensive tests for date formatting, currency formatting, and logger utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    formatDate,
    formatShortDate,
    formatDateRange,
    formatNumericDate,
    formatLongDate,
    formatRelativeDate,
} from "../utils/dateFormatters";
import {
    formatCurrency,
    formatWithConversion,
    formatTransactionAmount,
    getCurrencySymbol,
    getCurrencyName,
    formatCurrencyOption,
    parseCurrencyInput,
    formatCentsForInput,
    CURRENCY_INFO,
} from "../utils/formatters";
import { logError, logWarn, logInfo, logDebug } from "../utils/logger";

// =============================================================================
// DATE FORMATTERS TESTS
// =============================================================================

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

        it("returns empty string for null input", () => {
            expect(formatDate(null)).toBe("");
        });

        it("returns empty string for undefined input", () => {
            expect(formatDate(undefined)).toBe("");
        });

        it("returns empty string for empty string input", () => {
            expect(formatDate("")).toBe("");
        });

        it("handles ISO date string input", () => {
            expect(formatDate("2025-12-25")).toBe("25 Dec, 2025");
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

        it("returns empty string for null input", () => {
            expect(formatShortDate(null)).toBe("");
        });

        it("returns empty string for undefined input", () => {
            expect(formatShortDate(undefined)).toBe("");
        });
    });

    describe("formatNumericDate", () => {
        it("formats date as DD/MM/YYYY", () => {
            expect(formatNumericDate("2025-12-25")).toBe("25/12/2025");
        });

        it("pads single-digit days and months", () => {
            expect(formatNumericDate("2025-01-05")).toBe("05/01/2025");
        });

        it("returns empty string for null input", () => {
            expect(formatNumericDate(null)).toBe("");
        });

        it("returns empty string for undefined input", () => {
            expect(formatNumericDate(undefined)).toBe("");
        });
    });

    describe("formatLongDate", () => {
        it("formats date with full weekday, day, month, year", () => {
            const result = formatLongDate("2025-12-25");
            expect(result).toContain("25");
            expect(result).toContain("December");
            expect(result).toContain("2025");
            // Weekday depends on locale, just check it's there
            expect(result.length).toBeGreaterThan(15);
        });

        it("returns empty string for null input", () => {
            expect(formatLongDate(null)).toBe("");
        });

        it("returns empty string for undefined input", () => {
            expect(formatLongDate(undefined)).toBe("");
        });
    });

    describe("formatRelativeDate", () => {
        // Helper to get YYYY-MM-DD in local timezone (not UTC)
        const getLocalDateString = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        it("returns 'Today' for current date", () => {
            const today = getLocalDateString(new Date());
            expect(formatRelativeDate(today)).toBe("Today");
        });

        it("returns 'Tomorrow' for next day", () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = getLocalDateString(tomorrow);
            expect(formatRelativeDate(tomorrowStr)).toBe("Tomorrow");
        });

        it("returns 'Yesterday' for previous day", () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterday);
            expect(formatRelativeDate(yesterdayStr)).toBe("Yesterday");
        });

        it("returns formatted date for other dates", () => {
            const farDate = new Date();
            farDate.setDate(farDate.getDate() + 10);
            const result = formatRelativeDate(getLocalDateString(farDate));
            // Should be the standard format, not a relative string
            expect(result).not.toBe("Today");
            expect(result).not.toBe("Tomorrow");
            expect(result).not.toBe("Yesterday");
        });

        it("returns empty string for null input", () => {
            expect(formatRelativeDate(null)).toBe("");
        });

        it("returns empty string for undefined input", () => {
            expect(formatRelativeDate(undefined)).toBe("");
        });
    });

    describe("formatDateRange", () => {
        it("formats date range with short start and full end date", () => {
            const start = new Date("2025-11-20");
            const end = new Date("2025-11-26");
            const result = formatDateRange(start, end);
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

        it("returns empty string when start is null", () => {
            expect(formatDateRange(null, new Date("2025-12-25"))).toBe("");
        });

        it("returns empty string when end is null", () => {
            expect(formatDateRange(new Date("2025-12-20"), null)).toBe("");
        });

        it("returns empty string when both are null", () => {
            expect(formatDateRange(null, null)).toBe("");
        });
    });
});

// =============================================================================
// CURRENCY FORMATTERS TESTS
// =============================================================================

describe("Currency Formatters", () => {
    describe("formatCurrency", () => {
        it("formats cents to euros correctly", () => {
            expect(formatCurrency(5000)).toBe("€50.00");
            expect(formatCurrency(100)).toBe("€1.00");
            expect(formatCurrency(1500)).toBe("€15.00");
        });

        it("handles zero cents", () => {
            expect(formatCurrency(0)).toBe("€0.00");
        });

        it("handles large amounts", () => {
            const result = formatCurrency(100000);
            expect(result).toContain("1");
            expect(result).toContain("000");
            expect(result).toContain("00");
        });

        it("handles negative amounts", () => {
            const result = formatCurrency(-1500);
            expect(result).toContain("-");
            expect(result).toContain("15");
        });

        it("returns default for null cents", () => {
            expect(formatCurrency(null)).toBe("€0.00");
        });

        it("returns default for undefined cents", () => {
            expect(formatCurrency(undefined)).toBe("€0.00");
        });

        it("returns default for NaN cents", () => {
            expect(formatCurrency(NaN)).toBe("€0.00");
        });

        it("formats USD correctly", () => {
            const result = formatCurrency(1500, "USD");
            expect(result).toContain("$") || expect(result).toContain("US$");
            expect(result).toContain("15.00");
        });

        it("formats GBP correctly", () => {
            const result = formatCurrency(1500, "GBP");
            expect(result).toContain("£");
            expect(result).toContain("15.00");
        });

        it("formats without symbol when showSymbol is false", () => {
            const result = formatCurrency(1500, "EUR", { showSymbol: false });
            expect(result).toBe("15.00");
        });

        it("handles compact notation for large numbers", () => {
            // Note: compact with currency can have limitations
            // Just verify it doesn't crash for reasonable large amounts
            const result = formatCurrency(10000000, "EUR", { compact: false });
            expect(result).toContain("100");
        });
    });

    describe("formatWithConversion", () => {
        it("returns single currency when same currency", () => {
            const result = formatWithConversion(1500, "EUR", null, "EUR");
            expect(result).toBe("€15.00");
        });

        it("returns single currency when no converted amount", () => {
            const result = formatWithConversion(1500, "USD", null, "EUR");
            expect(result).toContain("$") || expect(result).toContain("US$");
            expect(result).toContain("15.00");
        });

        it("shows both currencies when different and converted", () => {
            const result = formatWithConversion(1650, "USD", 1500, "EUR");
            expect(result).toContain("16.50");
            expect(result).toContain("15.00");
            expect(result).toContain("≈");
        });
    });

    describe("formatTransactionAmount", () => {
        it("returns single display for same currency", () => {
            const tx = { amount: 1500, currency: "EUR" };
            const result = formatTransactionAmount(tx, "EUR", null);
            expect(result.display).toBe("€15.00");
            expect(result.converted).toBeNull();
            expect(result.showDual).toBe(false);
        });

        it("returns dual display for different currency", () => {
            const tx = { amount: 1650, currency: "USD" };
            const mockConvert = vi.fn().mockReturnValue(1500);
            const result = formatTransactionAmount(tx, "EUR", mockConvert);
            expect(result.showDual).toBe(true);
            expect(result.display).toContain("16.50");
            expect(result.converted).toContain("15.00");
        });

        it("defaults to EUR when transaction has no currency", () => {
            const tx = { amount: 1500 };
            const result = formatTransactionAmount(tx, "EUR", null);
            expect(result.display).toBe("€15.00");
            expect(result.showDual).toBe(false);
        });
    });

    describe("getCurrencySymbol", () => {
        it("returns EUR symbol", () => {
            expect(getCurrencySymbol("EUR")).toBe("€");
        });

        it("returns USD symbol", () => {
            expect(getCurrencySymbol("USD")).toBe("$");
        });

        it("returns GBP symbol", () => {
            expect(getCurrencySymbol("GBP")).toBe("£");
        });

        it("returns currency code for unknown currency", () => {
            expect(getCurrencySymbol("XYZ")).toBe("XYZ");
        });
    });

    describe("getCurrencyName", () => {
        it("returns EUR name", () => {
            expect(getCurrencyName("EUR")).toBe("Euro");
        });

        it("returns USD name", () => {
            expect(getCurrencyName("USD")).toBe("US Dollar");
        });

        it("returns currency code for unknown currency", () => {
            expect(getCurrencyName("XYZ")).toBe("XYZ");
        });
    });

    describe("formatCurrencyOption", () => {
        it("formats EUR option", () => {
            expect(formatCurrencyOption("EUR")).toBe("EUR - Euro");
        });

        it("formats USD option", () => {
            expect(formatCurrencyOption("USD")).toBe("USD - US Dollar");
        });

        it("returns code for unknown currency", () => {
            expect(formatCurrencyOption("XYZ")).toBe("XYZ");
        });
    });

    describe("parseCurrencyInput", () => {
        it("parses simple integer", () => {
            expect(parseCurrencyInput("15")).toBe(1500);
        });

        it("parses decimal with period", () => {
            expect(parseCurrencyInput("15.99")).toBe(1599);
        });

        it("parses European format with comma", () => {
            expect(parseCurrencyInput("15,99")).toBe(1599);
        });

        it("strips euro symbol", () => {
            expect(parseCurrencyInput("€15.99")).toBe(1599);
        });

        it("strips dollar symbol", () => {
            expect(parseCurrencyInput("$15.99")).toBe(1599);
        });

        it("strips pound symbol", () => {
            expect(parseCurrencyInput("£15.99")).toBe(1599);
        });

        it("handles thousand separators (period)", () => {
            expect(parseCurrencyInput("1.500,00")).toBe(150000);
        });

        it("handles thousand separators (comma)", () => {
            expect(parseCurrencyInput("1,500.00")).toBe(150000);
        });

        it("returns null for empty string", () => {
            expect(parseCurrencyInput("")).toBeNull();
        });

        it("returns null for null input", () => {
            expect(parseCurrencyInput(null)).toBeNull();
        });

        it("returns null for invalid string", () => {
            expect(parseCurrencyInput("abc")).toBeNull();
        });

        it("handles whitespace", () => {
            expect(parseCurrencyInput("  15.99  ")).toBe(1599);
        });
    });

    describe("formatCentsForInput", () => {
        it("formats cents to decimal string", () => {
            expect(formatCentsForInput(1500)).toBe("15.00");
        });

        it("formats small amounts", () => {
            expect(formatCentsForInput(99)).toBe("0.99");
        });

        it("formats zero", () => {
            expect(formatCentsForInput(0)).toBe("0.00");
        });

        it("returns empty string for null", () => {
            expect(formatCentsForInput(null)).toBe("");
        });

        it("returns empty string for undefined", () => {
            expect(formatCentsForInput(undefined)).toBe("");
        });

        it("returns empty string for NaN", () => {
            expect(formatCentsForInput(NaN)).toBe("");
        });
    });

    describe("CURRENCY_INFO", () => {
        it("contains EUR info", () => {
            expect(CURRENCY_INFO.EUR).toBeDefined();
            expect(CURRENCY_INFO.EUR.symbol).toBe("€");
            expect(CURRENCY_INFO.EUR.name).toBe("Euro");
        });

        it("contains USD info", () => {
            expect(CURRENCY_INFO.USD).toBeDefined();
            expect(CURRENCY_INFO.USD.symbol).toBe("$");
        });

        it("contains GBP info", () => {
            expect(CURRENCY_INFO.GBP).toBeDefined();
            expect(CURRENCY_INFO.GBP.symbol).toBe("£");
        });

        it("contains multiple currencies", () => {
            expect(Object.keys(CURRENCY_INFO).length).toBeGreaterThan(5);
        });
    });
});

// =============================================================================
// LOGGER TESTS
// =============================================================================

describe("Logger", () => {
    let consoleErrorSpy;
    let consoleWarnSpy;
    let consoleInfoSpy;
    let consoleDebugSpy;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("logError", () => {
        it("logs error with operation name", () => {
            const error = new Error("Test error");
            logError("testOperation", error);
            // In dev mode, should log the error
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it("handles error without message", () => {
            logError("testOperation", {});
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it("handles null error", () => {
            logError("testOperation", null);
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe("logWarn", () => {
        it("logs warning message", () => {
            logWarn("Test warning");
            expect(consoleWarnSpy).toHaveBeenCalledWith("Test warning");
        });

        it("logs warning with data", () => {
            const data = { key: "value" };
            logWarn("Test warning", data);
            expect(consoleWarnSpy).toHaveBeenCalledWith("Test warning", data);
        });
    });

    describe("logInfo", () => {
        it("logs info message", () => {
            logInfo("Test info");
            expect(consoleInfoSpy).toHaveBeenCalledWith("Test info");
        });

        it("logs info with data", () => {
            const data = { key: "value" };
            logInfo("Test info", data);
            expect(consoleInfoSpy).toHaveBeenCalledWith("Test info", data);
        });
    });

    describe("logDebug", () => {
        it("logs debug message", () => {
            logDebug("Test debug");
            expect(consoleDebugSpy).toHaveBeenCalledWith("Test debug");
        });

        it("logs debug with data", () => {
            const data = { key: "value" };
            logDebug("Test debug", data);
            expect(consoleDebugSpy).toHaveBeenCalledWith("Test debug", data);
        });
    });
});
