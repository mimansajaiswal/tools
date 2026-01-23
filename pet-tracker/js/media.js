/**
 * Pet Tracker - Media Pipeline
 * Camera capture, file upload, WebP conversion, and IndexedDB caching
 */

const Media = {
    // Quality settings per spec
    UPLOAD_QUALITY: 0.8,
    PREVIEW_QUALITY: 0.5,
    MAX_UPLOAD_DIMENSION: 2560,
    MAX_PREVIEW_DIMENSION: 1280,

    /**
     * Process an image file for upload
     * Returns: { upload: Blob, preview: Blob, originalName: string }
     */
    processImage: async (file) => {
        const img = await Media.loadImage(file);

        // Create upload version (webp, quality 0.8, max 2560px)
        const uploadBlob = await Media.resizeAndConvert(
            img,
            Media.MAX_UPLOAD_DIMENSION,
            Media.UPLOAD_QUALITY
        );

        // Create preview version (webp, quality 0.5, max 1280px)
        const previewBlob = await Media.resizeAndConvert(
            img,
            Media.MAX_PREVIEW_DIMENSION,
            Media.PREVIEW_QUALITY
        );

        return {
            upload: uploadBlob,
            preview: previewBlob,
            originalName: file.name,
            originalType: file.type,
            originalSize: file.size,
            uploadSize: uploadBlob.size,
            previewSize: previewBlob.size
        };
    },

    /**
     * Load an image file into an HTMLImageElement
     */
    loadImage: (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Resize and convert image to WebP
     */
    resizeAndConvert: async (img, maxDimension, quality) => {
        let { width, height } = img;

        // Scale down if needed
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height / width) * maxDimension);
                width = maxDimension;
            } else {
                width = Math.round((width / height) * maxDimension);
                height = maxDimension;
            }
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/webp', quality);
        });
    },

    /**
     * Process a video file (just extract poster frame)
     */
    processVideo: async (file) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        return new Promise((resolve, reject) => {
            video.onloadeddata = async () => {
                // Seek to 1 second or midpoint
                video.currentTime = Math.min(1, video.duration / 2);
            };

            video.onseeked = async () => {
                // Capture poster frame
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(video.videoWidth, Media.MAX_PREVIEW_DIMENSION);
                canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const posterBlob = await new Promise(r =>
                    canvas.toBlob(r, 'image/webp', Media.PREVIEW_QUALITY)
                );

                URL.revokeObjectURL(video.src);

                resolve({
                    poster: posterBlob,
                    originalName: file.name,
                    originalType: file.type,
                    originalSize: file.size,
                    duration: video.duration
                });
            };

            video.onerror = reject;
            video.src = URL.createObjectURL(file);
        });
    },

    /**
     * Check if file size is within Notion limits
     */
    checkFileSize: (file, isPaidPlan = false) => {
        const limitMb = isPaidPlan ? 20 : 5;
        const limitBytes = limitMb * 1024 * 1024;

        return {
            ok: file.size <= limitBytes,
            size: file.size,
            limit: limitBytes,
            limitMb,
            exceededBy: Math.max(0, file.size - limitBytes)
        };
    },

    /**
     * Store media in IndexedDB with metadata
     */
    storeLocal: async (id, blob, metadata = {}) => {
        try {
            await PetTracker.MediaStore.set(id, blob);
            console.log(`[Media] Stored ${id} (${Math.round(blob.size / 1024)}KB)`);
            return true;
        } catch (e) {
            if (e.isQuotaExceeded) {
                console.warn('[Media] Storage quota exceeded, evicting old media');
                await PetTracker.MediaStore.evictIfNeeded(blob.size);
                return Media.storeLocal(id, blob, metadata);
            }
            throw e;
        }
    },

    /**
     * Get media from local cache
     */
    getLocal: async (id) => {
        const blob = await PetTracker.MediaStore.get(id);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    },

    /**
     * Create placeholder for evicted media
     */
    createPlaceholder: () => {
        const svg = `
            <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#d4c8b8"/>
                <text x="50%" y="40%" text-anchor="middle" fill="#6b6357" font-family="JetBrains Mono, monospace" font-size="10">
                    MEDIA NOT STORED LOCALLY
                </text>
                <text x="50%" y="55%" text-anchor="middle" fill="#6b6357" font-family="JetBrains Mono, monospace" font-size="8">
                    due to space constraints
                </text>
            </svg>
        `;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },

    /**
     * Open camera for capture
     */
    openCamera: async (type = 'image') => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = type === 'video' ? 'video/*' : 'image/*';
            input.capture = 'environment';

            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('No file selected'));
                }
            };

            input.click();
        });
    },

    /**
     * Open file picker
     */
    openFilePicker: async (accept = 'image/*,video/*', multiple = true) => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = multiple;

            input.onchange = (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                    resolve(files);
                } else {
                    reject(new Error('No files selected'));
                }
            };

            input.click();
        });
    },

    /**
     * Process multiple files and return processed results
     */
    processFiles: async (files, onProgress = null) => {
        const results = [];
        let processed = 0;

        for (const file of files) {
            try {
                let result;
                if (file.type.startsWith('image/')) {
                    result = await Media.processImage(file);
                    result.type = 'image';
                } else if (file.type.startsWith('video/')) {
                    result = await Media.processVideo(file);
                    result.type = 'video';
                    // Warn about large videos
                    if (file.size > 50 * 1024 * 1024) {
                        result.warning = 'Video is large. Consider trimming before upload.';
                    }
                } else {
                    result = {
                        type: 'other',
                        originalName: file.name,
                        originalSize: file.size,
                        file
                    };
                }

                results.push(result);
                processed++;

                if (onProgress) {
                    onProgress(processed, files.length);
                }
            } catch (e) {
                console.error(`[Media] Error processing ${file.name}:`, e);
                results.push({
                    error: e.message,
                    originalName: file.name
                });
            }
        }

        return results;
    },

    /**
     * Upload to Notion (via proxy)
     */
    uploadToNotion: async (blob, filename) => {
        const settings = PetTracker.Settings.get();

        // Check size limit
        const isPaid = settings.uploadCapMb > 5;
        const check = Media.checkFileSize(blob, isPaid);

        if (!check.ok) {
            throw new Error(`File exceeds ${check.limitMb}MB limit`);
        }

        // Get upload URL from Notion
        const uploadInfo = await PetTracker.API.getFileUploadUrl(filename, blob.type);

        if (!uploadInfo.upload_url) {
            throw new Error('Failed to get upload URL');
        }

        // Upload to the provided URL (this goes directly to S3, not through proxy)
        const uploadRes = await fetch(uploadInfo.upload_url, {
            method: 'PUT',
            headers: {
                'Content-Type': blob.type
            },
            body: blob
        });

        if (!uploadRes.ok) {
            throw new Error('Upload failed');
        }

        return {
            url: uploadInfo.url,
            expiresAt: uploadInfo.expiry_time
        };
    },

    /**
     * Generate a unique media ID
     */
    generateId: () => {
        return `media_${PetTracker.generateId()}`;
    },

    /**
     * Create a thumbnail preview URL from a File object
     * Returns object URL for images, poster frame for videos
     */
    createThumbnailPreview: async (file) => {
        if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file);
        } else if (file.type.startsWith('video/')) {
            try {
                const result = await Media.processVideo(file);
                if (result.poster) {
                    return URL.createObjectURL(result.poster);
                }
            } catch (e) {
                console.warn('[Media] Failed to create video thumbnail:', e);
            }
            return null;
        }
        return null;
    },

    /**
     * Process and store media from File objects (handles share target files)
     * Returns array of { id, type, previewUrl, ... }
     */
    processAndStoreMedia: async (files, onProgress = null) => {
        const results = [];
        let processed = 0;

        for (const file of files) {
            try {
                const id = Media.generateId();
                let result;

                if (file.type.startsWith('image/')) {
                    const processed = await Media.processImage(file);
                    await Media.storeLocal(`${id}_upload`, processed.upload);
                    await Media.storeLocal(`${id}_preview`, processed.preview);
                    result = {
                        id,
                        type: 'image',
                        previewUrl: URL.createObjectURL(processed.preview),
                        originalName: file.name,
                        uploadSize: processed.uploadSize
                    };
                } else if (file.type.startsWith('video/')) {
                    const processed = await Media.processVideo(file);
                    await Media.storeLocal(`${id}_poster`, processed.poster);
                    result = {
                        id,
                        type: 'video',
                        previewUrl: URL.createObjectURL(processed.poster),
                        originalName: file.name,
                        duration: processed.duration,
                        warning: file.size > 50 * 1024 * 1024 ? 'Video is large. Consider trimming before upload.' : null
                    };
                } else {
                    result = {
                        id,
                        type: 'other',
                        originalName: file.name,
                        originalSize: file.size
                    };
                }

                results.push(result);
                processed++;

                if (onProgress) {
                    onProgress(processed, files.length);
                }
            } catch (e) {
                console.error(`[Media] Error processing ${file.name}:`, e);
                results.push({
                    error: e.message,
                    originalName: file.name
                });
            }
        }

        return results;
    },

    /**
     * Revoke object URLs to free memory
     */
    revokePreviewUrls: (urls) => {
        urls.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
};

// Export
window.PetTracker = window.PetTracker || {};
window.PetTracker.Media = Media;
window.Media = Media;
