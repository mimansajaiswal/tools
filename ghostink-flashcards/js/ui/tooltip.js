/**
 * Tooltip System
 * Provides hover tooltips for elements with data-tip attribute.
 */

/**
 * Tooltip manager object
 */
export const Tooltip = {
    timer: null,
    lastShown: null,
    el: null,

    /**
     * Ensure tooltip element exists and return it
     * @returns {HTMLElement|null} Tooltip element
     */
    ensure() {
        this.el = this.el || document.querySelector('#tooltip');
        return this.el;
    },

    /**
     * Show tooltip for target element
     * @param {HTMLElement} target - Element with data-tip attribute
     */
    show(target) {
        if (window.innerWidth <= 640) return; // Don't show tooltips on small screens
        const tip = target.dataset.tip;
        if (!tip) return;
        const node = this.ensure();
        if (!node) return;
        node.textContent = tip;
        const rect = target.getBoundingClientRect();
        const pad = 10;
        const x = Math.min(window.innerWidth - pad, Math.max(pad, rect.left + rect.width / 2));
        const preferBelow = rect.top < 100; // near top edge: show below to avoid clipping
        const y = preferBelow ? (rect.bottom + 8) : (rect.top - 8);
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = preferBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
        node.classList.remove('hidden');
        this.lastShown = target;
    },

    /**
     * Hide tooltip
     */
    hide() {
        const node = this.ensure();
        if (!node) return;
        node.classList.add('hidden');
        this.lastShown = null;
    },

    /**
     * Bind tooltip event listeners to document
     */
    bind() {
        document.addEventListener('mouseover', (e) => {
            const t = e.target.closest('[data-tip]');
            if (!t) return;
            // Fix 8: Clear pending timer even if showing immediately to prevent stale content
            clearTimeout(this.timer);
            if (this.lastShown) { this.show(t); return; }
            this.timer = setTimeout(() => this.show(t), 160);
        });
        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.closest('[data-tip]')) {
                clearTimeout(this.timer);
                this.hide();
            }
        });
        document.addEventListener('focusin', (e) => {
            const t = e.target.closest('[data-tip]');
            if (t) this.show(t);
        });
        document.addEventListener('focusout', () => this.hide());
    }
};
