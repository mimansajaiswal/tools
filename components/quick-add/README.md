# Quick Add Component

`QuickAdd` parses semi-structured text into structured entries.

- Deterministic mode: prefix/terminator parsing only.
- AI mode: deterministic helpers + in-component AI orchestration.

## Demo routes

The components demo is now a directory app (not one giant HTML file):

- `/components/components-demo/index.html`
- `/components/components-demo/quick-add-demo.html`

## Breaking AI contract (current)

AI mode now requires `ai.dispatch(batch, context)`.

`QuickAdd` owns:

- debounce and min-length thresholds
- separator-aware chunking
- prompt generation
- provider-ready request shaping
- parse-state transitions (`processing`, `queued`, `ready`, etc.)
- response normalization/merge
- stale-request protection

Caller owns only:

- dispatch now, or queue externally
- queue persistence + replay timing
- replay callbacks into component

`QuickAdd` does **not** persist queue data.

## Public API

- `QuickAdd.create(config)` -> instance
- `QuickAdd.parse(input, config)` -> deterministic parse result (no mount required)

Instance methods:

- `setInput(text)`
- `getResult()` -> live runtime snapshot (non-serialized, may include `File` references)
- `exportResult(options?)` -> async save payload with stable serialization contract
- `importResult(payload, options?)` -> async hydration from exported payload
- `getUnlinkedAttachments(options?)` -> async list of uploaded attachments not linked to entries
- `checkWarnings(options?)` -> async warning gate helper for `save`/`close`
- `updateConfig(nextConfig)`
- `destroy()`
- `undo()`, `redo()`, `canUndo()`, `canRedo()`, `clearHistory()`
- `parseAI({ force?: boolean })`
- `clearAIEntries()`
- `verifyAiRuntime()`
- `applyQueuedAIResult({ requestId, responses, providerRawResponse? })`
- `applyQueuedAIError({ requestId, error: { kind, message, detail? } })`

## V2 Save Contract (breaking)

Use `exportResult()` before closing/destroying the component when attachments matter.

`getResult()` is intentionally fast and runtime-oriented; `exportResult()` is the persistence boundary.

### `exportResult(options)`

```ts
type ExportOptions = {
  attachmentMode?: 'base64' | 'metadata-only'; // default: 'base64'
  includeUnlinked?: boolean;                    // default: false
  runValidation?: boolean;                      // default: true
  runWarnings?: boolean;                        // default: true
};
```

```ts
type ExportAttachment = {
  id: string;
  ref: string;
  entryKey: string | null;
  fieldKey: string | null;
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  fingerprint: string;
  previewUrl: string | null;
  contentBase64?: string;
  encoding?: 'base64';
  byteLength?: number;
  linked: boolean;
};

type QuickAddExportPayload = {
  version: 2;
  mode: 'deterministic' | 'ai';
  input: string;
  entries: Array<unknown>;
  attachments: ExportAttachment[];
  warnings: string[];
  missing?: string[];
  metadata: { exportedAt: string };
};
```

### `importResult(payload, options)`

```ts
type ImportOptions = {
  mergeStrategy?: 'replace' | 'append';                 // default: 'replace'
  attachmentConflict?: 'dedupe-by-fingerprint' | 'keep-both'; // default: 'dedupe-by-fingerprint'
};
```

## New Integrator Hooks

### Accessibility

```ts
a11y: {
  inputAriaLabel?: string; // default: "Quick add input"
}
```

### Warnings (default-on)

```ts
warnings: {
  unlinkedAttachments: {
    enabled?: boolean; // default: true
    onCheck?: (payload: {
      action: 'save' | 'close';
      unlinkedAttachments: ExportAttachment[];
      linkedAttachmentCount: number;
      result: unknown;
    }) => boolean | Promise<boolean>;
  };
}
```

### Validation

```ts
validation: {
  beforeCommitField?: (context: {
    entryIndex: number;
    entryKey: string | number;
    fieldKey: string;
    nextValue: unknown;
    source: 'typing' | 'click';
    sourceRegion: 'inline' | 'card';
    fieldType: string;
  }) => Promise<{ allow: boolean; value?: unknown; reason?: string; warning?: string } | void> | { allow: boolean; value?: unknown; reason?: string; warning?: string } | void;

  beforeSaveEntry?: (context: {
    entryDraft: unknown;
    allEntriesDraft: unknown[];
    source: 'save';
  }) => Promise<{ allow: boolean; reason?: string; code?: string } | void> | { allow: boolean; reason?: string; code?: string } | void;
}
```

### Custom Option Persistence

```ts
options: {
  onCreateOption?: (payload: {
    fieldKey: string;
    value: string;
    label: string;
    entryIndex: number;
    source: 'typing' | 'click';
  }) => Promise<{ value: string; label?: string; color?: string } | null | false | void> | { value: string; label?: string; color?: string } | null | false | void;

  onOptionsCatalogChange?: (payload: {
    fieldKey: string;
    options: Array<{ value: string; label: string; color?: string | null }>;
  }) => void;
}
```

### History

```ts
history: {
  enabled?: boolean;  // default: true
  maxDepth?: number;  // default: 100
}
```

### Field Slash Menu

```ts
showFieldMenuOnTyping?: boolean;      // default: true
fieldMenuTrigger?: string;            // default: "/"
fieldMenuShowUsedFields?: boolean;    // default: false (shows only fields not yet used in the current entry)
fieldMenuShowRequiredMeta?: boolean;  // default: true
fieldMenuShowAutoDetectMeta?: boolean;// default: true
showFieldActionBar?: boolean;         // default: false
fieldActionBarButtons?: Array<{       // default: []
  fieldKey: string;                   // required field key from schema
  iconSvg?: string;                   // inline SVG markup for the button icon
  showLabel?: boolean;                // default: true
  visible?: boolean;                  // default: true
}>;
hideFieldTerminatorInPills?: boolean; // default: false (keeps underlying text intact; only visual inline pills hide terminator)
autoCloseFieldOnSpace?: boolean;      // default: false
autoCloseFieldOnSpaceConfidenceThreshold?: number; // default: 0.9, range 0..1
fontFamily?: string;                  // default: CSS token --qa-font
```

Typing the trigger (for example `/`) opens a field menu in the dropdown; selecting an item inserts that field's prefix at the caret. The fallback field (usually `title`) is intentionally excluded from this menu.
When `autoCloseFieldOnSpace` is enabled, pressing space at the end of an active field value can auto-commit that field (append terminator) when confidence meets the configured threshold.
When `showFieldActionBar` is enabled, action buttons render under the input surface and remain available while the input area scrolls. Clicking a button inserts/open-focuses that field and opens date picker, option dropdown, or an input-style dropdown for non-dropdown field types.

### Multi-select dropdown ordering

```ts
sortSelectedMultiOptionsToBottom?: boolean; // default: true
```

When enabled, already-selected options are shown at the bottom of option dropdowns for multi-select fields.

### Number Math (safe arithmetic)

```ts
schema: {
  fields: Array<{
    key: string;
    type: 'number';
    allowMathExpression?: boolean; // field-level, default false
  }>
}
```

Supported operators: `+`, `-`, `*`, `/`, `%`, `^`, and grouping with `()`, `[]`, `{}`.
Evaluation is parser-based (no `eval`) with safety limits on length, token count, nesting depth, and numeric magnitude.

## AI config essentials

```js
const qa = QuickAdd.create({
  mount: document.getElementById('qa'),
  mode: 'ai',
  schema: { fields: [/* ... */] },
  ai: {
    provider: 'openai', // openai | anthropic | google | custom
    apiKey: '...',
    model: 'gpt-4o-mini',
    endpoint: '', // required for provider=custom
    autoParse: true,
    debounceMs: 420,
    minInputLength: 8,
    separatorAware: true,
    inlinePills: true,
    dispatch: async (batch, context) => {
      // caller transport boundary only
      // return { status: 'completed', responses: [...] }
      // or { status: 'queued', queueItems: [...], reason: 'offline' | 'deferred' | 'rate-limited' | 'custom', message?: string }
    }
  }
});
```

`batch` already contains exact request payloads shaped by the component (URL/method/headers/body + prompt/chunk metadata).

## Dispatch return contract

Completed:

```ts
{
  status: 'completed';
  responses: unknown[];
  providerRawResponse?: unknown;
}
```

Queued:

```ts
{
  status: 'queued';
  queueItems: unknown[];
  reason: 'offline' | 'deferred' | 'rate-limited' | 'custom';
  message?: string;
  providerRawResponse?: unknown;
}
```

## AI `getResult()` shape (key fields)

```ts
type AIResult = {
  mode: 'ai';
  input: string;
  entries: Array<unknown>;
  entryCount: number;
  warnings: string[];
  missing: string[];
  error: string;
  isProcessing: boolean;
  providerRawResponse: string;
  callerRequest: null | {
    mode: 'ai';
    requestId: number;
    input: string;
    chunks: Array<{ index: number; start: number; end: number; input: string }>;
    batch: Array<unknown>; // exact request payloads generated by component
    provider: string;
    model: string;
    endpoint: string;
    temperature: number;
    forceJson: boolean;
    webSearch: boolean;
    tools: unknown;
    dispatchConfigured: boolean;
    promptMode: string;
    hasCustomResponseParser: boolean;
  };
  parseState: {
    status: 'idle' | 'below-min-length' | 'processing' | 'queued' | 'ready' | 'stale' | 'offline' | 'error';
    isReady: boolean;
    isProcessing: boolean;
    isQueued: boolean;
    isStale: boolean;
    isOffline: boolean;
    shouldParse: boolean;
    hasInput: boolean;
    belowMinLength: boolean;
    minInputLength: number;
    currentInput: string;
    lastParsedInput: string;
    error: string;
    errorKind: string;
    queueReason: string;
    queueMessage: string;
    queueItems: unknown[];
  };
};
```

## Deterministic parser notes

Strict date and datetime validation now reject calendar rollovers.

Examples rejected:

- `2026-02-29`
- `2026-04-31`
- `2026-11-31T10:15`

Example accepted:

- `2028-02-29`

For `date`/`datetime` fields with `naturalDate: true`, missing-year inputs are inferred by default:

- `inferMissingYear` (default `true`)
- `missingYearPastWindowDays` (default `14`)

Behavior:

- Parse month/day with current year first (`24 Feb` -> `2026-02-24` if current year is 2026).
- If that inferred date is in the past by more than `missingYearPastWindowDays`, roll to next valid year.
- If the month/day is invalid for current year (for example `29 Feb` in a non-leap year), use the next valid year.
- Supports numeric and spoken day tokens like `15 Jan`, `15th Jan`, and `fifteenth january`.

Example field config:

```js
{
  key: 'due',
  type: 'date',
  naturalDate: true,
  inferMissingYear: true,
  missingYearPastWindowDays: 14
}
```

## Browser target

Modern browsers only. No backward-compatibility adapter is provided.
