/**
 * Loading Overlay System
 * Provides loading indicator with optional progress bar and cancel button.
 */

import { el } from '../config.js';

const loadingStack = [];

const renderStackTop = () => {
    const ov = el('#loadingOverlay');
    const lm = el('#loadingMessage');
    const ls = el('#loadingSubtext');
    const cancelBtn = el('#loadingCancelBtn');
    const mainContent = document.querySelector('main');

    if (loadingStack.length === 0) {
        if (ov) {
            ov.classList.add('hidden');
            ov.classList.remove('flex');
            ov.removeAttribute('aria-modal');
        }
        if (mainContent) {
            mainContent.removeAttribute('aria-busy');
            mainContent.removeAttribute('aria-hidden');
        }
        return;
    }

    const top = loadingStack[loadingStack.length - 1];
    if (lm) lm.textContent = top.msg;
    if (ls) ls.textContent = top.subtext;

    if (ov) {
        ov.classList.remove('hidden');
        ov.classList.add('flex');
        ov.setAttribute('role', 'alertdialog');
        ov.setAttribute('aria-modal', 'true');
    }

    if (mainContent) {
        mainContent.setAttribute('aria-busy', 'true');
        mainContent.setAttribute('aria-hidden', 'true');
    }

    if (cancelBtn) {
        if (top.onCancel) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => {
                top.onCancel();
                // We don't auto-pop here; the caller should handle logic and call hideLoading
            };
            cancelBtn.focus();
        } else {
            cancelBtn.classList.add('hidden');
            cancelBtn.onclick = null;
        }
    }
};

/**
 * Show loading overlay with message and optional subtext
 * @param {string} msg - Main loading message
 * @param {string} subtext - Optional secondary text
 * @param {Function|null} onCancel - Optional callback when user cancels
 */
export const showLoading = (msg = 'Loading...', subtext = '', onCancel = null) => {
    loadingStack.push({ msg, subtext, onCancel });
    renderStackTop();

    // Reset progress on new show
    const pw = el('#loadingProgressWrap');
    const pb = el('#loadingProgressBar');
    const pt = el('#loadingProgressText');
    if (pw) pw.classList.add('hidden');
    if (pb) pb.style.width = '0%';
    if (pt) pt.textContent = '0%';
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
    loadingStack.pop();
    renderStackTop();
};
