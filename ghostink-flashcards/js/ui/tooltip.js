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
    lastMouse: null,

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
    show(target, pos = null) {
        const force = !!(pos && pos.force);
        if (window.innerWidth <= 640 && !force) return; // Don't show tooltips on small screens unless forced
        const tip = target.dataset.tip;
        if (!tip) return;
        const node = this.ensure();
        if (!node) return;

        if (!target.getAttribute('aria-describedby')) {
            if (!node.id) node.id = 'tooltip';
            target.setAttribute('aria-describedby', node.id);
        }

        node.textContent = tip;
        node.classList.remove('hidden'); // Show to measure
        const pad = 10;
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        const cursor = pos || this.lastMouse;
        if (cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y)) {
            let x = cursor.x + 12;
            let y = cursor.y + 12;
            x = Math.max(pad, Math.min(window.innerWidth - pad - width, x));
            y = Math.max(pad, Math.min(window.innerHeight - pad - height, y));
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = 'translate(0, 0)';
        } else {
            const rect = target.getBoundingClientRect();
            let x = rect.left + rect.width / 2;
            x = Math.max(pad, Math.min(window.innerWidth - pad - width / 2, x));
            const preferBelow = rect.top < 100;
            const y = preferBelow ? (rect.bottom + 8) : (rect.top - 8);
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = preferBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
        }
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
        document.addEventListener('mousemove', (e) => {
            this.lastMouse = { x: e.clientX, y: e.clientY };
            if (this.lastShown) this.show(this.lastShown, this.lastMouse);
        });
        document.addEventListener('mouseover', (e) => {
            const t = e.target.closest('[data-tip]');
            if (!t) return;
            clearTimeout(this.timer);
            if (this.lastShown) { this.show(t, { x: e.clientX, y: e.clientY }); return; }
            this.timer = setTimeout(() => this.show(t, { x: e.clientX, y: e.clientY }), 80);
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
        document.addEventListener('click', (e) => {
            if (window.innerWidth > 640) return;
            const t = e.target.closest('[data-tip]');
            if (!t) {
                this.hide();
                return;
            }
            const isHeatmapCell = t.classList.contains('heatmap-cell') || !!t.closest('.heatmap-cell');
            if (!isHeatmapCell) return;
            this.show(t, { x: e.clientX, y: e.clientY, force: true });
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.hide(), 1800);
        });
    }
};
