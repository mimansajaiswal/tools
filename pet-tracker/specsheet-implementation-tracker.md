# Pet Tracker Implementation Tracker

## Project Overview
Client-only, offline-first PWA for pet health tracking using Notion as backend.

## File Structure
```
pet-tracker/
├── index.html              # Main HTML shell with all modals
├── manifest.webmanifest    # PWA manifest with share target
├── service-worker.js       # Offline caching & share target handling
├── css/
│   └── styles.css          # Custom styles (calendar, stamps, animations)
├── js/
│   ├── storage.js          # IndexedDB + LocalStorage layer ✅
│   ├── ui.js               # Modals, toasts, tabs, helpers ✅
│   ├── api.js              # Notion API wrapper with rate limiting ✅
│   ├── sync.js             # Sync queue & conflict resolution ✅
│   ├── pets.js             # Pet CRUD & profiles ✅
│   ├── events.js           # Event logging & stamp tracking ✅
│   ├── calendar.js         # Calendar views (Month, Week, Agenda) ✅
│   ├── care.js             # Care Items, Plans, Scales, Upcoming ✅
│   ├── media.js            # Media pipeline & eviction ✅
│   ├── ai.js               # AI auto-entry (BYOK, multi-provider) ✅
│   ├── app.js              # Main app initialization & routing ✅
│   ├── todoist.js          # Todoist two-way sync ✅
│   ├── calendar-export.js  # ICS export & Google Calendar ✅
│   ├── analytics.js        # Correlation view, trends, heatmaps ✅
│   └── onboarding.js       # Multi-step setup wizard ✅
└── icons/
    └── icon.svg            # App icon (SVG source)
```

## Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] Project setup (index.html, manifest, service worker)
- [x] Design system (Tailwind config, color palette, typography)
- [x] Modular JS file structure
- [x] Storage isolation (pettracker_ prefix for LocalStorage, PetTracker_ for IndexedDB)
- [x] IndexedDB storage layer (js/storage.js)
- [x] LocalStorage settings management
- [x] Reset App functionality
- [x] Basic responsive layout shell

### Phase 2: Connection & Settings ✅ COMPLETE
- [x] Cloudflare Worker proxy code modal
- [x] Worker URL configuration
- [x] Notion OAuth flow (redirect-based via centralized OAuth handler)
- [x] Multi-app OAuth redirect handling (uses `from` param for return URL)
- [x] Manual token authentication
- [x] Database/data source selection (scan + mapping UI)
- [x] Schema verification (property display)

### Phase 3: Data Models & CRUD ✅ COMPLETE
- [x] Pets data source operations (js/pets.js)
- [x] Events data source operations (js/events.js)
- [x] Event Types management (auto-create defaults)
- [x] Scales and Scale Levels (auto-create defaults)
- [x] Care Items management (js/care.js)
- [x] Care Plans with scheduling (js/care.js)
- [x] Contacts management (js/contacts.js)

### Phase 4: Core Features ✅ COMPLETE
- [x] Global Add button and modal
- [x] Calendar views (Month, Week, Agenda) - js/calendar.js
- [x] Pet profile cards with detail view
- [x] Stamp tracking with toggle/debounce (~100ms)
- [x] Long-press for notes on stamps
- [x] Weight tracking with trends (sparkline, Quick Weigh-In, target alerts)
- [x] Upcoming view from Care Plans (js/care.js)

### Phase 5: Media Pipeline ✅ COMPLETE
- [x] Camera capture (js/media.js)
- [x] File upload
- [x] WebP conversion (0.8 quality upload, 0.5 preview)
- [x] IndexedDB media storage
- [x] LRU eviction (~200MB cap)
- [x] Placeholder for evicted media
- [x] Video poster frame extraction
- [x] File size limit checking (5MB free, 20MB paid)

### Phase 6: Sync Engine ✅ COMPLETE
- [x] Sync queue management
- [x] Push local changes to Notion
- [x] Pull Notion updates
- [x] Last-write-wins conflict resolution
- [x] Rate limiting (3 req/s, 429 handling)
- [x] Deletion sync

### Phase 7: Todoist Integration ✅ COMPLETE
- [x] Token auth (js/todoist.js)
- [x] Per-Care Plan sync settings (todoistSync, todoistProject, todoistLabels, todoistLeadTime)
- [x] Task creation from Care Plans with lead time
- [x] Two-way completion sync (pull completed tasks)

### Phase 8: AI Auto-Entry ✅ COMPLETE
- [x] BYOK provider/model/key settings
- [x] Dynamic prompt assembly (js/ai.js)
- [x] Real-time extraction (5s debounce)
- [x] Entry cards with preview/edit
- [x] Multi-pet handling (separate events per pet)
- [x] Save All functionality
- [x] Support for OpenAI, Anthropic, Google, and custom endpoints
- [x] Edited entries frozen from re-parsing

### Phase 9: Calendar Export & Google Calendar ✅ PARTIAL
- [x] ICS file generation (js/calendar-export.js)
- [x] Single event export
- [x] Date range / filtered export
- [x] "Add to Calendar" button on event detail drawer
- [x] Google Calendar URL generation (manual add)
- [ ] Google Calendar OAuth (via worker proxy)
- [ ] Google Calendar settings UI (target calendar selection)
- [ ] One-way push sync to Google Calendar
- [ ] Google Calendar event ID storage on Events

### Phase 10: Analytics ✅ COMPLETE
- [x] Correlation view with time windows (6h, 12h, 24h, 48h, 7d)
- [x] Trend dashboards (js/analytics.js)
- [x] Weight trends with moving averages
- [x] Time-of-day heatmaps
- [x] Care adherence statistics

### Phase 11: Polish ✅ MOSTLY COMPLETE
- [x] Share-sheet intake (PWA) - manifest + service worker + app handling
- [x] First-run onboarding wizard (multi-step, js/onboarding.js)
- [x] Sample data creation (event types, scales, care items)
- [x] PWA install prompt (beforeinstallprompt handling, install button)
- [ ] Accessibility improvements

---

## Session Log

### Session 1 - Initial Setup
**Date:** 2026-01-21

**Completed:**
- Created modular project structure with separate JS files
- Built core HTML shell with full design system
- Implemented responsive layout (mobile bottom nav, desktop sidebar)
- Set up Tailwind config with spec colors (oatmeal, earth-metal, charcoal, white-linen, dull-purple, muted-pink)
- Created IndexedDB storage layer with proper prefixing (PetTracker_DB)
- Created LocalStorage settings with prefixing (pettracker_)
- Built settings modal with tabs (Connection, Database, AI, Todoist, Danger Zone)
- Implemented Reset App functionality with confirmation
- Created Add Event modal with form fields
- Created Add Pet modal
- Created Onboarding modal
- Created Worker Code modal with copy functionality
- Implemented toast notification system
- Created Notion API wrapper with rate limit handling
- Set up service worker for offline support

**Design Decisions:**
- Using squared-off aesthetic per spec (0-2px border-radius max)
- Monospace fonts for labels/headers (JetBrains Mono)
- Serif for pet names/titles (Playfair Display)
- Sans-serif for body (Inter)
- Section headers styled as badges: "01_PETS", "02_CALENDAR" format
- All storage isolated with pettracker_ / PetTracker_ prefix

**Files Created:**
- index.html (main app shell with modals)
- manifest.webmanifest (PWA manifest with share target)
- service-worker.js (offline caching, share target handling)
- css/styles.css (custom styles beyond Tailwind)
- js/storage.js (IndexedDB, LocalStorage, sync queue, media store)
- js/ui.js (modals, toasts, tabs, helpers)
- js/api.js (Notion API wrapper with NotionProps/NotionExtract helpers)
- js/app.js (main controller, routing, state)

**Next Steps:**
- Create actual PNG icons from SVG
- Build AI auto-entry feature
- Add media pipeline (camera, upload, compression)

---

### Session 1 - Continued
**Additional Progress:**
- Created js/sync.js with full sync engine
- Property mapping for all data sources (Pets, Events, EventTypes, CarePlans, Contacts, Scales, ScaleLevels, CareItems)
- Bidirectional sync with last-write-wins conflict resolution
- Rate limiting at 350ms between requests
- Added sync.js to index.html script includes

---

### Session 2 - Core Features Implementation
**Date:** 2026-01-21

**Completed:**
- Created js/pets.js - Full pet CRUD with profile views
  - Save/update/delete with sync queue integration
  - Pet cards with color dots and age calculation
  - Pet detail view with recent events and weight summary
  - Edit modal population and form handling
- Created js/events.js - Event management and stamp tracking
  - Create/update/delete events with sync queue
  - Stamp toggle with ~100ms debounce
  - Long-press handler for adding notes to stamps
  - Event date range queries
- Created js/calendar.js - Full calendar implementation
  - Month view with event dots colored by pet
  - Week view with event cards
  - Agenda view with grouped events
  - Pet filter dropdown
  - Navigation (prev/next/today)
  - Event detail drawer on click
- Created js/care.js - Care management
  - Care items and care plans CRUD
  - Fixed and rolling schedule calculation
  - Upcoming view with horizon filter
  - Mark complete / skip functionality
  - Default event types creation (Medication, Symptom, Vet Visit, Walk, Weight, Vaccine)
  - Default scales creation (Symptom Severity, Activity Level)
- Updated css/styles.css with calendar and stamp styles
- Updated app.js to use new modules for view rendering
- Updated add event modal to support edit mode

**Files Created:**
- js/pets.js (Pet CRUD and profiles)
- js/events.js (Event logging and stamps)
- js/calendar.js (Calendar views)
- js/care.js (Care items, plans, upcoming)
- js/media.js (Media pipeline with WebP conversion)
- js/ai.js (AI auto-entry with BYOK support)

**Files Created:**
- js/todoist.js (Two-way Todoist sync)

**Next Steps:**
- Create actual PNG icons from SVG
- Add database selection UI in settings
- Complete share-sheet intake for PWA

---

### Session 3 - Calendar Export, Analytics, Onboarding
**Date:** 2026-01-22

**Completed:**
- Created js/calendar-export.js with full ICS export functionality
  - Single event export to .ics file
  - Date range / filtered export with pet filter
  - Export modal with options
  - Google Calendar URL generation (manual add)
  - "Add to Calendar" buttons in event detail drawer
- Created js/analytics.js with full analytics dashboard
  - Weight trends with Chart.js line chart and 7-day moving average
  - Weight statistics (current, average, change, entries)
  - Correlation view with configurable time windows (6h, 12h, 24h, 48h, 7d)
  - Care adherence statistics (30-day tracking)
  - Activity heatmap by time of day (bar chart)
- Created js/onboarding.js with multi-step setup wizard
  - 4-step wizard: Welcome → Worker → Notion → First Pet
  - Progress indicators and navigation
  - Connection testing
  - Sample data creation (event types, scales, care items)
  - Skip option for quick start
- Updated index.html with new onboarding modal structure
- Added export button to calendar header

**Files Created:**
- js/calendar-export.js
- js/analytics.js
- js/onboarding.js

**Files Modified:**
- index.html (scripts, onboarding modal)
- js/calendar.js (export buttons, event detail)
- js/app.js (analytics routing, onboarding init)

---

### Session 4 - Contacts, Database Selection, Share-Sheet
**Date:** 2026-01-22

**Completed:**
- Created js/contacts.js - Full contacts management
  - CRUD operations (create, update, delete, get, getAll)
  - List view grouped by role (Vet, Groomer, Sitter, etc.)
  - Contact cards with role icons
  - Add/edit modal with pet checkboxes
  - Sync queue integration
- Added Contacts modal to index.html
- Added Contacts navigation to sidebar and view container
- Updated app.js to handle contacts view routing
- Enhanced Database tab in settings:
  - Scan data sources button
  - Data source mapping UI (8 selects for all data sources)
  - Schema status display showing detected properties
  - Added App.scanDataSources() function
- Improved Share-sheet intake (via separate task):
  - Enhanced handleShareTarget in app.js
  - Attachment preview thumbnails
  - Discard confirmation on modal close
  - Updated media.js with createThumbnailPreview

**Files Created:**
- js/contacts.js

**Files Modified:**
- index.html (contacts modal, database settings, contacts nav/view)
- js/app.js (contacts routing, scanDataSources, titles)
- js/media.js (createThumbnailPreview, processAndStoreMedia)
- js/ui.js (modal overlay handling)

**Next Steps:**
- PWA install prompt
- Notion OAuth flow
- Google Calendar OAuth integration
- Weight tracking enhancements

---

### Session 5 - PWA Install, Weight Enhancements, OAuth
**Date:** 2026-01-23

**Completed:**
- Implemented PWA install prompt
  - Added beforeinstallprompt and appinstalled event handlers in app.js
  - Added deferredPrompt state for storing the install event
  - Added Install App button in sidebar (hidden until browser triggers prompt)
  - Added promptInstall() function to trigger installation
- Enhanced weight tracking in pets.js
  - Added getWeightEventTypeId() helper to find weight event type
  - Added getWeightHistory() for fetching pet's weight history
  - Added generateWeightSparkline() for inline SVG sparklines
  - Added Quick Weigh-In button in pet detail view
  - Added target range alerts (shows warning when weight outside min/max)
  - Weight section now always shows with sparkline visualization
- Implemented Notion OAuth flow
  - Added OAuth section in Settings modal with Client ID field
  - Added OR divider between OAuth and manual token options
  - Added startOAuth() function in api.js with popup handling
  - Updated WORKER_CODE with /oauth/callback endpoint for token exchange
  - Added startNotionOAuth() function in app to coordinate flow
  - Worker now handles authorization code exchange securely

**Files Modified:**
- js/app.js (PWA install prompt handling)
- js/pets.js (weight enhancements, Quick Weigh-In)
- js/api.js (OAuth flow, startOAuth function)
- index.html (install button, OAuth UI, updated worker code)
- specsheet-implementation-tracker.md

**Remaining Items:**
- Google Calendar OAuth sync (one-way push)
- Accessibility improvements

---

### Session 6 - Multi-App OAuth Redirect Pattern
**Date:** 2026-01-23

**Completed:**
- Refactored Notion OAuth to use redirect-based flow (matching PhotoChronicles pattern)
  - Removed popup-based OAuth in favor of redirect-based approach
  - Uses centralized OAuth handler at `notion-oauth-handler.mimansa-jaiswal.workers.dev`
  - Added `from` parameter support for multi-app hosting on same domain
  - Handler redirects back to originating app with `accessToken` query param
- Updated js/app.js:
  - Added `startNotionOAuth()` function with redirect flow
  - Added `handleOAuthReturn()` to detect and store OAuth token from URL
  - OAuth return handling in init() flow
- Updated js/api.js:
  - Removed popup-based `startOAuth()` function
  - Added `getOAuthReturnUrl()` helper
- Simplified OAuth UI in index.html:
  - Removed OAuth Client ID field (handled by centralized handler)
  - Simplified OAuth button and description
- Updated specsheet.md:
  - Added section 13.2.1 documenting multi-app OAuth redirect handling

**Files Modified:**
- js/app.js (OAuth redirect flow, handleOAuthReturn)
- js/api.js (removed popup OAuth, added getOAuthReturnUrl)
- index.html (simplified OAuth section)
- specsheet.md (added 13.2.1 Multi-App OAuth Redirect Handling)
- specsheet-implementation-tracker.md
