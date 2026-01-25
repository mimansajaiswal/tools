/**
 * Toast Notification System
 * Provides non-blocking toast messages with auto-dismiss and manual control.
 */

import { el } from '../config.js';

let toastTimer = null;
let toastHideTimer = null;

/**
 * Show a toast message that auto-hides after 3 seconds
 * @param {string} msg - Message to display
 */
export const toast = (msg) => {
    const t = el('#toast');
    if (!t) return;

    if (toastTimer) clearTimeout(toastTimer);
    if (toastHideTimer) clearTimeout(toastHideTimer);

    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');

    t.textContent = msg;
    t.classList.remove('hidden', 'opacity-0');

    toastTimer = setTimeout(() => {
        t.classList.add('opacity-0');
        toastHideTimer = setTimeout(() => t.classList.add('hidden'), 500);
    }, 3000);
};

/**
 * Show a toast message that stays visible until manually hidden
 * @param {string} msg - Message to display
 */
export const toastLong = (msg) => {
    const t = el('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden', 'opacity-0');
    if (toastTimer) clearTimeout(toastTimer);
    if (toastHideTimer) clearTimeout(toastHideTimer);
};

/**
 * Hide the current toast message
 */
export const toastHide = () => {
    const t = el('#toast');
    if (!t) return;
    t.classList.add('opacity-0');
    if (toastTimer) clearTimeout(toastTimer);
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => t.classList.add('hidden'), 500);
};
