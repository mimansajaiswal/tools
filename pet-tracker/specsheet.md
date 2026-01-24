# Pet Tracker Spec Sheet (Client-Only PWA + Notion + AI Auto-Entry)
Version: 1.2

## 1) Product Vision and Goals
This product is a client-only, offline-first pet tracker that uses Notion as the sole backend. It must support multiple pets, flexible tracking styles, and rich analytics without requiring a server-side database. The app should feel fast, minimal, and configurable, while enabling structured data for reminders, correlations, and health insights. The system must run entirely in the browser, remain usable offline, and sync reliably when online. All Notion and Todoist calls must pass through a Cloudflare Worker proxy for CORS and OAuth handling.

## 2) Scope (What This App Does)
- Tracks pet health and routines: symptoms, meds, vaccines, vet visits, habits, activities, and weight.
- Supports event logging via manual entry, calendar stamping, share-sheet import, and AI-based extraction.
- Supports custom severity scales and labels, per event type.
- Provides upcoming schedule view and reminders based on care plans.
- Provides analytics and correlations (calendar overlays, trends, and impact windows).
- Supports two-way Todoist task sync for selected care plans.

## 3) Non-Negotiable Requirements (From User)
- Client-only PWA, installable, responsive for mobile, tablet, and desktop.
- Offline-first with IndexedDB caching and a sync queue.
- Notion is the only backend; single database container with multiple data sources.
- Notion auth: OAuth and manual secret token are both supported.
- Cloudflare Worker proxy required for all Notion/Todoist calls.
- Global Add button visible on all device sizes (not necessarily floating).
- Any Event Type can be Stamp or Timed; long-press adds notes + attachments on any event type.
- Share-sheet intake for image/video opens the same Add modal.
- Add modal supports camera capture and file upload from device.
- Media pipeline: upload webp quality ~0.8; IndexedDB preview webp quality ~0.5; never 0.25.
- Upcoming view filterable by category (habit/med/vet/vaccine/etc.).
- Todoist integration is two-way, with per-item sync and per-project selection.
- Weight tracking is first-class with trends and goals.
- AI auto-entry is BYOK; provider/model/key selectable by user.
- AI extraction must parse multiple entries and allow edit-before-save.

## 4) Architecture Overview
- Frontend: single-page app (HTML/CSS/JS), PWA installable.
- Local storage: IndexedDB as source of truth; includes records, sync queue, media previews.
- Backend: Notion as sole data source.
- Proxy: Cloudflare Worker handles CORS and OAuth code exchange for Notion and Todoist.
- Sync: push local queue, then pull Notion updates, then reconcile conflicts.

## 5) Notion Database Container and Data Sources
One Notion database container named `Pet Tracker` with multiple data sources. All property names below are exact and case-sensitive.

### 5.0 Notion API Constraints
- Use API version header: `Notion-Version: 2025-09-03`
- Store and use `data_source_id` for all queries and creates in multi-data-source containers.
- Linked database views are NOT supported by the API; each data source must be shared with the integration.
- If a data source is not shared, queries return 404.
- Use `filter_properties` parameter to reduce payload size and improve performance.
- Rate limit: ~3 requests/second average; handle 429 with `Retry-After` header and exponential backoff.

### 5.1 Data Source: Pets
- Name (Title) [required]
- Species (Select: Dog, Cat, Bird, Fish, Rabbit, Reptile, Hamster, Guinea Pig, Other) [presets; user can add custom]
- Breed (Text)
- Sex (Select: Male, Female, Unknown)
- Birth Date (Date)
- Adoption Date (Date)
- Status (Select: Active, Inactive, Deceased)
- Microchip ID (Text)
- Photo (Files)
- Tags (Multi-select)
- Notes (Rich text)
- Primary Vet (Relation -> Contacts)
- Related Contacts (Relation -> Contacts) [multi]
- Target Weight Min (Number)
- Target Weight Max (Number)
- Weight Unit (Select: lb, kg)
- Color (Text) [hex color for calendar display, user-selectable]
- Icon (Files) [optional; user-uploaded custom icon]
- Is Primary (Checkbox) [for AI auto-entry default when pet is ambiguous]

### 5.2 Data Source: Events (Single Timeline)
- Title (Title) [required]
- Pet(s) (Relation -> Pets) [required, multi]
- Event Type (Relation -> Event Types) [required]
- Care Item (Relation -> Care Items) [optional]
- Start Date (Date) [required; date-only for stamp, datetime for timed]
- End Date (Date) [optional; for range/timed events]
- Status (Select: Planned, Completed, Missed)
- Severity Level (Relation -> Scale Levels) [optional]
- Value (Number) [optional]
- Unit (Select) [optional]
- Duration (Number) [optional; minutes, for computed display]
- Notes (Rich text)
- Media (Files)
- Tags (Multi-select)
- Source (Select: Manual, Scheduled, Share, AI)
- Provider (Relation -> Contacts) [optional; vet/groomer for this event]
- Cost (Number) [optional; event-related costs only]
- Cost Category (Select: Medical, Vet Visit, Grooming, Boarding, Sitting, Other) [optional; user can add custom]
- Cost Currency (Select: USD, EUR, GBP, INR, CAD, AUD, Other) [optional]
- Todoist Task ID (Text)
- Client Updated At (Date) [for sync conflict detection]

### 5.3 Data Source: Event Types
- Name (Title) [required]
- Category (Select: Habit, Medication, Vaccine, Vet Visit, Symptom, Activity, Weight, Other)
- Tracking Mode (Select: Stamp, Timed, Range)
- Uses Severity (Checkbox) [whether severity scale applies]
- Default Scale (Relation -> Scales)
- Default Color (Select)
- Default Icon (Text)
- Default Tags (Multi-select)
- Allow Attachments (Checkbox)
- Default Value Kind (Select: None, Weight, Dose, Duration, Severity, Other)
- Default Unit (Select)
- Correlation Group (Select) [for analytics grouping, e.g., "Meds", "Symptoms"]

### 5.4 Data Source: Scales
- Name (Title) [required]
- Value Type (Select: Labels, Numeric)
- Unit (Text)
- Notes (Rich text)

### 5.5 Data Source: Scale Levels
- Name (Title) [required]
- Scale (Relation -> Scales) [required]
- Order (Number) [required]
- Color (Select)
- Numeric Value (Number)
- Description (Rich text)

### 5.6 Data Source: Care Items
- Name (Title) [required]
- Type (Select: Medication, Vaccine, Habit, Procedure, Condition)
- Default Dose (Text)
- Default Unit (Select)
- Default Route (Select)
- Linked Event Type (Relation -> Event Types)
- Related Pets (Relation -> Pets) [multi]
- Related Events (Relation -> Events) [multi; for history]
- Active Start (Date) [optional]
- Active End (Date) [optional]
- Notes (Rich text)
- Files (Files)
- Active (Checkbox)

### 5.7 Data Source: Care Plans
- Name (Title) [required]
- Pet(s) (Relation -> Pets)
- Care Item (Relation -> Care Items)
- Event Type (Relation -> Event Types)
- Schedule Type (Select: Fixed, Rolling, One-off)
- Interval Value (Number)
- Interval Unit (Select: Days, Weeks, Months, Years)
- Anchor Date (Date)
- Due Time (Text) [optional; HH:mm format]
- Time of Day Preference (Select: Morning, Afternoon, Evening, Night, Any)
- Window Before (Number) [days]
- Window After (Number) [days]
- End Date (Date) [optional; schedule ends]
- End After Occurrences (Number) [optional; schedule ends after N times]
- Timezone (Text) [IANA timezone, e.g., America/New_York]
- Next Due (Date) [computed or stored]
- Upcoming Category (Select: Habit, Medication, Vaccine, Vet Visit, Other)
- Todoist Sync (Checkbox)
- Todoist Project (Text)
- Todoist Labels (Text)
- Todoist Lead Time (Number) [days before due to create task]
- Notes (Rich text)

### 5.8 Data Source: Contacts
- Name (Title) [required]
- Role (Select: Vet, Groomer, Sitter, Breeder, Emergency, Other)
- Phone (Text)
- Email (Text)
- Address (Text)
- Notes (Rich text)
- Related Pets (Relation -> Pets)

### 5.9 Custom Fields / Mapping
- Users may add extra properties.
- App supports a mapping mode: unknown fields can be mapped into custom UI fields.
- Unknown fields are ignored unless mapped.

### 5.10 Storage Isolation & Reset
- All LocalStorage keys MUST be prefixed with `pettracker_` to avoid collision with other tools on the same domain.
- All IndexedDB database names MUST be prefixed with `PetTracker_` for the same reason.
- Settings must include a **Reset App** option that:
  - Clears all LocalStorage keys with `pettracker_` prefix.
  - Deletes the IndexedDB database.
  - Does NOT affect other tools' data.
  - Shows confirmation dialog before reset.
  - Reloads the app after reset.

### 5.11 Data Model Concepts

**Event Types vs Care Items**:
- **Event Types** = The *category/template* for how something is logged (e.g., "Medication Given", "Symptom", "Vet Visit"). Defines tracking mode, default color, severity scale, etc.
- **Care Items** = The *specific thing* being tracked (e.g., "Apoquel 16mg", "Rabies Vaccine", "Hip Dysplasia"). Has dosage, route, and links to an Event Type.
- When logging an event: Event Type controls UI/behavior, Care Item specifies what was given/observed.
- This enables: "all medication events" queries AND "just Apoquel events" queries; Care Plans tied to specific meds.

**Cost Tracking Scope**:
- Costs are always tied to events (not standalone expenses).
- Covers: medical, vet visits, grooming, boarding, sitting.
- Does NOT track: daily food, treats, toys, or general pet supplies.
- Not an expense management system; just event-associated costs for reference.

## 6) Core UX Flows

### 6.1 Global Add Button
- Global Add is visible on all device sizes and layouts.
- Opens a single universal Add modal used for manual add, share add, calendar add, and AI add.

### 6.2 Add Modal Fields
- Pet(s)
- Event Type
- Date/Time (or Date-only)
- Severity (Scale Level)
- Value/Unit
- Duration
- Notes
- Attachments (camera + upload)

### 6.3 Stamp Tracking (Any Event Type)
- Any Event Type can be configured as Tracking Mode = Stamp.
- Pet profile shows Tracking Cards for each Stamp type.
- Tap date to create/remove a date-only Event (toggle behavior with ~100ms debounce).
- Long-press a date to add notes or attachments to that Event.
- Stamp events appear in calendar and analytics like any other event.

### 6.4 Calendar & Detail Drawer
- **Views**: Month view, Week view, and Agenda list view.
- Multi-select filters for pets, event types, tags, severity labels.
- **Pet colors**: Each pet has a user-selectable color; events are colored by pet (not Event Type).
- Severity intensity modifies the pet color by Scale Level.
- Users can upload custom icons for pets and event types.
- Clicking an entry opens a detail drawer for notes, attachments, and edits.

### 6.5 Upcoming View
- Computed from Care Plans (not Events).
- Fixed schedule: anchor date + interval.
- Rolling schedule: last completed event + interval.
- Filter by category, pet, and horizon.
- Optional creation of planned Events for calendar visibility.

### 6.6 Weight Tracking
- Weight is a standard Event Type.
- Pet profile shows latest weight, delta, and trend sparkline.
- Quick Weigh-in opens Add modal prefilled.
- Target min/max in Pets highlights out-of-range trends.

### 6.7 Share-Sheet Intake (PWA)
- When installed, PWA appears in share sheet for image/video.
- Share opens Add modal with attachments prefilled.
- Offline: store attachments temporarily in IndexedDB and open modal for metadata.
- If user closes modal without saving, show confirmation: "Discard unsaved changes?" and discard media if confirmed.
- PWA install: rely on browser's native install prompt (no custom banner).

## 7) Media Pipeline

### 7.1 Client-Side Processing
- Upload pipeline: convert to webp at quality ~0.8 and downscale to max 2560px.
- IndexedDB previews: webp at quality ~0.5, max dimension ~1280px.
- Never store originals in IndexedDB long-term.
- Videos: only cache poster frames locally; no client transcoding; prompt user to trim large videos.

### 7.2 Media Eviction (IndexedDB Storage Management)
- LRU eviction on cached media previews when approaching storage limits.
- **Only media is evicted**; event data, sync queue, and metadata are never deleted.
- Evicted media is replaced with a placeholder image showing: "Media not stored locally due to space constraints."
- Placeholder includes a "Retrieve from Notion" button to fetch the original on demand.
- Target cache cap: ~200MB for media previews; evict least-recently-used first.

### 7.3 Notion Upload Strategy
- Enforce plan-based file size limits: **5 MiB for free workspaces**, **20 MiB soft cap for paid** (Notion allows up to 5 GiB).
- Direct upload for files ≤20 MiB; multipart upload required for files >20 MiB.
- Upload URLs expire in **1 hour**; must attach to Notion page/property before expiry.
- Offline handling: queue upload requests; re-request upload URLs when back online before uploading.
- External hosting fallback: for files exceeding caps, support indirect import from public URL.

## 8) Analytics & Correlation
- Calendar overlays allow multi-select event types.
- **Correlation view**: User-configurable time windows at analysis time (e.g., "show symptoms within 6-24h after meds").
- Time window presets: 6h, 12h, 24h, 48h, 7d; custom range also supported.
- Trend dashboards: weekly averages, adherence %, and time-of-day heatmaps.
- Weight trends include moving averages and correlations with other event types.
- Correlation Group on Event Types allows pre-defined groupings for quick analysis.

## 9) Calendar Export & Google Calendar Integration

### 9.1 ICS Export
- Export events as `.ics` file for import into any calendar app.
- Export options: single event, date range, filtered selection (by pet, event type, category).
- ICS includes: SUMMARY (title + pet name), DTSTART, DTEND (or duration), DESCRIPTION (notes), CATEGORIES (event type, tags).
- Upcoming/scheduled events from Care Plans can be exported as recurring events or individual occurrences.

### 9.2 Google Calendar Integration (Optional)
- Auth via Google OAuth (handled by Cloudflare Worker proxy).
- User selects target Google Calendar in settings.
- Sync modes:
  - **One-way push**: Export selected events/upcoming to Google Calendar.
  - **Manual export**: Generate shareable Google Calendar link for single event.
- Events synced include pet name in title: `[PetName] Event Title`.
- Google Calendar event ID stored on Event record for update/delete sync.
- Sync can be per-Care Plan (like Todoist) or global toggle.

### 9.3 Calendar Link Generation
- "Add to Calendar" button on event detail drawer.
- Generates Google Calendar URL or downloads `.ics` file.
- Works offline: ICS download always available; Google link requires connectivity.

## 10) Todoist Two-Way Sync
- Auth via OAuth or personal token.
- Per Care Plan controls: sync toggle, project, section, labels, lead time.
- User selects their own Todoist project and section in settings.
- Push: create/update tasks as due items enter the lead window.
- Pull: fetch tasks from linked projects; when a Todoist task is completed, update the existing Planned event to Completed (do not create new events).
- Task title format: `[PetName] Care Item Name` (e.g., `[Luna] Rabies vaccine`).

## 11) Offline-First Sync Behavior

### 11.1 Core Principles
- IndexedDB is local source of truth; app works fully offline.
- All data is stored locally first, then synced to Notion when online.
- Users can view, create, edit, and delete entries while offline.
- App automatically syncs in background when connectivity is restored.

### 11.2 Sync Queue
- All create/update/delete operations are added to a local sync queue.
- Queue persists in IndexedDB and survives app restarts.
- When online, queue is processed automatically in background.
- Failed operations are retried with exponential backoff.

### 11.3 Background Sync
- **Auto-sync on app init**: When app loads and is online, sync runs automatically.
- **Periodic sync**: Background sync runs every 2 minutes when online and app is visible.
- **Sync on reconnect**: When connectivity is restored, sync triggers immediately.
- **Manual sync**: User can trigger sync via UI button at any time.
- **Visibility-aware**: Sync pauses when app is in background; resumes when visible.

### 11.4 Bidirectional Sync
- **Push local changes**: Local queue is pushed to Notion first.
- **Pull remote updates**: After push, pull all Notion changes to detect remote edits.
- **Reconcile**: Merge remote changes with local data using last-write-wins.
- If someone adds/edits in Notion directly, changes appear in app on next sync.

### 11.5 Conflict Resolution
- **Last write wins**: No manual merge UI; most recent edit (by timestamp) wins.
- **Deletion wins**: If deleted remotely while edited locally, deletion wins.
- Users sharing a database are responsible for coordination.

### 11.6 Rate Limiting
- Enforce ~3 requests/second (350ms between requests).
- Handle 429 responses with `Retry-After` header and exponential backoff.
- Sync indicator shows progress during long sync operations.

### 11.7 Sync Status UI
- **Sync indicator**: Shows pending count, last sync time, and sync-in-progress state.
- **Visual feedback**: Badge shows number of unsynced changes.
- **Toast notifications**: Notify user of sync success/failure.

### 11.8 AI Entries vs Normal Entries
- **Normal entries**: Synced automatically in background when online.
- **AI entries**: Require manual processing (user must review extractions before saving).
- AI queue is separate from sync queue; processed only when user initiates.
- Once AI entries are confirmed and saved, they become normal entries and sync automatically.

## 12) AI Auto-Entry (BYOK, Provider-Agnostic)

### 12.1 UX Requirements
- AI Quick Add accepts typing or dictation.
- Parsing is dynamic: every 5 seconds of typing (or 5 seconds after stop typing) triggers extraction.
- Extracted entries list shows compact cards.
- Clicking a card expands a preview of all fields.
- Expanded preview is read-only until Edit is clicked.
- Edit button disables the AI input (to prevent re-parsing) and enables field editing.
- Edited entries are visually marked with a distinct border + "Edited" badge.
- Deleted entries show a muted/red border and remain visible as "Removed".
- Once a card is edited, it is frozen and cannot be overwritten by new AI parsing.
- A "Save All" button commits all non-deleted entries.
- A "Resume Parsing" button re-enables the AI input after edits.

### 12.2 AI Prompt Must Be Dynamic
The prompt must be assembled at runtime with the user's actual configuration:
- Pets list (names + IDs)
- Event Types (names + category + tracking mode + defaults)
- Care Items (names + linked Event Types)
- Scales + Scale Levels (labels, order, numeric values)
- Units list
- Tags list
- Current date and timezone

### 12.3 AI Output JSON Schema
{
  "entries": [
    {
      "title": "",
      "petName": "",
      "eventType": "",
      "careItem": "",
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "status": "Completed|Planned|Missed",
      "severityLabel": "",
      "value": 0,
      "unit": "",
      "durationMinutes": 0,
      "notes": "",
      "tags": [],
      "confidence": 0.0
    }
  ],
  "missing": [],
  "warnings": []
}

### 12.4 Validation Rules
- Unknown petName or eventType adds to missing.
- Missing time for Timed event adds warning.
- Missing severity for event types with scales adds warning.
- No AI entries are committed until user confirms.

### 12.5 Multi-Pet & Ambiguity Handling
- If input mentions multiple pets (e.g., "gave Luna and Max their meds"), create **separate events per pet**.
- Each event should only reference one pet.
- If pet cannot be determined from input: default to user's **primary pet** if set, otherwise leave `petName` blank and add to `missing` array.
- Never auto-create entries for all active pets when ambiguous.

### 12.6 AI Queue for Offline/Later Processing
- Users may not have internet or may want to queue text for later AI processing.
- **"Queue for Later"** button in AI modal saves input text to IndexedDB queue without processing.
- Queue is stored in `PetTracker_DB` with store `aiQueue`.
- Each queued item contains: `id`, `text`, `createdAt`, `status` (pending/processing/completed/failed).
- When online and AI is configured, queued items can be processed:
  - Automatically on app init (optional, user-configurable)
  - Manually via "Process Queue" button in AI modal
- **Queue indicator** shows count of pending items in AI modal header.
- Processed items create entries that still require user confirmation before saving.
- Failed items remain in queue with error message for retry.
- Queue works fully offline: text is stored locally and processed when conditions are met.

## 13) Settings & Connection Flow

### 13.1 Connection Wizard Steps
1. **Worker Setup**: Enter Cloudflare Worker proxy URL + optional proxy token; verify via `/v1/users/me` call through proxy.
2. **Authentication**: Choose auth mode:
   - **OAuth** (public integration): authorization code exchange handled by worker.
   - **Manual token** (internal integration): user pastes Notion secret token.
3. **Database Selection**: User provides/duplicates the Notion template; app retrieves database ID and available data sources.
4. **Data Source Scanning**: Scan connected databases and retrieve available data sources; user selects which source maps to Pets, Events, Event Types, etc.
5. **Schema Verification**: Validate required properties exist; show mapping UI for template mode vs custom mapping mode; warn about missing properties.
6. **Preferences**: Configure upload limits, severity scales, default pet filters, visualization defaults, Todoist connection.

### 13.2 Cloudflare Worker Code
- Settings includes a **"View Worker Code"** button that opens a modal.
- Modal displays the full Cloudflare Worker code in a code block with a **"Copy Code"** button.
- Instructions included: create Worker, paste code, deploy, optionally set `ALL_CORS_PROXY_MATCH_TOKEN` secret, copy Worker URL.
- Same worker pattern as PhotoChronicles (CORS proxy with optional token auth).

### 13.2.1 Multi-App OAuth Redirect Handling
- Multiple Notion-connected apps are hosted on the same domain.
- A **centralized OAuth handler** (`notion-oauth-handler.mimansa-jaiswal.workers.dev`) handles all Notion OAuth flows.
- OAuth flow uses **redirect-based** approach (not popup) for reliable return handling.
- Each app passes a `from` parameter with its full return URL (e.g., `?from=https://domain.com/pet-tracker/index.html`).
- After successful authorization, the handler redirects back to the originating app with `?accessToken=...` in the URL.
- The app checks for `accessToken` in URL params on init and saves it to settings.
- URL is cleaned (accessToken removed) after token is stored to prevent token exposure in browser history.

### 13.3 Multi-User Model
- Multi-user is achieved by **sharing the Notion database** with other users.
- Each user connects individually with their own OAuth token or integration.
- Each data source must be shared with the integration for access (otherwise 404).
- Local preferences (filters, UI settings) are per-user in IndexedDB; shared data lives in Notion.

### 13.4 First-Run Experience
- On first launch (no settings stored), show onboarding wizard.
- Guide user through: Worker setup → Notion auth → Database selection/duplication.
- After connection, offer to create **sample data**:
  - Sample Event Types (Medication Given, Symptom, Vet Visit, Walk, Weight, Vaccine)
  - Sample Scales (Symptom Severity: Mild/Moderate/Severe; Activity Level: Low/Medium/High)
  - Sample Care Items (example meds, vaccines)
  - Optionally create a demo pet for exploration.
- User can skip sample data and start blank.

## 14) Responsive Layout
- Mobile: bottom nav + global Add button, stacked panels.
- Tablet: split view (calendar + detail).
- Desktop: filters sidebar + calendar + analytics panels.

## 15) Design & Theming

### 15.1 Technology Stack
- **Standalone HTML + CSS + JS**: No build step, no bundler, no framework compilation.
- CDN-hosted dependencies allowed (e.g., Tailwind CDN, Lucide icons, Chart.js).
- Single `index.html` file with inline or linked CSS/JS.

### 15.2 Visual Aesthetic
- **Squared-off, no rounded corners**: All elements use sharp 0px or 2px max border-radius.
- **Flat and minimal**: Zero shadows, clean geometric shapes.
- **High information density**: Compact layouts, small text sizes, efficient use of space.
- **Pastel tech/terminal vibe**: Research system aesthetic, not generic consumer app.
- **Thin borders**: 1px borders for card/panel separation.

### 15.3 Color Palette
| Name         | Hex       | Usage                                      |
|--------------|-----------|-------------------------------------------|
| Oatmeal      | `#d4c8b8` | Secondary backgrounds, subtle fills       |
| Earth Metal  | `#6b6357` | Secondary text, muted UI elements         |
| Charcoal     | `#2d2926` | Primary text, solid badges, headers       |
| White Linen  | `#f8f6f3` | Page background, card surfaces            |
| Dull Purple  | `#8b7b8e` | Accents, interactive elements, links      |
| Muted Pink   | `#c9a9a6` | Highlights, status indicators, soft accents|

### 15.4 Typography
- **Display/headings**: Serif font (e.g., Playfair Display, Lora) for pet names, section titles.
- **Body text**: Clean sans-serif (e.g., Inter, DM Sans) for readable content.
- **Labels/system text**: Monospace font (e.g., JetBrains Mono, IBM Plex Mono) for:
  - Section headers (e.g., `01_MEDICATION_LOG`)
  - Metadata labels (e.g., `SPECIES: DOG // BREED: LABRADOR`)
  - Timestamps, IDs, technical info
- **Casing**: UPPERCASE for labels and navigation; sentence case for body text.
- **Sizing**: Dense, small text (12-14px body); tight line-height.

### 15.5 UI Elements
- **Badges/Labels**: Solid charcoal background with white-linen text, squared-off (like `00_ORIGIN_POINT` style).
- **Cards**: No shadow, thin 1px border (oatmeal or earth-metal), squared corners, white-linen background.
- **Buttons**: Flat, squared, charcoal or dull-purple fill, white-linen text; subtle hover (background shift only).
- **Inputs**: Squared corners, thin oatmeal borders, charcoal text, monospace placeholder in earth-metal.
- **Navigation**: Horizontal tabs with uppercase monospace labels in earth-metal; charcoal for active state.
- **Icons**: Use Lucide icons (CDN); thin stroke weight; charcoal or earth-metal color.
- **Transitions**: Subtle, fast (100-150ms); no bouncy animations.

### 15.6 Layout Patterns
- **Sidebar panels**: Right-aligned detail panels with stacked sections on white-linen.
- **Section headers**: Charcoal badge with white-linen uppercase monospace text (e.g., `02_CARE_PLAN`).
- **Metadata rows**: `LABEL: value` format with `//` separators; labels in earth-metal, values in charcoal.
- **Dense grids**: Tight spacing, minimal padding, information-forward.
- **Accents**: Use dull-purple for links/interactive; muted-pink for highlights/status badges.

## 16) Acceptance Criteria
- Global Add visible on all device sizes.
- Stamp tracking with toggle + debounce; long-press notes/attachments works.
- Share-sheet intake opens Add modal with media; discard confirmation on cancel.
- Weight tracking works end-to-end with trends and target ranges.
- Todoist two-way sync: tasks created from Care Plans, completion updates existing events.
- AI auto-entry: dynamic prompt, edit mode, Save All, multi-pet creates separate events.
- Offline queue and sync logic works without data loss; last-write-wins conflict resolution.
- Connection wizard completes: worker verify, auth, database selection, data source scan, schema validation.
- File uploads respect plan-based size limits (5 MiB free, 20 MiB paid).
- Media eviction replaces with placeholder + "Retrieve from Notion" button.
- Rate limiting with backoff handles 429 responses gracefully.
- Multi-user sharing via Notion database works correctly.
- Calendar has Month, Week, and Agenda views; pets have user-selectable colors.
- ICS export works for single events and date ranges; "Add to Calendar" button on event detail.
- Google Calendar integration (optional) syncs events one-way with proper pet name prefixes.
- Correlation view has user-configurable time windows.
- First-run experience with onboarding wizard and optional sample data.
- Worker code modal with copy button and setup instructions.
