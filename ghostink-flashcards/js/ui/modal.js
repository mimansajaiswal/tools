/**
 * Modal Dialog System
 * Provides generic modal open/close functionality with focus management.
 */

import { el } from '../config.js';

/**
 * Track the last focused element for returning focus after modal closes
 */
const focusStack = [];
let focusTimeout = null;
let activeModal = null;

const handleTabKey = (e) => {
    if (e.key !== 'Tab' || !activeModal) return;
    const focusables = activeModal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) {
        e.preventDefault();
        return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
        if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
    } else {
        if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
};

/**
 * Open a modal by ID
 * @param {string} id - Modal element ID (without #)
 */
export const openModal = (id) => {
    const m = el('#' + id);
    if (!m) return;

    // Push current focus to stack if valid
    if (document.activeElement && document.body.contains(document.activeElement)) {
        focusStack.push(document.activeElement);
    }

    m.classList.remove('hidden');
    m.classList.add('flex');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('role', 'dialog');

    activeModal = m;
    document.addEventListener('keydown', handleTabKey);

    if (focusTimeout) clearTimeout(focusTimeout);

    // Focus the first focusable element in the modal
    focusTimeout = setTimeout(() => {
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
    m.removeAttribute('aria-modal');

    if (activeModal === m) {
        document.removeEventListener('keydown', handleTabKey);
        activeModal = null;
    }

    if (focusTimeout) clearTimeout(focusTimeout);

    // Return focus to the element that triggered the modal
    let prev = focusStack.pop();
    while (prev && !document.body.contains(prev)) {
        prev = focusStack.pop();
    }
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
    if (m._clickOutsideAttached) return;
    m.addEventListener('click', (e) => {
        if (e.target === m) closeModal(id);
    });
    m._clickOutsideAttached = true;
};
