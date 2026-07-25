# Product Requirements

## Product Shape

- Static application deployable to GitHub Pages.
- No required build process for production use.
- Local-first browser storage with readable user-owned cloud exports.
- Primarily single-user; collaboration and concurrent merge behavior are not required.
- PWA-capable and usable offline for local work.

## Journal And Editor

- Notion-like document editor with continuous typing, slash commands, structured blocks, indentation, paste handling, rich text, tables, callouts, toggles, media, and files.
- Multiple journals with journal-specific entries.
- Quick Add component retained as an inline capture path.
- Templates, reminders, favorites, highlights, tags, people, places, custom fields, and categories.
- Reminders support one-time, daily, weekly, monthly, and entry-specific schedules; notification permission, pause/resume/delete, deduplicated delivery, and click-through are required.
- The installed PWA uses browser-managed Periodic Background Sync for reminder checks when available, while explicitly communicating that browser scheduling is not minute-precise or guaranteed.
- Search, saved filters, calendar, timeline, On This Day, map, and import/export ownership.

## Media And Transcription

- Images, audio, video, and file attachments.
- Image optimization with configurable dimensions/quality and an option to preserve originals.
- Audio recording/upload, transcript storage, and insertion into the current document.
- BYOK/custom transcription provider support in addition to browser-native transcription.
- OpenAI, Gemini, Deepgram, custom HTTP, and local-model transcription use explicit provider request contracts and user-supplied credentials/endpoints.
- JSON ownership export embeds local media bytes; import validates and hydrates the complete workspace before one atomic replacement transaction.

## Sync

- Google Drive stores readable Markdown and JSON plus attachment files.
- Google Drive stores a versioned readable library manifest for health logs, saved views, journals, templates, reminders, editor schema, media preferences, and non-secret workspace settings.
- A Drive sync commits every document and attachment before writing the manifest; restore treats the manifest as the authoritative library snapshot.
- Background Drive mode registers a one-off Background Sync tag whenever documents, assets, health logs, or workspace configuration become queued, and commits the same authoritative library snapshot after connectivity returns.
- Failed background delivery must preserve queued jobs and the previous successful timestamp; a successful Drive delivery may complete all Drive-owned jobs while leaving documents queued if Notion still requires them.
- Drive authentication uses user-owned Google OAuth credentials or an access token.
- Notion sync uses the configured worker/token/parent-page integration.
- Notion media larger than 20 MB uses the documented multipart lifecycle with numbered 10 MB parts and explicit completion.
- Local queue status must reflect actual provider success; no false “synced” state.
- Gemini consumption of Drive files is an external benefit, not functionality the app must implement.

## AI And Health

- Local reflection mode, BYOK API, custom endpoint, Chrome Prompt API, and local-model endpoint integration.
- Chrome Prompt API integration uses the current `window.LanguageModel` availability/create/prompt lifecycle and destroys sessions after use.
- Health/symptom/factor/treatment/medication/measurement tracking inspired by Bearable.
- Fitbit daily activity and sleep ingestion uses a user-owned Fitbit Web API access token.
- Google Health Connect and Apple Health require native Android/iOS bridge applications; the static web app must not present either platform as a direct browser API.

## Interface Direction

- Journalistic cleanliness and journaling focus.
- Notion-like editing flow.
- Multiple journals and map/media concepts inspired by Day One.
- Quick Add keeps its component styling.
- The app-owned stylesheet and font imports are removed; Leaflet retains its required dependency CSS.
- Route, rail, and sidebar-section visibility uses semantic application state rather than visual CSS.
- Other styling is owned by the dedicated styling thread.
