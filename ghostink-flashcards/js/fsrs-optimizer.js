import { constrainWeights } from './config.js';
import { fsrsLogLossPreprocessed } from './srs.js';

const DEFAULT_ALPHA = 0.602;
const DEFAULT_GAMMA = 0.101;
const DEFAULT_A0 = 0.12;
const DEFAULT_C0 = 0.06;

const chooseIterations = (totalReviews, explicit) => {
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    if (totalReviews < 500) return 100;
    if (totalReviews < 5000) return 160;
    return 220;
};

const hashString = (str = '') => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};

const abortError = () => {
    const err = new Error('Optimization aborted');
    err.name = 'AbortError';
    return err;
};

const computeOffsets = (lengths) => {
    const offsets = new Uint32Array(lengths.length + 1);
    let acc = 0;
    for (let i = 0; i < lengths.length; i++) {
        offsets[i] = acc;
        acc += lengths[i];
    }
    offsets[lengths.length] = acc;
    return offsets;
};

const buildSlices = (lengths, workerCount) => {
    const total = lengths.reduce((sum, v) => sum + v, 0);
    if (workerCount <= 1 || total === 0) return [{ start: 0, end: lengths.length }];
    const target = total / workerCount;
    const slices = [];
    let start = 0;
    let acc = 0;
    for (let i = 0; i < lengths.length; i++) {
        acc += lengths[i];
        const remaining = workerCount - slices.length;
        if (acc >= target && remaining > 1) {
            slices.push({ start, end: i + 1 });
            start = i + 1;
            acc = 0;
        }
    }
    if (start < lengths.length) {
        slices.push({ start, end: lengths.length });
    }
    return slices;
};

class LossWorker {
    constructor(worker) {
        this.worker = worker;
        this.pending = new Map();
        this.ready = new Promise(resolve => {
            this._resolveReady = resolve;
        });
        worker.onmessage = (e) => {
            const msg = e?.data || {};
            if (msg.type === 'ready') {
                this._resolveReady?.();
                return;
            }
            const pending = this.pending.get(msg.id);
            if (!pending) return;
            this.pending.delete(msg.id);
            if (msg.type === 'error') {
                pending.reject(new Error(msg.error || 'Worker error'));
            } else if (msg.type === 'loss') {
                pending.resolve({ loss: msg.loss, n: msg.n });
            }
        };
        worker.onerror = (err) => {
            this.pending.forEach(p => p.reject(err));
            this.pending.clear();
        };
    }

    async init(payload) {
        this.worker.postMessage({ type: 'init', payload });
        const timeoutMs = 2000;
        await Promise.race([
            this.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Worker init timeout')), timeoutMs))
        ]);
    }

    requestLoss(weights, id) {
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'loss', id, weights });
        });
    }

    terminate() {
        this.worker.terminate();
        this.pending.forEach(p => p.reject(abortError()));
        this.pending.clear();
    }
}

const createWorkerPool = async (payload, workerCount = 1, signal = null) => {
    const lengths = payload?.lengths || new Uint32Array(0);
    const offsets = computeOffsets(lengths);
    const slices = buildSlices(lengths, workerCount);

    const workers = [];
    try {
        for (const slice of slices) {
            const startOffset = offsets[slice.start] || 0;
            const endOffset = offsets[slice.end] || startOffset;
            const worker = new Worker(new URL('./fsrs-optimizer-worker.js', import.meta.url), { type: 'module' });
            const wrapper = new LossWorker(worker);
            const payloadSlice = {
                ratings: payload.ratings.subarray(startOffset, endOffset),
                timestamps: payload.timestamps.subarray(startOffset, endOffset),
                lengths: payload.lengths.subarray(slice.start, slice.end)
            };
            await wrapper.init(payloadSlice);
            workers.push(wrapper);
        }
    } catch (err) {
        workers.forEach(w => w.terminate());
        throw err;
    }

    const terminate = () => {
        workers.forEach(w => w.terminate());
    };

    if (signal) {
        if (signal.aborted) {
            terminate();
            throw abortError();
        }
        signal.addEventListener('abort', () => terminate(), { once: true });
    }

    const computeLoss = async (weights) => {
        if (signal?.aborted) throw abortError();
        const reqId = Date.now() + Math.random();
        const results = await Promise.all(workers.map((w, i) => w.requestLoss(weights, `${reqId}:${i}`)));
        let loss = 0;
        let n = 0;
        for (const r of results) {
            loss += r.loss;
            n += r.n;
        }
        return { loss, n };
    };

    return { computeLoss, terminate, mode: 'worker', workerCount: workers.length };
};

const createLocalEngine = (payload, signal = null) => {
    const computeLoss = async (weights) => {
        if (signal?.aborted) throw abortError();
        return fsrsLogLossPreprocessed(payload, weights);
    };
    return { computeLoss, terminate: () => { }, mode: 'local', workerCount: 1 };
};

export const runFsrsOptimization = async ({
    payload,
    startWeights,
    onProgress = null,
    signal = null,
    options = {}
}) => {
    if (!payload || !payload.lengths || !payload.ratings || !payload.timestamps) {
        throw new Error('Invalid training payload');
    }

    const totalReviews = Number.isFinite(payload.totalReviews)
        ? payload.totalReviews
        : payload.lengths.reduce((sum, v) => sum + v, 0);

    const iters = chooseIterations(totalReviews, options.iters);
    const alpha = options.alpha ?? DEFAULT_ALPHA;
    const gamma = options.gamma ?? DEFAULT_GAMMA;
    const a0 = options.a0 ?? DEFAULT_A0;
    const c0 = options.c0 ?? DEFAULT_C0;
    const progressEvery = options.progressEvery ?? 10;
    const seedKey = options.seedKey ?? '';
    const rng = mulberry32(hashString(seedKey));
    const hc = (typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency))
        ? navigator.hardwareConcurrency
        : 2;
    const requestedWorkers = Math.max(0, Math.min(options.workerCount || hc, 4));
    const shouldUseWorkers = requestedWorkers > 1 && typeof Worker !== 'undefined';

    let pool;
    if (shouldUseWorkers) {
        try {
            pool = await createWorkerPool(payload, requestedWorkers, signal);
        } catch (err) {
            pool = createLocalEngine(payload, signal);
        }
    } else {
        pool = createLocalEngine(payload, signal);
    }
    try {
        let w = constrainWeights(startWeights || []);
        let bestW = w.slice();
        let bestLoss = Number.POSITIVE_INFINITY;
        let prevBestLoss = Number.POSITIVE_INFINITY;
        let stagnantCount = 0;

        const evalAvgLoss = async (weights) => {
            const { loss, n } = await pool.computeLoss(weights);
            if (n === 0) return Number.POSITIVE_INFINITY;
            return loss / n;
        };

        const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const progressPayload = (iter, bestLossValue, converged = false) => {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const elapsedMs = Math.max(0, now - startTime);
            let etaMs = null;
            if (iter >= 3 && iters && Number.isFinite(elapsedMs)) {
                const avgPerIter = elapsedMs / Math.max(1, iter);
                etaMs = Math.max(0, avgPerIter * (iters - iter));
            }
            return {
                iter,
                iters,
                bestLoss: bestLossValue,
                converged,
                elapsedMs,
                etaMs,
                mode: pool.mode,
                workerCount: pool.workerCount
            };
        };

        bestLoss = await evalAvgLoss(bestW);
        prevBestLoss = bestLoss;
        if (onProgress) onProgress(progressPayload(0, bestLoss));

        const CONVERGENCE_RELATIVE = options.convergenceRelative ?? 0.001;
        const STAGNANT_ITERS_TO_CONVERGE = options.stagnantIters ?? 15;

        for (let k = 0; k < iters; k++) {
            if (signal?.aborted) throw abortError();

            const ak = a0 / Math.pow(k + 1, alpha);
            const ck = c0 / Math.pow(k + 1, gamma);
            const delta = new Array(21);
            const scale = new Array(21);
            for (let i = 0; i < 21; i++) {
                delta[i] = rng() < 0.5 ? -1 : 1;
                scale[i] = Math.abs(w[i]) + 1;
            }
            const wPlus = w.map((v, i) => v + ck * delta[i] * scale[i]);
            const wMinus = w.map((v, i) => v - ck * delta[i] * scale[i]);

            const lossPlus = await evalAvgLoss(wPlus);
            const lossMinus = await evalAvgLoss(wMinus);
            if (!Number.isFinite(lossPlus) || !Number.isFinite(lossMinus)) {
                w = bestW.slice();
                continue;
            }

            const gHat = new Array(21);
            for (let i = 0; i < 21; i++) {
                const denom = 2 * ck * delta[i] * scale[i];
                gHat[i] = (lossPlus - lossMinus) / denom;
            }

            w = constrainWeights(w.map((v, i) => v - ak * gHat[i]));
            const curLoss = await evalAvgLoss(w);
            if (curLoss < bestLoss) {
                bestLoss = curLoss;
                bestW = w.slice();
            }

            const relImprovement = Math.abs(bestLoss - prevBestLoss) / Math.max(1e-9, prevBestLoss);
            if (relImprovement < CONVERGENCE_RELATIVE) {
                stagnantCount++;
                if (stagnantCount >= STAGNANT_ITERS_TO_CONVERGE) {
                    if (onProgress) onProgress(progressPayload(k + 1, bestLoss, true));
                    break;
                }
            } else {
                stagnantCount = 0;
                prevBestLoss = bestLoss;
            }

            if (onProgress && (k % progressEvery === 0)) {
                onProgress(progressPayload(k + 1, bestLoss));
            }
        }

        return { bestWeights: bestW, bestLoss, iterations: iters };
    } finally {
        pool.terminate();
    }
};
