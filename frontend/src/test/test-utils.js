/**
 * Bloom - Test Utilities
 *
 * Helper functions for testing React components.
 * Provides act()-wrapped event handlers to prevent React act() warnings.
 */

import { act, fireEvent } from "@testing-library/react";

/**
 * Click an element wrapped in act() to ensure state updates complete.
 * Use this instead of userEvent.click() for components with async state updates.
 *
 * @param {HTMLElement} element - The element to click
 * @returns {Promise<void>}
 */
export const clickWithAct = async (element) => {
    await act(async () => {
        fireEvent.click(element);
    });
};

/**
 * Trigger a mousedown event wrapped in act().
 * Use for components that listen for mousedown (e.g., click-outside handlers).
 *
 * @param {HTMLElement} element - The element to trigger mousedown on
 * @returns {Promise<void>}
 */
export const mouseDownWithAct = async (element) => {
    await act(async () => {
        fireEvent.mouseDown(element);
    });
};

/**
 * Change an input value wrapped in act().
 * Use this instead of userEvent.type() for components with async state updates.
 *
 * @param {HTMLElement} element - The input element to change
 * @param {string} value - The new value to set
 * @returns {Promise<void>}
 */
export const changeWithAct = async (element, value) => {
    await act(async () => {
        fireEvent.change(element, { target: { value } });
    });
};

/**
 * Select an option in a dropdown/select element wrapped in act().
 * Use this instead of userEvent.selectOptions().
 *
 * @param {HTMLElement} selectElement - The select element
 * @param {string} value - The value of the option to select
 * @returns {Promise<void>}
 */
export const selectWithAct = async (selectElement, value) => {
    await act(async () => {
        fireEvent.change(selectElement, { target: { value } });
    });
};

/**
 * Clear an input element wrapped in act().
 * Use this instead of userEvent.clear().
 *
 * @param {HTMLElement} element - The input element to clear
 * @returns {Promise<void>}
 */
export const clearWithAct = async (element) => {
    await act(async () => {
        fireEvent.change(element, { target: { value: "" } });
    });
};

/**
 * Type into an input element wrapped in act().
 * Unlike changeWithAct, this simulates individual keystrokes.
 *
 * @param {HTMLElement} element - The input element to type into
 * @param {string} text - The text to type
 * @returns {Promise<void>}
 */
export const typeWithAct = async (element, text) => {
    await act(async () => {
        fireEvent.change(element, { target: { value: text } });
    });
};

/**
 * Submit a form wrapped in act().
 *
 * @param {HTMLElement} formElement - The form element to submit
 * @returns {Promise<void>}
 */
export const submitWithAct = async (formElement) => {
    await act(async () => {
        fireEvent.submit(formElement);
    });
};

/**
 * Focus an element wrapped in act().
 * Uses native DOM focus() method to actually move focus.
 *
 * @param {HTMLElement} element - The element to focus
 * @returns {Promise<void>}
 */
export const focusWithAct = async (element) => {
    await act(async () => {
        element.focus();
    });
};

/**
 * Blur an element wrapped in act().
 *
 * @param {HTMLElement} element - The element to blur
 * @returns {Promise<void>}
 */
export const blurWithAct = async (element) => {
    await act(async () => {
        fireEvent.blur(element);
    });
};

/**
 * Flush pending state updates by running an empty act().
 * Useful in afterEach hooks to ensure all state updates complete before cleanup.
 *
 * @returns {Promise<void>}
 */
export const flushPromises = async () => {
    await act(async () => {});
};

/**
 * Upload a file to a file input element wrapped in act().
 * Use this instead of userEvent.upload() for components with async state updates.
 *
 * @param {HTMLElement} inputElement - The file input element
 * @param {File} file - The file to upload
 * @returns {Promise<void>}
 */
export const uploadWithAct = async (inputElement, file) => {
    await act(async () => {
        fireEvent.change(inputElement, { target: { files: [file] } });
    });
};

/**
 * Trigger a keydown event wrapped in act().
 * Use this for simulating keyboard interactions.
 *
 * @param {HTMLElement} element - The element to trigger the keydown on
 * @param {string} key - The key to press (e.g., ' ', 'Enter', 'Escape')
 * @returns {Promise<void>}
 */
export const keydownWithAct = async (element, key) => {
    await act(async () => {
        fireEvent.keyDown(element, { key, code: key === " " ? "Space" : key });
    });
};
