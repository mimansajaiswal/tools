# Static GitHub Pages Journal/Notes App with Google Drive Storage

## What you are actually asking for

You are not asking for "a notes app with Google Drive sync."

You are asking for a very specific product shape:

- Static app only.
- Hostable on GitHub Pages.
- No required build process.
- Plain HTML, CSS, JavaScript, plus CDN imports.
- Strong offline/local behavior.
- Google Drive as the durable user-owned storage layer.
- Data stored in a readable format, not an opaque app database.
- A Notion-like editor experience, but with your existing `QuickAdd` model integrated inline.
- Journalistic-style timelines, tags, people, highlights, reflection, and insights.
- Prism-style frictionless capture, tags, review, links, and threads.
- Supernotes-style card thinking and linking.
- Columns/Bundled-style list, bundle, board, and view flexibility.
- Gami-style time parsing, duration understanding, and charts.
- Bring-your-own-key AI assistance.
- Minimal commercial/backend assumptions because you are effectively the primary user.

That is possible.

It is not a small app, but it is absolutely possible as a browser-only app if you accept one architectural reality:

> The browser-local database is the live editing system. Google Drive is the durable readable sync/export/source-of-truth layer for long-term ownership.

Trying to make Google Drive behave like a realtime transactional database directly from the UI will make the app feel worse and be harder to reason about.

## Short answer

The most viable architecture is:

1. GitHub Pages serves a static PWA shell.
2. The app stores live state locally in IndexedDB.
3. The app syncs documents and media into a dedicated folder in the user's Google Drive through the Drive API.
4. Documents are stored as human-readable Markdown plus structured sidecar JSON.
5. Media is uploaded to Drive as real files, while the browser keeps only the cache you choose to keep locally.
6. Your current `QuickAdd` system becomes an inline semantic entry layer inside the main editor rather than a separate popup/composer.
7. The editor is built around a Notion-like block model, most likely on top of Tiptap core or a custom block shell.
8. The app is an installable PWA, with foreground-first sync and background-assisted sync where browsers support it.
9. AI is BYOK from the browser, with optional Chrome built-in AI and local-model providers later.

That gives you:

- static hosting
- no mandatory backend
- readable files in Drive
- offline editing
- local speed
- user-owned storage
- no sync bill beyond normal Google storage usage

## V1 scope principle

Everything discussed in this document should be treated as part of the intended v1 product scope unless explicitly marked otherwise.

This is not an "MVP with a few core features" project.

For this product, "v1" means:

- the integrated journaling and notes experience
- the Notion-like block editor
- Google Drive sync
- local browser storage
- attachments and media handling
- AI provider support
- transcription
- health/self-tracking features
- wearable/platform import where feasible in this architecture
- dashboards, calendar, boards, search, and insight views

That means the phased plan in this document is an **implementation sequencing plan**, not a feature-cutting plan.

A feature may be built later in the implementation order, but if it has been accepted into this document, it should be assumed to be required before the product is considered a complete v1 release.

The only things that should be treated as outside strict v1 are:

- items explicitly described as future optional providers
- native-companion paths that are impossible inside the pure static/PWA architecture
- platform-specific extensions that require a different application form factor

## PWA reality

Yes, this should be a PWA.

That gives you:

- installability
- offline shell caching
- service worker support
- IndexedDB local persistence
- better app-like launch behavior

But there is one important constraint:

Do not make the app depend on guaranteed background sync after the app is closed.

The browser platform does support service workers and background-related APIs, but those capabilities are still inconsistent across browsers and platforms. Service workers are event-driven and can be terminated by the browser. Background Sync and Periodic Background Sync should be treated as opportunistic improvements, not core guarantees.

So the correct sync model is:

- save locally first
- sync aggressively while the app is open
- queue failed/offline work
- retry on reopen, focus, reconnect, and manual sync
- use service-worker-assisted sync where available

In other words:

- **PWA**: yes
- **service worker**: yes
- **best-effort background sync**: yes
- **product depends on closed-app background sync**: no

## Why Google Drive is the right fit here

For your specific goals, Drive is attractive for reasons that are more important than "it syncs files":

- The files remain yours.
- The storage is understandable outside the app.
- Gemini and other tools can inspect the files later because they are ordinary files.
- You do not need to run your own always-on sync backend.
- For a low-user-count product, Drive API quotas and pricing are not the bottleneck.

Per Google's current Drive API usage limits, the API is available at no additional cost, and the published request quota is far beyond what a single-user journaling app would normally hit. That makes it a good fit for a personal or low-scale tool.

Inference:
Drive is not good as a low-latency collaborative database, but it is very good as a durable, user-owned document store for a mostly single-user app.

## What Google Drive sync actually means

This is not a database integration in the Convex/Supabase/Firestore sense.

It is a browser-side file sync system.

The app writes locally first, then mirrors document folders and assets into the user's Drive.

The conceptual model is:

- IndexedDB = live working database
- Google Drive = durable readable file store
- sync queue = bridge between them

At runtime the flow is:

1. User edits a document or adds media.
2. App saves immediately to IndexedDB.
3. App marks the document and/or asset as dirty.
4. A sync queue uploads changed files to Drive.
5. The app stores remote Drive IDs locally so later syncs are updates, not discovery from scratch.

On another device:

1. User opens the app and signs into the same Google account.
2. App finds the configured Drive root folder.
3. App reads remote document folders and assets.
4. App rebuilds or updates local IndexedDB.

This is simple enough for a personal app and fits the static-hosting requirement well.

## Why browser-local storage still matters

You explicitly want browser storage too, and that is the correct instinct.

If you skip browser-local storage and write directly to Drive for everything:

- typing latency gets worse
- offline mode becomes weak
- conflict handling becomes harder
- uploads block the UX
- media becomes painful

If you keep all data only in browser storage:

- Safari and storage eviction become real risks
- multi-device use becomes weak
- the data is not externally readable

So the app should be **dual-store by design**:

- **IndexedDB** for active state, indexes, sync queue, local media cache, and offline work
- **Google Drive** for durable readable files and cross-device continuity

This is not a fallback strategy. This is the core design.

## What the reference products suggest

These are the product signals worth copying, not the whole implementation style.

### Journalistic

Useful signals:

- micro-journaling
- hashtags and mentions as first-class structure
- highlights
- people tracking
- dreams/notes/wisdom/ideas/focus as modules
- derived insights from writing history

Do copy:

- date-centered journaling
- semantic tags and people
- lightweight entry capture
- computed insight views

Do not copy:

- hard module boundaries as the primary data model

Your app should treat those as saved views over one unified entry/document model.

Visual/UI direction to copy most closely:

- of the referenced products, Journalistic is the strongest visual target
- calm, minimal, reflective, lightly premium
- soft surfaces rather than high-contrast productivity-app chrome
- strong readability over dense dashboard aesthetics

### Prism

Useful signals:

- frictionless quick capture
- tags that become organization
- review flow
- threads over documents
- strong link capture

Do copy:

- zero-friction capture
- threadable short-form notes
- review queue
- saved links as first-class objects

### Supernotes

Useful signals:

- note-as-card
- small composable units
- linking/backlinking
- idea-first model

Do copy:

- cards/blocks as atomic content
- backlinks
- references and transclusion later

### Columns

Useful signals:

- lists as a flexible thinking structure
- columns/boards as a view over data

Do copy:

- column/board views
- lightweight list management

Do not copy:

- list-only worldview

Your app needs richer documents and journal entries than that.

### Bundled Notes

Useful signals:

- bundles/workspaces
- offline-first feel
- tags driving behavior
- kanban
- link previews
- customization

Do copy:

- workspace/bundle grouping
- tag-driven views
- board views
- pleasant offline usage

### Gami

Useful signals:

- AI-assisted parsing of spoken/freeform time logs
- duration understanding
- charts from diary data
- markdown-backed editing

Do copy:

- time/event parsing
- duration math
- dashboards and charts

### Bearable

Useful signals:

- symptom tracking
- factor tracking
- medication and treatment tracking
- mood and energy tracking
- custom health measurements
- correlation reports
- combining subjective entries with imported health signals

Do copy:

- health factors as first-class tracked data
- highly customizable health metrics
- correlation-style reports
- ability to combine journaled experience with wearable/platform signals

Do not copy:

- medicalized UI tone as the entire product identity

Your app should be able to support health tracking deeply without feeling like a sterile clinical dashboard all the time.

## The recommended product model

Do **not** build separate apps inside one app.

Build one unified content system with different views.

### Core object types

- `document`
- `entry`
- `asset`
- `view`
- `relation`

In practice, `entry` can just be a subtype of `document`.

### Document types

- journal entry
- quick note
- thread
- person
- topic/tag page
- project
- link/save-later item
- recap
- dashboard
- health record
- symptom log
- medication log
- treatment log

### First-class properties

- `id`
- `type`
- `title`
- `createdAt`
- `updatedAt`
- `date`
- `startAt`
- `endAt`
- `durationMinutes`
- `tags[]`
- `people[]`
- `status`
- `rating`
- `mood`
- `energy`
- `location`
- `sourceUrl`
- `metrics{}`
- `healthMetrics{}`
- `symptoms[]`
- `factors[]`
- `medications[]`
- `treatments[]`
- `attachments[]`
- `linkedDocumentIds[]`

This is enough to support:

- journal timelines
- calendars
- board views
- tables
- charts
- link pages
- tag pages
- person pages
- rollups

## Health tracking and wearable integration

This app should support a Bearable-like layer of health tracking without becoming a dedicated medical-record product.

The right model is:

- subjective self-tracking
- imported wearable/platform data
- correlations and trend views
- journal context tied to health signals

### Health features worth supporting

From Bearable-like workflows, the most valuable feature families are:

- mood tracking
- symptom tracking
- energy/fatigue tracking
- sleep quality tracking
- medication logs
- treatment/intervention logs
- factor tracking
- health measurements
- correlation reports

Examples of factors:

- caffeine
- alcohol
- exercise
- supplements
- work stress
- screen time
- travel
- menstrual cycle context
- sleep disruption
- meals

Examples of tracked measurements:

- resting heart rate
- HRV
- steps
- sleep duration
- weight
- blood pressure
- body temperature
- custom measurements

### Product position

The health layer should feel like:

- a customizable health-and-life overlay inside the journal

Not like:

- a standalone rigid medical form system

That means the app can support:

- full health records for people who want them
- simple daily health signals for people who only want light tracking

### Data model additions

Add entity types or structured collections for:

- `symptom`
- `factor`
- `medication`
- `treatment`
- `healthMeasurement`
- `healthImportSource`

Useful per-entry properties:

- severity
- frequency
- confidence
- dosage
- unit
- source
- measurementTime
- notes

### Correlation/reporting layer

This is one of the strongest Bearable-like features to include later.

The app should be able to compute reports like:

- symptom severity vs sleep
- mood vs exercise
- fatigue vs caffeine
- HRV vs stress
- symptom flare-ups vs medication changes
- productivity vs sleep duration

These reports should be expressed as saved views over the core data model, not a separate analytics silo.

## Health platform integrations

This is where the platform constraints matter a lot.

There is no single cross-platform web API for all consumer health data.

The practical options differ by platform:

- Fitbit: feasible from a browser app
- Google Fit REST: feasible from a browser app, but increasingly legacy and policy-heavy
- Health Connect: Android-native path, not a browser/PWA path
- Apple Health / HealthKit: native Apple-platform path, not a browser HTTP API

### Fitbit

Fitbit is the cleanest health-data integration for this app's static/PWA architecture.

Fitbit provides OAuth and a web API for user data, including activity and heart-rate endpoints. Fitbit's own docs also expose rate-limit headers and document scopes and intraday access constraints.

What this means for your app:

- browser OAuth is feasible
- direct REST fetches are feasible
- importing steps, heart rate, sleep, and related metrics is realistic
- the integration can work in the static app without a custom backend, assuming the OAuth flow and CORS path are supported for the chosen endpoints

Inference:
Fitbit should be treated as the first external health integration to build if health imports matter.

### Google health data

Google now has two materially different paths:

#### Google Fit REST API

Google still documents a REST API for Google Fit that works across platforms.

However:

- many Google Fit Android APIs are deprecated
- Google repeatedly directs developers to Health Connect for historical data
- Fit health scopes are sensitive/restricted enough that verification and policy overhead matter

For a small personal app, Google Fit REST may still be usable, but it is not the clean long-term architecture choice.

#### Health Connect

Health Connect is Google's modern direction on Android.

But Health Connect is:

- Android-only
- part of Android / Google Play health infrastructure
- integrated through the Android SDK
- not a browser-web HTTP API

That means a static PWA cannot directly integrate with Health Connect in the same way it integrates with Drive or Fitbit.

If you want Health Connect support, you would need one of:

- a native Android wrapper app
- a tiny companion Android app
- a user-owned bridge app that syncs selected metrics into your app's storage

Inference:
For your current architecture, Google Fit REST is the only realistic browser-only Google health path. Health Connect is the better Android platform path, but it requires native Android work.

### Apple Health / HealthKit

Apple's official health stack is HealthKit, and Apple documents it as a framework for Apple-platform apps.

What I found:

- Apple positions HealthKit as part of Apple-platform app development
- HealthKit access is granted to apps on Apple platforms through native frameworks and permissions
- I did not find an Apple public HTTP/REST API for reading a user's Apple Health data from a generic web app

Inference:
There is no normal "connect my Apple Health account over HTTP from a PWA" path comparable to Google Drive OAuth or Fitbit web OAuth.

For this architecture, Apple Health cannot be a direct browser integration.

#### What would be required for real Apple Health support

You would need one of:

- a native iPhone/iPad app with HealthKit entitlements
- a lightweight native wrapper around the web app
- a companion sync app that reads HealthKit and writes selected data into your app's storage or API bridge

That native layer could then:

- read allowed HealthKit data
- normalize it
- write it into the same document/import format the PWA understands

#### Possible shortcut-based bridge

There is one interesting middle path:

- Apple Shortcuts supports actions like `Find Health Samples`
- Shortcuts also supports `Get Contents of URL`, including POST/PUT use cases

Inference:
It should be possible to create a user-owned Shortcut that reads selected health samples and sends them to a webhook, worker, or import endpoint you control.

This is not the same as a first-class Apple Health integration. It is a user automation bridge.

That means it could be useful for:

- advanced personal use
- one-way import
- scheduled export of limited metrics

But it is not as robust or integrated as a native HealthKit app.

### Recommended integration order

If you want health imports, the order should be:

1. Fitbit direct integration
2. Google Fit REST integration, only if still worth the policy overhead for your use case
3. Apple Shortcut bridge as an advanced-user option
4. Native companion apps for Health Connect and Apple Health only if health imports become strategically important

### Sync/import model for health data

Health imports should not overwrite the journal model. They should land as imported measurements and linked records.

Recommended import structure:

- imported health datapoints become normalized measurement records
- records keep source attribution
- source data can be rolled up into daily summaries
- journal entries can reference those summaries

Useful fields:

- `sourcePlatform`
- `sourceMetric`
- `sourceRecordId`
- `recordedAt`
- `value`
- `unit`
- `aggregation`
- `confidence`

### Read vs write

For v1, health integrations should be **read/import oriented**.

That means:

- import Apple Health / Fitbit / Google data where possible
- use imported data in views and reports
- do not try to write the app's journal/symptom data back into external health platforms initially

This matches Bearable's current posture as well: importing external health signals is the high-value part.

## Visual design direction

This should not be a generic SaaS UI.

The preferred visual direction is:

- closest overall inspiration: Journalistic
- muted purple
- muted pink
- oatmeal
- linen
- off-white / soft white

The intended feel is:

- calm
- tactile
- warm
- reflective
- slightly literary
- polished without looking corporate

### Color direction

The palette should bias toward:

- muted plum
- dusty mauve
- warm oatmeal
- linen
- milk-white backgrounds
- soft brown-gray text

Avoid:

- cold pure grays
- bright saturated purples
- harsh black-on-white contrast
- generic blue SaaS accents

### Layout direction

The UI should feel like a journal-first writing environment, not a database admin panel.

That means:

- generous spacing
- soft containers
- comfortable text measure
- strong reading hierarchy
- quiet sidebars and controls
- minimal visual noise around the editor

### Responsive requirements

This must be responsive across:

- phone
- tablet
- laptop
- large desktop

Recommended behavior:

- mobile first for structure
- single-column editor focus on phones
- collapsible side panels on tablets
- multi-panel workspace only when viewport allows it
- touch-friendly hit targets
- attachment flows and block controls that still work without hover

The editor experience should remain viable on narrow screens, which means:

- block menus cannot depend only on hover
- drag/reorder affordances need touch-safe alternatives
- slash commands and inline formatting need to remain usable with mobile keyboards

### Explicit visual constraints

These are not soft preferences. They should be treated as design rules unless deliberately revised later.

- no shadows
- no gradients
- no glassmorphism
- no floating neon accents
- no heavy card stacking effects
- no glossy "AI app" visuals

Depth should come from:

- spacing
- borders
- layering
- typography
- subtle color shifts
- layout rhythm

Not from:

- blur
- shadow elevation
- glowing outlines
- background gradients

## UI plan

This section describes how the actual product UI should look and behave.

The target is:

- Journalistic-like calmness
- stronger block editing than Journalistic
- cleaner structure than Notion
- softer and more reflective than most productivity apps

### Overall app shell

The app should use a three-zone model on large screens:

- left navigation rail
- central content area
- optional right context panel

On smaller screens, this collapses progressively:

- desktop: three-zone when useful
- tablet: left rail plus main content, right panel overlays
- phone: single main column, side panels become drawers/sheets

### Visual hierarchy

The visual hierarchy should be driven by:

- background tone changes
- thin borders
- section spacing
- text size and weight
- selective accent color use

Recommended border style:

- consistent 1px borders
- soft linen or mauve-gray border colors
- rounded corners, but not bubbly

Recommended surface treatment:

- base canvas in soft off-white or oatmeal
- slightly differentiated panels in linen / milk / pale mauve tints
- active states shown through border emphasis and subtle fills, not shadows

### Layout grid

Use a layout grid that feels editorial rather than dashboard-heavy.

Desktop:

- left rail: `248px` to `280px`
- main editor/content: flexible
- right context panel: `300px` to `360px`
- max readable text width in writing mode: around `720px` to `820px`

Tablet:

- left rail collapses to icon rail or slide-over panel
- main area remains dominant
- right panel becomes a slide-over inspector

Phone:

- single-column primary flow
- top app bar
- bottom quick actions or compact nav
- drawers/sheets for navigation, properties, and backlinks

## Main screens

### 1. Home / Today

This should be the emotional center of the app.

Purpose:

- today's journal
- quick capture
- recent threads
- upcoming / relevant items
- daily metrics snapshot

Structure:

- top header with date and optional gentle prompt
- inline quick capture area
- today's main journal stream
- compact cards for:
  - people mentioned today
  - active tags
  - upcoming items
  - time summary

Visual feel:

- mostly text-first
- light dividers
- no widget clutter
- journal page first, utility second

### 2. Document / Editor view

This is the most important screen.

Structure on desktop:

- top bar
- title row
- optional property strip
- main block editor
- right inspector panel

Top bar contents:

- page title or breadcrumb
- sync status
- search trigger
- AI action entry point
- overflow menu

Title row:

- large serif or high-character heading style
- calm spacing above and below

Property strip:

- date
- tags
- people
- mood
- status
- duration
- attachments count

This should feel like lightweight metadata, not a spreadsheet header.

Main editor:

- wide enough for comfortable reading
- block controls appear only when needed
- paragraph spacing slightly generous
- lists and nested blocks should feel crisp and orderly

Right panel:

- properties
- backlinks
- linked docs
- document outline
- attachments
- AI suggestions

### 3. Timeline / Journal history

This should feel like browsing a personal archive, not a data table.

Structure:

- date-grouped sections
- compact entry previews
- tag and people chips
- quick expand into full entry

Views:

- day
- week
- month
- archive list

The timeline should privilege:

- date clarity
- skim-ability
- emotional readability

### 4. Calendar

The calendar should be quiet and legible.

Behavior:

- month view first
- agenda drawer/panel on selection
- entries represented with soft color coding
- duration and event-like blocks readable at a glance

Avoid:

- heavy calendar chrome
- dense multicolor enterprise scheduling visuals

### 5. Board / Columns view

This is where Columns/Bundled energy belongs.

Use cases:

- project flows
- reading queues
- idea pipelines
- review queues

Structure:

- horizontally arranged columns
- muted labeled headers
- light bordered cards
- optional count badges

Cards should be slim and information-efficient, not kanban toy blocks.

### 6. People / Tag pages

These are dynamic collection pages.

Structure:

- page heading
- summary line
- key metrics
- recent linked entries
- timeline of mentions
- related people/tags/documents

This page should feel halfway between:

- a note page
- a filtered archive

### 7. Search / Command palette

Search should be one of the main navigation tools.

It should support:

- global search
- command palette
- jump to page
- filter by type/date/tag/person

Visual style:

- centered sheet on desktop
- full-screen modal on phone
- very little decoration
- strong typography

## Navigation model

### Left rail

The left rail should be calm and stable.

Sections:

- Today
- Journal
- Notes
- Calendar
- Boards
- People
- Tags
- Dashboards
- Saved views
- Settings

Under that:

- pinned pages
- recent pages
- active projects or bundles

The rail should not look like a file explorer first. It should look like a personal workspace.

### Top navigation behavior

Use a restrained top bar with:

- current location
- sync state
- search
- add/new
- account/settings

Do not overload the top bar with many segmented controls.

### Mobile navigation

Mobile should use:

- compact top app bar
- slide-over navigation drawer
- contextual bottom action row if needed

Recommended bottom actions:

- Today
- Search
- New
- Calendar
- More

## Editor behavior plan

### Block chrome

Block chrome should be minimal and mostly hidden until relevant.

Show on hover/focus:

- drag handle
- plus/insert control
- block type menu

On mobile:

- replace hover with tap-accessible handles
- use bottom sheet menus for block actions

### Slash menu

The slash menu should feel fast and small.

Default categories:

- basic
- journal
- media
- structure
- data
- AI

Suggested block actions:

- text
- heading
- bullet list
- checklist
- quote
- divider
- image
- video
- embed
- chart
- quick-add field row
- journal event
- reflection prompt

### Inline semantics

Inline structured chips should look integrated into the writing flow.

They should not feel like bright pills pasted into a text editor.

Recommended style:

- very soft tinted background
- subtle border
- small radius
- same text family as body, maybe slightly denser weight

Chip types:

- tag
- person
- date
- time
- duration
- metric
- attachment
- linked document

### Paste behavior

The editor should preserve useful structure on paste:

- paragraphs remain paragraphs
- headings remain headings when reasonable
- lists remain lists
- links remain links
- pasted images can become image blocks
- table-like content can become table blocks or normalized text

Priority:

- preserve legibility
- avoid ugly pasted formatting
- normalize toward app-native blocks

### Selection and formatting UI

Inline formatting toolbar should be restrained.

Use:

- small contextual toolbar near selection on desktop
- bottom or top anchored formatting bar on mobile

Formatting options should stay limited in v1:

- bold
- italic
- link
- inline code
- highlight

Do not rush into a huge formatting suite.

## Component styling rules

### Typography

Use a two-family system:

- expressive serif for large page titles and a few key headings
- highly readable sans or mono-leaning sans for UI and body

The title typography should carry some of the warmth instead of relying on gradients or shadows.

### Buttons

Buttons should be:

- flat
- bordered
- lightly filled
- text-led

No shadow-based elevation.

Primary button style:

- muted plum or mauve fill
- off-white text
- darker border tone

Secondary button style:

- pale background
- colored text
- visible border

### Inputs

Inputs should look soft and deliberate.

Use:

- pale filled background
- subtle border
- no shadow on focus
- focus shown through border color and background shift

### Cards and panels

Cards should not really be "cards" in the trendy sense.

They should be:

- bordered sections
- rounded
- softly separated from the canvas
- flat

### Chips and tags

Tags should use muted palette variants and stay legible even in long lists.

Do not use extremely saturated category colors.

### Empty states

Empty states should be editorial and quiet.

Use:

- short line of guidance
- one clear action
- maybe a tiny illustration only if it matches the restrained style

Do not use cartoonish onboarding empties.

## Responsive behavior plan

### Phone

Priorities:

- capture quickly
- read comfortably
- edit safely
- access essential navigation

Rules:

- one main column
- metadata collapses into compact rows or chips
- right panel becomes sheets
- timeline and calendar are simplified
- large tap targets

### Tablet

Priorities:

- preserve writing comfort
- allow side navigation without clutter

Rules:

- side rail may collapse
- inspector becomes overlay
- board view may horizontally scroll

### Desktop

Priorities:

- efficient workspace
- writing plus context at once

Rules:

- stable left rail
- wide central editor
- optional right panel
- keyboard-first interactions

## Screen density philosophy

Do not over-compress the interface.

This app should feel:

- spacious enough to think
- dense enough to be practical

That means:

- editor pages: spacious
- archive pages: moderately dense
- dashboards: compact but restrained

## UI summary

If the design is correct, the interface should feel like:

- Journalistic's calmness
- a more powerful editor than Journalistic
- Notion-like block flexibility
- none of Notion's visual clutter
- no shadows
- no gradients
- soft warm neutral color relationships
- responsive from phone to desktop

## Recommended file format in Google Drive

This is the most important design decision.

If you force everything into one giant JSON file:

- the app is easy to build at first
- the data is not pleasant to read
- sync gets coarse
- media references become messy
- manual inspection in Drive becomes worse

If you force everything into pure Markdown:

- the data is readable
- the editor model becomes lossy for rich structure
- view metadata, chart configs, relations, and properties get awkward

### Best fit: folder-per-document with Markdown + sidecar JSON

Use this structure:

```text
AppName/
  workspace.json
  documents/
    doc_<id>/
      content.md
      meta.json
      assets/
        asset_<id>.jpg
        asset_<id>.mp4
  views/
    dashboard_daily.json
    board_projects.json
  exports/
    snapshot_2026-03-19.json
```

### Why this format is strong

`content.md` gives you:

- readability in Drive
- easy Gemini inspection
- manual editing in emergencies
- long-term ownership

`meta.json` gives you:

- exact structured properties
- relation IDs
- editor metadata
- view/render hints
- parsed numeric and calendar values
- attachment descriptors

This hybrid avoids the worst tradeoff on both sides.

### Example document folder

```text
documents/doc_01HQX8.../
  content.md
  meta.json
  assets/
    asset_cover.webp
    receipt.jpg
```

`content.md`

```md
# Morning reflection

Met Rohan for coffee. Talked about the portfolio site and next sprint.

- Follow up on pricing ideas
- Sketch publishing flow

![receipt](./assets/receipt.jpg)
```

`meta.json`

```json
{
  "id": "doc_01HQX8",
  "type": "journal",
  "title": "Morning reflection",
  "createdAt": "2026-03-19T14:32:11.000Z",
  "updatedAt": "2026-03-19T15:04:02.000Z",
  "date": "2026-03-19",
  "startAt": "2026-03-19T08:30:00.000Z",
  "endAt": "2026-03-19T09:15:00.000Z",
  "durationMinutes": 45,
  "tags": ["coffee", "work", "planning"],
  "people": ["person_rohan"],
  "status": "active",
  "metrics": {
    "mood": 4,
    "energy": 3
  },
  "attachments": [
    {
      "id": "asset_receipt",
      "path": "assets/receipt.jpg",
      "mimeType": "image/jpeg"
    }
  ],
  "links": ["doc_idea_pricing"]
}
```

This is readable, inspectable, and structured enough for the app.

## Why not a single SQLite file, Dexie export, or one JSON blob in Drive

Those formats are convenient for the app and bad for your stated goal.

Your stated goal is not just persistence. It is:

- readable
- inspectable
- user-owned
- Gemini-friendly

That pushes the design toward a document tree, not a monolithic database artifact.

## Local browser storage model

### Primary recommendation

Use IndexedDB as the only required local persistence layer.

Stores:

- `documents`
- `documentBodies`
- `assets`
- `assetPreviews`
- `views`
- `relations`
- `syncQueue`
- `syncState`
- `settings`
- `searchIndex`

Why IndexedDB:

- It stores large structured data.
- It can store `Blob`/`File` objects.
- It is supported broadly enough for a GitHub Pages PWA.
- You already have working IndexedDB patterns in this repo.

Relevant repo examples:

- `ghostink-flashcards/js/storage.js`
- `voxmark/js/storage.js`

### Browser storage details that matter

- Use `navigator.storage.estimate()` to show the user how much local space is being used.
- Call `navigator.storage.persist()` once the user has real data so eviction risk is reduced where supported.
- Assume local data can still be lost on some browsers if the site is rarely used or storage pressure happens.

Inference:
Drive is your durability guarantee. IndexedDB is your performance and offline layer.

## Media strategy

This is the second most important decision after the document format.

### What you want

- support images
- support at least some videos
- let Gemini or other tools inspect those files later
- avoid filling browser storage forever

### Recommended media model

Use **Drive as the canonical store for original media**.

Use **browser storage only as a working cache**.

For images specifically, add optimization as a first-class pipeline, not as an afterthought.

### Asset lifecycle

1. User adds image/video.
2. File is stored locally immediately in IndexedDB so the UI is instant and offline-safe.
3. App creates a thumbnail/preview locally.
4. If the file is an image and optimization is enabled, the app creates an optimized derivative before upload.
5. Sync queue uploads the chosen asset version to Drive.
6. After successful upload, local cache policy decides whether to keep:
   - full file
   - preview only
   - metadata only

### Image optimization policy

This should be configurable in settings because different users will care differently about:

- archival fidelity
- Drive storage usage
- local storage usage
- upload speed

Recommended settings:

- `Original only`
- `Optimized only`
- `Original + optimized`

Recommended default:

- `Optimized only` for most screenshots/photos

Recommended optimization behavior:

- resize very large images
- convert photos/screenshots to WebP
- strip metadata/EXIF by default
- create a thumbnail preview for local rendering

Suggested default targets:

- long edge cap: `2200px` to `2560px`
- WebP quality: `0.78` to `0.86`

Important nuance:

- PNG should remain available for diagrams or transparency-sensitive assets
- browser-side image optimization is practical
- browser-side video transcoding should not be a default requirement

For video, the safer initial strategy is:

- upload the original file
- generate and cache a preview/poster if possible
- optionally cap duration/size for local-first workflows

### Cache policy

For your use case, the best default is:

- Keep full local copies of small assets.
- Keep thumbnails/previews for larger assets.
- Re-download large originals from Drive on demand.

Suggested thresholds:

- images under 10 MB: keep locally
- videos under 40 MB: optional keep locally
- anything bigger: upload, then keep preview plus metadata only unless explicitly pinned

This is not because the browser cannot store more. It is because long-term local bloat will degrade reliability.

### Drive layout for assets

Keep assets next to the document that references them unless you later implement deduplication.

That makes manual Drive browsing much clearer.

### Important constraint

Do not store large images and videos as base64 inside document JSON.

Your current `QuickAdd` export contract supports base64 exports, which is useful for transport and some save flows, but it should not be the canonical Drive storage format for a media-heavy app.

Use real files in Drive.

## The editor model

You want:

- freeform editing
- quick add editing
- inline, not popup
- Notion-like feel

That means you should not treat freeform mode and quick-add mode as separate editors.

### Recommended editor shape

Use a **hybrid block editor**:

- each document is a list of blocks
- paragraph blocks are freeform text
- the same paragraph block can host inline semantic chips/tokens from `QuickAdd`
- slash commands create structured blocks and properties

The critical editor behaviors you care about are:

- block-based editing, not one giant textarea
- paste and retain useful structure
- slash insertion
- drag/reorder blocks
- convert block type in place
- indent/outdent nested items
- image/video/embed blocks
- strong keyboard behavior
- mobile survivability

That is much closer to a ProseMirror/Tiptap-style problem than a plain Markdown editor problem.

### Block types for v1

- paragraph
- heading
- bullet list
- checklist
- quote
- code
- divider
- image
- video
- embed/link preview
- callout
- table
- chart
- property row
- related items

### Inline semantics

Inside paragraph blocks, detect and support:

- `#tags`
- `@people`
- dates
- date ranges
- times
- durations
- currencies
- counts
- ratings
- quick-add field prefixes
- attachment references

This is where your existing `QuickAdd` work becomes strategic.

## How your current QuickAdd component fits

The existing component already gives you a lot:

- deterministic parsing
- AI-assisted parsing
- inline pills
- slash-like field menu behavior
- attachment handling
- export/import contracts
- validation hooks
- history

Relevant repo files:

- `components/quick-add/README.md`
- `components/quick-add/quick-add-component.js`
- `components/quick-add/quick-add-component.css`

### Recommended reuse strategy

Do not drop the current component in unchanged as the final main editor.

Instead:

- reuse its parsing engine
- reuse its schema model
- reuse its inline pill mechanics
- reuse its attachment semantics
- reuse its AI dispatch contract

Then make a new host editor where `QuickAdd` powers inline structured interpretation inside normal blocks.

### Concrete integration model

Option A, best fit:

- build a block editor shell
- mount `QuickAdd`-style parsing on active paragraph blocks
- when text matches configured field patterns, convert to inline semantic tokens
- allow toggling between rendered token view and raw text view

Option B, faster but less ideal:

- use `QuickAdd` as the top capture block of a document
- convert parsed results into document properties and generated blocks

I would recommend Option A if the goal is a long-lived app that actually feels unified.

## Editor library evaluation

This is the place where the project can either become realistic or turn into a trap.

### Tiptap

Current status from Tiptap's docs:

- Tiptap works with vanilla JavaScript.
- Tiptap also documents a CDN example using ESM imports.
- The underlying editor is flexible enough for rich blocks, lists, tables, images, code, and custom nodes.
- There is a drag handle extension.
- There is a file handler extension for paste/drop events.

Why Tiptap is attractive here:

- best fit for a Notion-like editing feel
- good paste handling
- strong extension model
- excellent control over custom inline semantics
- realistic path to custom blocks and property chips
- can work in a static app without a backend

Why Tiptap is not a free lunch:

- the polished "Notion-like" template is tied to Tiptap UI components and React
- the official slash dropdown/menu tooling is not the simple open-source vanilla path
- most of the most polished UI examples assume a modern app stack
- you will still build a lot of the actual UX yourself

Important implication:

If you stay strict on "no build process at all", Tiptap core is still viable, but the nice official Notion-like UI layer is not the thing you are directly adopting. You are adopting the editor engine and building your own shell around it.

### Editor.js

Current status from Editor.js docs:

- Editor.js supports direct CDN loading.
- It is block-style by default.
- It has a plugin/tool architecture.
- It supports paste substitutions for tags, files, and patterns.

Why Editor.js is attractive here:

- easiest mental fit for no-build static usage
- block editor from day one
- custom tools are straightforward conceptually
- good if you want rigid block JSON output

Why I would not make it the primary choice here:

- it is less natural for the kind of rich inline semantics you want
- Notion-like flow, type changes, inline chip behavior, and polished block ergonomics are harder to make feel great
- its natural persistence format is Editor.js JSON, which is not the remote readable format you ultimately want

Inference:
Editor.js is a good "faster to first block editor" option, but a weaker fit for your exact hybrid freeform-plus-semantic-inline editor.

### BlockNote

Current status from BlockNote's docs:

- BlockNote does support vanilla JavaScript.
- BlockNote explicitly says its best out-of-the-box experience is with React.
- The vanilla path requires writing your own UI and is not their recommended route.

That makes BlockNote a poor match for your stated constraints.

If you were already willing to use React plus a build process, it would become more compelling.

### Lexical

Current status from Lexical's docs:

- Lexical is framework-agnostic.
- Lexical is intentionally minimal and expects you to assemble rich behavior through plugins and custom logic.

That makes it powerful, but probably too low-level for this project.

If you choose Lexical, you are choosing to build a large part of the Notion-like shell yourself anyway.

### Recommendation

If you keep the current constraints, I would choose one of these two paths:

#### Path 1: best long-term fit

- Tiptap core in plain JavaScript
- imported through ESM/CDN or local modules
- custom block UI shell
- custom slash menu
- custom drag/hover chrome
- `QuickAdd` semantics integrated as custom marks/nodes/helpers

This is the best chance of getting the editor feel right.

#### Path 2: fastest lower-risk prototype

- Editor.js
- custom tools for journal blocks, attachments, embeds, metrics, and quick-add capture

This is the best chance of shipping a functional block editor faster, but I would expect you to feel its ceiling sooner.

### What I would personally do

For your exact target, I would use **Tiptap core as the editor engine** and accept that the Notion-like shell is custom work.

That is the cleanest middle ground between:

- "everything from scratch"
- "React-heavy paid template"
- "block editor that never quite feels like the thing you want"

## Calendars, timelines, numbers, and charts

These should be **views**, not separate storage systems.

### Calendar support

Calendar view is just a filtered projection of documents with:

- `date`
- `startAt`
- `endAt`
- `durationMinutes`

Types that can appear on calendar:

- journal entries
- events
- reminders
- scheduled tasks
- recaps

### Numeric understanding

Support two kinds of number handling:

1. deterministic parsing
2. AI-assisted interpretation

Deterministic parsing should cover:

- `1h 30m`
- `90m`
- `₹1,250`
- `$42`
- `12km`
- `3 reps`
- `7/10`
- `2.5h deep work`

AI can help when the text is fuzzy, but the core cases should not depend on AI.

### Derived metrics engine

Run a local derived-data pipeline that computes:

- word counts
- entry counts
- streaks
- time by tag
- time by person
- mood averages
- activity totals
- first/last occurrence
- rolling weekly/monthly summaries

Store derived metrics locally, but do not make them the only source of truth. They should always be recomputable from documents.

### Charts

Store chart definitions as JSON view configs:

```json
{
  "id": "dashboard_time_by_tag",
  "type": "bar",
  "source": {
    "documentTypes": ["journal", "event"],
    "groupBy": "tags",
    "metric": "durationMinutes",
    "window": "last_30_days"
  }
}
```

That keeps charts portable and Drive-readable.

## Search, backlinks, and graph behavior

You do not need a backend search service.

Use a local search index in IndexedDB and rebuild it from synced documents.

### Search features

- title search
- body search
- tag/person filters
- date filters
- type filters
- attachment presence
- saved views

### Relations

Support:

- explicit links to other documents
- backlinks
- linked mentions from tags and people
- thread continuation

This gives you most of the useful "knowledge tool" behavior without needing a graph database.

## Sync architecture

### Key rule

Drive sync should be **snapshot-based per document**, not per keystroke.

Every keystroke does:

- local save
- local indexing
- enqueue dirty state

Then a debounced sync worker does:

- write `content.md`
- write `meta.json`
- upload changed assets
- update local sync metadata

### Why this works for your use case

- mostly single user
- low collaboration pressure
- minimal backend
- simpler conflict handling
- better offline behavior

### PWA-aware retry behavior

The retry triggers should be:

- app is open and debounce fires
- app regains focus
- connectivity returns
- user presses sync
- service worker background sync fires, when supported

This is the correct practical behavior for a PWA across browsers.

### Required sync state per document

- `docId`
- local revision
- local updatedAt
- drive folder ID
- Drive file IDs for content/meta
- last synced hash
- dirty flag
- pending operations

### Change detection

Use content hashes locally so the app does not upload unchanged files.

### Remote change detection

Use the Drive `changes` feed or periodic file metadata checks.

For your initial version, a simpler approach is enough:

- remember known file `modifiedTime`
- periodically refresh changed folders
- pull when newer than local sync state

Later, if needed, upgrade to Drive change tokens.

## Conflict handling

Because this is primarily for you, do not overengineer CRDTs.

### Recommended conflict model

- last-write-wins by default
- if both sides changed since last sync, create a conflict copy
- never silently merge rich text blocks beyond trivial field merges

For example:

- local keeps current draft
- remote version is saved as `conflict_remote_<timestamp>.md`
- user can compare and merge manually

This is the correct level of sophistication for a personal tool.

## Auth and Google Drive permissions

This part is feasible in a pure static app.

### Recommended auth model

Use Google Identity Services token flow in the browser.

That means:

- no backend required for auth
- OAuth client ID is public, which is normal
- access tokens stay client-side
- token refresh is user-gesture driven

This is not like a Notion internal integration token.

For this app, the normal model is:

- user signs in with Google
- user grants Drive access to the app
- the app acts on behalf of that user

That means:

- no long-lived secret token embedded in the static app
- no server-side integration token model like Notion's common internal-integration pattern
- no need for the Google CLI at runtime

The Google CLI or `gcloud` may be useful for setup, but it is not part of the product architecture.

### Scope strategy

Prefer the smallest practical Drive scope.

For this app, the best first attempt is:

- `drive.file`

That scope is good if:

- the app creates its own app folder/files
- the user explicitly picks the folder or files the app may access

If you later want the app to freely inspect arbitrary existing Drive files and folders, broader scope may become necessary, but that should not be the starting point.

### What setup this actually requires

You will need:

- a Google Cloud project
- Google Drive API enabled
- OAuth consent screen configured
- a Web OAuth client
- authorized JavaScript origins for GitHub Pages and local development

Then, in the app, you need:

- connect/disconnect Drive UX
- root-folder bootstrap
- local storage of Drive file and folder IDs
- upload/update/delete flows
- pull/reconcile flows
- sync status UI

### Costs and limits

For the Drive API itself, Google documents the API as available at no additional cost.

The practical costs are:

- normal Google Drive storage consumption
- optional cloud AI costs if you use third-party or Google cloud models

For a personal journaling app, the official API request limits are unlikely to be the main constraint. The more realistic bottlenecks are:

- Drive storage space
- media size and upload volume
- local browser cache size
- mobile/browser lifecycle behavior

Official Drive limits currently include per-minute query limits and a 750 GB/day upload+copy limit per user. Those are far above what this product is likely to hit under normal use.

Inference:
The real design pressure is media discipline, not API quota pressure.

### Folder setup UX

Recommended first-run flow:

1. User signs in with Google.
2. App asks to connect Drive.
3. App creates or opens a dedicated root folder such as `MyJournalDrive`.
4. App stores folder ID locally.
5. All future files live inside that folder tree.

This keeps the permissions model conceptually simple.

## GitHub Pages and no-build constraints

This part is also viable.

GitHub Pages can host plain HTML, CSS, and JavaScript files directly from a repo, with no mandatory build step.

### Recommended app stack

- `index.html`
- ES modules in `/js`
- CSS in `/styles`
- service worker for offline shell caching
- web manifest for installability
- CDN imports only for libraries that genuinely save time

### Good CDN-fit libraries

- small IndexedDB helper like `idb`
- Markdown parser if needed
- chart library
- date utility library
- syntax highlighter
- lightweight drag/drop helper

### Bad fit libraries

- editor stacks that assume bundling and heavy framework tooling
- libraries that require SSR
- anything that forces a full React/Vite pipeline unless you later decide the no-build rule is hurting you

## Recommended implementation philosophy

Because you explicitly do not care about backward compatibility yet, you should use that to your advantage.

### What that means in practice

- use aggressive schema evolution
- keep a snapshot/export button
- prefer destructive migrations over permanent compatibility layers
- keep one active format version only

Do not spend time building:

- complex migration compatibility matrices
- broad version negotiation
- legacy editor support
- defensive sync abstractions for hypothetical enterprise users

Instead:

- keep nightly or manual Drive snapshots
- if schema changes, migrate current data and move on

That matches your real usage profile.

## Implementation phases toward full v1

These phases are not scope-reduction phases.

They are the recommended build order for delivering the full discussed v1.

### Phase 1: foundation and app shell

- installable PWA shell
- IndexedDB schema
- basic document list
- document editor shell
- Drive auth
- Drive root-folder setup
- create/update/delete document sync

### Phase 2: editor system and core writing flows

- paragraph/heading/list/checklist blocks
- inline tags and mentions
- inline date/time/duration parsing
- inline `QuickAdd` semantics
- attachments with image support
- responsive editor chrome
- Journalistic-inspired visual system

### Phase 3: primary views and navigation

- Today/Home screen
- daily timeline
- calendar
- people pages
- tag pages
- backlinks/linked documents
- search
- boards / column views

### Phase 4: metrics, dashboards, and health layer

- word counts
- streaks
- duration rollups
- tag charts
- person/activity charts
- saved dashboards
- symptom/factor/medication/treatment tracking
- health measurements
- health correlation reports
- Fitbit integration
- whichever browser-feasible health imports are accepted for v1

### Phase 5: richer media, audio, and transcription

- video support
- audio capture and storage
- transcript storage and metadata
- BYOK transcription
- richer previews

### Phase 6: AI and advanced capture behaviors

- BYOK AI actions
- structured summarization
- extraction and cleanup tools
- advanced capture cleanup/structuring flows

## Still outside v1 unless explicitly re-added later

- realtime collaboration
- CRDTs
- server-owned storage
- multi-user permission systems
- complex plugin frameworks
- native Apple Health / Health Connect companion apps
- full arbitrary database formulas
- trying to mimic Notion at 100% fidelity

You do not need "Notion clone." You need "Notion-like editor ergonomics on top of a journal/notes system."

## The strongest single-product concept

If I reduce this to one sentence:

> Build an offline-first static journaling and thinking app where every note is a block-based document with inline semantic capture, synced to a readable Markdown-plus-JSON folder tree in the user's Google Drive.

That is the coherent center.

Everything else should hang off that.

## Specific decisions I would make now

### 1. Canonical remote format

Choose:

- `content.md` + `meta.json` per document

Do not choose:

- one huge remote JSON database

### 2. Canonical live store

Choose:

- IndexedDB

Do not choose:

- Drive-only editing

### 3. Editor model

Choose:

- custom hybrid block editor with inline `QuickAdd` semantics

Do not choose:

- separate "freeform mode" and "quick add mode" as unrelated experiences

### 4. Media model

Choose:

- Drive original + local cache policy

Do not choose:

- permanent full local copies of all media

### 5. AI model

Choose:

- BYOK browser-side provider calls
- optional user-owned worker later

Do not choose:

- first-party paid AI backend as a requirement

### 6. Sync complexity

Choose:

- per-document debounced sync
- conflict copies

Do not choose:

- collaborative merge engines

## Risks you should know up front

### 1. Rich editor complexity

The editor is the hardest part, not Drive sync.

Getting a truly pleasant Notion-like editing experience without a build system is possible, but it requires discipline and probably a custom editor shell.

### 2. Browser storage behavior

Local storage is strong enough for active use, but it should never be treated as the only durable store.

### 3. OAuth and Drive setup friction

This app will need:

- a Google Cloud project
- OAuth consent setup
- authorized origins for GitHub Pages and local development

That is manageable, but it is real setup work.

### 4. Large media offline

If you attach many large videos while offline, browser storage can become the limiting factor before Drive sync resumes.

### 5. Mobile editor polish

The difference between "works" and "pleasant" on mobile is mostly about selection, keyboard handling, and attachment flows.

## V1 release definition

For this project, v1 is the full integrated product discussed in this document.

That means v1 should include:

- static PWA shell on GitHub Pages
- IndexedDB local store
- Google Drive sync for documents, transcripts, and media
- Markdown + JSON remote format
- Notion-like block editor
- inline `QuickAdd` semantics
- journal/timeline/history views
- calendar view
- boards / columns views
- search and backlinks
- charts and dashboards
- AI BYOK support
- transcription support
- health/self-tracking model
- Bearable-like factor/symptom/measurement tracking
- responsive behavior across phone, tablet, and desktop

Some platform-specific integrations still need to be interpreted through the architecture constraints:

- Fitbit can fit directly into the PWA architecture and can therefore count as a normal v1 feature
- Apple Health direct integration cannot be done purely as a browser HTTP integration, so the realistic v1 interpretation is either:
  - no direct Apple Health support yet, or
  - a user-owned Shortcut bridge if that path is accepted
- Android Health Connect likewise requires native Android work, so it is not part of the pure static/PWA implementation unless you explicitly decide to add a native companion

So the correct planning stance is:

- the product feature set is v1
- the implementation is phased
- impossible native-only integrations are not silently assumed into the pure web build

## Future AI provider architecture

You said explicitly that Gemini-readability is a side effect of the file format, not an in-app dependency. That is the right framing.

The app's AI should be designed as a provider abstraction from day one.

Recommended provider IDs:

- `none`
- `openai_byo_key`
- `google_byo_key`
- `anthropic_byo_key`
- `transcription_byo_key`
- `chrome_prompt_api`
- `local_model`

That lets the rest of the app ask for operations like:

- summarize selection
- extract properties from text
- propose tags/people
- rewrite block
- parse fuzzy time logs

without coupling the app to one AI source.

### Chrome Prompt API and built-in AI

Chrome's built-in AI work is real and worth planning for, but it should remain a future optional provider.

Reasons:

- support is browser-specific
- support is desktop-oriented
- hardware requirements apply
- it should not be assumed to exist on mobile

So the right path is:

- define a provider interface now
- add `chrome_prompt_api` later if available
- keep cloud BYOK and local-model providers separate

### Local models

The same provider interface should be capable of supporting:

- browser-exposed local APIs
- user-installed local model bridges
- future desktop helper processes if you ever go beyond pure static web

You do not need to implement that now, but you do need the abstraction boundary now.

## Transcription

Transcription should be treated as a first-class capture mode, not as an afterthought.

This matters because the product already assumes:

- fast capture
- journaling flows
- freeform and structured entry
- users who may dictate into the app

### Capture paths

The app should support three distinct transcription paths:

1. external transcription into the input box
2. direct in-app audio capture without AI
3. in-app audio capture with BYOK transcription

#### 1. External transcription into the input box

This is the zero-complexity path.

Examples:

- OS dictation
- keyboard microphone
- third-party speech apps
- browser or mobile voice typing

The app should be friendly to this by:

- making the main input/editor accept long dictated text cleanly
- preserving paragraph breaks when possible
- making cleanup and structuring easy after dictation

#### 2. Direct in-app audio capture without AI

Even without transcription, the app should be able to:

- record audio
- store the recording
- attach it to a journal/document entry
- leave transcription for later

This is important because capture should not fail just because a transcription provider is unavailable.

#### 3. In-app audio capture with BYOK transcription

This is the richer path.

The user records or uploads audio, the app sends it to a transcription provider using the user's own API key, and the result becomes part of the document.

### Provider model

Transcription should use the same provider-abstraction philosophy as text AI.

Recommended transcription provider IDs:

- `none`
- `openai_byo_key`
- `google_byo_key`
- `groq_byo_key`
- `deepgram_byo_key`
- `assemblyai_byo_key`
- `local_model`
- `browser_native`

This is intentionally broader than "one API key type" because transcription providers differ materially in:

- pricing
- quality
- latency
- diarization
- timestamp support
- file size limits
- browser CORS support

The app should not hardcode itself to one vendor.

### What the transcription UX should look like

#### Entry points

Transcription can be started from:

- Today / quick capture
- document editor toolbar
- attachment menu
- dedicated audio note action

#### User choices at transcription time

When a user records or uploads audio, the app should offer a small settings sheet with:

- provider
- language or auto-detect
- speaker diarization on/off
- timestamps on/off
- store audio original on/off
- auto-insert into current document on/off
- auto-run structuring on/off

These should remember defaults from settings.

### Stored artifacts

When transcription happens, there are potentially four distinct artifacts:

1. original audio file
2. transcript text
3. transcript metadata
4. derived structured interpretation

#### 1. Original audio file

This should be treated like any other asset:

- stored locally first
- uploaded to Drive
- optionally cached locally after sync

#### 2. Transcript text

This should be stored in a readable format.

Recommended approach:

- transcript text becomes part of the document body when the user wants it inline
- a standalone transcript file is also stored when audio is first-class

Recommended transcript file:

```text
transcript.md
```

#### 3. Transcript metadata

Store in:

```text
transcript.json
```

Include:

- provider
- model
- createdAt
- language
- duration
- confidence if available
- timestamps if available
- speaker segments if available
- source audio file reference

#### 4. Derived structured interpretation

This is optional and separate from the transcript itself.

Examples:

- summarized journal entry
- extracted tasks
- extracted timeline
- extracted durations
- tags/people

This should not overwrite the raw transcript. It should be stored as:

- document content inserted by the user, or
- structured properties / generated blocks, or
- a separate AI operation result

### Drive layout for transcription

For audio-first entries or entries with attached recordings, use:

```text
documents/
  doc_<id>/
    content.md
    meta.json
    assets/
      audio_<id>.m4a
    transcripts/
      transcript.md
      transcript.json
```

This keeps the whole capture chain readable:

- the original audio exists
- the raw transcript exists
- the document content exists

That is good both for ownership and for future AI/Gemini inspection.

### Document model additions

To support transcription cleanly, add fields like:

- `audioAssets[]`
- `transcriptRefs[]`
- `transcriptionStatus`
- `transcriptionProvider`
- `transcriptionLanguage`
- `transcriptionUpdatedAt`

Optional:

- `speakerSegments[]`
- `transcriptSummary`

### Local processing and sync flow

The lifecycle should be:

1. user records or uploads audio
2. audio is stored locally immediately
3. document gets a pending transcription state
4. if provider configured and online, transcription request is sent
5. transcript result is saved locally
6. audio + transcript files are queued for Drive sync
7. document body/properties are updated depending on user choice

If transcription fails:

- audio still remains attached
- pending or failed transcription state is visible
- user can retry later

### Editor insertion behavior

The user should be able to choose one of these insertion modes:

- `Transcript as body text`
- `Transcript as collapsible block`
- `Transcript as attachment only`
- `Transcript as source for structured journal entry`

Recommended default:

- `Transcript as collapsible block`

Why:

- preserves the raw source
- avoids flooding the main body
- still keeps it visible and editable

### Prompting and instructions for transcription cleanup

You explicitly mentioned wanting instructions that go along with transcription.

That means transcription should support a second optional stage:

- raw speech-to-text
- transcript cleanup / normalization

Those are different operations and should be separated.

#### Raw transcription prompt/config

Purpose:

- get faithful text from audio
- preserve meaning
- optionally preserve disfluencies depending on setting

User-configurable instructions could include:

- "Preserve paragraph breaks where likely"
- "Keep filler words"
- "Remove filler words"
- "Normalize punctuation"
- "Do not summarize"
- "Mark uncertain words"

#### Cleanup / structuring prompt/config

Purpose:

- turn raw transcript into something more useful for the app

Examples:

- clean journal prose
- bullet summary
- extract tasks
- extract events and durations
- infer tags and people

This should be optional and explicitly separate from raw transcript storage.

### Settings

Add a transcription section in settings with:

- provider
- API key
- model
- default language
- auto-detect language on/off
- diarization default
- timestamps default
- store original audio default
- preferred insertion mode
- cleanup instructions
- raw transcript instructions

### Privacy and cost considerations

Transcription is often more sensitive than ordinary text editing.

The app should be explicit about:

- where audio is sent
- which provider is used
- whether raw audio is stored
- whether transcript is stored
- whether cleanup AI runs after transcription

Cost-wise:

- external transcription may cost money depending on provider and minutes processed
- storing audio in Drive consumes more space than text

Inference:
Transcription cost pressure is much more likely to come from API billing and Drive storage than from Drive API request limits.

### Local and future transcription options

The architecture should leave room for:

- browser-native speech APIs when useful
- Chrome built-in/local AI paths later
- user-installed local model bridges

But for the main product path, the practical version is:

- BYOK cloud transcription
- readable stored transcript files
- original audio retained when desired

### Transcription features required before v1 release

Include:

- audio upload
- optional in-app recording
- BYOK transcription provider
- transcript file storage
- transcript metadata storage
- collapsible transcript block in the editor
- retry failed transcription

Do not include in v1:

- complex speaker timeline editing
- waveform-heavy editing UI
- browser-side audio model inference as a requirement
- automatic multi-step transcript-to-database pipelines

## Final recommendation

Yes, this is a good project to build.

The architecture I would commit to is:

- static GitHub Pages app
- installable PWA
- IndexedDB for live state
- Google Drive for durable readable files
- per-document folder with `content.md`, `meta.json`, and `assets/`
- custom hybrid block editor
- inline `QuickAdd` semantics
- view-driven calendars/charts/boards
- BYOK AI

That is the narrowest architecture that still satisfies the real thing you want, instead of collapsing into either:

- "just a local notes app", or
- "just a sync wrapper around Drive files", or
- "a fake Notion clone that needs a backend anyway"

## Sources

Product references:

- [Prism](https://prism.you/)
- [Journalistic](https://journalisticapp.com/)
- [Supernotes](https://supernotes.app/)
- [Columns](https://columns.app/)
- [Bundled Notes](https://bundlednotes.com/)
- [Gami](https://gaminote.com/)
- [Bearable](https://bearable.app/)
- [Bearable support and tracking tips](https://bearable.app/support/tips/track-your-mental-health/)

Official capability references:

- [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [Google Identity Services token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google OAuth credentials setup](https://developers.google.com/workspace/guides/create-credentials)
- [Google OAuth consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Google Drive upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google Drive changes guide](https://developers.google.com/workspace/drive/api/guides/manage-changes)
- [Google Drive app data folder guide](https://developers.google.com/workspace/drive/api/guides/appdata)
- [Google Drive API scope guidance](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Google Drive usage limits](https://developers.google.com/drive/api/guides/limits)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN StorageManager estimate](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN Origin Private File System](https://developer.mozilla.org/docs/Web/API/File_System_API/Origin_private_file_system)
- [MDN Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [MDN Periodic Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API)
- [MDN PWA offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [web.dev service workers](https://web.dev/learn/pwa/service-workers)

Editor references:

- [Tiptap install overview](https://tiptap.dev/docs/editor/getting-started/install)
- [Tiptap vanilla JavaScript and CDN usage](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
- [Tiptap FileHandler extension](https://tiptap.dev/docs/editor/extensions/functionality/filehandler)
- [Tiptap product site showing Notion-like template/UI components](https://tiptap.dev/)
- [Editor.js getting started](https://editorjs.io/getting-started/)
- [Editor.js paste substitutions](https://editorjs.io/paste-substitutions/)
- [BlockNote vanilla JavaScript guide](https://www.blocknotejs.org/docs/getting-started/vanilla-js)
- [Lexical overview](https://lexical.dev/)

Future AI references:

- [Chrome built-in AI overview](https://developer.chrome.com/docs/ai/get-started)
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)

Health integration references:

- [Apple health and fitness developer overview](https://developer.apple.com/health-fitness/)
- [Fitbit Web API reference](https://dev.fitbit.com/build/reference/web-api/)
- [Fitbit intraday heart rate example](https://dev.fitbit.com/build/reference/web-api/intraday/get-heartrate-intraday-by-date-range/)
- [Google Fit REST API overview](https://developers.google.com/fit/rest)
- [Google Fit verification requirements](https://developers.google.com/fit/verification)
- [Health Connect overview and availability](https://developer.android.com/health-and-fitness/health-connect/availability)
- [Health Connect medical records overview](https://developer.android.com/health-and-fitness/health-connect/medical-records)
- [Google Drive-style OAuth is not the same as HealthKit](https://developer.apple.com/health-fitness/)
- [Apple Shortcuts guide mentioning Log Health Sample](https://support.apple.com/en-hk/guide/shortcuts/apd8b28e2166/ios)
- [Apple Shortcuts API request guide](https://support.apple.com/en-au/guide/shortcuts/apd58d46713f/ios)

Repo context used:

- `components/quick-add/README.md`
- `components/quick-add/quick-add-component.js`
- `ghostink-flashcards/js/storage.js`
- `voxmark/js/storage.js`
