/**
 * GhostInk Flashcards - Configuration and Constants
 * Core constants, timing intervals, and utility functions.
 */

// Sync timing intervals
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes background tick
export const MIN_PULL_INTERVAL_MS = 3 * 60 * 1000; // pull at most every 3 minutes
export const MIN_PUSH_INTERVAL_MS = 30 * 1000; // push at most every 30 seconds

// Logging configuration
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 };
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO; // Change to DEBUG for development

// Proper logging utility with levels and context
export const Logger = {
    _format(level, context, message, data) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}] [${context}]`;
        return { prefix, message, data };
    },
    debug(context, message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            const { prefix, message: msg, data: d } = this._format('DEBUG', context, message, data);
            if (d !== null) console.log(prefix, msg, d);
            else console.log(prefix, msg);
        }
    },
    info(context, message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
            const { prefix, message: msg, data: d } = this._format('INFO', context, message, data);
            if (d !== null) console.info(prefix, msg, d);
            else console.info(prefix, msg);
        }
    },
    warn(context, message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
            const { prefix, message: msg, data: d } = this._format('WARN', context, message, data);
            if (d !== null) console.warn(prefix, msg, d);
            else console.warn(prefix, msg);
        }
    },
    error(context, message, error = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
            const { prefix, message: msg } = this._format('ERROR', context, message, error);
            if (error !== null) console.error(prefix, msg, error);
            else console.error(prefix, msg);
        }
    }
};

// FSRS v6 constants
// fsrsW: weight parameters (21 values) - Global Defaults
export const fsrsW = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
export const DEFAULT_DESIRED_RETENTION = 0.9;
export const MAX_INTERVAL = 36500;
export const ratingsMap = { again: 1, hard: 2, good: 3, easy: 4 };

// Default AI prompt template
export const DEFAULT_AI_PROMPT = 'You are a strict flashcard grader.\nQuestion: {{question}}\nCorrect answer: {{answer}}\nLearner answer: {{user}}\nJudge correctness (short) and give brief feedback.';

// DOM helper
export const el = (sel) => document.querySelector(sel);

// Platform detection
export const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Data attribute encoding/decoding
export const encodeDataAttr = (value) => encodeURIComponent((value ?? '').toString());
export const decodeDataAttr = (value) => {
    try { return decodeURIComponent((value ?? '').toString()); } catch { return (value ?? '').toString(); }
};

// HTML escaping for XSS prevention
export const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Async sleep utility
export const sleep = ms => new Promise(res => setTimeout(res, ms));

// FSRS constraint helpers
export const clamp2 = (n) => +Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;

export const constrainDifficulty = (d) => Math.min(Math.max(+d.toFixed(2), 1), 10);

export const clampRetention = (r) => {
    const n = Number(r);
    if (!Number.isFinite(n)) return DEFAULT_DESIRED_RETENTION;
    return Math.min(0.99, Math.max(0.01, n));
};

export const constrainWeights = (w) => {
    // Handle non-array input
    if (!Array.isArray(w)) {
        console.warn('constrainWeights: received non-array input, using defaults');
        return [...fsrsW];
    }

    const out = w.slice(0, 21);
    while (out.length < 21) out.push(fsrsW[out.length]);

    // Validate and sanitize each weight
    for (let i = 0; i < out.length; i++) {
        const n = Number(out[i]);
        // Check for NaN, Infinity, undefined, null, non-numeric strings
        if (!Number.isFinite(n)) {
            console.warn(`constrainWeights: invalid value at index ${i} (${out[i]}), using default ${fsrsW[i]}`);
            out[i] = fsrsW[i];
        } else {
            out[i] = n;
        }
    }

    // A few guardrails to keep formulas well-behaved
    for (let i = 0; i <= 3; i++) out[i] = Math.max(0.01, out[i]); // initial stabilities
    out[4] = Math.min(10, Math.max(1, out[4])); // baseline difficulty
    out[7] = Math.min(1, Math.max(0, out[7])); // mean reversion weight
    out[20] = Math.min(0.8, Math.max(0.1, out[20])); // decay (used as -w[20])
    return out;
};

// Debounce utility (Bug fix: add debounce for search inputs)
export const debounce = (fn, delay = 150) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};
