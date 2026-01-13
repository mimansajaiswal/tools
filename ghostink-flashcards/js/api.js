/**
 * GhostInk Flashcards - API Module
 * Notion API integration via Cloudflare Worker proxy.
 */

import { Storage } from './storage.js';

export const API = {
    // Phase 2: API error context enhancement
    async request(method, endpoint, body = null, override = null) {
        const { workerUrl, authToken, proxyToken } = override || Storage.getSettings();
        if (!workerUrl || !authToken) throw new Error('Missing worker URL or Notion token');
        const cleanWorker = workerUrl.trim().replace(/\/$/, '');
        const fetchUrl = new URL(cleanWorker);
        fetchUrl.searchParams.append('url', `https://api.notion.com/v1${endpoint}`);
        if (proxyToken) fetchUrl.searchParams.append('token', proxyToken.trim());
        const headers = { 'Authorization': `Bearer ${authToken.trim()}`, 'Notion-Version': '2025-09-03' };
        let payload = body;
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }
        const res = await fetch(fetchUrl.toString(), { method, headers, body: payload });
        if (!res.ok) {
            let txt = await res.text();
            try {
                const j = JSON.parse(txt);
                txt = j.message || txt;
            } catch (_) { }
            const error = new Error(`[${method} ${endpoint}] ${txt || `Request failed ${res.status}`}`);
            error.status = res.status;
            error.endpoint = endpoint;
            error.method = method;
            throw error;
        }
        return await res.json();
    },

    // Phase 13: Exponential backoff for API
    async requestWithRetry(method, endpoint, body = null, override = null, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.request(method, endpoint, body, override);
            } catch (e) {
                lastError = e;
                // Retry on rate limit (429) or server errors (5xx)
                if (e.status === 429 || (e.status >= 500 && e.status < 600)) {
                    const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
                    console.warn(`API request failed (${e.status}), retrying in ${delay}ms...`, e.message);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw e;  // Don't retry client errors (4xx except 429)
                }
            }
        }
        throw lastError;
    },

    async listDatabases() {
        const results = [];
        let cursor = null;
        let hasMore = true;
        while (hasMore) {
            const body = { filter: { value: 'data_source', property: 'object' } };
            if (cursor) body.start_cursor = cursor;
            const res = await API.request('POST', '/search', body);
            results.push(...res.results);
            hasMore = res.has_more;
            cursor = res.next_cursor;
        }
        return results;
    },

    async queryDatabase(dbId, filter = null) {
        const rows = [];
        let cursor = null;
        let hasMore = true;
        while (hasMore) {
            const body = { page_size: 100 }; // Notion max page size
            if (cursor) body.start_cursor = cursor;
            if (filter) {
                body.filter = filter;
            }
            const res = await API.requestWithRetry('POST', `/data_sources/${dbId}/query`, body);
            rows.push(...res.results);
            hasMore = res.has_more;
            cursor = res.next_cursor;
        }
        return rows;
    },

    async getDatabase(dbId) {
        return API.request('GET', `/data_sources/${dbId}`);
    },

    async createPage(dbId, properties) {
        return API.requestWithRetry('POST', '/pages', { parent: { type: 'data_source_id', data_source_id: dbId }, properties });
    },

    async updatePage(pageId, properties) {
        return API.requestWithRetry('PATCH', `/pages/${pageId}`, { properties });
    },

    async archivePage(pageId) {
        return API.requestWithRetry('PATCH', `/pages/${pageId}`, { archived: true });
    },

    async appendBlocks(pageId, children) {
        return API.requestWithRetry('PATCH', `/blocks/${pageId}/children`, { children });
    }
};
