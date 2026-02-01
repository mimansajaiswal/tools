/**
 * Pet Tracker - Notion API Layer
 * All calls go through Cloudflare Worker proxy
 */

const API = {
    /**
     * Make a request to Notion API via proxy
     */
    request: async (method, endpoint, body = null) => {
        const settings = PetTracker.Settings.get();
        const { workerUrl, proxyToken, notionToken } = settings;

        if (!workerUrl) throw new Error('Worker URL not configured');
        if (!notionToken) throw new Error('Notion token not configured');

        const cleanWorkerUrl = workerUrl.trim().replace(/\/$/, '');
        const target = `https://api.notion.com/v1${endpoint}`;

        const fetchUrl = new URL(cleanWorkerUrl);
        fetchUrl.searchParams.append('url', target);
        if (proxyToken) fetchUrl.searchParams.append('token', proxyToken.trim());

        const headers = {
            'Authorization': `Bearer ${notionToken.trim()}`,
            'Notion-Version': '2025-09-03'
        };

        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            body = body ? JSON.stringify(body) : null;
        }

        const res = await fetch(fetchUrl.toString(), { method, headers, body });

        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10);
            throw { isRateLimit: true, retryAfter, message: `Rate limited. Retry after ${retryAfter}s` };
        }

        if (!res.ok) {
            const txt = await res.text();
            let errorMsg = `API Error ${res.status}`;
            try {
                const json = JSON.parse(txt);
                errorMsg = json.message || json.error?.message || errorMsg;
            } catch (e) {
                if (txt.length < 100) errorMsg += `: ${txt}`;
            }
            throw new Error(errorMsg);
        }

        return res.json();
    },

    /**
     * Verify connection to Notion
     */
    verifyConnection: async () => {
        return API.request('GET', '/users/me');
    },

    /**
     * Get data source info (2025-09-03 API)
     */
    getDataSource: async (dataSourceId) => {
        return API.request('GET', `/data_sources/${dataSourceId}`);
    },

    /**
     * Query a data source (2025-09-03 API)
     */
    queryDatabase: async (dataSourceId, filter = null, sorts = null, startCursor = null) => {
        const body = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (startCursor) body.start_cursor = startCursor;

        return API.request('POST', `/data_sources/${dataSourceId}/query`, body);
    },

    /**
     * Create a page (record) in a data source (2025-09-03 API)
     */
    createPage: async (dataSourceId, properties, children = []) => {
        const body = {
            parent: { type: 'data_source_id', data_source_id: dataSourceId },
            properties
        };
        if (children.length > 0) body.children = children;

        return API.request('POST', '/pages', body);
    },

    /**
     * Update a page
     */
    updatePage: async (pageId, properties) => {
        return API.request('PATCH', `/pages/${pageId}`, { properties });
    },

    /**
     * Archive (soft delete) a page
     */
    archivePage: async (pageId) => {
        return API.request('PATCH', `/pages/${pageId}`, { archived: true });
    },

    /**
     * Get a page by ID
     */
    getPage: async (pageId) => {
        return API.request('GET', `/pages/${pageId}`);
    },

    /**
     * Upload file to Notion (get upload URL)
     */
    getFileUploadUrl: async (fileName, contentType) => {
        return API.request('POST', '/files', {
            file_name: fileName,
            content_type: contentType
        });
    },

    /**
     * Rate-limited request with retry
     */
    requestWithRetry: async (method, endpoint, body = null, maxRetries = 3) => {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await API.request(method, endpoint, body);
            } catch (e) {
                lastError = e;
                if (e.isRateLimit) {
                    const delay = (e.retryAfter || 1) * 1000 * Math.pow(2, i);
                    console.log(`[API] Rate limited, waiting ${delay}ms before retry ${i + 1}/${maxRetries}`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw e;
                }
            }
        }
        throw lastError;
    },

    /**
     * Search for pages or databases
     */
    search: async (query = '', filter = null) => {
        const body = {
            query,
            sort: { direction: 'descending', timestamp: 'last_edited_time' }
        };
        if (filter) body.filter = filter;
        return API.request('POST', '/search', body);
    },

    /**
     * List all databases/data sources with pagination (like ghostink)
     */
    listDatabases: async () => {
        const results = [];
        let cursor = null;
        let hasMore = true;
        while (hasMore) {
            const body = { filter: { value: 'data_source', property: 'object' } };
            if (cursor) body.start_cursor = cursor;
            const res = await API.requestWithRetry('POST', '/search', body);
            results.push(...(res.results || []));
            hasMore = res.has_more;
            cursor = res.next_cursor;
        }
        return results;
    },

    /**
     * OAuth: Start flow (returns token if successful via popup)
     */
    startOAuth: async () => {
        return new Promise((resolve, reject) => {
            const settings = PetTracker.Settings.get();
            if (!settings.workerUrl || !settings.oauthClientId) {
                reject(new Error('Worker URL and Client ID required'));
                return;
            }

            const state = settings.oauthClientId; // Pass client ID as state for the worker to use
            const redirectUri = new URL('oauth/callback', settings.workerUrl).toString(); // Worker handles callback
            const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${settings.oauthClientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

            // We use the centralized handler in practice, but if using the worker directly:
            // window.open(authUrl, 'NotionAuth', 'width=600,height=600');

            // Using the centralized handler approach from index.html:
            const returnUrl = encodeURIComponent(window.location.href);
            const handlerUrl = `https://notion-oauth-handler.mimansa-jaiswal.workers.dev/notion/auth?from=${returnUrl}`;

            // For Onboarding, we can use a popup or redirect. Popup is better for preserving state.
            const width = 600;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(
                handlerUrl,
                'NotionAuth',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
            );

            if (!popup) {
                reject(new Error('Popup blocked. Please allow popups.'));
                return;
            }

            const messageHandler = (event) => {
                if (event.data?.type === 'NOTION_OAUTH_SUCCESS') {
                    window.removeEventListener('message', messageHandler);
                    resolve(event.data.token);
                } else if (event.data?.type === 'NOTION_OAUTH_ERROR') {
                    window.removeEventListener('message', messageHandler);
                    reject(new Error(event.data.error));
                }
            };

            window.addEventListener('message', messageHandler);
        });
    },

    /**
     * Build OAuth return URL for centralized handler
     * The centralized OAuth handler at notion-oauth-handler.mimansa-jaiswal.workers.dev
     * uses a 'from' parameter to redirect back to the correct app after auth
     */
    getOAuthReturnUrl: () => {
        return new URL('index.html', window.location.href).toString();
    }
};

/**
 * Property builders for Notion API
 */
const NotionProps = {
    title: (text) => ({
        title: [{ type: 'text', text: { content: text || '' } }]
    }),

    richText: (text) => ({
        rich_text: [{ type: 'text', text: { content: text || '' } }]
    }),

    number: (num) => ({
        number: num === null || num === undefined ? null : Number(num)
    }),

    select: (name) => ({
        select: name ? { name } : null
    }),

    multiSelect: (names) => ({
        multi_select: (names || []).map(name => ({ name }))
    }),

    date: (start, end = null) => ({
        date: start ? { start, end } : null
    }),

    checkbox: (checked) => ({
        checkbox: !!checked
    }),

    relation: (ids) => ({
        relation: (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(id => ({ id }))
    }),

    url: (url) => ({
        url: url || null
    }),

    email: (email) => ({
        email: email || null
    }),

    phone: (phone) => ({
        phone_number: phone || null
    }),

    files: (files) => ({
        files: (files || []).map(f => ({
            type: 'external',
            name: f.name || 'file',
            external: { url: f.url }
        }))
    })
};

/**
 * Property extractors from Notion API response
 */
const NotionExtract = {
    title: (prop) => prop?.title?.[0]?.plain_text || '',
    richText: (prop) => prop?.rich_text?.[0]?.plain_text || '',
    number: (prop) => prop?.number ?? null,
    select: (prop) => prop?.select?.name || null,
    multiSelect: (prop) => (prop?.multi_select || []).map(s => s.name),
    date: (prop) => prop?.date?.start || null,
    dateEnd: (prop) => prop?.date?.end || null,
    checkbox: (prop) => !!prop?.checkbox,
    relation: (prop) => (prop?.relation || []).map(r => r.id),
    url: (prop) => prop?.url || null,
    email: (prop) => prop?.email || null,
    phone: (prop) => prop?.phone_number || null,
    files: (prop) => (prop?.files || []).map(f => ({
        name: f.name,
        url: f.file?.url || f.external?.url || ''
    })),
    // Extract page icon (emoji or external URL)
    icon: (page) => {
        if (!page?.icon) return null;
        if (page.icon.type === 'emoji') {
            return { type: 'emoji', emoji: page.icon.emoji };
        }
        if (page.icon.type === 'external') {
            return { type: 'external', url: page.icon.external?.url };
        }
        if (page.icon.type === 'file') {
            return { type: 'file', url: page.icon.file?.url };
        }
        return null;
    }
};

// Export
window.PetTracker = window.PetTracker || {};
Object.assign(window.PetTracker, { API, NotionProps, NotionExtract });
