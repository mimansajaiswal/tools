/**
 * Media Embedding System
 * Handles image, video, YouTube, and Vimeo embeds with GLightbox integration.
 */

// Supported media file extensions
export const MEDIA_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']);
export const MEDIA_VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);

/**
 * Parse and validate a URL
 * @param {string} raw - Raw URL string
 * @returns {URL|null} Parsed URL or null if invalid
 */
export const safeUrl = (raw) => {
    try {
        const u = new URL(raw);
        if (!['http:', 'https:'].includes(u.protocol)) return null;
        return u;
    } catch (_) {
        return null;
    }
};

/**
 * Strip trailing punctuation from URLs
 * @param {string} s - URL string
 * @returns {string} Cleaned URL
 */
export const stripUrlPunctuation = (s) => {
    return (s || '').replace(/[)\].,!?:;]+$/g, '');
};

/**
 * Detect media type from URL
 * @param {string} rawUrl - Raw URL string
 * @returns {Object|null} Media info object with kind and src, or null if not media
 */
export const getMediaInfo = (rawUrl) => {
    const cleaned = stripUrlPunctuation(rawUrl);
    const u = safeUrl(cleaned);
    if (!u) return null;
    const host = u.hostname.toLowerCase();
    const path = u.pathname || '';
    const ext = (path.split('.').pop() || '').toLowerCase();

    if (MEDIA_IMAGE_EXTS.has(ext)) return { kind: 'image', src: u.toString() };
    if (MEDIA_VIDEO_EXTS.has(ext)) return { kind: 'video', src: u.toString(), ext };

    // YouTube
    if (host === 'youtu.be') {
        const id = path.replace(/^\/+/, '').split('/')[0];
        if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1` };
    }
    if (host.includes('youtube.com')) {
        if (path.startsWith('/watch')) {
            const id = u.searchParams.get('v');
            if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1` };
        }
        if (path.startsWith('/shorts/')) {
            const id = path.split('/').filter(Boolean)[1];
            if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1` };
        }
        if (path.startsWith('/embed/')) {
            const id = path.split('/').filter(Boolean)[1];
            if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1` };
        }
    }

    // Vimeo
    if (host === 'vimeo.com') {
        const id = path.replace(/^\/+/, '').split('/')[0];
        if (id && /^\d+$/.test(id)) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${encodeURIComponent(id)}?dnt=1&title=0&byline=0&portrait=0` };
    }

    return null;
};

// GLightbox instance (initialized lazily)
let lightbox = null;
// Track if lightbox needs refresh after DOM changes
let lightboxNeedsRefresh = false;
// Issue 3 Fix: Track temporary lightbox instances for proper cleanup
let tempLightboxInstances = [];

/**
 * Issue 3 Fix: Cleanup all temporary lightbox instances
 * Should be called when switching cards or cleaning up
 */
export const cleanupTempLightboxes = () => {
    for (const instance of tempLightboxInstances) {
        try {
            instance.destroy();
        } catch (e) {
            // Ignore destroy errors
        }
    }
    tempLightboxInstances = [];
};

/**
 * Initialize or get the GLightbox instance
 * Bug 8 fix: Proper instance management to prevent memory leaks
 * @returns {Object} GLightbox instance
 */
export const initLightbox = () => {
    if (!lightbox && typeof GLightbox !== 'undefined') {
        lightbox = GLightbox({
            selector: '.glightbox',
            touchNavigation: true,
            loop: true,
            autoplayVideos: true,
            zoomable: true,
            draggable: true
        });
    }
    return lightbox;
};

/**
 * Get the current lightbox instance
 * @returns {Object|null} GLightbox instance or null
 */
export const getLightbox = () => lightbox;

/**
 * Destroy and cleanup the lightbox instance
 * Call this when navigating away or before re-initialization
 */
export const destroyLightbox = () => {
    // Issue 3 Fix: Also cleanup temp instances
    cleanupTempLightboxes();

    if (lightbox) {
        try {
            lightbox.destroy();
        } catch (e) {
            console.warn('Error destroying lightbox:', e);
        }
        lightbox = null;
    }
};

/**
 * Bug 8 fix: Safely refresh the lightbox to pick up new elements
 * This avoids creating new instances on each render
 */
export const refreshLightbox = () => {
    if (typeof GLightbox === 'undefined') return;

    // Issue 3 Fix: Cleanup temp instances before refresh
    cleanupTempLightboxes();

    if (lightbox) {
        try {
            lightbox.reload();
        } catch (e) {
            console.warn('Error reloading lightbox, reinitializing:', e);
            destroyLightbox();
            initLightbox();
        }
    } else {
        initLightbox();
    }
};

/**
 * Create a media figure element
 * @param {Document} doc - Document to create elements in
 * @param {Object} mediaInfo - Media info from getMediaInfo
 * @param {string} label - Label/caption for the media
 * @param {string} originalUrl - Original URL for source link
 * @returns {HTMLElement} Figure element
 */
export const createMediaFigure = (doc, { kind, src }, label, originalUrl) => {
    const fig = doc.createElement('figure');
    fig.className = 'media-embed';

    const a = doc.createElement('a');
    a.href = src;
    a.className = 'glightbox';
    a.setAttribute('data-description', label || '');

    if (kind === 'image') {
        const img = doc.createElement('img');
        img.src = src;
        img.alt = (label || 'Image').slice(0, 200);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23917FB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect width="18" height="18" x="3" y="3" rx="2" ry="2"/%3E%3Ccircle cx="9" cy="9" r="2"/%3E%3Cpath d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/%3E%3C/svg%3E';
            img.className += ' opacity-40 p-8 bg-oatmeal';
        };
        a.appendChild(img);
        fig.appendChild(a);
    } else if (kind === 'video') {
        const video = doc.createElement('video');
        video.src = src;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        a.appendChild(video);
        fig.appendChild(a);
    } else if (kind === 'youtube' || kind === 'vimeo') {
        const wrap = doc.createElement('div');
        wrap.className = 'media-embed-frame';
        const iframe = doc.createElement('iframe');
        iframe.src = src;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);

        // Add an expand overlay for video frames
        const expandBtn = doc.createElement('button');
        expandBtn.className = 'absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70';
        expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 3 6 6-3 3-6-6 3-3Z"/><path d="M9 21 3 15l3-3 6 6-3 3Z"/><path d="M21 3v21H0V3h21ZM3 7v14h14V7H3Z"/></svg>';

        // Create handler that properly cleans up temporary lightbox instances
        const expandHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const instance = GLightbox({ elements: [{ href: src, type: 'video', source: kind }] });
            // Auto-destroy on close to prevent memory leaks
            instance.on('close', () => {
                setTimeout(() => {
                    try {
                        instance.destroy();
                    } catch (err) {
                        // Ignore destroy errors
                    }
                }, 100);
            });
            instance.open();
        };
        expandBtn.onclick = expandHandler;

        wrap.classList.add('group');
        wrap.appendChild(expandBtn);
        fig.appendChild(wrap);
    }

    const cap = doc.createElement('figcaption');
    const sourceLink = doc.createElement('a');
    sourceLink.href = originalUrl || src;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.className = 'flex items-center gap-1.5 opacity-80 hover:opacity-100 transition';
    sourceLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg> Source`;
    cap.appendChild(sourceLink);
    fig.appendChild(cap);
    return fig;
};

/**
 * Apply media embeds to a container element
 * @param {HTMLElement} container - Container to process
 */
export const applyMediaEmbeds = (container) => {
    if (!container) return;
    const doc = container.ownerDocument || document;
    const lb = initLightbox();

    // Upgrade raw <img>/<video>/<iframe> styling when users paste HTML.
    container.querySelectorAll('img').forEach(img => {
        img.loading = img.loading || 'lazy';
        img.decoding = img.decoding || 'async';
        img.referrerPolicy = img.referrerPolicy || 'no-referrer';
        if (!img.closest('figure.media-embed')) {
            const fig = doc.createElement('figure');
            fig.className = 'media-embed';
            img.replaceWith(fig);
            fig.appendChild(img);
        }
        if (!img.parentElement.classList.contains('glightbox')) {
            const a = doc.createElement('a');
            a.href = img.src;
            a.className = 'glightbox';
            img.replaceWith(a);
            a.appendChild(img);
        }
    });
    container.querySelectorAll('video').forEach(v => {
        v.controls = true;
        v.playsInline = true;
        v.preload = v.preload || 'metadata';
        if (!v.closest('figure.media-embed')) {
            const fig = doc.createElement('figure');
            fig.className = 'media-embed';
            v.replaceWith(fig);
            fig.appendChild(v);
        }
        if (!v.parentElement.classList.contains('glightbox')) {
            const a = doc.createElement('a');
            a.href = v.src;
            a.className = 'glightbox';
            v.replaceWith(a);
            a.appendChild(v);
        }
    });

    // Replace media links with embeds.
    container.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const info = getMediaInfo(href);
        if (!info) return;
        // Don't nest embeds.
        if (a.closest('figure.media-embed')) return;
        // Don't process glightbox links
        if (a.classList.contains('glightbox')) return;
        const label = (a.textContent || '').trim();
        const fig = createMediaFigure(doc, info, label || href, href);
        a.replaceWith(fig);
    });

    // Embed bare media URLs (not wrapped in markdown links).
    const urlRegex = /https?:\/\/[^\s<>"']+/g;
    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'].includes(tag)) return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue || !node.nodeValue.includes('http')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const toProcess = [];
    while (walker.nextNode()) toProcess.push(walker.currentNode);
    for (const textNode of toProcess) {
        const text = textNode.nodeValue || '';
        urlRegex.lastIndex = 0;
        let match;
        let lastIdx = 0;
        let changed = false;
        const frag = doc.createDocumentFragment();
        while ((match = urlRegex.exec(text)) !== null) {
            const raw = match[0];
            const info = getMediaInfo(raw);
            if (!info) continue;
            const start = match.index;
            const end = match.index + raw.length;
            if (start > lastIdx) frag.appendChild(doc.createTextNode(text.slice(lastIdx, start)));
            const cleaned = stripUrlPunctuation(raw);
            frag.appendChild(createMediaFigure(doc, info, cleaned, cleaned));
            lastIdx = end;
            changed = true;
        }
        if (!changed) continue;
        if (lastIdx < text.length) frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
        textNode.replaceWith(frag);
    }

    // Refresh GLightbox to pick up new elements
    if (lb) lb.reload();
};
