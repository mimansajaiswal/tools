/**
 * GhostInk Flashcards - SRS Module
 * Spaced Repetition System algorithms: FSRS v6 and SM-2.
 */

import {
    fsrsW,
    DEFAULT_DESIRED_RETENTION,
    MAX_INTERVAL,
    ratingsMap,
    clamp2,
    constrainDifficulty,
    clampRetention,
    constrainWeights
} from './config.js';

// FSRS v6 helpers (Pure functions accepting weights 'w')
export const getDecay = (w) => -w[20];
export const getFactor = (w) => Math.pow(0.9, 1 / getDecay(w)) - 1;
export const meanReversion = (w, init, current) => w[7] * init + (1 - w[7]) * current;

/** Calculate initial difficulty for a new card based on first rating */
export const initDifficulty = (w, ratingName) => {
    const r = ratingsMap[ratingName] || 3;
    // D0 = w4 - (G-3) * w5
    return constrainDifficulty(w[4] - (r - 3) * w[5]);
};

/** Calculate initial stability for a new card based on first rating */
export const initStability = (w, ratingName) => {
    const r = ratingsMap[ratingName] || 3;
    // S0 = w[G-1]
    return +Math.max(w[r - 1], 0.1).toFixed(2);
};

/** Calculate probability of recall using the power forgetting curve (v6) */
export const forgettingCurve = (w, elapsedDays, stability) => Math.pow(1 + getFactor(w) * elapsedDays / stability, getDecay(w));

/** Calculate next review interval in days based on stability */
export const nextInterval = (w, stability, desiredRetention = DEFAULT_DESIRED_RETENTION) => {
    const rr = clampRetention(desiredRetention);
    const newInterval = stability / getFactor(w) * (Math.pow(rr, 1 / getDecay(w)) - 1);
    return Math.min(Math.max(Math.round(newInterval), 0), MAX_INTERVAL);
};

/** Update difficulty after a review (applies mean reversion) */
export const nextDifficulty = (w, d, ratingName) => {
    const r = ratingsMap[ratingName] || 3;
    // next_D = D - w6 * (G - 3)
    const next_d = d - w[6] * (r - 3);
    // Mean reversion: w7 * w4 + (1 - w7) * next_D
    return constrainDifficulty(meanReversion(w, w[4], next_d));
};

// Phase 6: Calculate new stability after successful recall (capped at MAX_INTERVAL)
export const nextRecallStability = (w, d, s, r, ratingName) => {
    const hardPenalty = ratingName === 'hard' ? w[15] : 1;
    const easyBonus = ratingName === 'easy' ? w[16] : 1;
    // S_recall = S * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp((1 - R) * w10) - 1) * hardPenalty * easyBonus)
    const val = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hardPenalty * easyBonus);
    return Math.min(clamp2(val), MAX_INTERVAL);
};

/** Calculate new stability after forgetting (rated 'again') */
export const nextForgetStability = (w, d, s, r) => {
    // S_forget = w11 * D^(-w12) * ((S + 1)^w13 - 1) * exp((1 - R) * w14)
    // Capped at S (stability cannot increase on failure)
    const val = Math.min(
        w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]),
        s
    );
    return clamp2(val);
};

/** Calculate new stability for same-day review (Short-term) - capped at MAX_INTERVAL */
export const nextShortTermStability = (w, s, ratingName) => {
    const r = ratingsMap[ratingName] || 3;
    // S_new = S * exp(w17 * (G - 3 + w18)) * S^(-w19)
    const val = s * Math.exp(w[17] * (r - 3 + w[18])) * Math.pow(s, -w[19]);
    return Math.min(clamp2(val), MAX_INTERVAL);
};

// Rating helpers
export const normalizeRating = (name) => name ? name.toLowerCase() : null;
export const displayRating = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : null;

export const detectCardType = (name = '', back = '') => {
    const text = `${name} ${back}`.toLowerCase();
    const hasCloze = /\{\{c\d+::.+?\}\}/i.test(text);
    if (hasCloze) return 'Cloze';
    return 'Front-Back';
};

/**
 * SRS (Spaced Repetition System) algorithms for flashcard scheduling.
 * Contains implementations of FSRS v6 and SM-2 algorithms.
 */
export const SRS = {
    /**
     * Calculate due date set to 4:00 AM of the target day.
     * Prevents schedule creep by aligning reviews to start-of-day.
     */
    getDueDate(intervalDays) {
        const date = new Date();
        // If interval is 0, set to 4:00 AM today (due immediately)
        // If interval > 0, add days and set to 4:00 AM
        const daysToAdd = Math.round(intervalDays);
        if (daysToAdd > 0) {
            date.setDate(date.getDate() + daysToAdd);
        }
        date.setHours(4, 0, 0, 0);
        return date.toISOString();
    },

    /**
     * FSRS (Free Spaced Repetition Scheduler) v6 algorithm.
     * Calculates new difficulty, stability, and next review date based on user rating.
     * @param {Object} card - The card being reviewed
     * @param {Object} card.fsrs - FSRS state (difficulty, stability, lastReview, etc.)
     * @param {string} rating - User rating: 'again', 'hard', 'good', or 'easy'
     * @returns {Object} Updated FSRS state with new difficulty, stability, retrievability, dueDate
     */
    fsrs(card, rating, customWeights = null, desiredRetention = DEFAULT_DESIRED_RETENTION) {
        const now = new Date();
        const w = customWeights && customWeights.length === 21 ? customWeights : fsrsW;
        const ratingName = rating;
        const lastD = card.fsrs?.difficulty ?? initDifficulty(w, 'good');
        const lastS = card.fsrs?.stability ?? initStability(w, 'good');
        const lastReview = card.fsrs?.lastReview ? new Date(card.fsrs.lastReview) : null;
        const isNew = !lastReview;
        let newD, newS, retr;
        if (isNew) {
            newD = initDifficulty(w, ratingName);
            newS = initStability(w, ratingName);
            retr = 1;
        } else {
            const elapsed = Math.max(0.01, (now - lastReview) / 86400000);
            const r = forgettingCurve(w, elapsed, lastS);
            newD = nextDifficulty(w, lastD, ratingName);

            if (ratingName === 'again') {
                newS = nextForgetStability(w, lastD, lastS, r);
            } else if (elapsed < 1) {
                // Use Short-term stability formula for same-day reviews (if not 'again')
                newS = nextShortTermStability(w, lastS, ratingName);
            } else {
                newS = nextRecallStability(w, lastD, lastS, r, ratingName);
            }
            retr = Math.max(0, Math.min(1, +r.toFixed(4)));
        }
        const intervalDays = nextInterval(w, newS, desiredRetention);
        return {
            difficulty: newD,
            stability: newS,
            retrievability: retr,
            lastRating: ratingName,
            lastReview: now.toISOString(),
            dueDate: SRS.getDueDate(intervalDays)
        };
    },

    /**
     * SM-2 (SuperMemo 2) algorithm for spaced repetition.
     * Updates ease factor and interval based on user rating.
     * @param {Object} card - The card being reviewed
     * @param {Object} card.sm2 - SM-2 state (easeFactor, interval, repetitions, etc.)
     * @param {string} rating - User rating: 'again', 'hard', 'good', or 'easy'
     * @returns {Object} Updated SM-2 state with new easeFactor, interval, dueDate
     */
    sm2(card, rating) {
        const now = new Date();
        const ease = card.sm2?.easeFactor ?? 2.5;
        const interval = card.sm2?.interval ?? 0;
        const repetitions = card.sm2?.repetitions ?? 0;
        // Map ratings to SM-2 quality grades (0-5 scale)
        // again=0 (complete blackout), hard=2 (correct with serious difficulty),
        // good=4 (correct with minor difficulty), easy=5 (perfect)
        // Fix: hard grade (2) was incorrectly set to 3 (same as good in edge cases)
        const grade = { again: 0, hard: 2, good: 4, easy: 5 }[rating] ?? 4;

        let newEase, newInterval, newReps;

        // Update ease factor on every review (including failures), then clamp.
        newEase = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

        if (grade < 3) {
            // Failed recall (again or hard) - reset to beginning
            // Note: hard (grade=2) now correctly resets the card
            newReps = 0;
            newInterval = rating === 'hard' ? 1 : 0; // hard gets 1 day, again gets 0
        } else {
            // Successful recall (good or easy)
            newReps = repetitions + 1;

            // Calculate interval based on repetition count
            if (newReps === 1) {
                newInterval = 1;
            } else if (newReps === 2) {
                newInterval = 6;
            } else {
                // Apply bonus/penalty based on rating
                const multiplier = rating === 'easy' ? 1.3 : 1.0;
                newInterval = Math.round(interval * newEase * multiplier);
            }
        }

        return {
            easeFactor: newEase,
            interval: newInterval,
            repetitions: newReps,
            dueDate: SRS.getDueDate(newInterval),
            lastRating: rating,
            lastReview: now.toISOString()
        };
    }
};

// FSRS optimization helpers
export const simulateFsrsReviewAt = (state, { at, rating }, w) => {
    const now = new Date(at);
    if (!Number.isFinite(now.getTime())) return null;
    const ratingName = normalizeRating(rating);
    const lastReview = state.lastReview ? new Date(state.lastReview) : null;
    const isNew = !lastReview;

    let newD, newS, retr;
    if (isNew) {
        // Learning/init step: we don't score loss here; just set initial state.
        newD = initDifficulty(w, ratingName || 'good');
        newS = initStability(w, ratingName || 'good');
        retr = 1;
    } else {
        const elapsed = Math.max(0.01, (now - lastReview) / 86400000);
        const r = forgettingCurve(w, elapsed, state.stability);
        newD = nextDifficulty(w, state.difficulty, ratingName);
        if (ratingName === 'again') {
            newS = nextForgetStability(w, state.difficulty, state.stability, r);
        } else if (elapsed < 1) {
            newS = nextShortTermStability(w, state.stability, ratingName);
        } else {
            newS = nextRecallStability(w, state.difficulty, state.stability, r, ratingName);
        }
        retr = Math.max(0, Math.min(1, +r.toFixed(6)));
    }
    return {
        nextState: {
            difficulty: newD,
            stability: newS,
            lastReview: now.toISOString()
        },
        retrievability: retr,
        isNew
    };
};

export const buildFsrsTrainingSet = (cards, { maxCards = 400 } = {}) => {
    const candidates = (cards || []).filter(c => Array.isArray(c.reviewHistory) && c.reviewHistory.length >= 2);
    if (candidates.length === 0) return [];
    const chosen = candidates.length <= maxCards ? candidates : [...candidates].sort(() => Math.random() - 0.5).slice(0, maxCards);
    return chosen.map(c => ({
        id: c.id,
        history: [...c.reviewHistory]
            .filter(e => e && e.at && e.rating)
            .sort((a, b) => new Date(a.at) - new Date(b.at))
    })).filter(x => x.history.length >= 2);
};

export const fsrsLogLoss = (trainingSet, weights) => {
    const w = constrainWeights(weights);
    const eps = 1e-6;
    let n = 0;
    let loss = 0;
    for (const item of trainingSet) {
        const state = {
            difficulty: initDifficulty(w, 'good'),
            stability: initStability(w, 'good'),
            lastReview: null
        };
        for (const step of item.history) {
            const sim = simulateFsrsReviewAt(state, step, w);
            if (!sim) continue;
            if (!sim.isNew) {
                const y = normalizeRating(step.rating) === 'again' ? 0 : 1;
                const p = Math.min(1 - eps, Math.max(eps, sim.retrievability));
                loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
                n++;
            }
            state.difficulty = sim.nextState.difficulty;
            state.stability = sim.nextState.stability;
            state.lastReview = sim.nextState.lastReview;
        }
    }
    if (n === 0) return Number.POSITIVE_INFINITY;
    return loss / n;
};
