/**
 * Pet Tracker - UI Helpers
 * Modals, toasts, tabs, and common UI patterns
 */

const UI = {
    /**
     * Show a toast notification
     */
    toast: (message, type = 'info', duration = 3000) => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const colors = {
            info: 'bg-charcoal text-white-linen',
            success: 'bg-dull-purple text-white-linen',
            error: 'bg-muted-pink text-charcoal',
            warning: 'bg-oatmeal text-charcoal border border-earth-metal'
        };

        toast.className = `px-4 py-3 text-sm font-mono uppercase tracking-wide pointer-events-auto toast-enter ${colors[type] || colors.info}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 150);
        }, duration);
    },

    /**
     * Open modal by ID
     */
    openModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Store the currently focused element for restoration
            UI.lastFocusedElement = document.activeElement;

            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';

            // Focus first focusable element or the modal itself
            setTimeout(() => {
                const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea, button');
                if (firstInput) {
                    firstInput.focus();
                } else {
                    modal.setAttribute('tabindex', '-1');
                    modal.focus();
                }
            }, 100);
        }
    },

    /**
     * Close modal by ID
     */
    closeModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';

            // Restore focus to the element that opened the modal
            if (UI.lastFocusedElement && typeof UI.lastFocusedElement.focus === 'function') {
                UI.lastFocusedElement.focus();
                UI.lastFocusedElement = null;
            }
        }
    },

    /**
     * Close modal when clicking overlay
     */
    setupModalOverlays: () => {
        document.querySelectorAll('[data-modal-overlay]').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const modalId = overlay.closest('[id]')?.id;
                    if (modalId === 'addEventModal' && typeof App !== 'undefined') {
                        App.confirmCloseAddModal();
                    } else if (modalId) {
                        UI.closeModal(modalId);
                    }
                }
            });
        });

        // Global keyboard handler for modals
        document.addEventListener('keydown', UI.handleModalKeydown);
    },

    /**
     * Handle keyboard events for modals (Escape to close, Tab for focus trap)
     */
    handleModalKeydown: (e) => {
        // Find any open modal
        const openModal = document.querySelector('[role="dialog"]:not(.hidden)');
        if (!openModal) return;

        const modalId = openModal.id;

        // Escape key closes modal
        if (e.key === 'Escape') {
            e.preventDefault();
            if (modalId === 'addEventModal' && typeof App !== 'undefined') {
                App.confirmCloseAddModal();
            } else {
                UI.closeModal(modalId);
            }
            return;
        }

        // Tab key - trap focus within modal
        if (e.key === 'Tab') {
            const focusable = openModal.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    },

    /**
     * Store element that opened modal for focus restoration
     */
    lastFocusedElement: null,

    /**
     * Switch tabs
     */
    switchTab: (tabGroup, tabId) => {
        document.querySelectorAll(`[data-tab-group="${tabGroup}"]`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll(`[data-tab-panel="${tabGroup}"]`).forEach(panel => {
            panel.classList.toggle('hidden', panel.dataset.panel !== tabId);
        });
    },

    /**
     * Setup tab handlers
     */
    setupTabs: () => {
        document.querySelectorAll('[data-tab-group]').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.switchTab(btn.dataset.tabGroup, btn.dataset.tab);
            });
        });
    },

    /**
     * Confirmation dialog
     */
    confirm: (message, onConfirm, onCancel = null) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 modal-overlay" data-dismiss></div>
            <div class="relative bg-white-linen border border-oatmeal max-w-sm w-full p-6 z-10">
                <p class="text-charcoal mb-6">${message}</p>
                <div class="flex gap-3 justify-end">
                    <button class="btn-secondary px-4 py-2 font-mono text-xs uppercase" data-action="cancel">Cancel</button>
                    <button class="btn-primary px-4 py-2 font-mono text-xs uppercase" data-action="confirm">Confirm</button>
                </div>
            </div>
        `;

        const cleanup = () => modal.remove();

        modal.querySelector('[data-action="cancel"]').onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        modal.querySelector('[data-action="confirm"]').onclick = () => {
            cleanup();
            onConfirm();
        };

        modal.querySelector('[data-dismiss]').onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        document.body.appendChild(modal);
    },

    /**
     * Show loading overlay
     */
    showLoading: (message = 'Loading...') => {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay';
            overlay.innerHTML = `
                <div class="bg-white-linen border border-oatmeal p-6 flex items-center gap-4">
                    <div class="loader"></div>
                    <span class="font-mono text-xs uppercase text-charcoal" id="loadingMessage">${message}</span>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('loadingMessage').textContent = message;
            overlay.classList.remove('hidden');
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading: () => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    },

    /**
     * Render a section header
     */
    sectionHeader: (number, title) => {
        return `<span class="section-header">${String(number).padStart(2, '0')}_${title.replace(/\s+/g, '_').toUpperCase()}</span>`;
    },

    /**
     * Format date for display
     */
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    /**
     * Format time for display
     */
    formatTime: (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    },

    /**
     * Format relative time
     */
    formatRelative: (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return UI.formatDate(dateStr);
    },

    /**
     * Empty state component
     */
    emptyState: (icon, title, subtitle = '') => {
        return `
            <div class="empty-state">
                <i data-lucide="${icon}" class="empty-state-icon"></i>
                <h3 class="font-serif text-lg text-charcoal mb-2">${title}</h3>
                ${subtitle ? `<p class="text-sm text-earth-metal">${subtitle}</p>` : ''}
            </div>
        `;
    },

    /**
     * Debounce function
     */
    debounce: (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    },

    /**
     * Escape HTML
     */
    escapeHtml: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.UI = UI;
