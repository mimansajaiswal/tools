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
    isBound: false,

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

        if (!target.getAttribute('aria-describedby')) {
            if (!node.id) node.id = 'tooltip';
            target.setAttribute('aria-describedby', node.id);
        }

        node.textContent = tip;
        const rect = target.getBoundingClientRect();
        const pad = 10;
        let x = rect.left + rect.width / 2;
        x = Math.max(pad, Math.min(window.innerWidth - pad - node.offsetWidth / 2, x));
        // We need to show it first to get width, or assume max width?
        node.classList.remove('hidden'); // Show to measure

        // Re-clamp with actual width
        const width = node.offsetWidth;
        x = Math.max(pad + width / 2, Math.min(window.innerWidth - pad - width / 2, rect.left + rect.width / 2));

        const preferBelow = rect.top < 100;
        const y = preferBelow ? (rect.bottom + 8) : (rect.top - 8);
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = preferBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
        this.lastShown = target;
    },

    /**
     * Hide tooltip
     */
    hide() {
        const node = this.ensure();
        if (!node) return;
        node.classList.add('hidden');
        if (this.lastShown) {
            this.lastShown.removeAttribute('aria-describedby');
            this.lastShown = null;
        }
    },

    /**
     * Bind tooltip event listeners to document
     */
    bind() {
        if (this.isBound) return;
        this.isBound = true;
        document.addEventListener('mouseover', (e) => {
            const t = e.target.closest('[data-tip]');
            if (!t) return;
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
