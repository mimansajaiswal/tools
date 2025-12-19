/**
 * GhostInk Flashcards - Main Application Module
 * Contains the main App object with all application logic.
 */

// Import core modules
import {
    SYNC_INTERVAL_MS,
    MIN_PULL_INTERVAL_MS,
    MIN_PUSH_INTERVAL_MS,
    fsrsW,
    DEFAULT_DESIRED_RETENTION,
    MAX_INTERVAL,
    ratingsMap,
    DEFAULT_AI_PROMPT,
    el,
    isMac,
    encodeDataAttr,
    decodeDataAttr,
    escapeHtml,
    sleep,
    clamp2,
    constrainDifficulty,
    clampRetention,
    constrainWeights,
    debounce
} from './config.js';

import { Storage } from './storage.js';
import { API } from './api.js';

import {
    SRS,
    getDecay,
    getFactor,
    meanReversion,
    initDifficulty,
    initStability,
    forgettingCurve,
    nextInterval,
    nextDifficulty,
    nextRecallStability,
    nextForgetStability,
    nextShortTermStability,
    normalizeRating,
    displayRating,
    detectCardType,
    simulateFsrsReviewAt,
    buildFsrsTrainingSet,
    fsrsLogLoss
} from './srs.js';

import {
    NotionMapper,
    toRichTextChunks,
    compactReviewHistory,
    parseReviewHistory,
    richToMarkdown,
    markdownToNotionRichText,
    parseFsrsParamsText,
    serializeFsrsParamsText
} from './notion-mapper.js';

import {
    toast,
    toastLong,
    toastHide,
    showLoading,
    setLoadingProgress,
    hideLoading,
    Tooltip,
    openModal as uiOpenModal,
    closeModal as uiCloseModal,
    setLastFocusedElement
} from './ui/index.js';

import {
    initLightbox,
    getLightbox,
    destroyLightbox,
    refreshLightbox,
    cleanupTempLightboxes,
    applyMediaEmbeds,
    getMediaInfo,
    createMediaFigure,
    stripUrlPunctuation
} from './features/media.js';

// Configure marked to open all links in new tab
const renderer = new marked.Renderer();
const originalLinkRenderer = renderer.link.bind(renderer);
renderer.link = (href, title, text) => {
    const html = originalLinkRenderer(href, title, text);
    return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
};
marked.use({ renderer });

// Phase 5: Safe markdown parse wrapper - returns raw markdown on failure
const safeMarkdownParse = (md) => {
    if (!md) return '';
    try {
        return marked.parse(md);
    } catch (e) {
        console.error('Markdown parse error:', e);
        return md;  // Return raw markdown on failure
    }
};

// Phase 12: Safe history state wrapper - silently catches quota/security errors
const safeHistoryReplace = (data, title, url) => {
    try {
        history.replaceState(data, title, url);
    } catch (e) {
        console.warn('History replaceState failed:', e);
    }
};

// Phase 17: Scoped lucide icon creation - avoid scanning whole document
const createIconsInScope = (container) => {
    if (container && container.querySelectorAll) {
        lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') });
    } else {
        lucide.createIcons();
    }
};

// Phase 22: Focus trap for modals
const focusTrap = {
    active: null,
    handleKeydown(e) {
        if (e.key !== 'Tab' || !focusTrap.active) return;
        const focusable = focusTrap.active.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    },
    attach(modal) {
        focusTrap.active = modal;
        document.addEventListener('keydown', focusTrap.handleKeydown);
        const first = modal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (first) setTimeout(() => first.focus(), 10);
    },
    detach() {
        focusTrap.active = null;
        document.removeEventListener('keydown', focusTrap.handleKeydown);
    }
};

// Initialize lightbox on module load
const lightbox = initLightbox();

// Main App object
export const App = {
    state: {
        decks: [],
        cards: [],
        queue: [],
        lastQueueError: null,
        queueLastChangedAt: null,
        selectedDeck: null,
        selectedCard: null,
        filters: { again: false, hard: false, addedToday: false, tags: [], suspended: false, leech: false, studyDecks: [] },
        cardSearch: '',
        deckSearch: '',
        cardLimit: 50,
        cardLimitStep: 50,
        reverse: false,
        lastSync: null,
        lastPull: null,
        lastPush: null,
        activeTab: 'study',
        settings: Storage.getSettings(),
        sourcesCache: { deckOptions: [], cardOptions: [] },
        workerVerified: Storage.getSettings().workerVerified || false,
        authVerified: Storage.getSettings().authVerified || false,
        sourcesVerified: Storage.getSettings().sourcesVerified || false,
        autoSyncTimer: null,
        autoSyncSoonTimer: null,
        syncing: false,
        autoScanPending: false,
        answerRevealed: false,
        aiLocked: false,
        lockAiUntilNextCard: false,
        activeMicButton: null,  // 'inline' | 'fab'
        micPermissionPromise: null,
        cardReversed: false,
        studyNonDue: false,
        session: null,  // Active study session (loaded from localStorage)
        sessionReversed: null,  // Pre-computed reverse decision from session
        lastRating: null,  // For undo feature: { cardId, sm2, fsrs, history, rating, sessionIndex }
        undoToastTimeout: null,
        tagOptions: [],
        tagSelection: [],
        userStoppedMic: false,
        activeAudioStream: null,
        fabSetupMode: false,
        joystickActive: false,
        joystickHandlers: null
    },
    isAiModeSelected() {
        return el('#revisionMode')?.value === 'ai';
    },
    isAiModeUsable() {
        if (!this.isAiModeSelected()) return false;
        if (!navigator.onLine) return false;
        if (!this.state.settings.aiVerified) return false;
        if (!this.state.settings.aiKey) return false;
        return true;
    },
    async init() {
        this.applyTheme();
        this.applyFontMode();
        this.applyFabPosition();

        showLoading('Preparing app...', 'Loading your decks and cards.');
        await Storage.init();
        await this.loadFromDB();
        if (!this.state.tagOptions || this.state.tagOptions.length === 0) {
            this.state.tagOptions = this.buildLocalTagOptions();
        }
        await this.loadSession();  // Load any active study session (async for IndexedDB)
        this.captureOAuth();
        this.bind();
        this.seedIfEmpty();
        this.renderAll();
        await this.autoVerifyWorker();
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        // Issue 2 Fix: Check initial online state
        if (!navigator.onLine) {
            document.body.classList.add('offline-mode');
        }
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', () => this.applyTheme());
        }
        Tooltip.bind();
        this.startAutoSync();
        hideLoading();
    },
    async loadSession() {
        this.state.session = await Storage.getSession();
    },
    saveSession() {
        // Fire-and-forget async save - session is cached in Storage for sync access
        Storage.setSession(this.state.session).catch(e => {
            console.error('Failed to save session:', e);
        });
    },
    // Debounced version for frequent updates during study
    _debouncedSaveSession: null,
    saveSessionDebounced() {
        if (!this._debouncedSaveSession) {
            this._debouncedSaveSession = debounce(() => {
                Storage.setSession(this.state.session).catch(e => {
                    console.error('Failed to save session:', e);
                });
            }, 500);
        }
        this._debouncedSaveSession();
    },
    setSyncButtonSpinning(on) {
        const btn = el('#syncNowBtn');
        if (!btn) return;
        const icon = btn.querySelector('i');
        btn.disabled = on || !navigator.onLine || this.state.syncing;
        btn.classList.toggle('opacity-70', btn.disabled);
        if (icon) icon.classList.toggle('animate-spin', on);
    },
    async ensureMicPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
        if (this.state.micPermissionPromise) return this.state.micPermissionPromise;
        this.state.micPermissionPromise = navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Immediately stop the tracks: we only want the permission grant, not an always-on mic.
                // Keeping a live stream makes the browser show "microphone in use" even when not recording.
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                // Only set warmed state after successfully stopping tracks
                this.state.settings.sttPermissionWarmed = true;
                Storage.setSettings(this.state.settings);
                return true;
            })
            .catch(err => {
                // Permission denied or other error - ensure state reflects reality
                this.state.settings.sttPermissionWarmed = false;
                Storage.setSettings(this.state.settings);
                throw err;
            })
            .finally(() => {
                this.state.micPermissionPromise = null;
            });
        return this.state.micPermissionPromise;
    },
    warmMicStreamForAi() {
        // Only warm when explicitly requested elsewhere; avoid auto prompts on load
        if (this.state.micPermissionPromise) return;
        this.ensureMicPermission().catch(() => { /* permission denied handled later */ });
    },
    isSttEnabled() {
        return !!this.state.settings.sttProvider;
    },
    stopMicActivity(hideFeedback = false) {
        const hadActive = this.isMicActive() || !!this.state.activeAudioStream;
        try {
            if (this.state.activeAudioStream) {
                this.state.activeAudioStream.getTracks().forEach(t => t.stop());
                this.state.activeAudioStream = null;
            }
        } catch (_) { this.state.activeAudioStream = null; }
        try {
            if (this.state.currentRecorder && typeof this.state.currentRecorder.stop === 'function') {
                // SpeechRecognition can keep the system mic indicator on until it fully ends;
                // abort() is the most reliable way to release immediately.
                if (typeof this.state.currentRecorder.abort === 'function') {
                    try { this.state.currentRecorder.abort(); } catch (_) { }
                } else {
                    this.state.currentRecorder.stop();
                }
            }
        } catch (_) { }
        try {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        } catch (_) { }
        this.state.currentRecorder = null;
        this.mediaRecorder = null;
        // Preserve `userStoppedMic` while async onend/onstop handlers run (cloud STT uses it).
        // If nothing was active, clear it to avoid stale UI state.
        if (!hadActive) this.state.userStoppedMic = false;
        this.state.activeMicButton = null;
        if (hideFeedback) {
            const feedback = el('#aiFeedback');
            if (feedback) { feedback.classList.add('hidden'); feedback.innerHTML = ''; }
        }
        this.setMicVisualState(false);
        this.setAiControlsLocked(this.state.aiLocked);
        this.updateMobileFab();
    },
    async getMicStream() {
        // Request a fresh stream for actual recording; do not keep the mic open between actions.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Microphone unsupported');
        return navigator.mediaDevices.getUserMedia({ audio: true });
    },
    isMicActive() {
        return !!this.state.currentRecorder || (this.mediaRecorder && this.mediaRecorder.state === 'recording');
    },
    toggleMicRecording() {
        const isAiMode = this.isAiModeUsable();
        if (!isAiMode || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;

        if (this.isMicActive()) {
            const feedback = el('#aiFeedback');
            if (feedback) {
                const txt = (feedback.textContent || '').toLowerCase();
                if (txt.includes('listening') || txt.includes('recording')) {
                    feedback.classList.remove('hidden');
                    feedback.innerHTML = 'Captured. Now send.';
                }
            }
            this.stopMicActivity(false);
            return;
        }

        this.recordAnswer();
    },
    setMicVisualState(listening) {
        const micBtn = el('#aiRecord');
        const fabMic = el('#fabMic');
        const buttons = [micBtn, fabMic];
        // Reset all
        buttons.forEach(btn => {
            if (!btn) return;
            btn.classList.remove('ring', 'ring-dull-purple', 'ring-offset-2', 'animate-pulse', 'bg-dull-purple/20');
        });
        if (!listening) return;
        const target = this.state.activeMicButton === 'fab' ? fabMic : micBtn || fabMic;
        if (!target) return;
        target.classList.add('ring', 'ring-dull-purple', 'ring-offset-2', 'animate-pulse', 'bg-dull-purple/20');
    },
    setAiControlsLocked(locked) {
        if (!locked && this.state.lockAiUntilNextCard && !this.state.answerRevealed) {
            locked = true;
        }
        this.state.aiLocked = locked;
        const sendBtn = el('#aiSubmit');
        const micBtn = el('#aiRecord');
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');
        const isAiMode = this.isAiModeUsable();
        const sttEnabled = this.isSttEnabled();
        const listening = this.isMicActive();
        const answerField = el('#aiAnswer');
        const lockInput = isAiMode && locked;
        if (sendBtn) {
            sendBtn.disabled = locked || sendBtn.dataset.empty === '1';
            sendBtn.classList.toggle('opacity-50', sendBtn.disabled);
            sendBtn.classList.toggle('cursor-not-allowed', sendBtn.disabled);
            sendBtn.classList.toggle('hidden', isAiMode && locked);
        }
        if (micBtn) {
            micBtn.disabled = locked;
            micBtn.classList.toggle('opacity-50', micBtn.disabled);
            micBtn.classList.toggle('cursor-not-allowed', micBtn.disabled);
            micBtn.classList.toggle('hidden', isAiMode && (locked || !sttEnabled));
        }
        if (answerField) {
            answerField.disabled = lockInput;
            answerField.readOnly = lockInput;
            answerField.classList.toggle('pointer-events-none', lockInput);
            answerField.classList.toggle('opacity-60', lockInput);
        }
        if (fabMic) {
            fabMic.disabled = locked;
            fabMic.classList.toggle('opacity-50', fabMic.disabled);
            fabMic.classList.toggle('cursor-not-allowed', fabMic.disabled);
            fabMic.classList.toggle('hidden', isAiMode && (locked || !sttEnabled));
        }
        if (fabSend) {
            fabSend.disabled = locked || (sendBtn && sendBtn.dataset.empty === '1');
            fabSend.classList.toggle('opacity-50', fabSend.disabled);
            fabSend.classList.toggle('cursor-not-allowed', fabSend.disabled);
        }
        this.setMicVisualState(listening);
        this.updateMobileFab();
    },
    generateCardQueue(deckIds, includeNonDue = false) {
        const selectedDeckIds = (deckIds || []).filter(id => !!this.deckById(id));
        if (selectedDeckIds.length === 0) return [];

        const candidateCards = this.state.cards.filter(c =>
            selectedDeckIds.includes(c.deckId) &&
            this.passFilters(c) &&
            (includeNonDue || this.isDue(c))
        );

        if (candidateCards.length === 0) return [];

        // Fix: Improved new card detection - check learning state AND review history
        // A card is "new" only if it has never been reviewed (no history, no repetitions, no learning state)
        const isNewCard = (card) => {
            const lastReview = card.fsrs?.lastReview || card.sm2?.lastReview || null;
            const hasHistory = Array.isArray(card.reviewHistory) && card.reviewHistory.length > 0;
            const reps = card.sm2?.repetitions ?? 0;
            // Check learning state - cards in learning are NOT new, they're being learned
            const isLearning = card.fsrs?.state === 'learning' || card.sm2?.state === 'learning';
            // A card is only new if it has no reviews, no history, no repetitions, and is not in learning
            return !lastReview && !hasHistory && reps === 0 && !isLearning;
        };

        const shuffleInPlace = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };

        const applyOrderForDeck = (arr, deck, isNewCards = false) => {
            const mode = deck?.orderMode || 'none';
            // Fix: Add shuffle option for new cards (separate from review cards)
            const shuffleNewCards = deck?.shuffleNew ?? true; // Default to shuffling new cards

            if (isNewCards && shuffleNewCards && mode !== 'property') {
                // Shuffle new cards unless explicitly ordered by property
                shuffleInPlace(arr);
                return;
            }

            if (mode === 'created') {
                arr.sort((a, b) => {
                    const aKey = a.createdAt || a.id || '';
                    const bKey = b.createdAt || b.id || '';
                    return aKey.localeCompare(bKey);
                });
                return;
            }
            if (mode === 'property') {
                const maxVal = Number.MAX_SAFE_INTEGER;
                arr.sort((a, b) => {
                    const aOrder = typeof a.order === 'number' ? a.order : maxVal;
                    const bOrder = typeof b.order === 'number' ? b.order : maxVal;
                    if (aOrder === bOrder) {
                        const aKey = a.createdAt || a.id || '';
                        const bKey = b.createdAt || b.id || '';
                        return aKey.localeCompare(bKey);
                    }
                    return aOrder - bOrder;
                });
                return;
            }
            // Default: shuffle within that deck (so mixed sessions can still interleave).
            shuffleInPlace(arr);
        };

        // Interleave multiple per-deck sequences while preserving the relative order within each deck.
        // This gives "mixed sessions" where deck-specific ordering is respected but decks are blended.
        const interleavePreservingOrder = (deckToArr) => {
            const ids = Object.keys(deckToArr || {}).filter(id => Array.isArray(deckToArr[id]) && deckToArr[id].length > 0);
            if (ids.length === 0) return [];
            const remaining = new Map(ids.map(id => [id, deckToArr[id].slice()]));
            const out = [];
            while (true) {
                const choices = ids.filter(id => (remaining.get(id) || []).length > 0);
                if (choices.length === 0) break;
                let total = 0;
                for (const id of choices) total += remaining.get(id).length;
                let r = Math.random() * total;
                let chosen = choices[0];
                for (const id of choices) {
                    r -= remaining.get(id).length;
                    if (r <= 0) { chosen = id; break; }
                }
                out.push(remaining.get(chosen).shift());
            }
            return out;
        };

        const reviewBuckets = {};
        const newBuckets = {};
        const allBuckets = {};

        // Fix: Track seen card IDs to prevent double-counting
        const seenCardIds = new Set();

        for (const deckId of selectedDeckIds) {
            const deck = this.deckById(deckId);
            const deckCards = candidateCards.filter(c => c.deckId === deckId && !seenCardIds.has(c.id));
            if (deckCards.length === 0) continue;

            // Mark all cards in this deck as seen
            deckCards.forEach(c => seenCardIds.add(c.id));

            if (includeNonDue) {
                // Practice mode: cap per deck using reviewLimit, preserve deck-specific ordering.
                const limit = Math.max(0, deck?.reviewLimit ?? 50);
                const arr = deckCards.slice();
                applyOrderForDeck(arr, deck);
                allBuckets[deckId] = arr.slice(0, limit);
            } else {
                // Due-only: cap per deck with separate review vs new limits.
                const reviewLimit = Math.max(0, deck?.reviewLimit ?? 50);
                const newLimit = Math.max(0, deck?.newLimit ?? 20);
                const newCards = deckCards.filter(isNewCard);
                const reviewCards = deckCards.filter(c => !isNewCard(c));
                applyOrderForDeck(reviewCards, deck, false);
                applyOrderForDeck(newCards, deck, true); // Apply separate ordering for new cards
                reviewBuckets[deckId] = reviewCards.slice(0, reviewLimit);
                newBuckets[deckId] = newCards.slice(0, newLimit);
            }
        }

        const chosen = includeNonDue
            ? interleavePreservingOrder(allBuckets)
            : [...interleavePreservingOrder(reviewBuckets), ...interleavePreservingOrder(newBuckets)];

        // Pre-compute reverse decisions PER-CARD based on its own deck's settings.
        return chosen.map(card => {
            const deck = this.deckById(card.deckId);
            const typeKey = (card.type || '').toLowerCase();
            const isCloze = typeKey === 'cloze';
            const isFrontStyle = typeKey.includes('front');
            // Never reverse cloze cards. Reverse only if the source deck enables it.
            const shouldReverse = !isCloze && !!deck?.reverse && isFrontStyle && Math.random() < 0.5;
            return { cardId: card.id, reversed: shouldReverse };
        });
    },
    startSession() {
        // Default to all decks if none selected
        let deckIds = this.state.filters.studyDecks || [];
        if (deckIds.length === 0) {
            deckIds = this.state.decks.map(d => d.id);
        }
        if (deckIds.length === 0) {
            toast('No decks available');
            return;
        }

        // Check card selection mode (due only vs all)
        const cardSelectionMode = el('#cardSelectionMode')?.value || 'due';
        let revisionMode = el('#revisionMode')?.value || 'manual';

        if (revisionMode === 'ai' && !navigator.onLine) {
            revisionMode = 'manual';
            toast('Offline: switched to Manual mode');
        }

        const includeNonDue = cardSelectionMode === 'all';
        const noScheduleChanges = includeNonDue
            ? (el('#noScheduleChanges')?.checked ?? true)
            : false;

        const cardQueue = this.generateCardQueue(deckIds, includeNonDue);

        // Edge Case 1 Fix: Better empty deck handling with helpful options
        if (cardQueue.length === 0) {
            if (includeNonDue) {
                // No cards at all in the selected decks
                toast('No cards in selected decks');
            } else {
                // Check if there are non-due cards available for practice
                const allCardsInDecks = this.state.cards.filter(c => deckIds.includes(c.deckId) && this.passFilters(c));
                const nonDueCount = allCardsInDecks.filter(c => !this.isDue(c)).length;

                if (nonDueCount > 0) {
                    // Show a more helpful message with option to practice
                    toastLong(`All caught up! ${nonDueCount} card${nonDueCount === 1 ? ' is' : 's are'} available for extra practice.`);
                    // Auto-switch to the practice mode offer in renderStudy
                    this.renderStudy();
                } else {
                    toast('No cards available - add some cards to get started');
                }
            }
            return;
        }

        const deck = this.deckById(deckIds[0]);
        this.state.session = {
            id: 'session_' + Date.now(),
            startedAt: new Date().toISOString(),
            startTime: Date.now(),
            deckIds: deckIds,
            algorithm: deck?.algorithm || 'SM-2',
            settings: {
                revisionMode: revisionMode,
                cardSelectionMode: cardSelectionMode,
                filters: { ...this.state.filters }
            },
            cardQueue: cardQueue,
            currentIndex: 0,
            completed: [],
            skipped: [],
            studyingNonDue: includeNonDue,
            ratingCounts: { Again: 0, Hard: 0, Good: 0, Easy: 0 },
            noScheduleChanges
        };

        this.saveSession();
        this.renderStudy();
        toast(`Session started: ${cardQueue.length} cards`);
    },
    abandonSession() {
        this.state.session = null;
        this.saveSession();
        this.renderStudy();
        toast('Session stopped');
        if (this.state.queue.length > 0) this.requestAutoSyncSoon(200, 'session-end');
    },
    getSessionCard() {
        const session = this.state.session;
        // Issue 1 Fix: Automatically skip deleted/archived cards to prevent session stall
        while (session && session.currentIndex < session.cardQueue.length) {
            const queueItem = session.cardQueue[session.currentIndex];
            const card = this.cardById(queueItem.cardId);
            if (card) {
                return {
                    card: card,
                    reversed: queueItem.reversed
                };
            }
            // Card deleted or not found; skip it and persist progress
            console.warn(`Skipping deleted card in session: ${queueItem.cardId}`);
            session.skipped.push(queueItem.cardId);
            session.currentIndex++;
            this.saveSessionDebounced();
        }
        return null;
    },
    advanceSession(wasSkipped = false) {
        const session = this.state.session;
        if (!session) return;

        // Bug fix: Guard against race conditions from rapid calls (double-tap, etc.)
        if (this.state._advancingSession) return;
        this.state._advancingSession = true;

        // Issue 3 Fix: Cleanup temporary lightbox instances when switching cards
        cleanupTempLightboxes();

        const queueItem = session.cardQueue[session.currentIndex];
        if (queueItem) {
            if (wasSkipped) {
                session.skipped.push(queueItem.cardId);
            } else {
                session.completed.push(queueItem.cardId);
            }
        }

        session.currentIndex++;
        // Debounced save is sufficient - IndexedDB persists locally, no crash risk
        this.saveSessionDebounced();

        // Add fade transition between cards
        const cardFront = el('#cardFront');
        const cardBack = el('#cardBack');
        if (cardFront) cardFront.classList.add('card-transitioning');
        if (cardBack) cardBack.classList.add('card-transitioning');

        // Use a local reference to avoid closure issues if session changes
        const currentSession = session;
        setTimeout(() => {
            try {
                // Check if session is complete
                if (currentSession.currentIndex >= currentSession.cardQueue.length) {
                    this.renderSessionComplete();
                } else {
                    this.renderStudy();
                }
                if (cardFront) cardFront.classList.remove('card-transitioning');
                if (cardBack) cardBack.classList.remove('card-transitioning');
            } finally {
                // Always release the guard, even if render throws
                this.state._advancingSession = false;
            }
        }, 150);
    },
    renderSessionComplete() {
        const session = this.state.session;
        if (!session) return;

        const completedCount = session.completed.length;
        const skippedCount = session.skipped.length;

        // Calculate session statistics
        const durationMs = Date.now() - (session.startTime || Date.now());
        const durationMins = Math.round(durationMs / 60000);
        const cardsPerMin = durationMins > 0 ? (completedCount / durationMins).toFixed(1) : completedCount;
        const ratings = session.ratingCounts || { Again: 0, Hard: 0, Good: 0, Easy: 0 };
        const totalRatings = ratings.Again + ratings.Hard + ratings.Good + ratings.Easy;

        // Update session UI to show completion state
        const activeBar = el('#sessionActiveBar');
        const progressText = el('#sessionProgressText');
        if (activeBar) {
            progressText.textContent = `Study Session - Complete!`;
        }

        // Hide mobile FAB since session is complete (showing stats)
        this.updateMobileFab();

        // Hide all study controls
        const studyControls = el('#studyControls');
        if (studyControls) studyControls.classList.add('hidden');
        const revealBtn = el('#revealBtn');
        if (revealBtn) revealBtn.classList.add('hidden');
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.add('hidden');
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.add('hidden');
        const notesSection = el('#notesSection');
        if (notesSection) notesSection.classList.add('hidden');

        // Calculate percentages for positioning
        const againPct = totalRatings > 0 ? (ratings.Again / totalRatings * 100) : 0;
        const hardPct = totalRatings > 0 ? (ratings.Hard / totalRatings * 100) : 0;
        const goodPct = totalRatings > 0 ? (ratings.Good / totalRatings * 100) : 0;
        const easyPct = totalRatings > 0 ? (ratings.Easy / totalRatings * 100) : 0;

        // Build rating distribution bar with aligned numbers
        const ratingBar = totalRatings > 0 ? `
                    <div class="flex w-full h-2 rounded-full overflow-hidden bg-oatmeal-dark/30 dark:bg-white/10 mt-2">
                        ${ratings.Again > 0 ? `<div class="bg-red-400 dark:bg-red-700" style="width: ${againPct}%"></div>` : ''}
                        ${ratings.Hard > 0 ? `<div class="bg-orange-400 dark:bg-orange-700" style="width: ${hardPct}%"></div>` : ''}
                        ${ratings.Good > 0 ? `<div class="bg-green-400 dark:bg-green-700" style="width: ${goodPct}%"></div>` : ''}
                        ${ratings.Easy > 0 ? `<div class="bg-blue-400 dark:bg-blue-700" style="width: ${easyPct}%"></div>` : ''}
                    </div>
                    <div class="flex w-full text-[10px] mt-1">
                        ${ratings.Again > 0 ? `<span class="text-red-500 dark:text-red-200 text-center" style="width: ${againPct}%">${ratings.Again}</span>` : ''}
                        ${ratings.Hard > 0 ? `<span class="text-orange-500 dark:text-orange-200 text-center" style="width: ${hardPct}%">${ratings.Hard}</span>` : ''}
                        ${ratings.Good > 0 ? `<span class="text-green-500 dark:text-green-200 text-center" style="width: ${goodPct}%">${ratings.Good}</span>` : ''}
                        ${ratings.Easy > 0 ? `<span class="text-blue-500 dark:text-blue-200 text-center" style="width: ${easyPct}%">${ratings.Easy}</span>` : ''}
                    </div>
                ` : '';

        el('#studyDeckLabel').textContent = 'Session Complete';
        el('#cardFront').innerHTML = `
                    <div class="text-center py-4 md:py-6">
                        <h3 class="font-display text-base md:text-lg text-charcoal mb-1">Session Complete</h3>
                        <p class="text-earth-metal/60 text-xs md:text-sm">
                            ${completedCount} card${completedCount !== 1 ? 's' : ''} reviewed${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}
                        </p>
                        <p class="text-earth-metal/50 dark:text-white/60 text-[10px] md:text-xs mb-3">
                            ${durationMins > 0 ? `${durationMins} min` : '<1 min'} · ${cardsPerMin} cards/min
                        </p>
                        <div class="max-w-[200px] mx-auto mb-4">
                            ${ratingBar}
                        </div>
                        <div class="flex flex-col gap-3 items-center">
                            <div class="flex flex-col items-center">
                                <button id="restartAllCardsBtn" class="px-4 py-2 bg-dull-purple text-white rounded-lg text-sm hover:bg-dull-purple/90 transition">
                                    Restart
                                </button>
                                <label class="flex items-center gap-2 text-[11px] text-earth-metal/70 mt-2">
                                    <input id="restartNoScheduleChanges" type="checkbox" class="accent-dull-purple" checked>
                                    <span>No scheduling changes</span>
                                </label>
                                <p class="text-[10px] md:text-xs text-earth-metal/50 dark:text-white/60 mt-1">Restart with all cards in selected decks</p>
                            </div>
                            <button id="endSessionBtn" class="px-4 py-2 border border-oatmeal-dark/60 text-earth-metal/70 rounded-lg text-sm hover:bg-oatmeal/50 transition">
                                End Session
                            </button>
                        </div>
                    </div>
                `;
        el('#cardBack').innerHTML = '';
        el('#cardBack').classList.add('hidden');
        this.state.selectedCard = null;
        this.setRatingEnabled(false);

        // Bind completion buttons
        setTimeout(() => {
            const restartBtn = el('#restartAllCardsBtn');
            const endBtn = el('#endSessionBtn');
            if (restartBtn) restartBtn.onclick = () => this.restartWithAllCards();
            if (endBtn) endBtn.onclick = () => this.abandonSession();
        }, 0);
    },
    restartWithAllCards() {
        const session = this.state.session;
        if (!session) return;

        const previewCheckbox = el('#restartNoScheduleChanges');
        const noScheduleChanges = previewCheckbox ? previewCheckbox.checked : true;
        const cardQueue = this.generateCardQueue(session.deckIds, true);
        if (cardQueue.length === 0) {
            toast('No cards available');
            this.abandonSession();
            return;
        }

        session.cardQueue = cardQueue;
        session.currentIndex = 0;
        session.completed = [];
        session.skipped = [];
        session.studyingNonDue = true;
        session.noScheduleChanges = noScheduleChanges;
        if (session.settings) session.settings.cardSelectionMode = 'all';
        this.saveSession();
        this.renderStudy();
        toast(`Practicing ${cardQueue.length} cards`);
    },
    captureOAuth() {
        const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
        const searchParams = new URLSearchParams(location.search);
        const token = hashParams.get('token') || searchParams.get('token') || searchParams.get('accessToken');
        if (token) {
            this.state.settings.authToken = token;
            this.state.authVerified = true;
            this.state.settings.authVerified = true;
            Storage.setSettings(this.state.settings);
            toast('Notion token captured');
            safeHistoryReplace({}, document.title, location.pathname);
            this.openSettings();
            if (this.state.settings.workerUrl) {
                this.scanSources();
            } else {
                toast('Add worker URL then scan sources');
            }
        }
    },
    async loadFromDB() {
        this.state.decks = (await Storage.getAll('decks')).map(d => ({
            ...d,
            orderMode: d.orderMode || (d.ordered ? 'created' : 'none') || 'none',
            aiPrompt: d.aiPrompt || DEFAULT_AI_PROMPT,
            fsrsDesiredRetention: clampRetention(d.fsrsDesiredRetention ?? DEFAULT_DESIRED_RETENTION),
            fsrsWeights: Array.isArray(d.fsrsWeights) && d.fsrsWeights.length === 21 ? d.fsrsWeights : (d.fsrsWeights || null)
        }));
        this.state.cards = await Storage.getAll('cards');
        this.state.queue = (await Storage.getMeta('queue')) || [];
        this.state.lastQueueError = (await Storage.getMeta('lastQueueError')) || null;
        this.state.queueLastChangedAt = (await Storage.getMeta('queueLastChangedAt')) || null;
        const meta = await Storage.getAll('meta');
        const last = meta.find(m => m.key === 'lastSync');
        if (last) this.state.lastSync = last.value;
        const lp = meta.find(m => m.key === 'lastPull');
        if (lp) this.state.lastPull = lp.value;
        const lpush = meta.find(m => m.key === 'lastPush');
        if (lpush) this.state.lastPush = lpush.value;
        const tagMeta = meta.find(m => m.key === 'tagOptions');
        if (tagMeta && Array.isArray(tagMeta.value)) this.state.tagOptions = tagMeta.value;
    },
    async seedIfEmpty() {
        return;
    },
    newDeck(name, algorithm = 'SM-2') {
        return {
            id: crypto.randomUUID(),
            notionId: null,
            name,
            algorithm,
            reviewLimit: 50,
            newLimit: 20,
            reverse: false,
            createdInApp: true,
            updatedInApp: true,
            aiPrompt: DEFAULT_AI_PROMPT,
            aiProvider: '',
            aiModel: '',
            aiKey: '',
            orderMode: 'none',
            fsrsDesiredRetention: DEFAULT_DESIRED_RETENTION,
            fsrsWeights: null
        };
    },
    newCard(deckId, name, back, type) {
        const now = new Date().toISOString();
        return {
            id: crypto.randomUUID(),
            notionId: null,
            deckId,
            name,
            back,
            type,
            tags: [],
            notes: '',
            suspended: false,
            leech: false,
            order: null,
            fsrs: { difficulty: 4, stability: 1, retrievability: 0.9, lastRating: null, lastReview: null, dueDate: now },
            sm2: { interval: 1, easeFactor: 2.5, dueDate: now },
            syncId: crypto.randomUUID(),
            updatedInApp: true,
            reviewHistory: [],
            createdAt: now
        };
    },
    bind() {
        el('#syncNowBtn').onclick = () => this.syncNow();
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => this.switchTab(btn.dataset.tab));
        document.querySelectorAll('.theme-btn').forEach(btn => btn.onclick = () => {
            this.state.settings.themeMode = btn.dataset.theme;
            Storage.setSettings(this.state.settings);
            this.applyTheme();
        });
        document.querySelectorAll('.font-btn').forEach(btn => btn.onclick = () => {
            this.state.settings.fontMode = btn.dataset.font;
            Storage.setSettings(this.state.settings);
            this.applyFontMode();
        });
        el('#newDeckBtn').onclick = () => this.openDeckModal();
        el('#refreshDecksBtn').onclick = () => this.manualSync();
        el('#closeDeckModal').onclick = () => this.closeDeckModal();
        el('#saveDeckBtn').onclick = () => this.saveDeckFromModal();
        el('#archiveDeckBtn').onclick = () => this.archiveDeckFromModal();
        el('#deckAlgoInput').onchange = (e) => {
            const isFsrs = e.target.value === 'FSRS';
            el('#fsrsParamsField')?.classList.toggle('hidden', !isFsrs);
        };
        el('#newCardBtn').onclick = () => this.openCardModal();
        el('#resetAlgorithmBtn').onclick = () => this.openResetAlgorithmModal();
        el('#cancelResetAlgorithm').onclick = () => this.closeModal('resetAlgorithmModal');
        el('#confirmResetAlgorithm').onclick = () => this.confirmResetAlgorithm();
        el('#resetAlgorithmModal').addEventListener('click', (e) => { if (e.target === el('#resetAlgorithmModal')) this.closeModal('resetAlgorithmModal'); });
        el('#closeCardModal').onclick = () => this.closeCardModal();
        el('#saveCardBtn').onclick = () => this.saveCardFromModal();
        el('#cardTypeInput').onchange = () => this.updateCardBackVisibility();
        el('#deleteCardBtn').onclick = () => this.deleteCardFromModal();
        const cardSelectionMode = el('#cardSelectionMode');
        const noScheduleRow = el('#noScheduleRow');
        const noScheduleChk = el('#noScheduleChanges');
        const toggleNoScheduleUI = () => {
            const isAll = cardSelectionMode.value === 'all';
            if (noScheduleRow) {
                noScheduleRow.classList.toggle('hidden', !isAll);
                if (isAll && noScheduleChk) noScheduleChk.checked = true;
                if (!isAll && noScheduleChk) noScheduleChk.checked = false;
            }
        };
        if (cardSelectionMode) {
            cardSelectionMode.onchange = toggleNoScheduleUI;
            toggleNoScheduleUI();
        }
        el('#revealBtn').onclick = () => this.reveal();
        el('#skipCard').onclick = () => this.nextCard();
        el('#copyCardContent').onclick = () => this.copyCardContent();
        el('#addNoteBlock').onclick = () => this.openAddBlockModal();
        el('#closeAddBlockModal').onclick = () => this.closeModal('addBlockModal');
        el('#cancelAddBlockBtn').onclick = () => this.closeModal('addBlockModal');
        el('#saveAddBlockBtn').onclick = () => this.saveBlockNote();
        el('#blockNoteArea')?.addEventListener('input', () => this.renderBlockNotePreview());
        el('#addBlockModal').addEventListener('click', (e) => { if (e.target === el('#addBlockModal')) this.closeModal('addBlockModal'); });
        // Session control buttons
        el('#startSessionBtn').onclick = () => this.startSession();
        el('#abandonSessionBtn').onclick = () => this.abandonSession();
        document.querySelectorAll('.rate-btn').forEach(btn => btn.onclick = (e) => this.rate(e.currentTarget.dataset.rate));
        const tagInput = el('#cardTagSearch');
        const tagDropdown = el('#cardTagDropdown');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTagByName(tagInput.value.trim(), { toSelection: true });
                    tagInput.value = '';
                    this.renderCardTagSelectors();
                }
            });
            tagInput.addEventListener('input', () => {
                if (tagDropdown) tagDropdown.classList.remove('hidden');
                this.renderCardTagSelectors();
            });
            tagInput.addEventListener('focus', () => {
                if (tagDropdown) tagDropdown.classList.remove('hidden');
                this.renderCardTagSelectors();
            });
            tagInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (tagDropdown && !tagDropdown.matches(':hover')) tagDropdown.classList.add('hidden');
                }, 150);
            });
        }
        if (tagDropdown) {
            tagDropdown.onmouseenter = () => tagDropdown.classList.remove('hidden');
            tagDropdown.onmouseleave = () => tagDropdown.classList.add('hidden');
        }
        const refreshTagsBtn = el('#refreshTagOptionsBtn');
        if (refreshTagsBtn) refreshTagsBtn.onclick = () => this.refreshTagOptions();
        // Phase 14: Debounce search inputs for better performance
        const debouncedCardSearch = debounce((val) => {
            this.state.cardSearch = val;
            this.state.cardLimit = 50;
            this.renderCards();
        }, 150);
        const debouncedDeckSearch = debounce((val) => {
            this.state.deckSearch = val;
            this.renderDecks();
        }, 150);
        el('#cardSearchInput').oninput = (e) => debouncedCardSearch(e.target.value);
        el('#libraryDeckSearch').oninput = (e) => debouncedDeckSearch(e.target.value);
        el('#filterAgain').onchange = (e) => { this.state.filters.again = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        el('#filterHard').onchange = (e) => { this.state.filters.hard = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        el('#filterAddedToday').onchange = (e) => { this.state.filters.addedToday = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        // Tag filter handled via renderTagFilter()
        el('#resetFilters').onclick = () => this.resetFilters();
        const resetMobile = el('#resetFiltersMobile');
        if (resetMobile) resetMobile.onclick = () => this.resetFilters();
        const filterTagInput = el('#filterTagSearch');
        const filterTagDropdown = el('#filterTagDropdown');
        if (filterTagInput) {
            const debouncedTagFilter = debounce(() => this.renderTagFilter(), 100);
            filterTagInput.addEventListener('input', () => {
                if (filterTagDropdown) filterTagDropdown.classList.remove('hidden');
                debouncedTagFilter();
            });
            filterTagInput.addEventListener('focus', () => {
                if (filterTagDropdown) filterTagDropdown.classList.remove('hidden');
                this.renderTagFilter();
            });
            filterTagInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (filterTagDropdown && !filterTagDropdown.matches(':hover')) filterTagDropdown.classList.add('hidden');
                }, 150);
            });
        }
        if (filterTagDropdown) {
            filterTagDropdown.onmouseenter = () => filterTagDropdown.classList.remove('hidden');
            filterTagDropdown.onmouseleave = () => filterTagDropdown.classList.add('hidden');
        }
        el('#filterSuspended').onchange = (e) => { this.state.filters.suspended = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        el('#filterLeech').onchange = (e) => { this.state.filters.leech = e.target.checked; this.renderCards(); this.updateActiveFiltersCount(); };
        // Toggle filters panel
        el('#toggleFilters').onclick = () => this.toggleFiltersPanel();
        el('#ankiImportInput').onchange = (e) => this.handleAnkiImport(e.target.files[0]);
        el('#exportAnkiBtn').onclick = () => this.exportAnki();
        // Mobile menu toggle and duplicate handlers
        el('#mobileMoreBtn').onclick = () => {
            const menu = el('#mobileMoreMenu');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
        };
        const exportMobile = el('#exportAnkiBtnMobile');
        if (exportMobile) exportMobile.onclick = () => this.exportAnki();
        const importMobile = el('#ankiImportInputMobile');
        if (importMobile) importMobile.onchange = (e) => this.handleAnkiImport(e.target.files[0]);
        this.initMobileFab();
        this.bindDeckSearch();
        // Keyboard shortcuts for study
        // Use capture to ensure we can intercept combo hotkeys even when textarea is focused.
        document.addEventListener('keydown', (e) => {
            // Undo shortcut (Ctrl+Z or Cmd+Z) - works globally during study
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && this.state.lastRating) {
                e.preventDefault();
                this.undoLastRating();
                return;
            }
            // Stop session via Ctrl/Cmd+. (works even when focused in textarea)
            if ((e.ctrlKey || e.metaKey) && e.key === '.' && this.state.session) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.abandonSession();
                return;
            }
            // Start session via Cmd/Ctrl+Enter (desktop)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !this.state.session && this.state.activeTab === 'study') {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                this.startSession();
                return;
            }
            if (!this.state.session || !this.state.selectedCard) return;

            const isAiMode = this.isAiModeUsable();
            const aiAnswer = el('#aiAnswer');
            const hasAiText = (aiAnswer?.value || '').trim().length > 0;
            // Option/Alt+Shift+S can produce a different printable character on macOS, so prefer physical key detection.
            const isSkipCombo = !!(e.altKey && e.shiftKey && (
                (e.code === 'KeyS') ||
                ((e.key || '').toLowerCase() === 's') ||
                e.keyCode === 83 ||
                e.which === 83
            ));

            if (isSkipCombo) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.nextCard();
                return;
            }

            // Global send in AI mode (Cmd/Ctrl+Enter) even inside textarea
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (isAiMode && hasAiText && !this.state.aiLocked) {
                    e.preventDefault();
                    this.submitToAI();
                    return;
                }
                // In non-AI mode, allow reveal via Cmd/Ctrl+Enter
                if (!this.isAiModeSelected() && !this.state.answerRevealed) {
                    e.preventDefault();
                    this.reveal();
                    return;
                }
            }

            // Mic toggle via Cmd/Ctrl+E even when focused in textarea
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && isAiMode && this.isSttEnabled() && !this.state.answerRevealed && !this.state.aiLocked) {
                e.preventDefault();
                this.toggleMicRecording();
                return;
            }

            if (e.key === 'Escape' && this.isMicActive()) {
                e.preventDefault();
                this.stopMicActivity(false);
            }

            if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.key !== 'Escape') return;

            // Space key logic
            if (e.key === ' ' && !this.state.answerRevealed) {
                e.preventDefault();
                if (this.isAiModeUsable()) {
                    const btn = el('#aiSubmit');
                    // If text area has content (button enabled), Send. Otherwise do nothing.
                    if (!btn.disabled && !this.state.aiLocked) this.submitToAI();
                } else {
                    this.reveal();
                }
            }

            // Toggle Mic with Alt/Option+M in AI mode
            if (e.altKey && e.key.toLowerCase() === 'm' && this.isAiModeUsable() && this.isSttEnabled() && !this.state.answerRevealed && !this.state.aiLocked) {
                e.preventDefault();
                this.toggleMicRecording();
            }
            if (this.state.answerRevealed) {
                const ratings = { '1': 'Again', '2': 'Hard', '3': 'Good', '4': 'Easy' };
                if (ratings[e.key]) this.rate(ratings[e.key]);
            }
            if (e.key.toLowerCase() === 's') this.nextCard();
        }, true);
        document.addEventListener('click', (e) => {
            // Handle edit deck button click
            const editDeckBtn = e.target.closest('.edit-deck-btn');
            if (editDeckBtn) {
                e.stopPropagation();
                const deckId = editDeckBtn.dataset.deckId;
                this.editDeck(deckId);
                return;
            }
            // Handle deck selection (click on deck card)
            const deckCard = e.target.closest('[data-deck-id]');
            if (deckCard && !e.target.closest('.edit-card-btn') && !e.target.closest('.info-card-btn') && !e.target.closest('.edit-deck-btn') && !e.target.closest('.deck-option') && !e.target.closest('.selected-deck-pill')) {
                this.selectDeck(deckCard.dataset.deckId);
                return;
            }
            // Handle edit card button click
            const editCardBtn = e.target.closest('.edit-card-btn');
            if (editCardBtn) {
                e.stopPropagation();
                const cardId = editCardBtn.dataset.cardId;
                this.editCard(cardId);
                return;
            }
            // Handle info card button click (show review history popover)
            const infoCardBtn = e.target.closest('.info-card-btn');
            if (infoCardBtn) {
                e.stopPropagation();
                const cardId = infoCardBtn.dataset.cardId;
                this.showReviewHistoryPopover(infoCardBtn, cardId);
                return;
            }
        });
        el('#openSettings').onclick = () => this.openSettings();
        el('#closeSettings').onclick = () => this.closeSettings();
        el('#saveSettings').onclick = () => this.saveSettings();
        el('#verifyWorker').onclick = () => this.verifyWorker();
        el('#verifyAuth').onclick = () => this.verifyAuth();
        el('#oauthBtn').onclick = () => { if (this.state.settings.workerUrl) this.startOAuth(); else toast('Add worker URL first'); };
        el('#scanSources').onclick = () => this.scanSources();
        el('#saveSourcesChoice').onclick = () => {
            this.state.settings.deckSource = el('#deckSourceSelect').value;
            this.state.settings.cardSource = el('#cardSourceSelect').value;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            toast('Sources choice saved. Syncing...');
            this.syncNow();
        };
        // Mobile FAB position picker (grid-based)
        this.bindFabPositionPicker();
        el('#openWorkerHelp').onclick = () => this.openModal('workerHelpModal');
        el('#closeWorkerHelp').onclick = () => this.closeModal('workerHelpModal');
        el('#copyWorkerCode').onclick = () => this.copyWorkerCode();
        el('#lockedOpenSettings').onclick = () => this.openSettings();
        el('#resetApp').onclick = () => this.openModal('resetConfirmModal');
        el('#cancelReset').onclick = () => this.closeModal('resetConfirmModal');
        el('#confirmReset').onclick = () => this.resetApp();
        el('#toggleDangerZone').onclick = () => this.toggleDangerZone();
        el('#resetConfirmModal').addEventListener('click', (e) => { if (e.target === el('#resetConfirmModal')) this.closeModal('resetConfirmModal'); });
        this.updateSettingsButtons();
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.closeSettings(); this.closeModal('workerHelpModal'); this.closeDeckModal(); this.closeCardModal(); this.closeModal('confirmModal'); this.closeModal('aiSettingsRequiredModal'); this.closeModal('notesModal'); this.closeModal('addBlockModal'); } });
        el('#settingsModal').addEventListener('click', (e) => { if (e.target === el('#settingsModal')) this.closeSettings(); });
        el('#workerHelpModal').addEventListener('click', (e) => { if (e.target === el('#workerHelpModal')) this.closeModal('workerHelpModal'); });
        el('#revisionMode').onchange = (e) => {
            if (e.target.value === 'ai') {
                if (!navigator.onLine) {
                    e.target.value = 'manual';
                    this.showAiBlockedModal('offline');
                    return;
                }
                if (!this.state.settings.aiVerified) {
                    e.target.value = 'manual';
                    this.showAiBlockedModal('unverified');
                    return;
                }
                if (!this.state.settings.aiKey) {
                    e.target.value = 'manual';
                    this.showAiBlockedModal('unverified');
                    return;
                }
            }
            const on = this.isAiModeUsable();
            el('#aiControls').classList.toggle('hidden', !on);
            this.updateSkipHotkeyLabel(on);
            this.updateMobileFab();
            this.renderStudy();
        };
        el('#closeAiSettingsModal').onclick = () => this.closeModal('aiSettingsRequiredModal');
        el('#openSettingsFromAiModal').onclick = () => { this.closeModal('aiSettingsRequiredModal'); this.openSettings(); };
        el('#aiSettingsRequiredModal').addEventListener('click', (e) => { if (e.target === el('#aiSettingsRequiredModal')) this.closeModal('aiSettingsRequiredModal'); });
        // Notes modal bindings
        el('#editNotesBtn').onclick = () => this.openNotesModal();
        el('#closeNotesModal').onclick = () => this.closeModal('notesModal');
        el('#cancelNotesBtn').onclick = () => this.closeModal('notesModal');
        el('#saveNotesBtn').onclick = () => this.saveNotes();
        el('#notesModal').addEventListener('click', (e) => { if (e.target === el('#notesModal')) this.closeModal('notesModal'); });
        el('#verifyAi').onclick = () => this.verifyAiSettings();
        el('#verifyStt').onclick = () => this.verifySttSettings();
        el('#aiSubmit').onclick = () => this.submitToAI();
        el('#aiAnswer').oninput = (e) => {
            const btn = el('#aiSubmit');
            const hasText = e.target.value.trim().length > 0;
            btn.dataset.empty = hasText ? '0' : '1';
            this.setAiControlsLocked(this.state.aiLocked);
        };
        el('#aiRecord').onclick = () => {
            if (!this.isAiModeUsable() || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;
            this.state.activeMicButton = 'inline';
            this.toggleMicRecording();
        };
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');
        if (fabMic) fabMic.onclick = () => {
            if (!this.isAiModeUsable() || !this.isSttEnabled() || this.state.answerRevealed || this.state.aiLocked) return;
            this.state.activeMicButton = 'fab';
            this.toggleMicRecording();
        };
        if (fabSend) fabSend.onclick = () => { if (!this.state.aiLocked) this.submitToAI(); };
        el('#confirmDelete').onclick = () => this.performDelete();
        el('#cancelDelete').onclick = () => this.closeModal('confirmModal');
        el('#confirmModal').addEventListener('click', (e) => { if (e.target === el('#confirmModal')) this.closeModal('confirmModal'); });
        el('#deckModal').addEventListener('click', (e) => { if (e.target === el('#deckModal')) this.closeDeckModal(); });
        el('#cardModal').addEventListener('click', (e) => { if (e.target === el('#cardModal')) this.closeCardModal(); });
    },
    renderAll() {
        this.renderDecks();
        this.renderCards();
        this.renderConnection();
        this.renderStudy();
        this.renderStudyDeckSelection();
        this.renderTagFilter();
        this.updateCounts();
        this.populateSourceSelects();
        this.renderGate();
        this.renderStatus();
        this.renderSelectedDeckBar();
        this.updateActiveFiltersCount();
        lucide.createIcons();
        this.loadAISettings();
        // Show/hide STT settings based on whether AI is verified
        const isAiVerified = this.state.settings?.aiVerified;
        el('#sttSettings')?.classList.toggle('hidden', !isAiVerified);
        // Update hotkey labels based on platform
        const sendHotkey = el('#aiSendHotkey');
        const ctrlSymbol = isMac ? '⌘' : '⌃';
        const enterSymbol = '↵';
        if (sendHotkey) sendHotkey.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const micHotkey = el('#micHotkey');
        if (micHotkey) micHotkey.textContent = `${ctrlSymbol} E`;
        const startHotkey = el('#startSessionHotkey');
        if (startHotkey) startHotkey.textContent = `${ctrlSymbol} ${enterSymbol}`;
        const stopHotkey = el('#stopSessionHotkey');
        if (stopHotkey) stopHotkey.textContent = `${ctrlSymbol} .`;
    },
    // Tab switching
    switchTab(tab) {
        // Block library access during active study session
        if (tab === 'library' && this.state.session) {
            toast('Please stop your study session first to access the library');
            return;
        }
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const tabEl = el(`#${tab}Tab`);
        if (tabEl) tabEl.classList.remove('hidden');
        const btnEl = el(`[data-tab="${tab}"]`);
        if (btnEl) btnEl.classList.add('active');
        this.state.activeTab = tab;
        lucide.createIcons();
    },
    // Toggle filters panel
    toggleFiltersPanel() {
        const content = el('#filtersContent');
        const chevron = el('#filtersChevron');
        const text = el('#moreOptionsText');
        const isHidden = content && content.classList.contains('hidden');
        if (content) content.classList.toggle('hidden');
        if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
        if (text) text.textContent = isHidden ? 'Less options' : 'More options';
    },
    // Update active filters count (for reset button visibility)
    updateActiveFiltersCount() {
        const f = this.state.filters;
        let count = 0;
        if (f.again) count++;
        if (f.hard) count++;
        if (f.addedToday) count++;
        if (f.tags && f.tags.length > 0) count++;
        if (f.suspended) count++;
        if (f.leech) count++;
        if (f.studyDecks && f.studyDecks.length > 0) count++;
        // Show reset button if any filters are active
        const resetBtn = el('#resetFilters');
        if (resetBtn) {
            resetBtn.classList.toggle('hidden', count === 0);
        }
    },
    // Render selected deck bar
    renderSelectedDeckBar() {
        const deck = this.state.selectedDeck;
        const nameEl = el('#selectedDeckName');
        const newCardBtn = el('#newCardBtn');
        const resetBtn = el('#resetAlgorithmBtn');
        const cardsContent = el('#cardsContent');
        const footer = el('#footerAttribution');
        if (deck) {
            if (nameEl) nameEl.textContent = deck.name;
            if (newCardBtn) newCardBtn.classList.remove('hidden');
            if (resetBtn) resetBtn.classList.remove('hidden');
            if (cardsContent) cardsContent.classList.remove('hidden');
            if (footer) footer.classList.remove('hidden');
        } else {
            if (nameEl) nameEl.textContent = 'Select a deck above';
            if (newCardBtn) newCardBtn.classList.add('hidden');
            if (resetBtn) resetBtn.classList.add('hidden');
            if (cardsContent) cardsContent.classList.add('hidden');
            if (footer) footer.classList.add('hidden');
        }
    },
    renderGate() {
        const ready = this.isReady();
        el('#mainContent').style.display = ready ? 'block' : 'none';
        el('#lockedOverlay').classList.toggle('hidden', ready);
        const oauth = el('#oauthBtn');
        const verifyAuthBtn = el('#verifyAuth');
        const tokenInput = el('#settingAuthToken');
        if (oauth) oauth.disabled = !this.state.settings.workerUrl;
        if (verifyAuthBtn) verifyAuthBtn.disabled = !this.state.settings.workerUrl;
        if (tokenInput) tokenInput.disabled = !this.state.settings.workerUrl;
        this.updateSettingsButtons();
    },
    renderConnection() {
        const badge = el('#connectionBadge');
        const online = navigator.onLine;
        const hasWorkerUrl = !!this.state.settings.workerUrl;
        const workerOk = hasWorkerUrl && this.state.workerVerified;
        const hasToken = !!this.state.settings.authToken;
        const authOk = workerOk && hasToken;
        const ready = online && workerOk && authOk;

        const q2count = (this.state.queue || []).length;
        const pendingSpan = q2count > 0
            ? ` <span class="ml-1 font-mono text-[10px] sm:text-[11px] text-dull-purple/80 dark:text-dull-purple/90">(${q2count})</span>`
            : '';
        const q2ind = el('#q2syncIndicator');
        const q2val = el('#q2syncCount');
        if (q2ind && q2val) {
            q2val.textContent = String(q2count);
            q2ind.classList.toggle('hidden', q2count === 0);
        }

        // Tooltip/diagnostics for stuck queues (best-effort).
        const ageMs = this.state.queueLastChangedAt ? (Date.now() - new Date(this.state.queueLastChangedAt).getTime()) : 0;
        const staleMinutes = ageMs > 0 ? Math.floor(ageMs / 60000) : 0;
        const errorMsg = this.state.lastQueueError?.message || '';
        const errorAt = this.state.lastQueueError?.at ? new Date(this.state.lastQueueError.at).toLocaleString() : '';
        badge.title = '';
        if (q2count > 0) {
            const parts = [];
            if (staleMinutes >= 2) parts.push(`Queue unchanged for ~${staleMinutes} min`);
            if (errorMsg) parts.push(`Last sync error${errorAt ? ` (${errorAt})` : ''}: ${errorMsg}`);
            if (parts.length) badge.title = parts.join('\n');
        }

        if (!online) {
            badge.innerHTML = `Offline${pendingSpan}`;
            badge.className = 'px-3 py-1 rounded-full pill text-xs bg-oatmeal border border-oatmeal-dark text-earth-metal';
            this.updateSyncButtonState();
            return;
        }

        if (!hasWorkerUrl) {
            badge.innerHTML = `Online · add worker URL${pendingSpan}`;
        } else if (!workerOk) {
            badge.innerHTML = `Online · verify worker${pendingSpan}`;
        } else if (!hasToken) {
            badge.innerHTML = `Online · set token${pendingSpan}`;
        } else if (!authOk) {
            badge.innerHTML = `Online · verify token${pendingSpan}`;
        } else {
            badge.innerHTML = q2count > 0 ? `Online${pendingSpan}` : 'Online · Notion ready';
        }
        badge.className = ready
            ? 'px-3 py-1 rounded-full pill text-xs bg-white-linen border border-oatmeal-dark text-earth-metal'
            : 'px-3 py-1 rounded-full pill text-xs bg-oatmeal border border-oatmeal-dark text-earth-metal';
        this.updateSyncButtonState();
    },
    renderDecks() {
        const grid = el('#deckGrid');
        const theme = document.body.getAttribute('data-theme') || 'light';
        const selectedId = this.state.selectedDeck?.id;
        const searchQuery = (this.state.deckSearch || '').toLowerCase().trim();
        let decks = this.state.decks;
        if (searchQuery) {
            decks = decks.filter(d => d.name.toLowerCase().includes(searchQuery));
        }
        if (decks.length === 0) {
            grid.innerHTML = `<p class="text-earth-metal/60 text-sm col-span-full text-center py-4">${searchQuery ? 'No decks match your search.' : 'No decks yet. Click "New deck" to create one.'}</p>`;
            return;
        }
        grid.innerHTML = decks.map(d => {
            const isSelected = d.id === selectedId;
            const selectedClass = isSelected ? 'ring-2 ring-dull-purple' : '';
            return `
                    <article class="rounded-2xl border border-[color:var(--card-border)] p-3 bg-[color:var(--surface)] text-[color:var(--text-main)] flex flex-col gap-2 hover:bg-[color:var(--surface-strong)] transition cursor-pointer ${selectedClass}" data-deck-id="${d.id}">
                        <div class="flex items-center justify-between">
                            <p class="font-semibold text-[color:var(--text-main)] truncate flex-1">${escapeHtml(d.name)}</p>
                            <div class="flex items-center gap-1.5">
                                <button class="edit-deck-btn p-1 rounded hover:bg-dull-purple/20 text-dull-purple" data-deck-id="${d.id}" title="Edit deck">
                                    <i data-lucide="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                                </button>
                                <span class="text-[11px] px-2 py-1 rounded-full bg-[color:var(--surface-strong)] text-[color:var(--text-main)] border border-[color:var(--card-border)]">${d.algorithm}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-[color:var(--text-sub)]">
                            <span>${this.cardsForDeck(d.id).filter(c => this.isDue(c)).length} due</span>
                            <span>${this.cardsForDeck(d.id).length} cards</span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] text-[color:var(--text-sub)]">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                            <span>Reverse ${d.reverse ? 'on' : 'off'}</span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] text-[color:var(--text-sub)]">
                            <i data-lucide="list-ordered" class="w-3 h-3"></i>
                            <span>Order: ${(d.orderMode === 'created' && 'Created Time') || (d.orderMode === 'property' && 'Order Property') || 'None'}</span>
                        </div>
                    </article>
                `}).join('');
        createIconsInScope(grid);
    },
    renderCards() {
        const tbody = el('#cardTable');
        const noCardsMsg = el('#noCardsMessage');
        const container = el('#cardsContainer');

        // Cleanup previous observer to prevent memory leaks
        if (this.state.cardListObserver) {
            this.state.cardListObserver.disconnect();
            this.state.cardListObserver = null;
        }

        // If no deck selected, show message and hide table
        if (!this.state.selectedDeck) {
            tbody.innerHTML = '';
            if (container) container.classList.add('hidden');
            if (noCardsMsg) {
                noCardsMsg.textContent = 'Select a deck above to view its cards';
                noCardsMsg.classList.remove('hidden');
            }
            this.updateCounts();
            return;
        }

        let cards = this.cardsForDeck(this.state.selectedDeck.id);
        cards = cards.filter(c => this.passFilters(c));

        // Sort by due date (overdue/upcoming first, new cards at end)
        cards.sort((a, b) => {
            const dueA = (a.fsrs?.dueDate || a.sm2?.dueDate);
            const dueB = (b.fsrs?.dueDate || b.sm2?.dueDate);
            if (!dueA && !dueB) return 0;
            if (!dueA) return 1;
            if (!dueB) return -1;
            return new Date(dueA) - new Date(dueB);
        });

        // Apply card name search filter
        const searchQuery = (this.state.cardSearch || '').toLowerCase().trim();
        if (searchQuery) {
            cards = cards.filter(c => {
                const plainName = (c.name || '').replace(/<[^>]*>/g, '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1').toLowerCase();
                return plainName.includes(searchQuery);
            });
        }

        if (cards.length === 0) {
            tbody.innerHTML = '';
            if (container) container.classList.add('hidden');
            if (noCardsMsg) {
                noCardsMsg.textContent = searchQuery ? 'No cards match your search.' : 'No cards in this deck yet. Click "New card" to add one.';
                noCardsMsg.classList.remove('hidden');
            }
        } else {
            if (container) container.classList.remove('hidden');
            if (noCardsMsg) noCardsMsg.classList.add('hidden');

            const limit = this.state.cardLimit || 50;
            const visibleCards = cards.slice(0, limit);
            const hasMore = cards.length > limit;
            const remainingCount = cards.length - limit;

            tbody.innerHTML = visibleCards.map(c => {
                // Strip HTML tags and cloze syntax for display, then escape for safety
                const plainName = (c.name || '').replace(/<[^>]*>/g, '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1');
                const nameText = escapeHtml(plainName.slice(0, 50));
                const tagPills = c.tags.slice(0, 2).map(t => `<span class="notion-color-${t.color.replace('_', '-')}-background px-1.5 py-0.5 rounded text-[10px]">${escapeHtml(t.name)}</span>`).join(' ');
                // Get due date
                const dueDate = c.fsrs?.dueDate || c.sm2?.dueDate;
                const dueDisplay = dueDate ? new Date(dueDate).toLocaleDateString() : '—';
                return `
                        <tr class="hover:bg-oatmeal/50 dark:hover:bg-white/5" data-card-id="${c.id}">
                            <td class="py-2 pr-2 text-charcoal"><div class="truncate max-w-[150px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[450px]">${nameText}</div></td>
                            <td class="py-2 pr-2 capitalize hidden sm:table-cell">${c.type}</td>
                            <td class="py-2 pr-2 text-earth-metal/70 text-xs whitespace-nowrap">${dueDisplay}</td>
                            <td class="py-2 pr-2 hidden md:table-cell text-xs"><div class="flex gap-1 flex-wrap">${tagPills}${c.tags.length > 2 ? '<span class="text-earth-metal/50 dark:text-white/60">...</span>' : ''}</div></td>
                            <td class="py-2 flex gap-1">
                                <button class="info-card-btn p-1 rounded hover:bg-dull-purple/20 text-earth-metal/60 relative" data-card-id="${c.id}" title="Review history">
                                    <i data-lucide="info" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                                <button class="edit-card-btn p-1 rounded hover:bg-dull-purple/20 text-dull-purple" data-card-id="${c.id}" title="Edit card">
                                    <i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                            </td>
                        </tr>`;
            }).join('');

            if (hasMore) {
                tbody.innerHTML += `
                         <tr id="cardListSentinel">
                            <td colspan="5" class="py-3 text-center">
                                <button id="showMoreCardsBtn" class="text-xs text-dull-purple hover:underline bg-oatmeal/50 dark:bg-white/10 px-4 py-2 rounded-lg">
                                    Show ${Math.min(remainingCount, this.state.cardLimitStep || 50)} more cards (${remainingCount} remaining)
                                </button>
                            </td>
                         </tr>
                         `;
                // Phase 15: IntersectionObserver for infinite scroll with cleanup
                setTimeout(() => {
                    const btn = el('#showMoreCardsBtn');
                    const sentinel = el('#cardListSentinel');
                    if (btn) btn.onclick = () => {
                        this.state.cardLimit += (this.state.cardLimitStep || 50);
                        this.renderCards();
                    };
                    if (sentinel && 'IntersectionObserver' in window) {
                        // Disconnect any existing observer before creating a new one
                        if (this.state.cardListObserver) {
                            this.state.cardListObserver.disconnect();
                            this.state.cardListObserver = null;
                        }
                        const observer = new IntersectionObserver((entries) => {
                            if (entries[0].isIntersecting) {
                                observer.disconnect();
                                this.state.cardListObserver = null;
                                this.state.cardLimit += (this.state.cardLimitStep || 50);
                                this.renderCards();
                            }
                        }, { rootMargin: '100px' });
                        observer.observe(sentinel);
                        // Store observer reference for cleanup
                        this.state.cardListObserver = observer;
                    }
                }, 0);
            }
            createIconsInScope(tbody);
        }
        this.updateCounts();
    },
    renderStudy() {
        // Ensure we never keep the mic open across cards/screens.
        if (this.isMicActive() || this.state.activeAudioStream) {
            this.stopMicActivity(true);
        }
        // Update session UI controls
        const session = this.state.session;
        const revisionSelect = el('#revisionMode');
        if (session?.settings?.revisionMode && revisionSelect) {
            revisionSelect.value = session.settings.revisionMode;
        }
        const activeBar = el('#sessionActiveBar');
        const progressText = el('#sessionProgressText');
        const studySettingsCard = el('#studySettingsCard');
        const studyCardSection = el('#studyCardSection');
        const notesSection = el('#notesSection');

        // Show/hide sections based on session state
        if (session) {
            // Session is active - hide settings, show session bar and study card
            // Notes are hidden until answer is revealed
            if (studySettingsCard) studySettingsCard.classList.add('hidden');
            if (studyCardSection) studyCardSection.classList.remove('hidden');
            if (notesSection) notesSection.classList.add('hidden'); // Hidden until reveal
            if (activeBar) {
                activeBar.classList.remove('hidden');
                const current = session.currentIndex + 1;
                const total = session.cardQueue.length;
                progressText.textContent = `Study Session (${current}/${total})`;
                const previewBadge = el('#previewBadge');
                if (previewBadge) previewBadge.classList.toggle('hidden', !session.noScheduleChanges);
            }
            lucide.createIcons();
        } else {
            // No session - show settings, hide session bar, study card, and notes
            if (studySettingsCard) studySettingsCard.classList.remove('hidden');
            if (studyCardSection) studyCardSection.classList.add('hidden');
            if (notesSection) notesSection.classList.add('hidden');
            if (activeBar) activeBar.classList.add('hidden');
        }

        const card = this.pickCard();
        const deck = card ? this.deckById(card.deckId) : null;
        const isCloze = card && (card.type || '').toLowerCase() === 'cloze';

        // Check if no cards are due but decks are selected
        const f = this.state.filters;
        const hasSelectedDecks = f.studyDecks && f.studyDecks.length > 0;
        const allCards = hasSelectedDecks
            ? this.state.cards.filter(c => f.studyDecks.includes(c.deckId))
            : this.state.cards;
        const dueCards = allCards.filter(c => this.passFilters(c) && this.isDue(c));
        const nonDueCards = allCards.filter(c => this.passFilters(c) && !this.isDue(c));

        if (!card && hasSelectedDecks && nonDueCards.length > 0 && !session) {
            // No due cards but there are non-due cards available (only show when no session)
            el('#studyDeckLabel').textContent = 'No cards due';
            el('#cardFront').innerHTML = `
                        <div class="text-center py-4">
                            <p class="text-earth-metal/70 text-sm mb-3">No cards are due for review right now.</p>
                            <p class="text-earth-metal/60 text-xs mb-4">${nonDueCards.length} card${nonDueCards.length === 1 ? '' : 's'} available for extra practice.</p>
                            <button id="studyNonDueBtn" class="px-4 py-2 bg-dull-purple text-white rounded-lg text-sm hover:bg-dull-purple/90 transition">
                                Practice non-due cards
                            </button>
                        </div>
                    `;
            el('#cardBack').innerHTML = '';
            el('#cardBack').classList.add('hidden');
            el('#aiControls').classList.add('hidden');
            this.state.answerRevealed = false;
            this.setRatingEnabled(false);
            this.updateMobileFab();
            this.state.selectedCard = null;
            // Bind the button
            setTimeout(() => {
                const btn = el('#studyNonDueBtn');
                if (btn) btn.onclick = () => this.enableNonDueStudy();
            }, 0);
            return;
        }

        el('#studyDeckLabel').textContent = deck ? deck.name : 'Choose a deck';
        // Clear cardFront before setting new content to force fresh DOM
        el('#cardFront').innerHTML = '';
        const front = card ? this.renderCardFront(card, deck) : '<p class="text-earth-metal/70 text-sm">No card selected</p>';
        el('#cardFront').innerHTML = front;
        applyMediaEmbeds(el('#cardFront'));
        // Show opposite side based on whether card was reversed
        const backContent = card ? (this.state.cardReversed ? card.name : card.back) : '';
        el('#cardBack').innerHTML = card ? safeMarkdownParse(backContent || '') : '';
        applyMediaEmbeds(el('#cardBack'));
        this.renderMath(el('#cardFront'));
        this.renderMath(el('#cardBack'));
        // Ensure cloze blanks are NOT revealed on new card (must be after renderMath)
        document.querySelectorAll('#cardFront .cloze-blank').forEach(span => span.classList.remove('revealed'));
        el('#cardBack').classList.add('hidden');
        el('#aiControls').classList.add('hidden');
        // Show study controls (may have been hidden by session complete)
        const studyControls = el('#studyControls');
        if (studyControls) studyControls.classList.remove('hidden');

        this.state.activeMicButton = null;
        this.state.lockAiUntilNextCard = false;
        const isAiMode = this.isAiModeUsable();
        const revealBtn = el('#revealBtn');

        this.updateSkipHotkeyLabel(isAiMode);
        this.setAiControlsLocked(false);
        if (revealBtn) {
            revealBtn.disabled = false;
            revealBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        if (isAiMode) {
            if (revealBtn) revealBtn.classList.add('hidden');
            el('#aiControls').classList.remove('hidden');
            const submitBtn = el('#aiSubmit');
            submitBtn.dataset.empty = '1';
            const feedback = el('#aiFeedback');
            if (feedback) { feedback.classList.add('hidden'); feedback.innerHTML = ''; }
            this.setAiControlsLocked(false);
            setTimeout(() => el('#aiAnswer').focus(), 50);
        } else {
            if (revealBtn) revealBtn.classList.remove('hidden');
            el('#aiControls').classList.add('hidden');
        }

        // Hide copy button until reveal (shows answer content)
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.add('hidden');
        // Hide add note button until reveal
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.add('hidden');
        // Reset answer revealed state and disable rating buttons
        this.state.answerRevealed = false;
        this.setRatingEnabled(false);
        this.updateMobileFab();
        this.state.selectedCard = card || null;
        this.renderNotes();
        this.renderFsrsMeta();
        el('#aiAnswer').value = '';
        el('#aiFeedback').innerHTML = '';
        el('#aiFeedback').classList.add('hidden');
        lucide.createIcons();
    },
    renderNotes() {
        const notes = this.state.selectedCard?.notes ?? '';
        el('#notesPreview').innerHTML = notes ? safeMarkdownParse(notes) : '<p class="text-earth-metal/60 text-sm">No notes for this card</p>';
        applyMediaEmbeds(el('#notesPreview'));
        this.renderMath(el('#notesPreview'));
    },
    renderFsrsMeta() {
        // Stats display removed - internal calculation only
    },
    renderTagFilter() {
        const input = el('#filterTagSearch');
        const dropdown = el('#filterTagDropdown');
        const selectedWrap = el('#filterTagSelected');
        if (!input || !dropdown || !selectedWrap) return;

        const tagMap = new Map();
        this.state.cards.forEach(c => {
            (c.tags || []).forEach(t => {
                if (!tagMap.has(t.name)) tagMap.set(t.name, t.color || 'default');
            });
        });
        const allTags = Array.from(tagMap.keys()).sort((a, b) => a.localeCompare(b));
        const selected = new Set(this.state.filters.tags || []);
        const query = (input.value || '').toLowerCase();
        const options = allTags.filter(name => name.toLowerCase().includes(query));

        dropdown.innerHTML = options.length
            ? options.map(name => {
                const isSelected = selected.has(name);
                return `<button class="tag-option w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${isSelected ? 'bg-dull-purple/10 border-lime-200' : 'hover:bg-oatmeal/60'}" data-tag="${encodeDataAttr(name)}">
                            <span class="flex-1">${escapeHtml(name)}</span>
                            ${isSelected ? '<span class="text-[11px] text-dull-purple">Selected</span>' : ''}
                        </button>`;
            }).join('')
            : `<div class="px-3 py-2 text-sm text-earth-metal/60 dark:text-white/60">No tags found</div>`;

        dropdown.querySelectorAll('.tag-option').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                if (selected.has(tag)) selected.delete(tag); else selected.add(tag);
                this.state.filters.tags = Array.from(selected);
                this.renderTagFilter();
                this.renderCards();
                this.updateActiveFiltersCount();
            };
        });

        selectedWrap.innerHTML = selected.size
            ? Array.from(selected).map(tag => `
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-oatmeal text-earth-metal text-xs border border-oatmeal-dark/60">
                            ${escapeHtml(tag)}
                            <button class="remove-tag text-earth-metal/70" data-tag="${encodeDataAttr(tag)}">&times;</button>
                        </span>
                    `).join('')
            : '<span class="text-earth-metal/50 dark:text-white/60 text-xs">All tags included</span>';

        selectedWrap.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                this.state.filters.tags = this.state.filters.tags.filter(t => t !== tag);
                this.renderTagFilter();
                this.renderCards();
                this.updateActiveFiltersCount();
            };
        });
    },
    buildLocalTagOptions() {
        const tagMap = new Map();
        this.state.cards.forEach(c => {
            (c.tags || []).forEach(t => {
                if (!tagMap.has(t.name)) tagMap.set(t.name, t.color || 'default');
            });
        });
        return Array.from(tagMap.entries()).map(([name, color]) => ({ name, color }));
    },
    collectTagOptions() {
        const tagMap = new Map();
        (this.state.tagOptions || []).forEach(t => { if (t?.name) tagMap.set(t.name, t.color || 'default'); });
        this.buildLocalTagOptions().forEach(t => { if (!tagMap.has(t.name)) tagMap.set(t.name, t.color || 'default'); });
        return Array.from(tagMap.entries())
            .map(([name, color]) => ({ name, color }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },
    renderCardTagSelectors() {
        const input = el('#cardTagSearch');
        const dropdown = el('#cardTagDropdown');
        const selectedWrap = el('#cardTagSelected');
        if (!input || !dropdown || !selectedWrap) return;

        const selected = new Set(this.state.tagSelection || []);
        const allOptions = this.collectTagOptions();
        const query = (input.value || '').toLowerCase();
        const options = allOptions.filter(opt => opt.name.toLowerCase().includes(query));
        const canAdd = query && !allOptions.some(opt => opt.name.toLowerCase() === query);

        dropdown.innerHTML = `
                    ${canAdd ? `<button class="tag-add-option w-full text-left px-3 py-2 text-sm text-dull-purple hover:bg-dull-purple/10" data-add="${encodeDataAttr(input.value.trim())}">+ Add "${escapeHtml(input.value.trim())}"</button>` : ''}
                    ${options.map(opt => {
            const active = selected.has(opt.name);
            return `<button class="tag-option w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${active ? 'bg-dull-purple/10 border-lime-200' : 'hover:bg-oatmeal/60'}" data-tag="${encodeDataAttr(opt.name)}">
                            <span class="flex-1">${escapeHtml(opt.name)}</span>
                            ${active ? '<span class="text-[11px] text-dull-purple">Selected</span>' : ''}
                        </button>`;
        }).join('')}
                `;

        dropdown.querySelectorAll('.tag-option').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                if (selected.has(tag)) selected.delete(tag); else selected.add(tag);
                this.state.tagSelection = Array.from(selected);
                this.renderCardTagSelectors();
            };
        });
        dropdown.querySelectorAll('.tag-add-option').forEach(btn => {
            btn.onclick = () => {
                const name = decodeDataAttr(btn.dataset.add);
                this.addTagByName(name, { toSelection: true });
                if (input) input.value = '';
            };
        });

        selectedWrap.innerHTML = selected.size
            ? Array.from(selected).map(tag => `
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-oatmeal text-earth-metal text-xs border border-oatmeal-dark/60">
                            ${escapeHtml(tag)}
                            <button class="remove-tag text-earth-metal/70" data-tag="${encodeDataAttr(tag)}">&times;</button>
                        </span>
                    `).join('')
            : '<span class="text-earth-metal/50 dark:text-white/60 text-xs">No tags selected</span>';

        selectedWrap.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = decodeDataAttr(btn.dataset.tag);
                this.state.tagSelection = this.state.tagSelection.filter(t => t !== tag);
                this.renderCardTagSelectors();
            };
        });
    },
    addTagByName(name, { toSelection = false } = {}) {
        if (!name) return;
        const exists = this.state.tagOptions.some(t => t.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
            this.state.tagOptions.push({ name, color: 'default' });
            Storage.setMeta('tagOptions', this.state.tagOptions).catch(e => console.debug('Storage setMeta tagOptions failed:', e));
        }
        if (toSelection && !this.state.tagSelection.includes(name)) {
            this.state.tagSelection.push(name);
        }
        this.renderCardTagSelectors();
        this.renderTagFilter();
    },
    async refreshTagOptions() {
        const btn = el('#refreshTagOptionsBtn');
        if (btn) btn.disabled = true;
        try {
            if (!this.isReady()) {
                this.state.tagOptions = this.buildLocalTagOptions();
                this.renderCardTagSelectors();
                toast('Offline: using local tags');
                return;
            }
            const { cardSource } = this.state.settings;
            if (!cardSource) throw new Error('Missing card source');
            const db = await API.getDatabase(cardSource);
            const opts = db?.properties?.['Tags']?.multi_select?.options || [];
            this.state.tagOptions = opts.map(o => ({ name: o.name, color: o.color || 'default' }));
            await Storage.setMeta('tagOptions', this.state.tagOptions);
            this.renderCardTagSelectors();
            this.renderTagFilter();
            toast('Tags refreshed');
        } catch (e) {
            console.error('Refresh tags failed', e);
            toast('Could not refresh tags – check your connection and try again');
        } finally {
            if (btn) btn.disabled = false;
        }
    },
    renderStudyDeckSelection() {
        const dropdown = el('#deckDropdown');
        const display = el('#selectedDecksDisplay');
        const input = el('#deckSearchInput');
        if (!dropdown || !display || !input) return;

        const selected = this.state.filters.studyDecks || [];
        const query = (input.value || '').toLowerCase();

        // Render dropdown options
        const filtered = this.state.decks.filter(d => d.name.toLowerCase().includes(query));
        dropdown.innerHTML = filtered.map(d => {
            const isSelected = selected.includes(d.id);
            const dueCount = this.cardsForDeck(d.id).filter(c => this.isDue(c)).length;
            return `<div class="deck-option flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-oatmeal/50 ${isSelected ? 'bg-dull-purple/10' : ''}" data-deck-id="${d.id}">
                        <span class="flex items-center gap-2">
                            ${isSelected ? '<i data-lucide="check" class="w-3 h-3 text-dull-purple"></i>' : '<span class="w-3"></span>'}
                            <span class="text-sm">${escapeHtml(d.name)}</span>
                        </span>
                        <span class="text-xs text-earth-metal/60">${dueCount} due</span>
                    </div>`;
        }).join('');
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-earth-metal/60 dark:text-white/60 italic">No decks found</div>';
        }

        // Render selected deck pills
        display.innerHTML = selected.map(id => {
            const d = this.deckById(id);
            if (!d) return '';
            return `<span class="selected-deck-pill inline-flex items-center gap-1 px-2 py-1 rounded-full bg-dull-purple text-white text-xs" data-deck-id="${id}">
                        ${escapeHtml(d.name)}
                        <button class="remove-deck-btn hover:bg-white/20 rounded-full p-0.5" data-deck-id="${id}">
                            <i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>
                        </button>
                    </span>`;
        }).join('');
        if (selected.length === 0) {
            const totalDue = this.state.cards.filter(c => this.isDue(c)).length;
            display.innerHTML = `<span class="text-dull-purple/80 text-xs italic">All decks (${totalDue} due)</span>`;
        }
        lucide.createIcons();
    },
    bindDeckSearch() {
        const input = el('#deckSearchInput');
        const dropdown = el('#deckDropdown');
        if (!input || !dropdown) return;

        input.onfocus = () => {
            dropdown.classList.remove('hidden');
            this.renderStudyDeckSelection();
        };
        input.oninput = () => this.renderStudyDeckSelection();
        input.onblur = (e) => {
            // Delay hiding to allow click on dropdown
            setTimeout(() => {
                if (!dropdown.contains(document.activeElement)) {
                    dropdown.classList.add('hidden');
                }
            }, 150);
        };

        dropdown.onmousedown = (e) => {
            e.preventDefault(); // Prevent blur
            const option = e.target.closest('.deck-option');
            if (option) {
                const deckId = option.dataset.deckId;
                const idx = this.state.filters.studyDecks.indexOf(deckId);
                if (idx >= 0) {
                    this.state.filters.studyDecks.splice(idx, 1);
                } else {
                    this.state.filters.studyDecks.push(deckId);
                }
                // Reset non-due study mode when decks change
                this.state.studyNonDue = false;
                this.renderStudyDeckSelection();
                this.renderStudy();
                this.updateActiveFiltersCount();
            }
        };

        el('#selectedDecksDisplay').onclick = (e) => {
            const btn = e.target.closest('.remove-deck-btn');
            if (btn) {
                const deckId = btn.dataset.deckId;
                const idx = this.state.filters.studyDecks.indexOf(deckId);
                if (idx >= 0) {
                    this.state.filters.studyDecks.splice(idx, 1);
                    // Reset non-due study mode when decks change
                    this.state.studyNonDue = false;
                    this.renderStudyDeckSelection();
                    this.renderStudy();
                    this.updateActiveFiltersCount();
                }
            }
        };
    },
    openDeckModal(deck) {
        if (!this.isReady()) { this.openSettings(); return; }
        this.state.editingDeck = deck || null;
        el('#deckModalTitle').textContent = deck ? 'Edit deck' : 'New deck';
        el('#deckNameInput').value = deck?.name ?? '';
        const algo = deck?.algorithm ?? 'SM-2';
        el('#deckAlgoInput').value = algo;
        el('#deckReviewLimit').value = deck?.reviewLimit ?? 50;
        el('#deckNewLimit').value = deck?.newLimit ?? 20;
        el('#deckOrderMode').value = deck?.orderMode ?? 'none';
        el('#deckReverseInput').checked = deck?.reverse ?? false;
        el('#deckPromptInput').value = deck?.aiPrompt ?? DEFAULT_AI_PROMPT;

        // Populate FSRS params
        const paramsField = el('#fsrsParamsField');
        const paramsInput = el('#deckFsrsParams');
        const retentionInput = el('#deckFsrsDesiredRetention');
        const optimizeBtn = el('#optimizeFsrsBtn');
        if (paramsInput) {
            paramsInput.value = (deck?.fsrsWeights || fsrsW).join(', ');
        }
        if (retentionInput) {
            retentionInput.value = (deck?.fsrsDesiredRetention ?? DEFAULT_DESIRED_RETENTION).toFixed(2);
        }
        if (optimizeBtn) {
            optimizeBtn.onclick = async () => {
                const current = this.state.editingDeck;
                if (!current || current.algorithm !== 'FSRS') return toast('Switch to FSRS first');
                if (!current.id) return toast('Save the deck first');
                await this.optimizeFsrsWeightsForDeck(current);
            };
        }
        if (paramsField) {
            paramsField.classList.toggle('hidden', algo !== 'FSRS');
        }

        el('#archiveDeckBtn').classList.toggle('hidden', !deck);
        const modal = el('#deckModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusTrap.attach(modal);
    },
    async optimizeFsrsWeightsForDeck(deck) {
        const cards = this.cardsForDeck(deck.id);
        const trainingSet = buildFsrsTrainingSet(cards);
        const totalEvents = trainingSet.reduce((acc, x) => acc + x.history.length, 0);
        if (trainingSet.length < 10 || totalEvents < 50) {
            toast('Not enough review history to optimize (need ~50+ reviews)');
            return;
        }
        if (!confirm(`Optimize FSRS weights for "${deck.name}"?\n\nThis uses your review history for this deck and can take ~10–60 seconds.`)) {
            return;
        }

        const optimizeBtn = el('#optimizeFsrsBtn');
        if (optimizeBtn) optimizeBtn.disabled = true;

        // Cancellation flag
        let cancelled = false;
        const cancelOptimization = () => {
            cancelled = true;
            toast('Optimization cancelled');
        };

        try {
            const start = constrainWeights(Array.isArray(deck.fsrsWeights) && deck.fsrsWeights.length === 21 ? deck.fsrsWeights : fsrsW);
            showLoading('Optimizing FSRS weights...', `Using ${trainingSet.length} cards (~${totalEvents} reviews)`, cancelOptimization);
            setLoadingProgress(0, `0% • iter 0/220`);
            await new Promise(r => setTimeout(r, 0));

            const alpha = 0.602;
            const gamma = 0.101;
            const a0 = 0.12;
            const c0 = 0.06;
            const iters = 220;

            // Convergence detection parameters
            const CONVERGENCE_THRESHOLD = 0.0001;
            const STAGNANT_ITERS_TO_CONVERGE = 15;

            let w = start.slice();
            let bestW = w.slice();
            let bestLoss = fsrsLogLoss(trainingSet, bestW);
            let prevBestLoss = bestLoss;
            let stagnantCount = 0;

            for (let k = 0; k < iters; k++) {
                // Check for cancellation
                if (cancelled) {
                    return;
                }

                const ak = a0 / Math.pow(k + 1, alpha);
                const ck = c0 / Math.pow(k + 1, gamma);
                const delta = new Array(21);
                const scale = new Array(21);
                for (let i = 0; i < 21; i++) {
                    delta[i] = Math.random() < 0.5 ? -1 : 1;
                    scale[i] = Math.abs(w[i]) + 1;
                }
                const wPlus = w.map((v, i) => v + ck * delta[i] * scale[i]);
                const wMinus = w.map((v, i) => v - ck * delta[i] * scale[i]);
                const lossPlus = fsrsLogLoss(trainingSet, wPlus);
                const lossMinus = fsrsLogLoss(trainingSet, wMinus);
                if (!Number.isFinite(lossPlus) || !Number.isFinite(lossMinus)) {
                    // If we wandered into invalid space, reset toward best.
                    w = bestW.slice();
                    continue;
                }
                const gHat = new Array(21);
                for (let i = 0; i < 21; i++) {
                    const denom = 2 * ck * delta[i] * scale[i];
                    gHat[i] = (lossPlus - lossMinus) / denom;
                }

                // Gradient step
                w = constrainWeights(w.map((v, i) => v - ak * gHat[i]));
                const curLoss = fsrsLogLoss(trainingSet, w);
                if (curLoss < bestLoss) {
                    bestLoss = curLoss;
                    bestW = w.slice();
                }

                // Convergence check: if best loss hasn't improved significantly for N iterations, stop early
                if (Math.abs(bestLoss - prevBestLoss) < CONVERGENCE_THRESHOLD) {
                    stagnantCount++;
                    if (stagnantCount >= STAGNANT_ITERS_TO_CONVERGE) {
                        showLoading('Optimizing FSRS weights...', `Converged early at iter ${k + 1}/${iters}`, cancelOptimization);
                        setLoadingProgress(100, `Converged at iter ${k + 1}`);
                        break;
                    }
                } else {
                    stagnantCount = 0;
                    prevBestLoss = bestLoss;
                }

                if (k % 10 === 0) {
                    showLoading('Optimizing FSRS weights...', `Iter ${k + 1}/${iters} • best logloss ${bestLoss.toFixed(4)}`, cancelOptimization);
                    setLoadingProgress(((k + 1) / iters) * 100, `${Math.round(((k + 1) / iters) * 100)}% • iter ${k + 1}/${iters}`);
                    // Phase 18: Use requestIdleCallback when available for better main thread responsiveness
                    await new Promise(r => {
                        if (typeof requestIdleCallback === 'function') {
                            requestIdleCallback(r, { timeout: 50 });
                        } else {
                            setTimeout(r, 0);
                        }
                    });
                }
            }

            // Final cancellation check
            if (cancelled) {
                return;
            }

            setLoadingProgress(100, `100% • iter ${iters}/${iters}`);

            const rounded = bestW.map(n => +n.toFixed(4));
            // Update modal fields (user still presses Save to persist/sync).
            deck.fsrsWeights = rounded;
            const paramsInput = el('#deckFsrsParams');
            if (paramsInput) paramsInput.value = rounded.join(', ');
            toast(`Optimized FSRS weights loaded (best logloss ${bestLoss.toFixed(4)}). Press Save to apply.`);
        } finally {
            hideLoading();
            if (optimizeBtn) optimizeBtn.disabled = false;
        }
    },
    editDeck(deckId) {
        const deck = this.state.decks.find(d => d.id === deckId);
        if (deck) this.openDeckModal(deck);
    },
    closeDeckModal() {
        focusTrap.detach();
        el('#deckModal').classList.add('hidden');
        el('#deckModal').classList.remove('flex');
    },
    async saveDeckFromModal() {
        const d = this.state.editingDeck || this.newDeck('', 'SM-2');
        d.name = el('#deckNameInput').value || d.name || 'Untitled deck';
        d.algorithm = el('#deckAlgoInput').value;
        d.reviewLimit = Number(el('#deckReviewLimit').value) || 50;
        d.newLimit = Number(el('#deckNewLimit').value) || 20;
        d.orderMode = el('#deckOrderMode').value || 'none';
        d.reverse = el('#deckReverseInput').checked;
        d.aiPrompt = el('#deckPromptInput').value || '';

        // Save FSRS params if present
        if (d.algorithm === 'FSRS') {
            const rawRetention = el('#deckFsrsDesiredRetention')?.value?.trim() || '';
            const rawParams = el('#deckFsrsParams')?.value?.trim() || '';

            // Use parseFsrsParamsText to handle recovery and various formats
            const parsed = parseFsrsParamsText(rawParams || rawRetention);

            // If the user explicitly provided a retention value in the numeric field, prioritize it
            if (rawRetention) {
                d.fsrsDesiredRetention = clampRetention(parseFloat(rawRetention)) || DEFAULT_DESIRED_RETENTION;
            } else {
                d.fsrsDesiredRetention = parsed.desiredRetention;
            }

            // Always ensure we have 21 weights if it's FSRS
            d.fsrsWeights = parsed.weights || [...fsrsW];
        } else {
            d.fsrsWeights = null;
            d.fsrsDesiredRetention = DEFAULT_DESIRED_RETENTION;
        }

        if (!this.state.editingDeck) this.state.decks.push(d);
        d.updatedInApp = true;
        await Storage.put('decks', d);
        this.queueOp({ type: 'deck-upsert', payload: d });
        this.closeDeckModal();
        this.renderDecks();
        this.renderStudy();
        toast('Deck saved');
    },
    async archiveDeckFromModal() {
        const deck = this.state.editingDeck;
        if (!deck) return;
        // Check if this was the selected deck
        const wasSelected = this.state.selectedDeck?.id === deck.id;
        // Remove from study deck filters if it was there
        if (this.state.filters.studyDecks) {
            this.state.filters.studyDecks = this.state.filters.studyDecks.filter(id => id !== deck.id);
        }

        // Mark as archived
        deck.archived = true;

        // Remove deck and its cards from local storage view (deletion logic remains for UX)
        // But we queue the upsert with archived=true FIRST so it syncs correctly
        await Storage.put('decks', deck);
        this.queueOp({ type: 'deck-upsert', payload: deck });

        const cards = this.cardsForDeck(deck.id);
        for (const card of cards) {
            const idx = this.state.cards.findIndex(c => c.id === card.id);
            if (idx >= 0) this.state.cards.splice(idx, 1);
            await Storage.delete('cards', card.id);
        }
        const deckIdx = this.state.decks.findIndex(d => d.id === deck.id);
        if (deckIdx >= 0) this.state.decks.splice(deckIdx, 1);
        await Storage.delete('decks', deck.id);

        // Clear selection if this was the selected deck
        if (wasSelected) {
            this.state.selectedDeck = null;
        }
        this.closeDeckModal();
        this.renderDecks();
        this.renderCards();
        this.renderSelectedDeckBar();
        this.renderStudyDeckSelection();
        this.renderStudy();
        toast('Deck archived');
    },
    openResetAlgorithmModal() {
        const deck = this.state.selectedDeck;
        if (!deck) {
            toast('Select a deck first');
            return;
        }
        el('#resetDeckName').textContent = deck.name;
        this.openModal('resetAlgorithmModal');
    },
    async confirmResetAlgorithm() {
        const deck = this.state.selectedDeck;
        if (!deck) return;
        const cards = this.cardsForDeck(deck.id);
        if (cards.length === 0) {
            toast('No cards in this deck');
            this.closeModal('resetAlgorithmModal');
            return;
        }

        // Show progress UI
        const container = el('#resetProgressContainer');
        const bar = el('#resetProgressBar');
        const percent = el('#resetProgressPercent');
        const confirmBtn = el('#confirmResetAlgorithm');
        const cancelBtn = el('#cancelResetAlgorithm');

        if (container) container.classList.remove('hidden');
        if (confirmBtn) confirmBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        // Reset algorithm parameters for all cards in the deck
        const total = cards.length;
        const CHUNK_SIZE = 50; // Larger chunks for batch writes
        const weights = deck.fsrsWeights || fsrsW;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = cards.slice(i, i + CHUNK_SIZE);

            // Update UI
            if (percent) percent.textContent = Math.round((i / total) * 100) + '%';
            if (bar) bar.style.width = ((i / total) * 100) + '%';

            // Allow UI to breathe
            await new Promise(resolve => setTimeout(resolve, 0));

            // Reset all cards in this chunk
            for (const card of chunk) {
                // Reset SM-2 parameters
                card.sm2 = {
                    easeFactor: 2.5,
                    interval: 1,
                    repetitions: 0,
                    dueDate: null,
                    lastRating: null,
                    lastReview: null
                };
                // Reset FSRS parameters with proper initial values
                card.fsrs = {
                    stability: initStability(weights, 'good'),
                    difficulty: initDifficulty(weights, 'good'),
                    dueDate: null,
                    lastReview: null,
                    lastRating: null,
                    retrievability: 0.9
                };
            }

            // Batch save to IndexedDB - single transaction for the chunk
            try {
                await Storage.putMany('cards', chunk);
            } catch (e) {
                console.error('Failed to batch save cards:', e);
                toast('Error saving cards: ' + e.message);
                // Try individual saves as fallback
                for (const card of chunk) {
                    await Storage.put('cards', card).catch(err => console.error('Individual save failed:', err));
                }
            }

            // Queue for sync to Notion
            for (const card of chunk) {
                this.queueOp({ type: 'card-upsert', payload: card });
            }
        }

        // Update in-memory state
        this.state.cards = this.state.cards.map(c => {
            const updated = cards.find(uc => uc.id === c.id);
            return updated || c;
        });

        this.closeModal('resetAlgorithmModal');

        // Reset UI for next time
        if (container) container.classList.add('hidden');
        if (confirmBtn) confirmBtn.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (bar) bar.style.width = '0%';

        // Re-render all views that show due counts
        this.renderCards();
        this.renderDecks();
        this.renderStudyDeckSelection();
        this.renderStudy();
        toast(`Reset ${total} card${total !== 1 ? 's' : ''} — syncing to Notion`);
    },
    openCardModal(card) {
        if (!this.isReady()) { this.openSettings(); return; }
        this.state.editingCard = card || null;
        el('#cardModalTitle').textContent = card ? 'Edit card' : 'New card';
        const deckSelect = el('#cardDeckInput');
        deckSelect.innerHTML = this.state.decks.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        deckSelect.value = card?.deckId || this.state.selectedDeck?.id || this.state.decks[0]?.id;
        el('#cardTypeInput').value = card?.type ?? 'Front-Back';
        el('#cardNameInput').value = card?.name ?? '';
        el('#cardBackInput').value = card?.back ?? '';
        el('#cardNotesInput').value = card?.notes ?? '';
        // Initialize tag selection for modal
        this.state.tagSelection = card?.tags?.map(t => t.name) || [];
        const tagSearch = el('#cardTagSearch');
        if (tagSearch) tagSearch.value = '';
        this.renderCardTagSelectors();
        el('#cardOrderInput').value = (typeof card?.order === 'number') ? card.order : '';
        el('#cardSuspendedInput').checked = card?.suspended ?? false;
        el('#cardLeechInput').checked = card?.leech ?? false;
        el('#deleteCardBtn').classList.toggle('hidden', !card);
        // Show/hide back section based on card type
        this.updateCardBackVisibility();
        // Populate review history section
        this.renderCardModalReviewHistory(card);
        el('#cardModal').classList.remove('hidden');
        el('#cardModal').classList.add('flex');
        lucide.createIcons();
    },
    renderCardModalReviewHistory(card) {
        const section = el('#cardReviewHistorySection');
        const countEl = el('#cardReviewHistoryCount');
        const tableEl = el('#cardReviewHistoryTable');

        if (!card || !card.reviewHistory || card.reviewHistory.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        const history = card.reviewHistory;
        countEl.textContent = history.length;

        const ratingColors = { again: 'text-red-500', hard: 'text-orange-500', good: 'text-green-500', easy: 'text-blue-500' };
        // Show all reviews (most recent first)
        const sortedHistory = [...history].reverse();
        tableEl.innerHTML = `
                    <table class="w-full text-xs">
                        <thead class="sticky top-0 bg-oatmeal dark:bg-white/5"><tr class="text-earth-metal/50 dark:text-white/60 border-b border-charcoal/10"><th class="text-left py-1.5 px-2">Rating</th><th class="text-left py-1.5 px-2">Date</th><th class="text-left py-1.5 px-2">Time</th></tr></thead>
                        <tbody>
                            ${sortedHistory.map(h => `
                                <tr class="border-b border-charcoal/5 last:border-0">
                                    <td class="py-1 px-2 capitalize ${ratingColors[h.rating] || ''}">${h.rating}</td>
                                    <td class="py-1 px-2 text-earth-metal/70">${new Date(h.at).toLocaleDateString()}</td>
                                    <td class="py-1 px-2 text-earth-metal/70">${new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
    },
    updateCardBackVisibility() {
        const isCloze = el('#cardTypeInput').value === 'Cloze';
        const backSection = el('#cardBackSection');
        if (backSection) backSection.classList.toggle('hidden', isCloze);
    },
    closeCardModal() {
        el('#cardModal').classList.add('hidden');
        el('#cardModal').classList.remove('flex');
    },
    async saveCardFromModal() {
        let card = this.state.editingCard || this.newCard('', '', '', 'Front-Back');
        const oldName = card.name;
        const oldBack = card.back;
        const oldNotes = card.notes;
        card.deckId = el('#cardDeckInput').value;
        card.type = el('#cardTypeInput').value;
        card.name = el('#cardNameInput').value || 'Untitled';
        card.back = el('#cardBackInput').value || '';
        card.notes = el('#cardNotesInput').value || '';
        if (!this.state.editingCard) {
            const autoType = detectCardType(card.name, card.back);
            if (card.type === 'Front-Back' && autoType === 'Cloze') card.type = 'Cloze';
        }
        const selectedTags = this.state.tagSelection || [];
        const optionMap = new Map(this.collectTagOptions().map(t => [t.name, t.color || 'default']));
        const existingColors = new Map((this.state.editingCard?.tags || []).map(t => [t.name, t.color || 'default']));
        card.tags = selectedTags.map(name => ({ name, color: optionMap.get(name) || existingColors.get(name) || 'default' }));
        const orderVal = el('#cardOrderInput').value;
        card.order = orderVal === '' ? null : Number(orderVal);
        card.suspended = el('#cardSuspendedInput').checked;
        card.leech = el('#cardLeechInput').checked;
        // Only set updatedInApp if name/back/notes changed (affects rich_text preservation)
        // Note: Editing Name, Back, or Notes will cause text colors and highlights to be lost on sync
        if (card.name !== oldName || card.back !== oldBack || card.notes !== oldNotes) {
            card.updatedInApp = true;
        }
        // Ensure selected tags are stored for future modal suggestions
        selectedTags.forEach(name => {
            if (!this.state.tagOptions.some(t => t.name === name)) {
                this.state.tagOptions.push({ name, color: optionMap.get(name) || 'default' });
            }
        });
        Storage.setMeta('tagOptions', this.state.tagOptions).catch(e => console.debug('Storage setMeta tagOptions failed:', e));
        if (!this.state.editingCard) this.state.cards.push(card);
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        this.closeCardModal();
        this.renderCards();
        toast('Card saved');
    },
    async deleteCardFromModal() {
        const card = this.state.editingCard;
        if (!card) return;
        this.pendingDelete = { type: 'card', id: card.id, notionId: card.notionId };
        this.openModal('confirmModal');
    },
    async syncNow() {
        if (!navigator.onLine) {
            toast('Offline: sync will resume when you reconnect');
            return;
        }
        if (!this.isReady()) return toast('Complete settings first');
        if (this.state.syncing) { toast('Sync already in progress'); return; }
        this.state.syncing = true;
        this.updateSyncButtonState();
        this.setSyncButtonSpinning(true);
        const loadingMsg = el('#loadingMessage');
        el('#syncProgress').style.width = '10%';
        try {
            // Push first to save local changes
            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Pushing local changes...';
            }
            await this.pushQueue();
            el('#syncProgress').style.width = '50%';

            // Then pull to get updates
            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Fetching decks...';
            }
            await this.pullFromNotion();
            el('#syncProgress').style.width = '100%';

            if (loadingMsg && !el('#loadingOverlay').classList.contains('hidden')) {
                loadingMsg.textContent = 'Preparing your library...';
            }
            const nowIso = new Date().toISOString();
            this.state.lastPull = nowIso;
            this.state.lastPush = nowIso;
            this.state.lastSync = nowIso;
            await Storage.put('meta', { key: 'lastPull', value: nowIso });
            await Storage.put('meta', { key: 'lastPush', value: nowIso });
            await Storage.put('meta', { key: 'lastSync', value: nowIso });
            toast('Synced with Notion');
        } catch (e) {
            console.error('Sync failed', e);
            toast('Sync failed – check your internet connection or Notion settings');
        } finally {
            this.setSyncButtonSpinning(false);
            setTimeout(() => el('#syncProgress').style.width = '0%', 700);
            this.state.syncing = false;
            this.updateSyncButtonState();
            if (this.state.queue.length > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    async pullFromNotion() {
        const { deckSource, cardSource } = this.state.settings;
        if (!deckSource || !cardSource) return;
        const since = this.state.lastPull;

        // Deck visibility:
        // - Custom deck property "Archived?" means "hide deck + cards from app".
        // - Notion page-level `archived: true` means deleted in Notion (remove locally).
        // For incremental pulls, we must fetch both archived/unarchived to detect newly hidden decks.
        let deckFilter = { property: 'Archived?', checkbox: { equals: false } };
        if (since) {
            deckFilter = { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } };
        }

        // Query non-archived decks first
        const decks = await API.queryDatabase(deckSource, deckFilter);
        const deckPages = decks || [];
        const isHiddenDeck = (p) => !!p?.properties?.['Archived?']?.checkbox;
        // Notion page-level deletion sets `archived: true`. Remove those locally.
        const deletedDeckNotionIds = new Set(deckPages.filter(p => p?.archived).map(p => p.id));
        // Custom "Archived?" decks should not exist locally at all.
        const hiddenDeckNotionIds = new Set(deckPages.filter(p => !p?.archived && isHiddenDeck(p)).map(p => p.id));
        // Optional safety: fetch all hidden decks to ensure we never show them even if they were archived
        // before `since` (e.g., after upgrading from older versions).
        if (since) {
            try {
                const hiddenAll = await API.queryDatabase(deckSource, { property: 'Archived?', checkbox: { equals: true } });
                for (const p of (hiddenAll || [])) {
                    if (p?.id) hiddenDeckNotionIds.add(p.id);
                }
            } catch (_) { /* best-effort */ }
        }

        const mappedDecks = deckPages
            .filter(p => !p?.archived && !isHiddenDeck(p))
            .map(d => NotionMapper.deckFrom(d));

        // Identify decks that are new (not in local state) - need to fetch their cards
        const existingActiveDeckNotionIds = new Set(
            this.state.decks.filter(d => d.notionId && !d.archived).map(d => d.notionId)
        );
        const newDeckIds = mappedDecks.filter(d => !existingActiveDeckNotionIds.has(d.notionId)).map(d => d.notionId);

        // Active deck ids for card filtering (local active + newly pulled active), excluding hidden/deleted.
        const activeDeckNotionIds = new Set([...existingActiveDeckNotionIds, ...mappedDecks.map(d => d.notionId)]);
        for (const id of hiddenDeckNotionIds) activeDeckNotionIds.delete(id);
        for (const id of deletedDeckNotionIds) activeDeckNotionIds.delete(id);

        // Query cards (with timestamp if incremental), then filter client-side
        let cardFilter = null;
        if (since) {
            cardFilter = { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } };
        }
        const cards = await API.queryDatabase(cardSource, cardFilter);
        const deletedCardNotionIds = new Set((cards || []).filter(p => p?.archived).map(p => p.id));
        let mappedCards = (cards || []).filter(p => !p?.archived).map(c => NotionMapper.cardFrom(c, mappedDecks));

        // If we have new decks, fetch their cards separately (they may not have been edited recently)
        if (since && newDeckIds.length > 0) {
            for (const deckId of newDeckIds) {
                const deckCards = await API.queryDatabase(cardSource, {
                    property: 'Deck',
                    relation: { contains: deckId }
                });
                const newCards = (deckCards || []).filter(p => !p?.archived).map(c => NotionMapper.cardFrom(c, mappedDecks));
                // Add cards we don't already have
                for (const nc of newCards) {
                    if (!mappedCards.find(c => c.notionId === nc.notionId)) {
                        mappedCards.push(nc);
                    }
                }
            }
        }

        // Filter out cards that belong to hidden/deleted decks
        const filteredCards = mappedCards.filter(c => {
            // If card has no deck relation, include it
            if (!c.deckId) return true;
            // Include only if deck is in our non-archived list
            return activeDeckNotionIds.has(c.deckId);
        });

        if (!since) {
            await Storage.wipeStore('decks');
            await Storage.wipeStore('cards');
            this.state.decks = [];
            this.state.cards = [];
        }

        // Apply deletions (Notion page-level archive/delete) on incremental pulls.
        // Deck deletions also remove their cards locally.
        if (since) {
            if (deletedCardNotionIds.size > 0) {
                for (const nid of deletedCardNotionIds) {
                    const local = this.state.cards.find(c => c.notionId === nid);
                    if (!local) continue;
                    await Storage.delete('cards', local.id);
                }
                this.state.cards = this.state.cards.filter(c => !deletedCardNotionIds.has(c.notionId));
            }
            if (hiddenDeckNotionIds.size > 0) {
                const toHideDecks = this.state.decks.filter(d => d.notionId && hiddenDeckNotionIds.has(d.notionId));
                // Remove from local DB/state entirely.
                for (const d of toHideDecks) {
                    await Storage.delete('decks', d.id);
                }
                const hideDeckKeys = new Set([
                    ...toHideDecks.map(d => d.id),
                    ...toHideDecks.map(d => d.notionId).filter(Boolean),
                    ...hiddenDeckNotionIds
                ]);
                const cardsToHide = this.state.cards.filter(c => hideDeckKeys.has(c.deckId));
                for (const c of cardsToHide) {
                    await Storage.delete('cards', c.id);
                }
                this.state.cards = this.state.cards.filter(c => !hideDeckKeys.has(c.deckId));
                this.state.decks = this.state.decks.filter(d => !(d.notionId && hiddenDeckNotionIds.has(d.notionId)));
                // Remove hidden decks from selection/filter state
                if (this.state.filters?.studyDecks?.length) {
                    const hiddenIds = new Set(toHideDecks.map(d => d.id));
                    this.state.filters.studyDecks = this.state.filters.studyDecks.filter(id => !hiddenIds.has(id));
                }
                if (this.state.selectedDeck && this.state.selectedDeck.notionId && hiddenDeckNotionIds.has(this.state.selectedDeck.notionId)) {
                    this.state.selectedDeck = null;
                }
            }
            if (deletedDeckNotionIds.size > 0) {
                const toDeleteDecks = this.state.decks.filter(d => deletedDeckNotionIds.has(d.notionId));
                for (const d of toDeleteDecks) {
                    await Storage.delete('decks', d.id);
                }
                const deletedDeckKeys = new Set([
                    ...toDeleteDecks.map(d => d.id),
                    ...toDeleteDecks.map(d => d.notionId).filter(Boolean),
                    ...deletedDeckNotionIds
                ]);
                // Remove cards in deleted decks (by either local id or Notion id).
                const cardsToDelete = this.state.cards.filter(c => deletedDeckKeys.has(c.deckId));
                for (const c of cardsToDelete) {
                    await Storage.delete('cards', c.id);
                }
                this.state.decks = this.state.decks.filter(d => !deletedDeckNotionIds.has(d.notionId));
                this.state.cards = this.state.cards.filter(c => !deletedDeckKeys.has(c.deckId));
            }
        }

        const upsertDeck = (deck) => {
            const idx = this.state.decks.findIndex(d => d.notionId === deck.notionId);
            if (idx >= 0) this.state.decks[idx] = { ...this.state.decks[idx], ...deck };
            else this.state.decks.push(deck);
        };
        const upsertCard = (card) => {
            const idx = this.state.cards.findIndex(c => c.notionId === card.notionId);
            if (idx >= 0) {
                const existing = this.state.cards[idx];
                // Preserve local review history if Notion's is empty but local has data
                // This prevents data loss from sync parse failures
                const localHistory = existing.reviewHistory || [];
                const remoteHistory = card.reviewHistory || [];
                const preservedHistory = (remoteHistory.length === 0 && localHistory.length > 0)
                    ? localHistory
                    : remoteHistory;
                this.state.cards[idx] = { ...existing, ...card, reviewHistory: preservedHistory };
            } else {
                this.state.cards.push(card);
            }
        };

        for (const d of mappedDecks) { upsertDeck(d); await Storage.put('decks', d); }
        for (const c of filteredCards) { upsertCard(c); await Storage.put('cards', c); }
        this.renderAll();
    },
    async pushQueue() {
        const { deckSource, cardSource } = this.state.settings;
        // Process deck operations before card operations to satisfy Notion relation dependencies.
        const queue = [...this.state.queue]
            .map((op, idx) => ({ op, idx }))
            .sort((a, b) => {
                const prio = (t) => ({ 'deck-upsert': 1, 'deck-delete': 2, 'card-upsert': 3, 'card-delete': 4, 'block-append': 5 }[t] || 99);
                const dp = prio(a.op.type) - prio(b.op.type);
                return dp !== 0 ? dp : a.idx - b.idx; // stable within the same type
            })
            .map(x => x.op);
        const hadQueue = queue.length > 0;
        // Bug 1 Fix: Don't clear the queue yet - only clear successfully processed items
        // Keep track of processed items to remove them atomically after successful sync
        const processedIndices = new Set();
        const failed = [];
        const succeeded = [];
        for (let i = 0; i < queue.length; i++) {
            const op = queue[i];
            if (i > 0) await sleep(350); // Pace requests to ~3 per second
            try {
                if (op.type === 'deck-upsert') {
                    const props = NotionMapper.deckProps(op.payload);
                    if (op.payload.notionId) await API.updatePage(op.payload.notionId, props);
                    else {
                        const res = await API.createPage(deckSource, props);
                        op.payload.notionId = res.id;
                        op.payload.id = op.payload.id || res.id;
                        await Storage.put('decks', op.payload);
                        // If the queue was rehydrated from storage, op.payload may not be the same object
                        // instance as the deck in memory. Ensure we update in-memory state so subsequent
                        // card upserts in this same run can resolve `deck.notionId`.
                        const deckIdx = this.state.decks.findIndex(d => d.id === op.payload.id);
                        if (deckIdx >= 0) {
                            this.state.decks[deckIdx] = { ...this.state.decks[deckIdx], ...op.payload };
                        }
                    }
                }
                if (op.type === 'deck-delete' && op.payload.notionId) await API.archivePage(op.payload.notionId);
                if (op.type === 'card-upsert') {
                    const deck = this.deckById(op.payload.deckId);
                    if (!op.payload.notionId && op.payload.deckId && (!deck || !deck.notionId)) {
                        throw new Error('Deck not yet synced');
                    }
                    const props = NotionMapper.cardProps(op.payload, deck);
                    if (op.payload.notionId) await API.updatePage(op.payload.notionId, props);
                    else {
                        const res = await API.createPage(cardSource, props);
                        op.payload.notionId = res.id;
                        op.payload.id = op.payload.id || res.id;
                        op.payload.syncId = res.id;
                    }
                    // After successful push, reset updatedInApp and update _notionRichText
                    // so subsequent pushes (e.g., SRS updates) preserve the rich_text we just sent
                    op.payload.updatedInApp = false;
                    op.payload._notionRichText = {
                        name: props['Name'].title,
                        back: props['Back'].rich_text,
                        notes: props['Notes'].rich_text
                    };
                    // Update local state
                    const cardIdx = this.state.cards.findIndex(c => c.notionId === op.payload.notionId || c.id === op.payload.id);
                    if (cardIdx >= 0) {
                        this.state.cards[cardIdx] = { ...this.state.cards[cardIdx], ...op.payload };
                    }
                    await Storage.put('cards', op.payload);
                }
                if (op.type === 'card-delete' && op.payload.notionId) await API.archivePage(op.payload.notionId);
                if (op.type === 'block-append' && op.payload.pageId) {
                    await API.appendBlocks(op.payload.pageId, op.payload.blocks);
                }
                // Bug 1 Fix: Track successfully processed operations
                succeeded.push(op);
            } catch (e) {
                console.error(`Queue op failed: ${op.type}`, e);
                // Store last error so the header badge can explain why the queue may look "stuck".
                this.state.lastQueueError = {
                    at: new Date().toISOString(),
                    type: op.type,
                    message: e?.message || String(e)
                };
                Storage.setMeta('lastQueueError', this.state.lastQueueError).catch(e => console.debug('Storage setMeta lastQueueError failed:', e));
                op.retryCount = (op.retryCount || 0) + 1;
                if (op.retryCount <= 5) {
                    failed.push(op);
                } else {
                    toast(`Sync dropped item after 5 attempts: ${e.message}`);
                }
            }
        }
        // Bug 1 Fix: Atomically update the queue - remove successfully processed items and add failed ones
        // This prevents data loss from race conditions during sync
        const succeededIds = new Set(succeeded.map(op => {
            const id = op.payload?.id || op.payload?.notionId;
            return `${op.type}:${id}`;
        }));
        // Filter out succeeded items from the current queue (in case new items were added during processing)
        this.state.queue = this.state.queue.filter(op => {
            const id = op.payload?.id || op.payload?.notionId;
            const key = `${op.type}:${id}`;
            return !succeededIds.has(key);
        });
        // Re-queue failed operations
        if (failed.length > 0) {
            this.state.queue = [...this.state.queue, ...failed];
            toast(`${failed.length} sync operation(s) failed, will retry`);
            this.state.queueLastChangedAt = new Date().toISOString();
            Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(e => console.debug('Storage setMeta queueLastChangedAt failed:', e));
        } else if (hadQueue && succeeded.length > 0) {
            // Queue successfully processed: clear the last error to avoid stale "stuck" tooltips.
            this.state.lastQueueError = null;
            Storage.setMeta('lastQueueError', null).catch(e => console.debug('Storage clear lastQueueError failed:', e));
            this.state.queueLastChangedAt = new Date().toISOString();
            Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(() => { });
        }
        el('#queueCount').textContent = String(this.state.queue.length);
        await Storage.setMeta('queue', this.state.queue);
        this.renderConnection();
    },
    queueOp(op, reason = 'generic') {
        op.reason = reason;

        // Deduplicate: remove existing operation for same entity + type
        // Keep only the latest operation for each card/deck
        const entityId = op.payload?.id || op.payload?.notionId;
        if (entityId && (op.type === 'card-upsert' || op.type === 'deck-upsert')) {
            this.state.queue = this.state.queue.filter(existing => {
                const existingId = existing.payload?.id || existing.payload?.notionId;
                return !(existing.type === op.type && existingId === entityId);
            });
        }

        this.state.queue.push(op);
        el('#queueCount').textContent = String(this.state.queue.length);
        Storage.setMeta('queue', this.state.queue).catch(e => console.debug('Storage setMeta queue failed:', e));
        this.state.queueLastChangedAt = new Date().toISOString();
        Storage.setMeta('queueLastChangedAt', this.state.queueLastChangedAt).catch(e => console.debug('Storage setMeta queueLastChangedAt failed:', e));
        this.updateSyncButtonState();
        this.renderConnection();
        const delay = (reason === 'rating') ? (5 * 60 * 1000) : 1500;
        this.requestAutoSyncSoon(delay, reason);
    },
    updateSyncButtonState() {
        const btn = el('#syncNowBtn');
        if (!btn) return;
        const pendingOffline = this.state.queue.length > 0 && !navigator.onLine;
        const offline = !navigator.onLine;
        btn.disabled = pendingOffline || this.state.syncing || offline;
        btn.classList.toggle('opacity-70', btn.disabled);
    },
    async manualSync() {
        if (!navigator.onLine) {
            toast('Offline: sync will run when you are online');
            return;
        }
        if (!this.isReady()) { toast('Complete setup first'); return; }
        if (this.state.syncing) { toast('Sync already in progress'); return; }

        this.state.syncing = true;
        const btn = el('#refreshDecksBtn');
        const svg = btn?.querySelector('svg');
        if (svg) svg.classList.add('animate-spin');

        try {
            // Always push first to save local progress
            if (this.state.queue.length > 0) {
                await this.pushQueue();
                this.state.lastPush = new Date().toISOString();
                await Storage.put('meta', { key: 'lastPush', value: this.state.lastPush });
            }
            // Then pull to get updates
            await this.pullFromNotion();
            this.state.lastPull = new Date().toISOString();
            await Storage.put('meta', { key: 'lastPull', value: this.state.lastPull });

            this.state.lastSync = new Date().toISOString();
            await Storage.put('meta', { key: 'lastSync', value: this.state.lastSync });
            this.renderConnection();
            toast('Synced with Notion');
        } catch (e) {
            console.error('Manual sync failed', e);
            toast('Sync failed - check connection');
        } finally {
            this.state.syncing = false;
            if (svg) svg.classList.remove('animate-spin');
            if (this.state.queue.length > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    startAutoSync() {
        if (this.state.autoSyncTimer) clearInterval(this.state.autoSyncTimer);
        this.state.autoSyncTimer = setInterval(() => this.autoSyncTick(), SYNC_INTERVAL_MS);
        this.autoSyncTick(); // kick off once on load
        this.updateSyncButtonState();
    },
    requestAutoSyncSoon(delayMs = 1500, reason = 'generic') {
        if (this.state.autoSyncSoonTimer) {
            if (reason !== 'rating') {
                clearTimeout(this.state.autoSyncSoonTimer);
                this.state.autoSyncSoonTimer = null;
            } else {
                return;
            }
        }
        if (!navigator.onLine) return;
        if (!this.isReady()) return;
        const ms = Math.max(200, Number(delayMs) || 0);
        this.state.autoSyncSoonTimer = setTimeout(() => {
            this.state.autoSyncSoonTimer = null;
            this.autoSyncTick();
        }, ms);
    },
    async autoSyncTick() {
        if (this.state.syncing) return;
        if (!navigator.onLine) {
            this.updateSyncButtonState();
            return;
        }
        if (!this.isReady()) return;
        const now = Date.now();
        const lastPullMs = this.state.lastPull ? new Date(this.state.lastPull).getTime() : 0;
        const lastPushMs = this.state.lastPush ? new Date(this.state.lastPush).getTime() : 0;
        // Don't pull during a study session; keep focus on local flow.
        const wantsPull = !this.state.session && (now - lastPullMs > MIN_PULL_INTERVAL_MS);
        // Never pull while there are pending local mutations; a pull can overwrite local edits or
        // break deck/card references before the queue finishes pushing.
        const wantsPush = this.state.queue.length > 0;
        const canPushNow = wantsPush && (this.state.lastPush == null || (now - lastPushMs > MIN_PUSH_INTERVAL_MS));
        if (!wantsPull && !wantsPush) return;
        // If we have pending work but are within the push cooldown, schedule another tick close to the allowed time.
        if (wantsPush && !canPushNow) {
            const remaining = MIN_PUSH_INTERVAL_MS - (now - lastPushMs);
            this.requestAutoSyncSoon(remaining + 100);
            return;
        }
        this.state.syncing = true;
        try {
            let didWork = false;
            // Always push first to avoid overwriting local changes with stale Notion data
            if (canPushNow) {
                await this.pushQueue();
                this.state.lastPush = new Date().toISOString();
                await Storage.put('meta', { key: 'lastPush', value: this.state.lastPush });
                didWork = true;
            }
            // Only pull when the queue is empty after any push attempt.
            if (wantsPull && this.state.queue.length === 0) {
                await this.pullFromNotion();
                this.state.lastPull = new Date().toISOString();
                await Storage.put('meta', { key: 'lastPull', value: this.state.lastPull });
                didWork = true;
            }
            if (didWork) {
                this.state.lastSync = new Date().toISOString();
                await Storage.put('meta', { key: 'lastSync', value: this.state.lastSync });
                this.renderConnection();
            }
        } catch (e) {
            console.error('Auto sync failed', e);
        } finally {
            this.state.syncing = false;
            this.updateSyncButtonState();
            // If more work was added to the queue during sync, schedule another tick.
            if (this.state.queue.length > 0) {
                this.requestAutoSyncSoon(MIN_PUSH_INTERVAL_MS + 100);
            }
        }
    },
    handleOnline() {
        // Issue 2 Fix: Show visual feedback when coming back online
        document.body.classList.remove('offline-mode');
        toast('Back online');
        this.renderConnection();
        this.requestAutoSyncSoon(250);
    },
    handleOffline() {
        // Issue 2 Fix: Show visual feedback when going offline
        document.body.classList.add('offline-mode');
        toast('You are offline - changes will sync when online');
        this.renderConnection();
        this.updateSyncButtonState();
    },
    selectDeck(id) {
        const deck = this.deckById(id);
        this.state.selectedDeck = deck;
        this.state.cardLimit = 50; // Reset limit
        this.renderDecks(); // Re-render to show selection highlight
        this.renderCards();
        this.renderStudy();
        this.renderSelectedDeckBar();
        // Scroll to cards section
        const cardsSection = el('#cardsSection');
        if (cardsSection) cardsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    selectCard(id) {
        const card = this.cardById(id);
        this.state.selectedCard = card;
        this.renderStudy();
        this.openCardModal(card);
    },
    editCard(id) {
        const card = this.cardById(id);
        if (!card) return;
        this.state.selectedCard = card;
        this.openCardModal(card);
    },
    showReviewHistoryPopover(btn, cardId) {
        // Close any existing popover
        const existing = document.querySelector('.review-history-popover');
        if (existing) existing.remove();

        const card = this.cardById(cardId);
        if (!card) return;

        const history = card.reviewHistory || [];
        const ratingColors = { again: 'text-red-500', hard: 'text-orange-500', good: 'text-green-500', easy: 'text-blue-500' };

        // Create popover content
        let content;
        if (history.length === 0) {
            content = '<p class="text-earth-metal/50 dark:text-white/60 text-center py-2">No reviews yet</p>';
        } else {
            // Show last 10 reviews (most recent first)
            const recentHistory = [...history].reverse().slice(0, 10);
            content = `
                        <table class="w-full text-xs">
                            <thead><tr class="text-earth-metal/50 dark:text-white/60 border-b border-charcoal/10 dark:border-white/10"><th class="text-left py-1">Rating</th><th class="text-left py-1">Date</th></tr></thead>
                            <tbody>
                                ${recentHistory.map(h => `
                                    <tr class="border-b border-charcoal/5 dark:border-white/5 last:border-0">
                                        <td class="py-1 capitalize ${ratingColors[h.rating] || ''}">${escapeHtml(String(h.rating || ''))}</td>
                                        <td class="py-1 text-earth-metal/70 dark:text-white/70">${new Date(h.at).toLocaleDateString()} ${new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${history.length > 10 ? `<p class="text-earth-metal/50 dark:text-white/60 text-xs text-center mt-1">+${history.length - 10} more</p>` : ''}
                    `;
        }

        // Create and position popover
        const popover = document.createElement('div');
        popover.className = 'review-history-popover fixed z-50 bg-oatmeal dark:bg-zinc-800 border border-charcoal/20 dark:border-white/10 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]';
        popover.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium text-sm text-charcoal dark:text-white">Review History</span>
                        <button class="close-popover text-earth-metal/50 dark:text-white/60 hover:text-earth-metal dark:hover:text-white p-0.5"><i data-lucide="x" class="w-4 h-4"></i></button>
                    </div>
                    ${content}
                `;

        // Position popover near button
        document.body.appendChild(popover);
        const btnRect = btn.getBoundingClientRect();
        const popRect = popover.getBoundingClientRect();

        // Position to the left of button, or right if not enough space
        let left = btnRect.left - popRect.width - 8;
        if (left < 8) left = Math.min(window.innerWidth - popRect.width - 8, btnRect.right + 8);
        let top = btnRect.top;
        if (top + popRect.height > window.innerHeight - 8) top = window.innerHeight - popRect.height - 8;

        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;

        lucide.createIcons({ nodes: [popover] });

        // Close handlers
        const closeOnClickOutside = (e) => {
            if (!popover.contains(e.target) && !btn.contains(e.target)) {
                popover.remove();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        popover.querySelector('.close-popover').onclick = () => {
            popover.remove();
            document.removeEventListener('click', closeOnClickOutside);
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0);
    },
    passFilters(card) {
        const f = this.state.filters;
        const now = new Date();
        const deck = this.deckById(card.deckId);
        const alg = deck?.algorithm || 'SM-2';
        const lastRating = (alg === 'FSRS' ? card.fsrs?.lastRating : card.sm2?.lastRating) || card.fsrs?.lastRating || card.sm2?.lastRating;
        if (f.again && lastRating !== 'again') return false;
        if (f.hard && !['again', 'hard'].includes(lastRating)) return false;
        if (f.addedToday && card.createdAt && new Date(card.createdAt).toDateString() !== now.toDateString()) return false;
        if (f.tags.length && !f.tags.some(t => card.tags.some(ct => ct.name === t))) return false;
        if (f.suspended && card.suspended) return false;
        if (f.leech && card.leech) return false;
        return true;
    },
    isDue(card) {
        const deck = this.deckById(card.deckId);
        const alg = deck?.algorithm || 'SM-2';
        const duePrimary = alg === 'FSRS' ? card.fsrs?.dueDate : card.sm2?.dueDate;
        const dueFallback = alg === 'FSRS' ? card.sm2?.dueDate : card.fsrs?.dueDate;
        const due = duePrimary || dueFallback;
        if (!due) return true;

        const now = new Date();
        const dueDate = new Date(due);
        const studyDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0, 0);
        const effectiveNow = now < studyDayStart ? studyDayStart : now;
        return dueDate <= effectiveNow;
    },
    pickCard() {
        // If session is active, return the session's current card
        if (this.state.session) {
            const sessionData = this.getSessionCard();
            if (sessionData && sessionData.card) {
                // Store the pre-computed reverse decision from session
                this.state.sessionReversed = sessionData.reversed;
                return sessionData.card;
            }
            // Session complete or no more cards
            return null;
        }

        const f = this.state.filters;
        // If studyNonDue is enabled, include all cards regardless of due date
        let pool = this.state.studyNonDue
            ? this.state.cards.filter(c => this.passFilters(c))
            : this.state.cards.filter(c => this.passFilters(c) && this.isDue(c));
        // Filter by selected study decks
        if (f.studyDecks && f.studyDecks.length > 0) {
            pool = pool.filter(c => f.studyDecks.includes(c.deckId));
        }
        if (pool.length === 0) return null;

        // Sort by due date (most overdue first, new cards at the end)
        pool.sort((a, b) => {
            const dueA = (a.fsrs?.dueDate || a.sm2?.dueDate);
            const dueB = (b.fsrs?.dueDate || b.sm2?.dueDate);
            if (!dueA && !dueB) return 0;
            if (!dueA) return 1;
            if (!dueB) return -1;
            return new Date(dueA) - new Date(dueB);
        });

        return pool[0] || null;
    },
    renderCardFront(card, deck) {
        const typeKey = (card.type || '').toLowerCase();
        const isCloze = typeKey === 'cloze';
        const isFrontStyle = typeKey.includes('front');
        // Use session's pre-computed reverse decision if active, otherwise random
        let shouldReverse;
        if (this.state.session && typeof this.state.sessionReversed === 'boolean') {
            shouldReverse = !isCloze && this.state.sessionReversed;
        } else {
            shouldReverse = !isCloze && deck?.reverse && isFrontStyle && Math.random() < 0.5;
        }
        // Store reverse state for reveal
        this.state.cardReversed = shouldReverse;
        let prompt = shouldReverse ? card.back : card.name;
        if (isCloze) {
            // Cloze content may be stored in either Name or Back; prefer the field that contains cloze markup.
            const hasClozeInName = /\{\{c\d+::.+?\}\}/i.test(card.name || '');
            const hasClozeInBack = /\{\{c\d+::.+?\}\}/i.test(card.back || '');
            if (!hasClozeInName && hasClozeInBack) {
                prompt = card.back;
            }

            // Phase 8: Cloze index bounds check with cleanup
            const clozeMatches = (prompt || '').match(/\{\{c\d+::.+?\}\}/gi) || [];
            const maxIndex = Math.max(0, clozeMatches.length - 1);
            let clozeIdx = card.activeClozeIndex ?? 0;
            if (clozeIdx > maxIndex || clozeIdx < 0) {
                console.warn(`Cloze index ${clozeIdx} out of bounds (max: ${maxIndex}), resetting to 0`);
                clozeIdx = 0;
                card.activeClozeIndex = 0;
                // Check flag BEFORE starting any async operations to prevent race conditions
                const shouldQueue = !card._clozeIndexFixQueued;
                if (shouldQueue) {
                    card._clozeIndexFixQueued = true;
                }
                // Persist fix to local storage
                Storage.put('cards', card)
                    .then(() => {
                        // Clear the flag after successful save so future out-of-bounds corrections can be queued
                        delete card._clozeIndexFixQueued;
                    })
                    .catch(e => {
                        // Clear flag on error so retry is possible
                        delete card._clozeIndexFixQueued;
                        console.error('Failed to fix cloze index:', e);
                    });
                // Queue sync to Notion only if not already queued
                if (shouldQueue) {
                    this.queueOp({ type: 'card-upsert', payload: card });
                }
            }

            // Bug 5 fix: Improved cloze regex to handle nested braces (e.g., code snippets)
            // Uses a non-greedy match with proper handling of nested content
            // Bug 3 fix (XSS): Escape user content before inserting into HTML
            const processed = prompt.replace(/\{\{c(\d+)::((?:[^{}]|\{(?!\{)|\}(?!\}))*?)(?:::((?:[^{}]|\{(?!\{)|\}(?!\}))*?))?\}\}/g, (match, num, answer, hint) => {
                // The hint (if present) is the 3rd capture group after the optional :::
                // Escape both hint and answer to prevent XSS attacks
                const safeAnswer = escapeHtml(answer);
                const safeHint = hint ? escapeHtml(hint) : null;
                const displayHint = safeHint ? `[${safeHint}]` : '[...]';
                return `<span class="cloze-blank"><span class="cloze-placeholder">${displayHint}</span><span class="cloze-answer">${safeAnswer}</span></span>`;
            });
            return safeMarkdownParse(processed);
        }
        return safeMarkdownParse(prompt);
    },
    setRatingEnabled(enabled) {
        document.querySelectorAll('.rate-btn').forEach(btn => {
            btn.disabled = !enabled;
            btn.classList.toggle('opacity-30', !enabled);
            btn.classList.toggle('cursor-not-allowed', !enabled);
            btn.classList.toggle('pointer-events-none', !enabled);
        });
    },
    reveal() {
        const card = this.state.selectedCard;
        const isCloze = card && (card.type || '').toLowerCase() === 'cloze';
        if (this.state.answerRevealed) return;

        // Only show cardBack for non-cloze cards
        if (!isCloze) {
            el('#cardBack').classList.remove('hidden');
        }

        // Show notes section after reveal (no longer a hint)
        const notesSection = el('#notesSection');
        if (notesSection) notesSection.classList.remove('hidden');

        // Show add note button after reveal
        const addNoteBtn = el('#addNoteBlock');
        if (addNoteBtn) addNoteBtn.classList.remove('hidden');

        // Show copy button after reveal
        const copyBtn = el('#copyCardContent');
        if (copyBtn) copyBtn.classList.remove('hidden');

        // Reveal cloze blanks
        document.querySelectorAll('#cardFront .cloze-blank').forEach(span => span.classList.add('revealed'));

        // Enable rating (in both Manual and AI modes, reveal() signifies answer is now visible)
        this.state.answerRevealed = true;
        this.setRatingEnabled(true);
        this.updateMobileFab();
        const revealBtn = el('#revealBtn');
        if (revealBtn) {
            revealBtn.classList.add('hidden');
        }
        this.state.activeMicButton = null;
        this.state.lockAiUntilNextCard = true;
    },
    async rate(rating) {
        const card = this.state.selectedCard;
        if (!card) return;
        if (!this.state.answerRevealed) {
            const mode = el('#revisionMode').value;
            toast(mode === 'ai' ? 'Judge the answer first' : 'Reveal the answer first');
            return;
        }
        if (this.isAiModeSelected() && navigator.onLine && !this.state.settings.aiKey) {
            toast('Add an AI key or switch to Reveal mode');
            return;
        }
        const ratingKey = normalizeRating(rating);
        const ratingLabel = displayRating(ratingKey) || 'Good';
        // Save previous state for undo
        const previousState = {
            cardId: card.id,
            sm2: JSON.parse(JSON.stringify(card.sm2 || {})),
            fsrs: JSON.parse(JSON.stringify(card.fsrs || {})),
            history: [...card.reviewHistory],
            rating: ratingLabel,
            sessionIndex: this.state.session ? this.state.session.currentIndex : null,
            ratingCounts: this.state.session?.ratingCounts ? { ...this.state.session.ratingCounts } : null
        };
        // Preview mode: never modify scheduling (independent of due/all selection).
        const previewMode = !!this.state.session?.noScheduleChanges;

        // Bug 2 Fix: Wrap all state modifications in try-catch to ensure consistency
        try {
            if (previewMode) {
                // Track rating in session statistics (only after confirming we will advance)
                if (this.state.session && this.state.session.ratingCounts) {
                    this.state.session.ratingCounts[ratingLabel] = (this.state.session.ratingCounts[ratingLabel] || 0) + 1;
                }
                this.state.lastRating = null;
                this.setRatingEnabled(false);
                this.advanceSession(false);
                toast('Preview mode: scheduling unchanged');
                return;
            }

            const deck = this.deckById(card.deckId);
            const alg = deck?.algorithm || 'SM-2';
            if (alg === 'FSRS') card.fsrs = SRS.fsrs(card, ratingKey, deck?.fsrsWeights, deck?.fsrsDesiredRetention);
            else card.sm2 = SRS.sm2(card, ratingKey);  // SM-2 is default
            card.fsrs = card.fsrs || {};
            if (alg === 'FSRS') card.fsrs.lastRating = ratingKey;
            else {
                card.sm2 = card.sm2 || {};
                card.sm2.lastRating = ratingKey;
            }
            card.reviewHistory.push({ rating: ratingKey, at: new Date().toISOString() });

            // Persist to storage first - if this fails, we haven't modified session state yet
            await Storage.put('cards', card);
            this.queueOp({ type: 'card-upsert', payload: card }, 'rating');

            // Bug 2 Fix: Only update session statistics AFTER successful storage
            if (this.state.session && this.state.session.ratingCounts) {
                this.state.session.ratingCounts[ratingLabel] = (this.state.session.ratingCounts[ratingLabel] || 0) + 1;
            }

            // Show undo toast
            this.showUndoToast(previousState);
            // If session is active, advance the session; otherwise just render next card
            if (this.state.session) {
                this.advanceSession(false);
            } else {
                this.nextCard();
            }
        } catch (e) {
            // Bug 2 Fix: Rollback card state on failure
            console.error('Rating failed, rolling back:', e);
            card.sm2 = previousState.sm2;
            card.fsrs = previousState.fsrs;
            card.reviewHistory = previousState.history;
            toast('Rating failed, please try again');
        }
    },
    nextCard() {
        if (this.state.session) {
            this.advanceSession(true); // wasSkipped = true
        } else {
            this.renderStudy();
        }
    },
    showUndoToast(previousState) {
        // Clear any existing undo toast timeout
        if (this.state.undoToastTimeout) {
            clearTimeout(this.state.undoToastTimeout);
        }
        this.state.lastRating = previousState;
        const t = el('#toast');
        t.innerHTML = `Rated "${previousState.rating}" <button id="undoBtn" class="ml-2 underline font-medium hover:text-ghost-dark">Undo</button>`;
        t.classList.remove('hidden', 'opacity-0');
        el('#undoBtn').onclick = () => this.undoLastRating();
        this.state.undoToastTimeout = setTimeout(() => {
            this.state.lastRating = null;
            t.classList.add('opacity-0');
            setTimeout(() => {
                t.classList.add('hidden');
                t.innerHTML = '';
            }, 300);
        }, 4000);
    },
    async undoLastRating() {
        const prev = this.state.lastRating;
        if (!prev) {
            toast('Nothing to undo');
            return;
        }
        // Clear the undo toast timeout
        if (this.state.undoToastTimeout) {
            clearTimeout(this.state.undoToastTimeout);
            this.state.undoToastTimeout = null;
        }
        // Find the card and restore its state
        const card = this.cardById(prev.cardId);
        if (!card) {
            toast('Card not found');
            this.state.lastRating = null;
            return;
        }
        // Restore SRS state
        card.sm2 = prev.sm2;
        card.fsrs = prev.fsrs;
        card.reviewHistory = prev.history;
        // Save restored card
        await Storage.put('cards', card);
        // Ensure undo is propagated to Notion on next sync.
        this.queueOp({ type: 'card-upsert', payload: card });
        // Also update in memory
        const cardIndex = this.state.cards.findIndex(c => c.id === card.id);
        if (cardIndex !== -1) {
            this.state.cards[cardIndex] = card;
        }
        // Restore session state if applicable
        if (this.state.session && prev.sessionIndex !== null) {
            this.state.session.currentIndex = prev.sessionIndex;
            // Remove from completed array if it was added
            const completedIdx = this.state.session.completed.indexOf(prev.cardId);
            if (completedIdx !== -1) {
                this.state.session.completed.splice(completedIdx, 1);
            }
            // Restore rating counts
            if (prev.ratingCounts) {
                this.state.session.ratingCounts = prev.ratingCounts;
            }
            this.saveSession();
        }
        this.state.lastRating = null;
        // Hide the undo toast
        const t = el('#toast');
        t.classList.add('hidden', 'opacity-0');
        t.innerHTML = '';
        // Re-render study view to show the card again
        this.renderStudy();
        toast('Rating undone');
    },
    enableNonDueStudy() {
        // Temporarily ignore due dates for this study session
        this.state.studyNonDue = true;
        this.renderStudy();
    },
    cardsForDeck(deckId) {
        return this.state.cards.filter(c => c.deckId === deckId);
    },
    deckById(id) {
        return this.state.decks.find(d => d.id === id);
    },
    cardById(id) {
        return this.state.cards.find(c => c.id === id);
    },
    deckName(id) {
        return this.deckById(id)?.name ?? '—';
    },
    getDeckLabel(deckIds) {
        if (!deckIds || deckIds.length === 0) return 'No decks';
        const allDeckIds = this.state.decks.map(d => d.id);
        const isAllDecks = deckIds.length === allDeckIds.length &&
            deckIds.every(id => allDeckIds.includes(id));
        if (isAllDecks) return 'All decks';
        if (deckIds.length === 1) return this.deckById(deckIds[0])?.name || 'Unknown';
        return `${deckIds.length} decks`;
    },
    resetFilters() {
        this.state.filters = { again: false, hard: false, addedToday: false, tags: [], suspended: false, leech: false, studyDecks: [] };
        el('#filterAgain').checked = false;
        el('#filterHard').checked = false;
        el('#filterAddedToday').checked = false;
        el('#filterSuspended').checked = false;
        el('#filterLeech').checked = false;
        this.renderStudyDeckSelection();
        this.renderTagFilter();
        this.renderStudy();
        this.renderCards();
    },
    openNotesModal() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        el('#notesArea').value = card.notes || '';
        el('#noteStatus').textContent = '';
        this.openModal('notesModal');
    },
    async saveNotes() {
        const card = this.state.selectedCard;
        if (!card) return;
        card.notes = el('#notesArea').value;
        await Storage.put('cards', card);
        this.queueOp({ type: 'card-upsert', payload: card });
        el('#noteStatus').textContent = 'Saved';
        el('#notesPreview').innerHTML = card.notes ? safeMarkdownParse(card.notes) : '<p class="text-earth-metal/60 text-sm">No notes yet.</p>';
        applyMediaEmbeds(el('#notesPreview'));
        this.renderMath(el('#notesPreview'));
        this.closeModal('notesModal');
        toast('Notes saved');
    },
    openAddBlockModal() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        if (!card.notionId) return toast('Card not synced to Notion yet');
        el('#blockNoteArea').value = '';
        this.renderBlockNotePreview();
        this.openModal('addBlockModal');
    },
    renderBlockNotePreview() {
        const area = el('#blockNoteArea');
        const preview = el('#blockNotePreview');
        if (!area || !preview) return;
        const md = (area.value || '').trim();
        if (!md) {
            preview.innerHTML = '<p class="text-earth-metal/50 dark:text-white/60">Type a note to preview media embeds.</p>';
            return;
        }
        preview.innerHTML = safeMarkdownParse(md);
        applyMediaEmbeds(preview);
        this.renderMath(preview);
    },
    async saveBlockNote() {
        const card = this.state.selectedCard;
        if (!card || !card.notionId) return toast('Card not synced to Notion');
        const content = el('#blockNoteArea').value.trim();
        if (!content) return toast('Please enter some text');

        // Add timestamp prefix
        const timestamp = new Date().toLocaleString();
        const fullContent = `[${timestamp}] ${content}`;

        // Create Notion paragraph block (no 'object' property needed for children)
        const block = {
            type: 'paragraph',
            paragraph: {
                rich_text: markdownToNotionRichText(fullContent)
            }
        };

        // Queue the block append operation
        this.queueOp({
            type: 'block-append',
            payload: {
                pageId: card.notionId,
                blocks: [block]
            }
        });

        this.closeModal('addBlockModal');
        toast('Note queued for sync');
    },
    async copyCardContent() {
        const card = this.state.selectedCard;
        if (!card) return toast('No card selected');
        const deck = this.deckById(card.deckId);
        const isCloze = (card.type || '').toLowerCase() === 'cloze';
        let content = `## ${card.name}\n\n`;
        if (!isCloze && card.back) {
            content += `**Answer:**\n${card.back}\n\n`;
        }
        if (card.notes) {
            content += `**Notes:**\n${card.notes}\n\n`;
        }
        content += `Deck: ${deck?.name ?? '—'}`;
        try {
            await navigator.clipboard.writeText(content);
            toast('Copied to clipboard');
        } catch (_) {
            toast('Copy failed');
        }
    },
    async handleAnkiImport(file) {
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) return toast('File too large (max 100MB)');
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'apkg' || ext === 'zip') {
            await this.importApkg(file);
            return;
        }
        const text = await file.text();
        let payload;
        try { payload = JSON.parse(text); } catch { payload = null; }
        if (!payload?.cards?.length) return toast('Unsupported file');

        const deckName = file.name.replace('.apkg', '').replace('.json', '');
        let deck = this.state.decks.find(d => d.name === deckName);
        if (!deck) {
            deck = this.newDeck(deckName, 'SM-2');
            this.state.decks.push(deck);
            await Storage.put('decks', deck);
            this.queueOp({ type: 'deck-upsert', payload: deck });
        }

        let importedCount = 0;
        const existingGuids = new Set(this.state.cards.map(c => c.ankiGuid).filter(Boolean));
        for (const raw of payload.cards) {
            const guid = raw.guid || raw.id || null;
            if (guid && existingGuids.has(guid)) continue;

            const card = this.newCard(deck.id, raw.name || raw.front || 'Imported', raw.back || '', raw.type || 'Front-Back');
            card.tags = (raw.tags || []).map(t => typeof t === 'string' ? { name: t, color: 'default' } : t);
            card.notes = raw.notes || '';
            card.ankiGuid = guid || crypto.randomUUID();
            existingGuids.add(card.ankiGuid);
            this.state.cards.push(card);
            await Storage.put('cards', card);
            this.queueOp({ type: 'card-upsert', payload: card });
            importedCount++;
        }
        this.renderAll();
        toast(`Imported ${importedCount} cards from JSON`);
    },
    async importApkg(file) {
        try {
            // Phase 19: Anki import progress feedback
            showLoading('Importing Anki deck...', 'Reading file...');
            const buf = await file.arrayBuffer();
            setLoadingProgress(10, 'Extracting archive...');
            const zip = await JSZip.loadAsync(buf);
            const collectionFile = zip.file('collection.anki2');
            if (!collectionFile) {
                hideLoading();
                toast('Invalid .apkg file: missing collection.anki2');
                return;
            }
            setLoadingProgress(25, 'Parsing database...');
            const collection = await collectionFile.async('uint8array');
            const SQL = await Storage.ensureSQL();
            const db = new SQL.Database(collection);
            const colRow = db.exec("SELECT * FROM col LIMIT 1")[0];
            const row = colRow?.values?.[0] || [];
            const models = JSON.parse(row[9] || '{}');
            const decksJson = JSON.parse(row[10] || '{}');
            const decksMap = {};
            Object.values(decksJson).forEach(d => { decksMap[d.id] = d.name; });
            const notes = db.exec("SELECT id,guid,mid,mod,usn,tags,flds,sfld,csum,flags,data FROM notes")[0]?.values || [];
            const cards = db.exec("SELECT id,nid,did,ord,mod,usn,type,queue,due,ivl,factor,reps,lapses,left,odue,odid,flags,data FROM cards")[0]?.values || [];
            setLoadingProgress(50, 'Processing cards...');

            const deckCache = {};
            const notesById = new Map(notes.map(n => [n[0], n]));
            const existingGuids = new Set(this.state.cards.map(c => c.ankiGuid).filter(Boolean));
            let importedCount = 0;
            const totalCards = cards.length;

            for (let i = 0; i < cards.length; i++) {
                const cardRow = cards[i];
                const [cid, nid, did, ord] = cardRow;
                const note = notesById.get(nid);
                if (!note) continue;
                const [_, guid, mid, mod, usn, tags, flds] = note;

                // Check if card with this GUID already exists
                if (guid && existingGuids.has(guid)) continue;

                const deckId = did;
                // Use existing deck if available, or create/cache new one
                if (!deckCache[deckId]) {
                    let deckName = decksMap[deckId] || file.name.replace('.apkg', '');

                    // Phase 7: Anki import deck name collision - append suffix for duplicates
                    let finalDeckName = deckName;
                    let suffix = 1;
                    while (this.state.decks.some(d => d.name === finalDeckName)) {
                        finalDeckName = `${deckName} (${suffix++})`;
                    }

                    let deck = this.state.decks.find(d => d.name === finalDeckName);
                    if (!deck) {
                        deck = this.newDeck(finalDeckName, 'SM-2');
                        this.state.decks.push(deck);
                        await Storage.put('decks', deck);
                        this.queueOp({ type: 'deck-upsert', payload: deck });
                    }
                    deckCache[deckId] = deck;
                }

                const model = models[mid];
                const fields = (flds || '').split('\u001f');
                const front = fields[0] || 'Imported';
                const back = fields[1] || '';
                const isCloze = model?.type === 1;
                const type = isCloze ? 'Cloze' : 'Front-Back';
                const card = this.newCard(deckCache[deckId].id, front, isCloze ? back || front : back, type);
                card.tags = (tags || '').trim().split(' ').filter(Boolean).map(t => ({ name: t.replace(/^\s*/, '').replace(/\s*$/, ''), color: 'default' }));
                card.ankiGuid = guid;
                if (guid) existingGuids.add(guid);
                card.ankiNoteType = model?.name || '';
                card.ankiFields = JSON.stringify(fields);
                card.clozeIndexes = isCloze ? 'auto' : '';
                this.state.cards.push(card);
                await Storage.put('cards', card);
                this.queueOp({ type: 'card-upsert', payload: card });
                importedCount++;

                // Update progress every 20 cards
                if (i % 20 === 0) {
                    const progress = 50 + (i / totalCards) * 45;
                    setLoadingProgress(progress, `Imported ${importedCount} cards...`);
                }
            }
            setLoadingProgress(100, 'Complete!');
            hideLoading();
            this.renderAll();
            toast(`Imported ${importedCount} cards from .apkg`);
        } catch (e) {
            hideLoading();
            console.error(e);
            toast('Import failed');
        }
    },
    async exportAnki() {
        const deck = this.state.selectedDeck || this.state.decks[0];
        if (!deck) return toast('No deck to export');
        const cards = this.cardsForDeck(deck.id);
        try {
            const dbBytes = await this.buildApkgSql(deck, cards);
            const zip = new JSZip();
            zip.file('collection.anki2', dbBytes);
            zip.file('media', JSON.stringify({}));
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = (deck.name || 'deck')
                .toString()
                .replace(/[\\/:*?"<>|]+/g, '-')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 120) || 'deck';
            a.download = `${safeName}.apkg`;
            a.click();
            URL.revokeObjectURL(url);
            toast('Exported .apkg');
        } catch (e) {
            toast('Export failed');
            console.error(e);
        }
    },
    async buildApkgSql(deck, cards) {
        const SQL = await Storage.ensureSQL();
        const db = new SQL.Database();
        db.run(`CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer, dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);`);
        db.run(`CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer, usn integer, tags text, flds text, sfld text, csum integer, flags integer, data text);`);
        db.run(`CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, mod integer, usn integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer, lapses integer, left integer, odue integer, odid integer, flags integer, data text);`);
        db.run(`CREATE TABLE revlog (id integer primary key, cid integer, usn integer, ease integer, ivl integer, lastIvl integer, factor integer, time integer, type integer);`);
        db.run(`CREATE TABLE graves (id integer primary key, oid integer, type integer, usn integer);`);

        const nowMs = Date.now();
        const now = Math.floor(nowMs / 1000);
        const dayStart = Math.floor(now / 86400);
        const deckId = Math.abs(this.hash(deck.name));
        const modelBasicId = deckId + 1;
        const modelClozeId = deckId + 2;

        const conf = { nextPos: 1, estTimes: true, activeDecks: [deckId], sortType: "noteFld", sortBackwards: false, newSpread: 0, dueCounts: true, curDeck: deckId, timeLim: 0 };
        const models = {};
        models[modelBasicId] = {
            id: modelBasicId,
            name: "Basic",
            type: 0,
            mod: now,
            usn: 0,
            sortf: 0,
            did: deckId,
            latexPre: "\\documentclass{article}\\begin{document}",
            latexPost: "\\end{document}",
            flds: [
                { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20, media: [] },
                { name: "Back", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20, media: [] }
            ],
            tmpls: [
                { name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{FrontSide}}<hr id=answer>{{Back}}", did: null, bqfmt: "", bafmt: "" }
            ],
            css: ".card { font-family: Arial; font-size: 20px; }"
        };
        models[modelClozeId] = {
            id: modelClozeId,
            name: "Cloze",
            type: 1,
            mod: now,
            usn: 0,
            sortf: 0,
            did: deckId,
            flds: [
                { name: "Text", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20, media: [] },
                { name: "Back Extra", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20, media: [] }
            ],
            tmpls: [{ name: "Cloze", ord: 0, qfmt: "{{cloze:Text}}", afmt: "{{cloze:Text}}<br>{{Back Extra}}", did: null }],
            css: ".card { font-family: Arial; font-size: 20px; }"
        };

        const decks = {};
        decks[deckId] = { id: deckId, name: deck.name, mod: now, usn: 0, desc: "", dyn: 0, extendNew: 0, extendRev: 0, conf: 1, collapsed: false, browserCollapsed: false, newToday: [dayStart, 0], revToday: [dayStart, 0], lrnToday: [dayStart, 0], timeToday: [dayStart, 0] };
        const dconf = { 1: { id: 1, name: "Default", new: { perDay: 20 }, rev: { perDay: 200 }, lapse: { delays: [10], mult: 0 }, dyn: false, maxTaken: 60, timer: 0 } };
        const tags = {};
        const colRow = db.prepare("INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
        colRow.run([nowMs, dayStart, now, now, 11, 0, 0, 0, JSON.stringify(conf), JSON.stringify(models), JSON.stringify(decks), JSON.stringify(dconf), JSON.stringify(tags)]);

        let nidCounter = nowMs;
        let cidCounter = nowMs + 500;
        const noteStmt = db.prepare("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        const cardStmt = db.prepare("INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

        cards.forEach((card, idx) => {
            const isCloze = (card.type || '').toLowerCase() === 'cloze';
            const mid = isCloze ? modelClozeId : modelBasicId;
            const nid = ++nidCounter;

            const fields = isCloze ? [card.name, card.back] : [card.name, card.back];
            const flds = fields.join('\u001f');
            const tagStr = card.tags.length ? card.tags.map(t => t.name.trim()).join(' ') + ' ' : '';
            const sfld = fields[0];
            const csum = Math.abs(this.hash(flds)) >>> 0;
            noteStmt.run([nid, card.ankiGuid || crypto.randomUUID(), mid, now, 0, tagStr, flds, sfld, csum, 0, ""]);

            let ordinals = [0];
            if (isCloze) {
                const matches = [...card.name.matchAll(/{{\s*c(\d+)::/g)];
                if (matches.length > 0) {
                    const indices = new Set(matches.map(m => parseInt(m[1], 10) - 1));
                    ordinals = Array.from(indices).sort((a, b) => a - b);
                }
            }

            ordinals.forEach((ord) => {
                const cid = ++cidCounter;
                // Export as new cards: type=0, queue=0, due=integer order
                const type = 0;
                const queue = 0;
                const due = idx + 1; // Or some global counter, but idx is fine for new cards order
                const ivl = 0;
                const factor = 0;

                cardStmt.run([cid, nid, deckId, ord, now, 0, type, queue, due, ivl, factor, 0, 0, 0, 0, 0, 0, ""]);
            });
        });

        return new Uint8Array(db.export());
    },
    hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        }
        return h;
    },
    updateCounts() {
        el('#deckCount').textContent = String(this.state.decks.length);
        el('#cardCount').textContent = String(this.state.cards.length);
        el('#queueCount').textContent = String(this.state.queue.length);
        el('#lastSync').textContent = this.state.lastSync ? new Date(this.state.lastSync).toLocaleString() : '—';
    },
    openSettings() {
        setLastFocusedElement(document.activeElement);
        const s = this.state.settings;
        el('#settingWorkerUrl').value = s.workerUrl;
        el('#settingProxyToken').value = s.proxyToken;
        el('#settingAuthToken').value = s.authToken.startsWith('secret_') ? s.authToken : s.authToken;
        const modal = el('#settingsModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.renderStatus();
        this.updateSettingsButtons();
        focusTrap.attach(modal);
    },
    closeSettings() {
        focusTrap.detach();
        uiCloseModal('settingsModal');
    },
    showAiBlockedModal(reason) {
        const modal = el('#aiSettingsRequiredModal');
        const title = el('#aiSettingsModalTitle');
        const body = el('#aiSettingsModalBody');
        const actions = el('#aiSettingsModalActions');
        const closeBtn = el('#closeAiSettingsModal');
        const openSettingsBtn = el('#openSettingsFromAiModal');
        if (!modal || !title || !body || !actions) return;

        if (reason === 'offline') {
            title.textContent = 'AI not available offline';
            body.textContent = 'Reconnect to use AI mode. We switched you back to Reveal.';
            if (openSettingsBtn) openSettingsBtn.classList.add('hidden');
            if (closeBtn) closeBtn.textContent = 'OK';
            closeBtn.onclick = () => {
                this.closeModal('aiSettingsRequiredModal');
                const revisionSelect = el('#revisionMode');
                if (revisionSelect) revisionSelect.value = 'manual';
                el('#aiControls')?.classList.add('hidden');
            };
        } else {
            title.textContent = 'AI settings required';
            body.textContent = 'Set and verify your AI provider in Settings to enable AI mode.';
            if (openSettingsBtn) openSettingsBtn.classList.remove('hidden');
            if (closeBtn) closeBtn.textContent = 'Cancel';
            closeBtn.onclick = () => this.closeModal('aiSettingsRequiredModal');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    async saveSettings() {
        const prevWorkerUrl = this.state.settings.workerUrl;
        const prevProxyToken = this.state.settings.proxyToken;
        const prevAiProvider = this.state.settings.aiProvider || '';
        const prevAiModel = this.state.settings.aiModel || '';
        const prevAiKey = this.state.settings.aiKey || '';
        this.state.settings.workerUrl = el('#settingWorkerUrl').value.trim();
        this.state.settings.proxyToken = el('#settingProxyToken').value.trim();
        if (this.state.settings.workerUrl !== prevWorkerUrl || this.state.settings.proxyToken !== prevProxyToken) {
            this.state.workerVerified = false;
            this.state.settings.workerVerified = false;
        }
        const authVal = el('#settingAuthToken').value.trim();
        const prevAuth = this.state.settings.authToken;
        if (authVal) {
            this.state.settings.authToken = authVal;
            if (authVal !== prevAuth) {
                this.state.authVerified = false;
                this.state.settings.authVerified = false;
            }
        } else {
            this.state.settings.authToken = '';
            this.state.authVerified = false;
            this.state.settings.authVerified = false;
        }
        // Save AI settings
        const aiProvider = el('#aiProvider').value;
        const aiModel = el('#aiModel').value.trim();
        const aiKey = el('#aiKey').value.trim();
        this.state.settings.aiProvider = aiProvider;
        this.state.settings.aiModel = aiModel;
        this.state.settings.aiKey = aiKey;
        const aiKeyChanged = !!(aiKey !== prevAiKey);
        const aiChanged = (aiProvider || '') !== prevAiProvider || (aiModel || '') !== prevAiModel || aiKeyChanged;
        if (!aiProvider || aiChanged) {
            this.state.settings.aiVerified = false;
        }

        // Save STT settings
        const prevSttProvider = this.state.settings.sttProvider;
        const prevSttModel = this.state.settings.sttModel || '';
        const prevSttKey = this.state.settings.sttKey || '';
        const sttProvider = el('#sttProvider').value;
        const sttModel = el('#sttModel').value.trim();
        const sttKey = el('#sttKey').value.trim();
        const sttPrompt = el('#sttPrompt').value.trim();
        this.state.settings.sttProvider = sttProvider;
        this.state.settings.sttModel = sttModel;
        this.state.settings.sttKey = sttKey;
        this.state.settings.sttPrompt = sttPrompt;
        const sttKeyChanged = !!(sttKey !== prevSttKey);
        const sttChanged = (sttProvider || '') !== (prevSttProvider || '') || (sttModel || '') !== prevSttModel || sttKeyChanged;
        if (!sttProvider) {
            this.state.settings.sttVerified = false;
        } else if (sttProvider === 'browser') {
            this.state.settings.sttVerified = true;
        } else if (sttChanged) {
            this.state.settings.sttVerified = false;
        }

        Storage.setSettings(this.state.settings);
        this.renderStatus();
        this.applyTheme();
        this.applyFontMode();
        this.renderGate();
        this.applySttChangeEffects(!sttProvider || sttChanged);
        // If AI became unverified, force the UI out of AI mode to avoid a broken study flow.
        if (!this.state.settings.aiVerified) {
            const revisionSelect = el('#revisionMode');
            if (revisionSelect && revisionSelect.value === 'ai') revisionSelect.value = 'manual';
            el('#aiControls')?.classList.add('hidden');
            el('#sttSettings')?.classList.add('hidden');
            this.updateSkipHotkeyLabel(false);
            this.updateMobileFab();
        }

        // Check if this is first sync (no decks/cards loaded yet)
        const isFirstSync = this.state.decks.length === 0 && this.state.cards.length === 0;

        if (isFirstSync && this.isReady()) {
            // Close settings and show sync loading overlay
            this.closeSettings();
            showLoading('Syncing your content...', 'Fetching decks and cards from Notion.');

            try {
                await this.syncNow();
                toast('Initial sync complete');
            } catch (err) {
                console.error('First sync error:', err);
                toast('Sync error - please try again');
            } finally {
                hideLoading();
                this.renderAll();
            }
        } else {
            this.closeSettings();
            this.renderConnection();
            toast('Settings saved');
        }
    },
    async verifyWorker() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify worker');
            return;
        }
        const workerUrl = el('#settingWorkerUrl').value.trim();
        const proxyToken = el('#settingProxyToken').value.trim();
        if (!workerUrl) return toast('Add worker URL');
        try {
            const url = new URL(workerUrl.replace(/\/$/, ''));
            url.searchParams.append('url', 'https://api.notion.com/v1/users/me');
            if (proxyToken) url.searchParams.append('token', proxyToken);
            const res = await fetch(url.toString());
            if (res.ok || res.status === 401) {
                toast('Worker reachable');
                this.state.settings.workerUrl = workerUrl;
                this.state.settings.proxyToken = proxyToken;
                this.state.workerVerified = true;
                this.state.settings.workerVerified = true;
                Storage.setSettings(this.state.settings);
                this.renderStatus();
                this.renderGate();
                el('#workerSettingsDetails')?.removeAttribute('open');
            } else throw new Error(res.status);
        } catch (e) {
            toast('Worker check failed');
            this.state.workerVerified = false;
            this.state.settings.workerVerified = false;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
        }
    },
    async verifyAuth() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify Notion token');
            return;
        }
        if (!this.state.settings.workerUrl) { this.updateSettingsButtons(); return toast('Add worker URL first'); }
        const workerUrl = (el('#settingWorkerUrl').value.trim()) || this.state.settings.workerUrl;
        const proxyToken = (el('#settingProxyToken').value.trim()) || this.state.settings.proxyToken;
        const authVal = (el('#settingAuthToken').value.trim()) || this.state.settings.authToken;
        if (!authVal) return toast('Add Notion token');
        this.state.settings.workerUrl = workerUrl;
        this.state.settings.proxyToken = proxyToken;
        this.state.settings.authToken = authVal;
        this.state.authVerified = true;
        this.state.settings.authVerified = true;
        Storage.setSettings(this.state.settings);
        toast('Token saved');
        this.renderStatus();
        this.renderGate();
        await this.scanSources();
    },
    async verifyAiSettings() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify AI settings');
            return;
        }
        const provider = el('#aiProvider').value;
        const model = el('#aiModel').value.trim();
        const key = el('#aiKey').value.trim();
        if (!provider) return toast('Select an AI provider');
        if (!model) return toast('Enter a model name');
        if (!key) return toast('Enter an API key');
        try {
            showLoading('Verifying AI settings...', 'Testing connection to AI provider.');
            let endpoint, headers, body;
            if (provider === 'openai') {
                endpoint = 'https://api.openai.com/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'anthropic') {
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
                body = JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] });
            } else if (provider === 'gemini') {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                headers = {};
            }
            const res = await fetch(endpoint, { method: body ? 'POST' : 'GET', headers, body });
            if (res.ok || res.status === 400) {
                this.state.settings.aiProvider = provider;
                this.state.settings.aiModel = model;
                this.state.settings.aiKey = key;
                this.state.settings.aiVerified = true;
                Storage.setSettings(this.state.settings);
                // Show STT settings now that AI is verified
                el('#sttSettings')?.classList.remove('hidden');
                toast('AI settings verified');
            } else {
                throw new Error(`API returned ${res.status}`);
            }
        } catch (e) {
            this.state.settings.aiVerified = false;
            Storage.setSettings(this.state.settings);
            // Hide STT settings since AI is not verified
            el('#sttSettings')?.classList.add('hidden');
            toast('AI verification failed: ' + e.message);
        } finally {
            hideLoading();
        }
    },
    async verifySttSettings() {
        if (!navigator.onLine) {
            toast('Offline: connect to verify speech settings');
            return;
        }
        const provider = el('#sttProvider').value;
        const model = el('#sttModel').value.trim();
        const key = el('#sttKey').value.trim();
        const prompt = el('#sttPrompt').value.trim();
        const inAiMode = el('#revisionMode').value === 'ai';

        if (!provider) {
            this.state.settings.sttProvider = '';
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
            this.state.settings.sttPrompt = prompt;
            this.state.settings.sttVerified = false;
            this.state.settings.sttPermissionWarmed = false;
            Storage.setSettings(this.state.settings);
            this.state.sttProvider = '';
            this.state.sttVerified = false;
            this.state.sttKey = '';
            this.stopMicActivity(true);
            this.applySttChangeEffects(true);
            toast('Speech-to-text disabled');
            return;
        }

        if (provider === 'browser') {
            this.state.settings.sttProvider = 'browser';
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
            this.state.settings.sttPrompt = prompt;
            this.state.settings.sttVerified = true;
            Storage.setSettings(this.state.settings);
            this.state.sttProvider = 'browser';
            this.state.sttModel = '';
            this.state.sttKey = '';
            this.state.sttPrompt = prompt;
            this.state.sttVerified = true;
            this.applySttChangeEffects(false);
            if (inAiMode) el('#aiControls')?.classList.remove('hidden');
            toast('Using browser speech recognition');
            return;
        }

        if (!key) return toast('Enter an API key for cloud provider');

        try {
            showLoading('Verifying STT settings...', 'Testing connection to speech provider.');
            let endpoint, headers;

            if (provider === 'openai') {
                // Verify OpenAI key by checking models endpoint
                endpoint = 'https://api.openai.com/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'groq') {
                // Verify Groq key by checking models endpoint
                endpoint = 'https://api.groq.com/openai/v1/models';
                headers = { 'Authorization': `Bearer ${key}` };
            } else if (provider === 'gemini') {
                // Verify Gemini key by listing models
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                headers = {};
            }

            const res = await fetch(endpoint, { method: 'GET', headers });
            if (res.ok) {
                this.state.settings.sttProvider = provider;
                this.state.settings.sttModel = model || this.getDefaultSttModel(provider);
                this.state.settings.sttKey = key;
                this.state.settings.sttPrompt = prompt;
                this.state.settings.sttVerified = true;
                Storage.setSettings(this.state.settings);
                this.applySttChangeEffects(false);
                if (inAiMode) el('#aiControls')?.classList.remove('hidden');
                toast('STT settings verified');
            } else {
                throw new Error(`API returned ${res.status}`);
            }
        } catch (e) {
            this.state.settings.sttVerified = false;
            Storage.setSettings(this.state.settings);
            toast('STT verification failed: ' + e.message);
        } finally {
            hideLoading();
        }
    },
    getDefaultSttModel(provider) {
        if (provider === 'openai') return 'whisper-1';
        if (provider === 'groq') return 'whisper-large-v3';
        if (provider === 'gemini') return 'gemini-2.0-flash';
        return '';
    },
    startOAuth() {
        if (!this.state.settings.workerUrl) return toast('Add worker URL first');
        this.saveSettings();
        showLoading('Starting Notion sign-in...', 'Redirecting to Notion authorization.');
        const here = encodeURIComponent(window.location.href);
        window.location.href = `https://notion-oauth-handler.mimansa-jaiswal.workers.dev/auth/login?from=${here}`;
    },
    async scanSources() {
        if (!navigator.onLine) {
            toast('Offline: cannot scan databases');
            return;
        }
        if (!this.state.settings.workerUrl || !this.state.settings.authToken) return toast('Add worker URL and token first');
        try {
            showLoading('Scanning databases...', 'Finding valid deck and card sources.');
            toastLong('Scanning data sources...');
            const dbs = await API.listDatabases();
            const deckOptions = [];
            const cardOptions = [];
            for (const d of dbs) {
                const id = d.id;
                const title = d.title?.[0]?.plain_text || id;
                if (await this.validateDb(d, 'deck')) deckOptions.push({ id, title });
                if (await this.validateDb(d, 'card')) cardOptions.push({ id, title });
            }
            this.state.sourcesCache = { deckOptions, cardOptions };
            this.state.settings.sourcesCache = { deckOptions, cardOptions };
            el('#deckSourceSelect').innerHTML = `<option value=\"\">Select deck source</option>` + deckOptions.map(o => `<option value=\"${o.id}\">${o.title}</option>`).join('');
            el('#cardSourceSelect').innerHTML = `<option value=\"\">Select card source</option>` + cardOptions.map(o => `<option value=\"${o.id}\">${o.title}</option>`).join('');
            if (deckOptions.length === 1) this.state.settings.deckSource = deckOptions[0].id;
            if (cardOptions.length === 1) this.state.settings.cardSource = cardOptions[0].id;
            Storage.setSettings(this.state.settings);
            if (this.state.settings.deckSource) el('#deckSourceSelect').value = this.state.settings.deckSource;
            if (this.state.settings.cardSource) el('#cardSourceSelect').value = this.state.settings.cardSource;
            this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource);
            this.state.settings.sourcesVerified = this.state.sourcesVerified;
            Storage.setSettings(this.state.settings);
            this.renderStatus();
            this.renderGate();
            toast('Sources loaded');
        } catch (e) {
            toast(e.message);
        } finally {
            hideLoading();
            toastHide();
        }
    },
    populateSourceSelects() {
        const cache = this.state.settings.sourcesCache || { deckOptions: [], cardOptions: [] };
        const deckOptions = cache.deckOptions || [];
        const cardOptions = cache.cardOptions || [];
        this.state.sourcesCache = { deckOptions, cardOptions };
        el('#deckSourceSelect').innerHTML = `<option value="">Select deck source</option>` + deckOptions.map(o => `<option value="${o.id}">${o.title}</option>`).join('');
        el('#cardSourceSelect').innerHTML = `<option value="">Select card source</option>` + cardOptions.map(o => `<option value="${o.id}">${o.title}</option>`).join('');
        if (this.state.settings.deckSource) el('#deckSourceSelect').value = this.state.settings.deckSource;
        if (this.state.settings.cardSource) el('#cardSourceSelect').value = this.state.settings.cardSource;
        el('#deckSourceSelect').onchange = (e) => { this.state.settings.deckSource = e.target.value; this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource); this.state.settings.sourcesVerified = this.state.sourcesVerified; Storage.setSettings(this.state.settings); this.renderStatus(); this.renderGate(); };
        el('#cardSourceSelect').onchange = (e) => { this.state.settings.cardSource = e.target.value; this.state.sourcesVerified = !!(this.state.settings.deckSource && this.state.settings.cardSource); this.state.settings.sourcesVerified = this.state.sourcesVerified; Storage.setSettings(this.state.settings); this.renderStatus(); this.renderGate(); };
    },
    openModal(id) {
        // Delegate to the UI module's openModal function
        // This keeps the App interface consistent while using shared implementation
        uiOpenModal(id);
    },
    closeModal(id) {
        // Delegate to the UI module's closeModal function
        uiCloseModal(id);
    },
    async copyWorkerCode() {
        const code = el('#workerCodeBlock').innerText;
        try {
            await navigator.clipboard.writeText(code);
            toast('Worker code copied');
        } catch (e) {
            console.error('Clipboard write failed:', e);
            toast('Failed to copy - please select and copy manually');
        }
    },
    toggleDangerZone() {
        const content = el('#dangerZoneContent');
        const chevron = el('#dangerZoneChevron');
        content.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    },
    async resetApp() {
        this.closeModal('resetConfirmModal');
        showLoading('Resetting GhostInk...', 'Clearing all local data.');
        // Clear IndexedDB stores
        await Storage.wipeStore('decks');
        await Storage.wipeStore('cards');
        await Storage.wipeStore('meta');
        // Clear all GhostInk-specific localStorage keys
        localStorage.removeItem(Storage.settingsKey);
        localStorage.removeItem('ghostink_session_v1');
        // Close the database connection before deleting
        if (Storage.db) {
            Storage.db.close();
            Storage.db = null;
        }
        // Delete the entire database and wait for it to complete
        await new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase('GhostInkDB');
            req.onsuccess = resolve;
            req.onerror = reject;
            req.onblocked = () => {
                console.warn('Database delete blocked, reloading anyway');
                resolve();
            };
        });
        // Clear caches used by this app only
        if (typeof caches !== 'undefined') {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.filter(k => k.startsWith('ghostink-cache-')).map(k => caches.delete(k)));
            } catch (e) {
                console.warn('Cache clear failed', e);
            }
        }
        // Unregister only this app's service worker (scope limited to current path)
        if (navigator.serviceWorker) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.filter(r => r.scope.includes('ghostink-flashcards')).map(r => r.unregister()));
            } catch (e) {
                console.warn('SW unregister failed', e);
            }
        }
        location.reload();
    },
    renderStatus() {
        const hasWorkerUrl = !!this.state.settings.workerUrl;
        const workerOk = hasWorkerUrl && (this.state.workerVerified || this.state.settings.workerVerified);
        const hasToken = !!this.state.settings.authToken;
        const authOk = workerOk && hasToken && (this.state.authVerified || this.state.settings.authVerified);
        const hasSources = !!(this.state.settings.deckSource && this.state.settings.cardSource && this.state.sourcesVerified);

        el('#statusWorker').textContent = `Worker: ${workerOk ? 'verified' : hasWorkerUrl ? 'unverified' : 'missing'}`;
        el('#statusAuth').textContent = `Auth: ${authOk ? 'verified' : workerOk ? (hasToken ? 'unverified' : 'missing') : 'blocked (verify worker)'}`;
        el('#statusSources').textContent = `Sources: ${hasSources ? 'verified' : 'missing'}`;

        const vaultSection = el('#vaultStatusSection');
        if (vaultSection) vaultSection.classList.toggle('hidden', !hasSources);

        this.updateSettingsButtons();
        this.renderConnection();
    },
    async validateDb(dbOrId, type) {
        try {
            const meta = typeof dbOrId === 'string' ? await API.getDatabase(dbOrId) : dbOrId;
            const props = meta?.properties || {};
            const has = (name, kind) => props[name]?.type === kind;
            if (type === 'deck') {
                const required = [
                    ['Deck Name', 'title'],
                    ['SRS Algorithm', 'select'],
                    ['Order Mode', 'select'],
                    ['Daily Review Limit', 'number'],
                    ['New Card Limit', 'number'],
                    ['Reverse Mode Enabled', 'checkbox'],
                    ['Created In-App', 'checkbox'],
                    ['Archived?', 'checkbox']
                ];
                const missing = required.filter(([n, k]) => !has(n, k));
                if (missing.length) return false;
                // FSRS configuration storage
                if (!has('FSRS Params', 'rich_text')) return false;
                return true;
            }
            if (type === 'card') {
                const required = [
                    ['Name', 'title'],
                    ['Back', 'rich_text'],
                    ['Card Type', 'select'],
                    ['Deck', 'relation'],
                    ['Tags', 'multi_select'],
                    ['Suspended', 'checkbox'],
                    ['Leech', 'checkbox'],
                    ['Order', 'number'],
                    ['Difficulty', 'number'],
                    ['Stability', 'number'],
                    ['Retrievability', 'number'],
                    ['Last Rating', 'select'],
                    ['Last Review', 'date'],
                    ['Due Date', 'date'],
                    ['Interval / Box Level', 'number'],
                    ['Ease Factor', 'number'],
                    ['Updated In-App', 'checkbox']
                ];
                const missing = required.filter(([n, k]) => !has(n, k));
                if (missing.length) return false;
                return true;
            }
        } catch (e) {
            // Validation failed - database doesn't match expected schema
        }
        return false;
    },
    updateSettingsButtons() {
        const s = this.state.settings;
        // Block scan/save/sources until both worker AND Notion auth are verified
        const workerOk = s.workerVerified || this.state.workerVerified;
        const notionOk = s.authVerified || this.state.authVerified;
        const blockScanSave = !(workerOk && notionOk);
        const online = navigator.onLine;

        ['scanSources', 'saveSourcesChoice', 'saveSettings', 'deckSourceSelect', 'cardSourceSelect'].forEach(id => {
            const elem = el('#' + id);
            if (!elem) return;
            elem.disabled = blockScanSave;
        });
        const oa = el('#oauthBtn');
        const va = el('#verifyAuth');
        const tokenInput = el('#settingAuthToken');
        const blockAuth = !this.state.settings.workerUrl;
        if (oa) { oa.disabled = blockAuth; oa.classList.toggle('opacity-60', blockAuth); oa.classList.toggle('cursor-not-allowed', blockAuth); }
        if (va) { va.disabled = blockAuth; va.classList.toggle('opacity-60', blockAuth); va.classList.toggle('cursor-not-allowed', blockAuth); }
        if (tokenInput) tokenInput.disabled = blockAuth;

        // Disable AI/STT verification buttons when offline
        ['verifyAi', 'verifyStt'].forEach(id => {
            const btn = el('#' + id);
            if (!btn) return;
            btn.disabled = !online;
            btn.classList.toggle('opacity-60', !online);
            btn.classList.toggle('cursor-not-allowed', !online);
        });
    },
    async autoVerifyWorker() {
        const s = this.state.settings;
        // If already verified from storage, just re-render gate
        if (s.workerUrl && this.state.workerVerified && s.authToken && this.state.sourcesVerified) {
            this.renderGate();
            el('#workerSettingsDetails')?.removeAttribute('open');
            return;
        }
        // Otherwise, silently verify worker using stored settings (not input fields)
        if (!s.workerUrl) return;
        try {
            const url = new URL(s.workerUrl.replace(/\/$/, ''));
            url.searchParams.append('url', 'https://api.notion.com/v1/users/me');
            if (s.proxyToken) url.searchParams.append('token', s.proxyToken);
            const res = await fetch(url.toString());
            if (res.ok || res.status === 401) {
                this.state.workerVerified = true;
                this.state.settings.workerVerified = true;
                Storage.setSettings(this.state.settings);
                el('#workerSettingsDetails')?.removeAttribute('open');
            }
        } catch (_) { /* silent fail - user can manually verify */ }
        this.renderGate();
        this.renderConnection();
    },
    applyTheme() {
        const mode = this.state.settings.themeMode || 'system';
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;
        document.body.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === mode);
        });
    },
    applyFabPosition() {
        const fab = el('#mobileFabCluster');
        if (!fab) return;
        if (this.state.settings.fabEnabled === false) {
            fab.style.left = '';
            fab.style.bottom = '';
            fab.style.top = '';
            fab.style.right = '';
            fab.style.transform = '';
            return;
        }
        const pos = this.state.settings.fabPos;
        // Legacy format: { bottom: px, left: px } anchored to bottom-left of the cluster.
        if (pos && typeof pos === 'object' && pos.mode !== 'grid' && (pos.bottom != null || pos.left != null)) {
            fab.style.transform = 'none';
            fab.style.bottom = (pos.bottom ?? 12) + 'px';
            fab.style.left = (pos.left ?? 12) + 'px';
            fab.style.top = 'auto';
            fab.style.right = 'auto';
            return;
        }

        // Grid format: { mode:'grid', rows, cols, cell } anchored to the *center* of the cluster.
        const grid = pos && typeof pos === 'object' && pos.mode === 'grid' ? pos : null;
        // Custom 3x5 grid logic with 12% fixed borders on all sides
        // Active area: 76% width (12% left + 76% content + 12% right)
        // Active area: 76% height (12% top + 76% content + 12% bottom)

        const cellMax = 15;
        const cell = Math.max(1, Math.min(cellMax, Number(grid?.cell) || 15)); // default bottom-right (15)

        const logicalCol = (cell - 1) % 3; // 0, 1, 2
        const logicalRow = Math.floor((cell - 1) / 3); // 0, 1, 2, 3, 4

        const vw = window.innerWidth || document.documentElement.clientWidth || 360;
        const vh = window.innerHeight || document.documentElement.clientHeight || 640;

        // Border offset
        const borderX = 0.12;
        const borderY = 0.12;
        const activeW = 0.76;
        const activeH = 0.76;

        // Center X % = border + (col * (activeW / 3)) + half_col
        const colW = activeW / 3;
        const cxPct = borderX + (logicalCol * colW) + (colW / 2);

        // Center Y % = border + (row * (activeH / 5)) + half_row
        const rowH = activeH / 5;
        const cyPct = borderY + (logicalRow * rowH) + (rowH / 2);

        const centerX = cxPct * vw;
        const centerY = cyPct * vh;

        // Clamp to ensure it doesn't go off screen even with safe area adjustments
        const pad = 48;
        const clampedX = Math.min(vw - pad, Math.max(pad, centerX));
        const clampedY = Math.min(vh - pad, Math.max(pad, centerY));

        fab.style.transform = 'translate(-50%, 50%)';
        fab.style.left = clampedX + 'px';
        fab.style.bottom = (vh - clampedY) + 'px';
        fab.style.top = 'auto';
        fab.style.right = 'auto';
    },
    bindFabPositionPicker() {
        const select = el('#fabPosCellSelect');
        const ascii = el('#fabGridAscii');
        const enabledToggle = el('#fabEnabledToggle');
        const posControls = el('#fabPosControls');
        if (!select) return;

        const rows = 5;
        const cols = 3;
        const total = rows * cols;

        const getSavedCell = () => {
            const pos = this.state.settings.fabPos;
            if (pos && typeof pos === 'object' && pos.mode === 'grid') {
                const c = Number(pos.cell);
                if (Number.isFinite(c) && c >= 1 && c <= total) return c;
            }
            return 15; // near bottom-left by default
        };

        const renderAscii = (activeCell) => {
            if (!ascii) return;
            const pad2 = (n) => String(n).padStart(2, '0');
            let out = ' ┌──────────────┐ \n';
            out += ' │ ┌──────────┐ │ \n';
            let cell = 1;
            for (let r = 0; r < rows; r++) {
                let rowStr = ' │ │';
                const rowArr = [];
                for (let c = 0; c < cols; c++) {
                    const label = pad2(cell);
                    if (cell === activeCell) {
                        rowArr.push(`<span class="text-dull-purple font-semibold">${label}</span>`);
                    } else {
                        rowArr.push(label);
                    }
                    cell++;
                }
                rowStr += rowArr.join('  ') + '│ │ ';
                out += rowStr + '\n';
                if (r < rows - 1) {
                    out += ' │ │          │ │ \n';
                }
            }
            out += ' │ └──────────┘ │ \n';
            out += ' └──────────────┘ ';
            ascii.innerHTML = out;
        };

        const applyCell = (cell) => {
            const n = Math.max(1, Math.min(total, Number(cell) || 1));
            this.state.settings.fabPos = { mode: 'grid', rows, cols, cell: n };
            Storage.setSettings(this.state.settings);
            this.applyFabPosition();
            renderAscii(n);
            toast('Mobile FAB position saved');
        };

        const initial = getSavedCell();
        select.value = String(initial);
        renderAscii(initial);
        select.onchange = () => applyCell(select.value);

        const applyEnabled = (enabled) => {
            const on = !!enabled;
            this.state.settings.fabEnabled = on;
            Storage.setSettings(this.state.settings);
            if (posControls) posControls.classList.toggle('hidden', !on);
            this.applyFabPosition();
            this.updateMobileFab();
        };

        if (enabledToggle) {
            const savedEnabled = this.state.settings.fabEnabled;
            enabledToggle.checked = savedEnabled !== false;
            if (posControls) posControls.classList.toggle('hidden', enabledToggle.checked === false);
            enabledToggle.onchange = () => applyEnabled(enabledToggle.checked);
        } else {
            // No toggle in DOM; ensure controls are visible if present.
            if (posControls) posControls.classList.remove('hidden');
        }
    },
    applyFontMode() {
        const mode = this.state.settings.fontMode || 'serif';
        const fontMode = mode === 'mono' ? 'mono' : 'serif';
        document.body.setAttribute('data-font', fontMode);
        document.documentElement.setAttribute('data-font', fontMode);
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === mode);
        });
    },
    isReady() {
        const s = this.state.settings;
        const hasSettings = !!(s.workerUrl && s.authToken && s.deckSource && s.cardSource);
        // If offline, trust the stored settings (assume they were verified before)
        if (!navigator.onLine && hasSettings) return true;
        // If online, require full verification
        return hasSettings && s.workerVerified && (s.authVerified || this.state.authVerified) && s.sourcesVerified;
    },
    loadAISettings() {
        const s = Storage.getSettings();
        if (s.aiProvider) el('#aiProvider').value = s.aiProvider;
        if (s.aiModel) el('#aiModel').value = s.aiModel;
        if (s.aiKey) el('#aiKey').value = s.aiKey;

        // Load STT settings
        if (s.sttProvider) el('#sttProvider').value = s.sttProvider;
        if (s.sttModel) el('#sttModel').value = s.sttModel;
        if (s.sttKey) el('#sttKey').value = s.sttKey;
        if (s.sttPrompt) el('#sttPrompt').value = s.sttPrompt;

        this.state.settings.sttVerified = s.sttVerified || false;
        this.state.settings.sttPermissionWarmed = s.sttPermissionWarmed || false;
        if (s.themeMode) this.state.settings.themeMode = s.themeMode;
        if (s.fontMode) this.state.settings.fontMode = s.fontMode;
        this.applyTheme();
        this.applyFontMode();
        this.updateSkipHotkeyLabel(el('#revisionMode')?.value === 'ai');
        // Toggle provider field visibility based on current selection
        this.toggleAiProviderFields();
        this.toggleSttProviderFields();
        // On file:// we still need to proactively ask once to enable mic; HTTPS will reuse prior grant
        if (location.protocol === 'file:' && s.sttProvider && s.sttPermissionWarmed) {
            this.warmMicStreamForAi();
        }
        // Add change listeners for provider dropdowns
        el('#aiProvider').onchange = () => this.toggleAiProviderFields();
        el('#sttProvider').onchange = () => {
            this.toggleSttProviderFields();
            const provider = el('#sttProvider')?.value || '';
            this.persistSttSettingsFromUI({ requestPermission: !!provider });
        };
    },
    persistSttSettingsFromUI({ requestPermission = false } = {}) {
        const prevProvider = this.state.settings.sttProvider || '';
        const provider = (el('#sttProvider')?.value || '').trim();
        const model = (el('#sttModel')?.value || '').trim();
        const key = (el('#sttKey')?.value || '').trim();
        const prompt = (el('#sttPrompt')?.value || '').trim();

        this.state.settings.sttProvider = provider;
        this.state.settings.sttModel = model;
        this.state.settings.sttPrompt = prompt;
        if (key) this.state.settings.sttKey = key;
        // Browser STT doesn't require verification. Disabled clears verification.
        if (!provider) {
            this.state.settings.sttVerified = false;
            this.state.settings.sttPermissionWarmed = false;
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
        } else if (provider === 'browser') {
            this.state.settings.sttVerified = true;
            this.state.settings.sttModel = '';
            this.state.settings.sttKey = '';
        } else if (provider !== prevProvider) {
            // If provider changed, require re-verify to avoid using stale creds with a new endpoint.
            this.state.settings.sttVerified = false;
        }

        Storage.setSettings(this.state.settings);
        this.applySttChangeEffects(!provider);

        if (prevProvider && provider && provider !== prevProvider) {
            toast(provider === 'browser' ? 'Using browser speech recognition' : 'STT provider changed — verify STT settings');
        }

        // Only request mic permission when transitioning from disabled -> enabled.
        const shouldRequest = !!(requestPermission && !prevProvider && provider);
        if (!shouldRequest) return;
        this.ensureMicPermission()
            .then(() => {
                this.state.settings.sttPermissionWarmed = true;
                Storage.setSettings(this.state.settings);
            })
            .catch(() => {
                this.state.settings.sttPermissionWarmed = false;
                Storage.setSettings(this.state.settings);
                toast('Microphone access denied');
            });
    },
    toggleAiProviderFields() {
        const provider = el('#aiProvider').value;
        const fields = el('#aiProviderFields');
        if (fields) {
            if (provider) {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        }
    },
    toggleSttProviderFields() {
        const provider = el('#sttProvider').value;
        const fields = el('#sttProviderFields');
        if (fields) {
            if (provider && provider !== 'browser') {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        }
        // Avoid auto-triggering mic prompts on simple provider toggles; recording will request when needed
    },
    updateSkipHotkeyLabel(isAiMode) {
        const skipKbd = el('#skipHotkey');
        if (!skipKbd) return;
        if (isAiMode) {
            // Use symbols for both platforms (⎇ = Alt, ⇧ = Shift)
            skipKbd.textContent = isMac ? '⌥ ⇧ S' : '⎇ ⇧ S';
        } else {
            skipKbd.textContent = 'S';
        }
    },
    applySttChangeEffects(disabled = false) {
        if (disabled || !this.isSttEnabled()) {
            this.stopMicActivity(true);
        } else {
            const feedback = el('#aiFeedback');
            if (feedback) feedback.classList.add('hidden');
            if (location.protocol === 'file:' && this.state.settings.sttPermissionWarmed) {
                // Prompt once on local files so mic shows up immediately
                this.warmMicStreamForAi();
            }
        }
        this.setAiControlsLocked(this.state.aiLocked);
        this.updateMobileFab();
    },
    async submitToAI() {
        if (this.state.aiLocked) return;
        if (!this.state.selectedCard) return;
        if (this.state.answerRevealed) {
            toast('Answer already reviewed. Go to the next card.');
            return;
        }
        // Stop any ongoing mic recording before sending
        if (this.isMicActive()) this.stopMicActivity(true);
        const ans = el('#aiAnswer').value.trim();
        if (!ans) { toast('Enter or record an answer first'); return; }
        if (!navigator.onLine) {
            toast('Offline: AI mode needs internet');
            return;
        }
        if (!this.state.settings.aiVerified) {
            toast('Verify AI settings in Settings first');
            return;
        }
        if (!this.state.settings.aiKey) { toast('Add an AI key in Settings'); return; }
        const deck = this.deckById(this.state.selectedCard.deckId);
        const promptTemplate = deck?.aiPrompt || DEFAULT_AI_PROMPT;
        // Swap question and answer if card is reversed
        const isReversed = this.state.cardReversed;
        const question = isReversed ? this.state.selectedCard.back : this.state.selectedCard.name;
        const answer = isReversed ? this.state.selectedCard.name : this.state.selectedCard.back;
        const applyTemplate = (tpl, vars) => {
            let out = String(tpl || '');
            for (const [key, value] of Object.entries(vars)) {
                out = out.split(`{{${key}}}`).join(String(value ?? ''));
            }
            return out;
        };
        const prompt = applyTemplate(promptTemplate, { question, answer, user: ans });
        const provider = this.state.settings.aiProvider || 'openai';
        const model = this.state.settings.aiModel || (provider === 'anthropic' ? 'claude-3-haiku-20240307' : provider === 'gemini' ? 'gemini-1.5-flash-latest' : 'gpt-4o-mini');
        try {
            this.state.lockAiUntilNextCard = true;
            this.setAiControlsLocked(true);
            this.updateMobileFab();
            el('#aiFeedback').classList.remove('hidden');
            el('#aiFeedback').innerHTML = 'Thinking...';
            const res = await this.callAI(provider, model, prompt, this.state.settings.aiKey);
            // Validate response before rendering
            if (!res || typeof res !== 'string') {
                throw new Error('Invalid response from AI');
            }
            el('#aiFeedback').innerHTML = safeMarkdownParse(res);
            applyMediaEmbeds(el('#aiFeedback'));
            this.renderMath(el('#aiFeedback'));
            this.reveal();
        } catch (e) {
            // Comprehensive error boundary - ensure all UI state is reset
            const feedback = el('#aiFeedback');
            if (feedback) {
                feedback.innerHTML = '';
                feedback.classList.add('hidden');
            }
            this.state.lockAiUntilNextCard = false;
            this.setAiControlsLocked(false);
            this.updateMobileFab();
            // Provide user-friendly error messages
            const msg = e?.message || 'Unknown error';
            if (msg.includes('401') || msg.includes('403')) {
                toast('AI API key invalid or expired');
            } else if (msg.includes('429')) {
                toast('AI rate limited - try again in a moment');
            } else if (msg.includes('Network') || msg.includes('fetch')) {
                toast('Network error - check your connection');
            } else {
                toast('AI error: ' + msg);
            }
            console.error('AI judging error:', e);
        }
    },
    async callAI(provider, model, prompt, key) {
        // Phase 9: Offline mode check for AI
        if (!navigator.onLine) {
            throw new Error('Network unavailable');
        }

        // Helper for safe JSON parsing with error context
        const safeParseJson = async (resp, providerName) => {
            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch (parseErr) {
                console.error(`${providerName} returned invalid JSON:`, text.slice(0, 500));
                throw new Error(`${providerName} returned invalid response`);
            }
        };

        if (provider === 'anthropic') {
            const resp = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({ model, max_tokens: 256, messages: [{ role: 'user', content: prompt }] })
            });
            if (!resp.ok) throw new Error('Claude returned ' + resp.status);
            const json = await safeParseJson(resp, 'Claude');
            return json.content?.[0]?.text || 'No response';
        }
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!resp.ok) throw new Error('Gemini returned ' + resp.status);
            const json = await safeParseJson(resp, 'Gemini');
            return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || 'No response';
        }
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 256 })
        });
        if (!resp.ok) throw new Error('OpenAI returned ' + resp.status);
        const json = await safeParseJson(resp, 'OpenAI');
        return json.choices?.[0]?.message?.content || 'No response';
    },
    initMobileFab() {
        const cluster = el('#mobileFabCluster');
        if (!cluster) return;

        // Bind action buttons (always bind, visibility controlled by updateMobileFab)
        el('#fabReveal')?.addEventListener('click', () => this.reveal());
        el('#fabSkip')?.addEventListener('click', () => this.nextCard());
        el('#fabCopy')?.addEventListener('click', () => this.copyCardContent());
        el('#fabAddNote')?.addEventListener('click', () => this.openAddBlockModal());

        // Initialize joystick with Hammer.js
        this.initJoystick();

        // Listen for window resize to show/hide FAB cluster
        window.addEventListener('resize', () => this.updateMobileFab());
    },
    initJoystick() {
        const isSmallDevice = window.matchMedia('(max-width: 640px)').matches;
        const inSession = !!this.state.session;
        const fabEnabled = this.state.settings.fabEnabled !== false;
        const shouldBeActive = isSmallDevice && inSession && fabEnabled;

        if (!shouldBeActive) {
            if (this.state.joystickActive || this.state.joystickHandlers) {
                this.cleanupJoystick();
            }
            return;
        }

        // Always cleanup before re-initializing to prevent duplicate handlers
        if (this.state.joystickActive || this.state.joystickHandlers) {
            this.cleanupJoystick();
        }

        const joystick = el('#joystick');
        if (!joystick) return;

        const THRESHOLD = 15;
        let startX = 0;
        let startY = 0;
        let currentDirection = null;

        const getDirection = (dx, dy) => {
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (absX < THRESHOLD && absY < THRESHOLD) return null;
            if (absX > absY) {
                return dx > 0 ? 'right' : 'left';
            } else {
                return dy > 0 ? 'down' : 'up';
            }
        };

        const updateJoystick = (direction) => {
            joystick.classList.remove('up', 'down', 'left', 'right');
            joystick.querySelectorAll('.joystick-label').forEach(l => l.classList.remove('active'));
            if (direction) {
                joystick.classList.add(direction);
                joystick.querySelector(`.joystick-label-${direction}`)?.classList.add('active');
            }
        };

        const onPointerDown = (e) => {
            startX = e.clientX;
            startY = e.clientY;
            joystick.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e) => {
            if (!startX && !startY) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            currentDirection = getDirection(dx, dy);
            updateJoystick(currentDirection);
        };

        const onPointerUp = (e) => {
            if (currentDirection) {
                const ratings = { up: 'Good', down: 'Again', left: 'Hard', right: 'Easy' };
                this.rate(ratings[currentDirection]);
            }
            startX = 0;
            startY = 0;
            currentDirection = null;
            updateJoystick(null);
        };

        joystick.addEventListener('pointerdown', onPointerDown);
        joystick.addEventListener('pointermove', onPointerMove);
        joystick.addEventListener('pointerup', onPointerUp);
        joystick.addEventListener('pointercancel', onPointerUp);

        this.state.joystickActive = true;
        this.state.joystickHandlers = { onPointerDown, onPointerMove, onPointerUp };
    },
    cleanupJoystick() {
        const joystick = el('#joystick');
        if (joystick && this.state.joystickHandlers) {
            const { onPointerDown, onPointerMove, onPointerUp } = this.state.joystickHandlers;
            joystick.removeEventListener('pointerdown', onPointerDown);
            joystick.removeEventListener('pointermove', onPointerMove);
            joystick.removeEventListener('pointerup', onPointerUp);
            joystick.removeEventListener('pointercancel', onPointerUp);
            joystick.classList.remove('up', 'down', 'left', 'right');
            joystick.querySelectorAll('.joystick-label').forEach(l => l.classList.remove('active'));
        }
        this.state.joystickActive = false;
        this.state.joystickHandlers = null;
    },

    updateMobileFab() {
        const isSmallDevice = window.matchMedia('(max-width: 640px)').matches;
        const cluster = el('#mobileFabCluster');

        // Try to init joystick if needed
        this.initJoystick();

        // Hide FAB on large screens
        if (!isSmallDevice) {
            if (cluster) cluster.classList.add('hidden');
            return;
        }
        // Hard-disable FAB entirely if user turned it off.
        if (this.state.settings.fabEnabled === false) {
            if (cluster) cluster.classList.add('hidden');
            return;
        }

        const hasCard = !!this.state.selectedCard;
        const inSession = !!this.state.session;
        const revealed = this.state.answerRevealed;
        const revisionMode = el('#revisionMode')?.value || 'manual';
        const isAiMode = revisionMode === 'ai';
        const sttEnabled = this.isSttEnabled();
        // Check if the actual reveal button in the card is visible (not hidden)
        const revealBtnVisible = el('#revealBtn') && !el('#revealBtn').classList.contains('hidden');

        const joystickContainer = el('#joystickContainer');
        const fabPreRevealActions = el('#fabPreRevealActions');
        const fabCopy = el('#fabCopy');
        const fabAddNote = el('#fabAddNote');
        const fabMic = el('#fabMic');
        const fabSend = el('#fabSend');

        // Only show FAB cluster when there's an active card with reveal button visible or already revealed
        const showFab = hasCard && inSession && (revealBtnVisible || revealed || isAiMode);
        if (cluster) cluster.classList.toggle('hidden', !showFab);

        // Show joystick only when answer is revealed
        if (joystickContainer) joystickContainer.classList.toggle('hidden', !revealed);
        // Show pre-reveal actions (skip + reveal) only when not revealed and reveal button is visible
        if (fabPreRevealActions) fabPreRevealActions.classList.toggle('hidden', revealed || !revealBtnVisible);
        // Show copy and add note only when revealed
        if (fabCopy) fabCopy.classList.toggle('hidden', !revealed);
        if (fabAddNote) fabAddNote.classList.toggle('hidden', !revealed);
        const hideFabMic = !hasCard || !inSession || this.state.answerRevealed || !isAiMode || this.state.aiLocked || !sttEnabled;
        const hideFabSend = !hasCard || !inSession || this.state.answerRevealed || !isAiMode || this.state.aiLocked;
        if (fabMic) fabMic.classList.toggle('hidden', hideFabMic);
        if (fabSend) fabSend.classList.toggle('hidden', hideFabSend);

        // Re-init lucide icons for the joystick
        if (revealed) {
            setTimeout(() => lucide.createIcons(), 0);
        }
    },
    renderMath(container) {
        // Guard against KaTeX not being loaded yet (async CDN load)
        if (!container) return;
        if (typeof katex === 'undefined') {
            // KaTeX not loaded yet, wait for it and retry
            const checkInterval = setInterval(() => {
                if (typeof katex !== 'undefined') {
                    clearInterval(checkInterval);
                    this.renderMath(container);
                }
            }, 100);
            // Stop checking after 5 seconds to avoid infinite loop
            setTimeout(() => clearInterval(checkInterval), 5000);
            return;
        }
        container.querySelectorAll('.notion-equation').forEach(span => {
            // Skip already-rendered equations
            if (span.querySelector('.katex')) return;
            try {
                const expr = span.textContent || '';
                span.innerHTML = katex.renderToString(expr, { throwOnError: false });
            } catch (e) { console.error('KaTeX render error:', e); }
        });
    },
    async recordAnswer() {
        const isAiMode = el('#revisionMode')?.value === 'ai';
        if (!isAiMode) {
            toast('Mic is available in AI mode only.');
            return;
        }
        if (!this.isSttEnabled()) {
            toast('Enable speech-to-text in Settings first.');
            return;
        }
        if (this.state.answerRevealed) {
            toast('Already judged. Go to the next card.');
            return;
        }
        this.state.userStoppedMic = false;
        if (!this.state.activeMicButton) this.state.activeMicButton = 'inline';
        const provider = this.state.settings.sttProvider;
        const isCloudProvider = provider && provider !== 'browser';

        // If cloud provider is configured and verified, use it
        if (isCloudProvider) {
            if (!this.state.settings.sttKey) {
                toast('Add and verify your STT API key in Settings.');
                return;
            }
            if (!this.state.settings.sttVerified) {
                toast('Verify STT settings in Settings first.');
                return;
            }
            await this.recordWithCloudSTT();
            return;
        }

        // Fall back to browser speech recognition
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast('Speech recognition not supported. Configure a cloud provider in settings.');
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
        el('#aiFeedback').classList.remove('hidden');
        el('#aiFeedback').innerHTML = 'Listening...';

        let finalTranscript = el('#aiAnswer').value;
        if (finalTranscript) finalTranscript += ' ';

        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            el('#aiAnswer').value = finalTranscript + interim;
            // Trigger input event to update Send button state
            el('#aiAnswer').dispatchEvent(new Event('input'));
        };

        // Store recorder instance to allow stopping it
        this.state.currentRecorder = rec;
        this.setAiControlsLocked(false);

        rec.onerror = (e) => {
            if (e.error !== 'aborted') {
                el('#aiFeedback').innerHTML = '';
                toast('Mic error: ' + e.error);
            }
            this.state.currentRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
        };
        rec.onend = () => {
            if (el('#aiFeedback').innerHTML.includes('Listening') && this.state.userStoppedMic) {
                el('#aiFeedback').innerHTML = 'Captured. Now send.';
            } else if (el('#aiFeedback').innerHTML.includes('Listening')) {
                el('#aiFeedback').innerHTML = '';
            }
            this.state.currentRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
        };
        rec.start();
    },
    async recordWithCloudSTT() {
        const provider = this.state.settings.sttProvider;
        const model = this.state.settings.sttModel || this.getDefaultSttModel(provider);
        const key = this.state.settings.sttKey;
        const prompt = this.state.settings.sttPrompt || '';

        el('#aiFeedback').classList.remove('hidden');
        el('#aiFeedback').innerHTML = 'Recording... Click again to stop.';

        // If already recording, stop
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.state.userStoppedMic = true;
            this.mediaRecorder.stop();
            return;
        }
        this.state.userStoppedMic = false;
        if (!this.state.activeMicButton) this.state.activeMicButton = 'inline';

        // Bug 4 fix: Comprehensive try-catch with proper cleanup
        let stream = null;
        try {
            stream = await this.getMicStream();
            if (!stream) throw new Error('Microphone unavailable');
            this.state.activeAudioStream = stream;
            const chunks = [];
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            this.mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            this.mediaRecorder.onstop = async () => {
                // Bug 4 fix: Ensure stream is stopped even if transcription fails
                const cleanupStream = () => {
                    try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                    if (this.state.activeAudioStream === stream) this.state.activeAudioStream = null;
                };

                cleanupStream();
                el('#aiFeedback').innerHTML = 'Transcribing...';
                this.state.currentRecorder = null;
                this.setAiControlsLocked(this.state.aiLocked);

                try {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    let transcript = '';

                    if (provider === 'openai' || provider === 'groq') {
                        transcript = await this.transcribeWithWhisper(audioBlob, provider, model, key, prompt);
                    } else if (provider === 'gemini') {
                        transcript = await this.transcribeWithGemini(audioBlob, model, key, prompt);
                    }

                    if (transcript) {
                        const current = el('#aiAnswer').value.trim();
                        el('#aiAnswer').value = current ? `${current} ${transcript}` : transcript;
                        // Trigger input event to update Send button state
                        el('#aiAnswer').dispatchEvent(new Event('input'));
                    }
                    el('#aiFeedback').innerHTML = this.state.userStoppedMic ? 'Captured. Now send.' : '';
                    this.mediaRecorder = null;
                    this.state.userStoppedMic = false;
                    this.state.activeMicButton = null;
                    this.setAiControlsLocked(false);
                } catch (e) {
                    // Bug 4 fix: Proper cleanup on transcription failure
                    el('#aiFeedback').innerHTML = '';
                    toast('Transcription failed: ' + e.message);
                    this.mediaRecorder = null;
                    this.state.userStoppedMic = false;
                    this.state.activeMicButton = null;
                    this.setAiControlsLocked(false);
                    this.updateMobileFab();
                }
            };

            this.mediaRecorder.onerror = () => {
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
                if (this.state.activeAudioStream === stream) this.state.activeAudioStream = null;
                el('#aiFeedback').innerHTML = '';
                toast('Recording error');
                this.state.currentRecorder = null;
                this.mediaRecorder = null;
                this.state.userStoppedMic = false;
                this.state.activeMicButton = null;
                this.setAiControlsLocked(this.state.aiLocked);
            };

            this.state.currentRecorder = {
                stop: () => {
                    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                        this.state.userStoppedMic = true;
                        this.mediaRecorder.stop();
                    }
                }
            };
            this.setAiControlsLocked(false);
            this.mediaRecorder.start();
            const activeRecorder = this.mediaRecorder;

            // Auto-stop after 60 seconds
            setTimeout(() => {
                if (this.mediaRecorder === activeRecorder && activeRecorder && activeRecorder.state === 'recording') {
                    activeRecorder.stop();
                }
            }, 60000);

        } catch (e) {
            // Bug 4 fix: Cleanup stream on any error during setup
            if (stream) {
                try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
            }
            this.state.activeAudioStream = null;
            el('#aiFeedback').innerHTML = '';
            toast('Microphone access denied');
            this.state.currentRecorder = null;
            this.mediaRecorder = null;
            this.state.userStoppedMic = false;
            this.state.activeMicButton = null;
            this.setAiControlsLocked(this.state.aiLocked);
            this.updateMobileFab();
        }
    },
    async transcribeWithWhisper(audioBlob, provider, model, key, prompt) {
        // Phase 9: Offline mode check for STT
        if (!navigator.onLine) {
            throw new Error('Network unavailable for transcription');
        }
        const endpoint = provider === 'openai'
            ? 'https://api.openai.com/v1/audio/transcriptions'
            : 'https://api.groq.com/openai/v1/audio/transcriptions';

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', model);
        if (prompt) formData.append('prompt', prompt);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}` },
            body: formData
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        return data.text || '';
    },
    async transcribeWithGemini(audioBlob, model, key, prompt) {
        // Phase 9: Offline mode check for Gemini STT
        if (!navigator.onLine) {
            throw new Error('Network unavailable for transcription');
        }
        // Use FileReader for efficient non-blocking Base64 conversion
        const base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const systemPrompt = prompt
            ? `Transcribe this audio. Context: ${prompt}. Return only the transcription, no other text.`
            : 'Transcribe this audio. Return only the transcription, no other text.';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
                    ]
                }]
            })
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    async performDelete() {
        this.closeModal('confirmModal');
        const target = this.pendingDelete;
        if (!target) return;
        if (target.type === 'card') {
            await Storage.delete('cards', target.id);
            this.state.cards = this.state.cards.filter(c => c.id !== target.id);
            this.queueOp({ type: 'card-delete', payload: { id: target.id, notionId: target.notionId } });
            this.renderCards();
            toast('Card deleted');
        }
        this.pendingDelete = null;
    }
};
