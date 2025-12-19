/**
 * Modal Dialog System
 * Provides generic modal open/close functionality with focus management.
 */

import { el } from '../config.js';

/**
 * Track the last focused element for returning focus after modal closes
 * Issue 7 Fix: Use a stack to handle nested modals properly
 */
const focusStack = [];

/**
 * Open a modal by ID
 * @param {string} id - Modal element ID (without #)
 */
export const openModal = (id) => {
    const m = el('#' + id);
    if (!m) return;
    // Store the element that triggered the modal
    if (document.activeElement) focusStack.push(document.activeElement);
    m.classList.remove('hidden');
    m.classList.add('flex');
    // Focus the first focusable element in the modal
    setTimeout(() => {
        const focusable = m.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    }, 50);
};

/**
 * Close a modal by ID
 * @param {string} id - Modal element ID (without #)
 */
export const closeModal = (id) => {
    const m = el('#' + id);
    if (!m) return;
    m.classList.add('hidden');
    m.classList.remove('flex');
    // Return focus to the element that triggered the modal
    const prev = focusStack.pop();
    if (prev) {
        prev.focus();
    }
};

/**
 * Get the last focused element (for App state compatibility)
 * @returns {Element|null}
 */
export const getLastFocusedElement = () => focusStack.length > 0 ? focusStack[focusStack.length - 1] : null;

/**
 * Set the last focused element (for App state compatibility)
 * @param {Element|null} element
 */
export const setLastFocusedElement = (element) => {
    if (element) focusStack.push(element);
};

/**
 * Setup click-outside-to-close for a modal
 * @param {string} id - Modal element ID (without #)
 */
export const setupModalClickOutside = (id) => {
    const m = el('#' + id);
    if (!m) return;
    m.addEventListener('click', (e) => {
        if (e.target === m) closeModal(id);
    });
};
