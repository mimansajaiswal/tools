# Functional Status

Updated: 2026-07-12

## Verified In Current Worktree

- Tiptap editor mounts and remains editable on desktop and mobile.
- Explicit `/heading2` slash command creates a Heading 2 block and typing continues in the next block.
- Explicit `/toggle` creates a real nested ProseMirror structure with independently editable summary and child blocks.
- Image attachment through the editor action stores and renders a local asset.
- IndexedDB persists documents, assets, health logs, views, settings, and sync jobs.
- Live Notion worker sync succeeds with the configured integration and current `2026-03-11` API version.
- Local image/audio/video/file blobs up to 20 MB use Notion's native Direct Upload lifecycle and become native media blocks.
- Files larger than 20 MB use Notion multipart upload creation, sequential numbered 10 MB parts, and explicit completion before attachment.
- Repeated Notion sync reuses persisted file-upload IDs, replaces page Markdown with the current typed `replace_content` command, and does not duplicate attachments.
- The toolbar attachment action now inserts the asset into the editor document model as well as the attachment collection.
- PNG image attachment is converted to WebP using configured edge/quality settings while retaining original filename and optimized dimensions.
- Google Drive document sync writes Markdown and JSON.
- Google Drive attachment sync now creates an `Assets` folder and uses resumable uploads for image/audio/video/file blobs.
- Drive file IDs and viewer/download links are persisted on asset records.
- Explicit Drive restore discovers every JSON/Markdown pair, selects the newest snapshot per document ID, downloads authenticated attachment blobs, and replaces local document/asset stores only after complete validation.
- Restored Drive documents and inline images persist through a full browser reload from IndexedDB.
- Drive sync now uploads every document and attachment, emits only durable Drive media links in Markdown, and writes `journaling-library.json` last as the authoritative commit record.
- The library manifest restores health logs, saved views, journals, templates, reminders, editor schema, media preferences, and non-secret AI/health settings while preserving local credentials and API keys.
- Restore ignores stale Drive page files absent from the manifest and refuses incomplete snapshots that declare missing documents.
- Documents, health logs, assets, views, and queued jobs are replaced in one IndexedDB transaction.
- Manual and background Drive delivery now share one worker-safe snapshot orchestrator and Markdown serializer.
- Document, asset, health, reminder, journal, template, custom-field, saved-search, and settings changes register one coalesced `journaling-drive-sync` tag when background mode is enabled.
- The module service worker processes a real one-off `sync` event, uploads the complete library, commits the manifest last, persists results transactionally, and reports completion/error to open clients.
- Failed worker delivery leaves jobs queued and does not advance `lastPushAt`; successful delivery completes Drive-owned jobs while retaining documents still awaiting Notion.
- A document queue item is marked synced only after all enabled providers succeed.
- Attachment queue items are marked synced only after Drive actually uploads the files.
- Private Drive links are not emitted as broken Notion media embeds; Notion receives an attachment reference unless a public URL exists.
- Quick Add component JavaScript and its component stylesheet remain linked.
- The app-owned stylesheet and Google font imports are removed; Leaflet dependency CSS remains for map function.
- Routes, left/right rails, and each sidebar section use native `hidden` state, preserving navigation and collapse behavior without app styling.
- One-time, daily, weekly, monthly, and document-specific reminder occurrences use one shared deterministic scheduler.
- Notification permission, foreground checks, browser-managed Periodic Background Sync registration, pause/resume/delete, persisted deduplication, and entry/journal click-through are implemented.
- The service worker skips reminder delivery while a visible client is active, preventing foreground/background duplicate notifications.
- Fitbit daily import reads activity and v1.2 sleep data, upserts deterministic measurement IDs, persists the credential locally after success, and queues imported measurements when Drive is enabled.
- The readable Drive workspace manifest includes Fitbit connection state and last-import time but excludes the Fitbit access token.
- Uploaded and recorded audio is stored as a queued local asset, inserted as an editor audio block, and linked to its transcript artifact.
- OpenAI, Gemini, Deepgram, custom multipart, and local-model endpoint transcription request paths are implemented; custom endpoint upload/insertion/reload is browser-tested.
- Transcript insertion is awaited and persists as body text, a nested editable toggle, or transcript metadata only.
- JSON export embeds Blob media as data URLs; import validates every collection and media payload before atomically replacing all workspace stores.
- Malformed JSON import reports failure without changing the current library.
- Chrome Prompt API uses the current `window.LanguageModel` contract with availability checks, initial system context, direct prompting, and session destruction.
- BYOK and local-model chat endpoints share the configured JSON chat contract; local endpoints may omit authentication while BYOK requires a key.

## Automated Evidence

- `node journaling-app/tests/drive-sync-unit.mjs` passes.
- `node journaling-app/tests/drive-restore-unit.mjs` passes discovery, newest-snapshot selection, Markdown pairing, and blob hydration checks.
- `node journaling-app/tests/drive-restore-e2e.mjs` passes full browser restore and reload-persistence checks against an intercepted Drive API.
- `node journaling-app/tests/drive-library-sync-e2e.mjs` passes four-page/one-image upload, manifest commit ordering, durable Markdown media, document JSON metadata, and secret-exclusion checks.
- `node journaling-app/tests/drive-background-sync-e2e.mjs` passes offline editing, tag registration, real CDP-dispatched service-worker sync, worker-originated uploads, transactional queue completion, and expired-token failure invariants.
- `node journaling-app/tests/notion-markdown-unit.mjs` passes.
- `node journaling-app/tests/notion-media-unit.mjs` passes create/send/attach and typed page-replacement request checks.
- `node journaling-app/tests/reminders-unit.mjs` passes recurrence, eligibility windows, document reminders, and deduplication checks.
- `node journaling-app/tests/settings-unit.mjs` passes explicit-empty collection ownership and provider-disable normalization checks.
- `node journaling-app/tests/fitbit-sync-unit.mjs` passes metric conversion, endpoint/authentication, and Drive secret-exclusion checks.
- `node journaling-app/tests/fitbit-sync-e2e.mjs` passes visible settings/sidebar navigation, Fitbit API requests, ten-metric persistence/rendering, and Drive queue checks.
- `node journaling-app/tests/transcription-service-unit.mjs` passes OpenAI, Gemini, Deepgram, and custom/local endpoint request contracts.
- `node journaling-app/tests/transcription-e2e.mjs` passes settings, multipart upload, audio asset/block insertion, transcript metadata, nested toggle editing, sync queueing, and reload persistence.
- `node journaling-app/tests/import-export-e2e.mjs` passes embedded-audio import/export, full-store replacement, reload persistence, and malformed-import preservation.
- `node journaling-app/tests/ai-providers-e2e.mjs` passes current Chrome Prompt API lifecycle, BYOK authorization/body parsing, response rendering, and persisted two-provider history.
- `node journaling-app/tests/reminders-e2e.mjs` passes create/pause/resume/delete, permission enablement, document delivery, deduplication, click-through, ledger persistence, and disablement checks.
- `node journaling-app/tests/strict-e2e.mjs` passes editor, slash-command, inline media, live Notion create/update sync, upload-ID reuse, direct Notion block inspection, desktop, and mobile functional checks.
- Syntax checks pass for the app, editor, Drive sync, Notion sync, service worker, and test modules.

## Known Incomplete Or Separately Owned Work

- Visual styling and visual-audit acceptance are intentionally owned by the separate styling thread; this worktree currently has no app-owned stylesheet.
- Live Google OAuth/Drive upload still requires a valid client ID or access token from the user’s Google Cloud project.
- Live multipart Notion upload against a paid workspace is not exercised with a file larger than 20 MB; the lifecycle is covered by the mocked request-contract test.
- Live OpenAI, Gemini, Deepgram, custom, and local-model transcription require user credentials/endpoints; provider contracts and custom endpoint browser behavior are tested without spending user API quota.
- Google Health Connect and Apple Health ingestion require native bridge applications and are not implemented in this static repository.
- Periodic reminder execution remains browser-managed: supported browsers decide when or whether a periodic event fires based on installation, permission, engagement, network, and power conditions. Foreground checks are deterministic while the app is open.
- Background Drive delivery requires a still-valid stored Google access token. When it expires, the queue remains pending until the user reconnects; refreshing Google credentials without user interaction requires a user-owned token worker.

## Removed Defect

The obsolete `google-sync.js` adapter was a disabled stub that maintained a second, misleading sync state. It has been removed; the persisted sync queue and real Notion/Drive modules are now authoritative.
