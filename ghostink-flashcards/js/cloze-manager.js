/**
 * GhostInk Flashcards - Cloze Manager Module
 * Handles cloze card parent/sub-item hierarchy logic.
 */

import { parseSrsState } from './config.js';
import { initDifficulty, initStability, SRS } from './srs.js';
import { fsrsW } from './config.js';

/**
 * Parse cloze indices from text containing {{c1::...}} patterns
 * @param {string} text - Card text with cloze syntax
 * @returns {Set<number>} Set of cloze indices (1-based)
 */
export const parseClozeIndices = (text) => {
    if (!text) return new Set();
    const matches = [...text.matchAll(/\{\{\s*c(\d+)::/gis)];
    return new Set(matches.map(m => parseInt(m[1], 10)).filter(n => n > 0));
};

/**
 * Check if a card is a cloze parent (has type=Cloze and no parentCard)
 * @param {Object} card - Card object
 * @returns {boolean}
 */
export const isClozeParent = (card) => {
    if (!card) return false;
    const type = (card.type || '').toLowerCase();
    return type === 'cloze' && !card.parentCard;
};

/**
 * Check if a card is a sub-item (has a parentCard reference)
 * @param {Object} card - Card object
 * @returns {boolean}
 */
export const isSubItem = (card) => {
    return !!(card?.parentCard);
};

/**
 * Check if a card is schedulable (not a cloze parent)
 * Regular cards and sub-items are schedulable; cloze parents are not.
 * @param {Object} card - Card object
 * @returns {boolean}
 */
export const isSchedulable = (card) => {
    return !isClozeParent(card);
};

/**
 * Parse cloze indexes from a comma-separated string like "1,2,3"
 * @param {string} str - Comma-separated indexes
 * @returns {Set<number>}
 */
const parseClozeIndexesFromString = (str) => {
    if (!str) return new Set();
    return new Set(
        str.split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => n > 0 && !isNaN(n))
    );
};

/**
 * Reconcile sub-items for a parent card
 * @param {Object} parent - Parent cloze card
 * @param {Array} existingSubItems - Array of existing sub-item cards for this parent
 * @returns {Object} { toCreate: number[], toKeep: string[], toSuspend: string[] }
 */
export const reconcileSubItems = (parent, existingSubItems) => {
    // Optimization: Prefer pre-calculated indices from Notion property if available
    // AND not edited locally (updatedInApp check)
    let indices = new Set();

    if (parent.clozeIndexes && !parent.updatedInApp) {
        indices = parseClozeIndexesFromString(parent.clozeIndexes);
    }

    // Fallback to parsing text if property missing/empty or edited locally
    if (indices.size === 0) {
        // Try name first (standard location)
        indices = parseClozeIndices(parent.name);

        // Try back if name empty (rare, but supported)
        if (indices.size === 0 && parent.back) {
            indices = parseClozeIndices(parent.back);
        }
    }

    const existingByIndex = new Map();
    const duplicatesToSuspend = [];
    for (const sub of existingSubItems) {
        // Parse the clozeIndexes field to get the index
        const idx = parseInt(sub.clozeIndexes, 10);
        if (idx > 0 && !sub.suspended) {
            if (existingByIndex.has(idx)) {
                // Duplicate found - mark for suspension
                duplicatesToSuspend.push(sub.id);
            } else {
                existingByIndex.set(idx, sub.id);
            }
        }
    }

    const toCreate = [];
    const toKeep = [];
    const toSuspend = [...duplicatesToSuspend];

    // Indices that exist in parent text
    for (const idx of indices) {
        if (existingByIndex.has(idx)) {
            toKeep.push(existingByIndex.get(idx));
        } else {
            toCreate.push(idx);
        }
    }

    // Sub-items that no longer match any index in parent
    for (const sub of existingSubItems) {
        const idx = parseInt(sub.clozeIndexes, 10);
        if (!indices.has(idx) && !sub.suspended && !duplicatesToSuspend.includes(sub.id)) {
            toSuspend.push(sub.id);
        }
    }

    return { toCreate, toKeep, toSuspend };
};

/**
 * Transform cloze text to only test one specific index.
 * - The target cloze {{cN::answer}} becomes {{c1::answer}} (renumbered to c1)
 * - Other clozes {{cX::answer}} are revealed as just "answer"
 * @param {string} text - Original text with multiple clozes
 * @param {number} targetIndex - The cloze index to test (1-based)
 * @returns {string} Transformed text
 */
export const transformClozeForSubItem = (text, targetIndex) => {
    if (!text) return '';
    return text.replace(/\{\{\s*c(\d+)::(.*?)\}\}/gis, (match, idx, content) => {
        const clozeIdx = parseInt(idx, 10);
        if (clozeIdx === targetIndex) {
            // Keep this cloze but renumber to c1 for consistency
            return `{{c1::${content}}}`;
        }
        // Reveal other clozes
        return content;
    });
};

/**
 * Create a sub-item card for a cloze parent
 * @param {Object} parent - Parent cloze card
 * @param {number} clozeIndex - The cloze index (1-based)
 * @param {string} deckId - Deck ID for the sub-item
 * @param {Function} makeTempId - Function to generate a temporary ID
 * @returns {Object} New sub-item card object
 */
export const createSubItem = (parent, clozeIndex, deckId, makeTempId) => {
    const now = new Date().toISOString();
    const due = SRS.getDueDate(0);
    // Transform name to only test the specific cloze index
    const transformedName = transformClozeForSubItem(parent.name, clozeIndex);
    const transformedBack = transformClozeForSubItem(parent.back || '', clozeIndex);
    return {
        id: makeTempId(),
        notionId: null,
        deckId,
        name: transformedName,
        back: transformedBack,
        type: 'Cloze',
        tags: [...(parent.tags || [])],
        notes: parent.notes || '',
        marked: false,
        flag: '',
        suspended: false,
        leech: false,
        order: clozeIndex - 1, // 0-indexed order
        parentCard: parent.id,
        subCards: [],
        clozeIndexes: String(clozeIndex),
        fsrs: {
            difficulty: initDifficulty(fsrsW, 'good'),
            stability: initStability(fsrsW, 'good'),
            retrievability: 0.9,
            lastRating: null,
            lastReview: null,
            dueDate: due
        },
        sm2: { interval: 1, easeFactor: 2.5, repetitions: 0, dueDate: due },
        syncId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
        updatedInApp: true,
        reviewHistory: [],
        srsState: parseSrsState(null),
        createdAt: now,
        ankiGuid: '',
        ankiNoteType: parent.ankiNoteType || '',
        ankiFields: ''
    };
};
