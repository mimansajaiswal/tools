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
     * Get database info
     */
    getDatabase: async (databaseId) => {
        return API.request('GET', `/databases/${databaseId}`);
    },

    /**
     * Query a database/data source
     */
    queryDatabase: async (dataSourceId, filter = null, sorts = null, startCursor = null) => {
        const body = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (startCursor) body.start_cursor = startCursor;

        return API.request('POST', `/databases/${dataSourceId}/query`, body);
    },

    /**
     * Create a page (record) in a data source
     */
    createPage: async (dataSourceId, properties, children = []) => {
        const body = {
            parent: { database_id: dataSourceId },
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
     * Start Notion OAuth flow
     * Opens popup window for Notion authorization
     */
    startOAuth: () => {
        const settings = PetTracker.Settings.get();
        const { workerUrl, oauthClientId } = settings;

        if (!workerUrl) throw new Error('Worker URL not configured');
        if (!oauthClientId) throw new Error('OAuth Client ID not configured');

        const cleanWorkerUrl = workerUrl.trim().replace(/\/$/, '');
        const redirectUri = `${cleanWorkerUrl}/oauth/callback`;

        const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
        authUrl.searchParams.set('client_id', oauthClientId.trim());
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('owner', 'user');

        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;

        const popup = window.open(
            authUrl.toString(),
            'NotionOAuth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.origin !== new URL(cleanWorkerUrl).origin) return;

                window.removeEventListener('message', handleMessage);

                if (event.data?.type === 'NOTION_OAUTH_SUCCESS') {
                    resolve(event.data.token);
                } else if (event.data?.type === 'NOTION_OAUTH_ERROR') {
                    reject(new Error(event.data.error || 'OAuth failed'));
                }
            };

            window.addEventListener('message', handleMessage);

            const checkClosed = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', handleMessage);
                    reject(new Error('OAuth window closed'));
                }
            }, 500);

            setTimeout(() => {
                clearInterval(checkClosed);
                window.removeEventListener('message', handleMessage);
                if (!popup?.closed) popup?.close();
                reject(new Error('OAuth timeout'));
            }, 300000);
        });
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
    }))
};

// Export
window.PetTracker = window.PetTracker || {};
Object.assign(window.PetTracker, { API, NotionProps, NotionExtract });
