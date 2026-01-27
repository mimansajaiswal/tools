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

    // Build toast content with close button
    t.innerHTML = `<span class="toast-message">${msg}</span><button type="button" class="toast-close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
    t.classList.remove('hidden', 'opacity-0');

    // Only close button dismisses the toast
    const closeBtn = t.querySelector('.toast-close');
    if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); toastHide(); };

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
    // Build toast content with close button
    t.innerHTML = `<span class="toast-message">${msg}</span><button type="button" class="toast-close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
    t.classList.remove('hidden', 'opacity-0');
    if (toastTimer) clearTimeout(toastTimer);
    if (toastHideTimer) clearTimeout(toastHideTimer);
    // Only close button dismisses the toast
    const closeBtn = t.querySelector('.toast-close');
    if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); toastHide(); };
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
