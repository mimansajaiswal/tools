import { fsrsLogLossPreprocessed } from './srs.js';

let payload = null;

self.onmessage = (e) => {
    const msg = e?.data || {};
    if (msg.type === 'init') {
        payload = msg.payload || null;
        self.postMessage({ type: 'ready' });
        return;
    }
    if (msg.type === 'loss') {
        const { id, weights } = msg;
        try {
            const result = fsrsLogLossPreprocessed(payload, weights);
            self.postMessage({ type: 'loss', id, loss: result.loss, n: result.n });
        } catch (err) {
            self.postMessage({ type: 'error', id, error: err?.message || String(err) });
        }
    }
};
