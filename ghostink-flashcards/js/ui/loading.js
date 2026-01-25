/**
 * Loading Overlay System
 * Provides loading indicator with optional progress bar and cancel button.
 */

import { el } from '../config.js';

let currentCancelCallback = null;

/**
 * Show loading overlay with message and optional subtext
 * @param {string} msg - Main loading message
 * @param {string} subtext - Optional secondary text
 * @param {Function|null} onCancel - Optional callback when user cancels
 */
export const showLoading = (msg = 'Loading...', subtext = '', onCancel = null) => {
    const ov = el('#loadingOverlay');
    const lm = el('#loadingMessage');
    const ls = el('#loadingSubtext');
    const pw = el('#loadingProgressWrap');
    const pb = el('#loadingProgressBar');
    const pt = el('#loadingProgressText');
    const cancelBtn = el('#loadingCancelBtn');
    if (lm) lm.textContent = msg;
    if (ls) ls.textContent = subtext;

    const isVisible = ov && !ov.classList.contains('hidden');
    if (!isVisible) {
        if (pw) pw.classList.add('hidden');
        if (pb) pb.style.width = '0%';
        if (pt) pt.textContent = '0%';
    }

    // Handle cancel button
    currentCancelCallback = onCancel;
    if (cancelBtn) {
        if (onCancel) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => {
                if (currentCancelCallback) {
                    currentCancelCallback();
                    currentCancelCallback = null;
                }
            };
        } else {
            cancelBtn.classList.add('hidden');
            cancelBtn.onclick = null;
        }
    }

    if (ov) {
        ov.classList.remove('hidden');
        ov.classList.add('flex');
    }
};

/**
 * Update loading progress bar
 * @param {number} percent - Progress percentage (0-100)
 * @param {string|null} label - Optional label text (defaults to percentage)
 */
export const setLoadingProgress = (percent, label = null) => {
    const pw = el('#loadingProgressWrap');
    const pb = el('#loadingProgressBar');
    const pt = el('#loadingProgressText');
    if (pw) pw.classList.remove('hidden');
    const p = Math.min(100, Math.max(0, Number(percent) || 0));
    if (pb) pb.style.width = `${p}%`;
    if (pt) pt.textContent = label != null ? String(label) : `${Math.round(p)}%`;
};

/**
 * Hide loading overlay
 */
export const hideLoading = () => {
    const ov = el('#loadingOverlay');
    const cancelBtn = el('#loadingCancelBtn');
    currentCancelCallback = null;
    if (cancelBtn) {
        cancelBtn.classList.add('hidden');
        cancelBtn.onclick = null;
    }
    if (ov) {
        ov.classList.add('hidden');
        ov.classList.remove('flex');
    }
};
