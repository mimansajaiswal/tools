# Quick Add Component

`QuickAdd` parses semi-structured text into structured entries (deterministic mode) and supports AI extraction (AI mode).

## Quick start

```html
<div id="qa"></div>
<script src="./quick-add/quick-add-component.js"></script>
```

```js
const qa = QuickAdd.create({
  mount: '#qa',
  mode: 'deterministic',
  entrySeparator: '\n\n',
  fieldTerminator: ';;',
  multiSelectSeparator: ',',
  multiSelectDisplaySeparator: ', ',
  showDropdownOnTyping: true,
  schema: {
    fields: [
      { key: 'title', type: 'string', required: true },
      { key: 'priority', type: 'options', prefixes: ['!'], options: ['p1', 'p2', 'p3'], defaultValue: 'p2' },
      { key: 'tags', type: 'options', prefixes: ['tag:'], multiple: true, options: ['urgent', 'client'] },
      { key: 'due', type: 'datetime', prefixes: ['due:'], naturalDate: true, defaultValue: 'today' },
      { key: 'files', type: 'file', prefixes: ['file:'], multiple: true }
    ]
  },
  onParse: (result) => console.log(result)
});
```

## Public API

- `QuickAdd.create(config)` -> instance
- `QuickAdd.parse(input, config)` -> deterministic parse result only (no UI mount required)

Instance methods:

- `setInput(text)` -> updates input and re-parses
- `getResult()` -> latest result snapshot (AI mode also triggers non-blocking parse attempt when stale)
- `updateConfig(nextConfig)` -> merges/re-initializes config and re-renders
- `destroy()` -> unbinds events and clears mount
- `parseAI({ force?: boolean })` -> runs AI extraction (AI mode)
- `verifyAiRuntime()` -> runtime/provider verification (AI mode)
- `clearAIEntries()` -> clears AI entries/warnings/missing/error

## Top-level config (key fields)

- `mode`: `'deterministic' | 'ai'` (default: `'deterministic'`)
- `debounceMs`: deterministic input debounce (default: `300`)
- `allowMultipleEntries`: split by `entrySeparator` or treat whole input as one entry
- `entrySeparator`: entry delimiter (default: `'\n'`)
- `fieldTerminator`: token commit delimiter (default: `';;'`)
- `fieldTerminatorMode`: `'strict' | 'or-next-prefix' | 'or-end'`
- `multiSelectSeparator`: multi-option parse separator; must differ from `entrySeparator` and `fieldTerminator`
- `multiSelectDisplaySeparator`: card display separator for grouped multi-select values
- `allowNumberMath`: allow math expressions in number parsing (default: `false`)
- `enableNumberPillStepper`: enable number pill stepper popover with `+/-` controls (default: `false`)
- `numberPillStep`: default increment/decrement step when number stepper is enabled (default: `1`)
- `fallbackField`: target for non-prefixed text
- `showJsonOutput`: renders `<details>` JSON output panel (collapsed by default)
- `showDropdownOnTyping`: enables typing-triggered dropdown workflow
- `showAttachmentDropdownPreview`: show tiny attachment visuals in file-field dropdown options (default: `true`)
- `showInlinePills`, `showEntryCards`, `showEntryHeader`
- `inputHeightMode`: `'grow' | 'scroll'`, with optional `inputMaxHeight`
- `allowMultipleAttachments`: global attachment picker single vs multi-file selection
- `allowAttachmentReuse`: when false, linking a file already used elsewhere prompts conflict handling
- `allowedAttachmentTypes`: MIME/extensions allow list (`[]` means unrestricted)
- `attachmentSources`: `['files']` by default; can include `camera`, `gallery`, `files`
- `schema`: `{ fields: FieldConfig[] }`
- `ai`: AI runtime config
- `tokens`: CSS variable overrides (`--qa-*`)
- `onParse(result)`: called after parse/render and attachment link/remove changes

## Schema field types

Supported `schema.fields[].type`:

- `string`
- `number`
- `options`
- `date`
- `datetime`
- `boolean`
- `file`

Useful per-field keys:

- `key`, `label`, `prefixes`, `required`, `multiple`
- `defaultValue`
- `dependsOn`, `constraints`
- `options` (for `type: 'options'`)
- `naturalDate`, `allowDateOnly`, `defaultTime`, `timeFormat` (date/datetime)
- `allowMathExpression` (number): overrides `allowNumberMath` for this field
- `showNumberStepper` (number): overrides `enableNumberPillStepper` for this field
- `numberStep` (number): per-field override for step size in number stepper
- `min`, `max` (number): optional bounds enforced by number stepper

Use canonical keys only:

- `options`
- `dependsOn`
- `constraints`
- `defaultValue`

## AI config (key fields)

`ai` defaults include:

- `enabled`, `autoParse`, `debounceMs`, `minInputLength`
- `timeoutMs` (default `20000`)
- `provider`: `openai | anthropic | google | custom`
- `apiKey`, `model`, `endpoint`, `temperature`
- `forceJson`, `outputType`, `outputSchema`
- `promptMode`: `'default' | 'custom'`
- `promptTemplate` (used when `promptMode: 'custom'`)
- `request` (custom request function), `parseResponse`, `splitInput`
- `mockResponse`, `mockLatencyMs`
- `webSearch`, `tools`
- `preserveEditedEntries`, `separatorAware`, `inlinePills`

Provider resolution order:

1. `ai.mockResponse`
2. `ai.request`
3. built-in provider call (`openai` / `anthropic` / `google` / `custom`)

## Output contracts

### Deterministic `getResult()`

```ts
type DeterministicResult = {
  input: string;
  entries: Array<{
    index: number;
    raw: string;
    fields: Record<string, unknown>;
    explicitValues: Record<string, unknown>;
    inferred: Array<unknown>;
    autoFields: Array<string>;
    pending: Array<string>;
    errors: Array<string>;
    tokens: Array<unknown>;
    blocked: Array<unknown>;
    isValid: boolean;
    attachments?: Attachment[];
  }>;
  entryCount: number;
  validCount: number;
  invalidCount: number;
  config: {
    entrySeparator: string;
    fieldTerminator: string;
    fieldTerminatorMode: string;
    multiSelectSeparator: string;
    multiSelectDisplaySeparator: string;
  };
};
```

### AI `getResult()`

```ts
type AIResult = {
  mode: 'ai';
  input: string;
  entries: Array<{
    index: number;
    raw: string;
    fields: Record<string, unknown>;
    explicitValues: Record<string, never>;
    inferred: [];
    autoFields: Set<string>;
    pending: [];
    errors: [];
    tokens: [];
    blocked: [];
    isValid: boolean;
    aiMeta: { id: string; deleted: boolean; edited: boolean };
    attachments?: Attachment[];
  }>;
  entryCount: number;
  validCount: number;
  invalidCount: number;
  warnings: string[];
  missing: string[];
  error: string;
  isProcessing: boolean;
  providerRawResponse: string;
  parseState: {
    status: 'idle' | 'below-min-length' | 'processing' | 'ready' | 'stale' | 'offline' | 'error';
    isReady: boolean;
    isProcessing: boolean;
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
  };
  callerRequest: null | {
    mode: 'ai';
    input: string;
    chunks: Array<{ index: number; start: number; end: number; input: string }>;
    provider: string;
    model: string;
    endpoint: string;
    temperature: number;
    forceJson: boolean;
    webSearch: boolean;
    tools: unknown;
    hasCustomRequest: boolean;
    promptMode: string;
    hasCustomResponseParser: boolean;
  };
  verification: { status: string; message: string; signature: string };
};
```

## Attachments and file fields

Attachments are enabled by adding one or more `type: 'file'` schema fields.

Behavior:

- Files are chosen from a global attachment pool.
- Entries link attachment references through file fields.
- Result entries expose resolved attachment metadata under `entry.attachments`.
- `allowAttachmentReuse: false` enables conflict prompts:
  - link conflict: **Unlink and attach here**
  - delete conflict: **Unlink and delete**
- `allowedAttachmentTypes` filters picks by MIME/extension.
- Mobile uses a single `+ Add attachment` trigger with source menu (`camera` / `gallery` / `files`).

## Dropdown and keyboard behavior

- Typing dropdown starts with no active option.
- `ArrowDown` / `ArrowUp` moves active option.
- `Enter` with active option selects it.
- `Enter` with no active option inserts newline.
- Multi-select typing is separator-aware (`value,` and `value, ` supported).
- Multi-select insertion appends `multiSelectSeparator + space`.
- Entry cards render multi-select values as grouped text using `multiSelectDisplaySeparator`.
- When number stepper is enabled, number pills render inline `+/-` controls using configured step values.

## Notes

- This component is browser-first; API keys in browser config are user-visible.
- For production AI calls, prefer a backend proxy/token flow instead of exposing provider keys directly.
