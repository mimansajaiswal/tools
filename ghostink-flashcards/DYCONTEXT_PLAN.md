# DyContext Variants Plan

Goal
- Add Dynamic Context variant generation for cards, with linear lineage and minimal new fields, synced to Notion.

Desired outcomes
- Decks can opt-in via a "Dynamic Context?" checkbox.
- Cards keep a linear chain using two relations: DyContext Root Card + DyContext Previous Card.
- Root is always normalized to self when missing, and written back to Notion.
- Variants are scheduled as normal cards (not shown immediately).
- Active window: only current + previous remain active once variants exist; older cards are suspended and synced.
- Cloze variants are generated only when all sub-cards of the parent are Good/Easy.
- AI generation can either reuse the existing AI settings (via a checkbox) or use a separate DyContext AI config.
- If AI isn’t configured, DyContext generation does nothing (no prompts, no queued jobs).
- Offline generation is queued and processed when online.

Final decisions and notes
- Cloze relation fields are renamed in code: "Cloze Parent Card" / "Cloze Sub Cards".
- DyContext Root Card and DyContext Previous Card are required in validation.
- Preview mode means no scheduling changes and should skip DyContext generation.
- Duplicate guard: do nothing if a card already exists with DyContext Previous Card == current.
- Root defaults to self if missing and is written back to Notion for normalization.
- Tags are copied to generated variants; order is preserved if set.
- For cloze variants: create a new cloze parent (no cloze parent relation) and then reconcile sub-cards.

Preview mode (definition)
- Preview mode is the session state where no schedule changes are allowed.
- In the current code, this is handled by early return in rate() when noScheduleChanges is enabled.
- DyContext generation should be skipped in preview mode.

Schema changes (Notion)
- Deck DB:
  - Dynamic Context? (checkbox)
  - Use default AI settings? (checkbox) — when true, reuse the app-level AI config
  - DyContext AI Provider (select or rich_text, depending on current pattern)
  - DyContext AI Model (rich_text)
  - DyContext AI Key (rich_text)
  - DyContext AI Prompt (rich_text)
    - Same behavior as AI Revision Prompt: supports variables and per-deck overrides.
    - If empty, use default prompt and sync the default back to Notion.
- Card DB:
  - DyContext Root Card (relation -> cards)
  - DyContext Previous Card (relation -> cards)

Where things should be added (code touchpoints)
- js/notion-mapper.js
  - deckFrom/deckProps: map Dynamic Context? and DyContext AI fields
  - cardFrom/cardProps: map DyContext Root Card / DyContext Previous Card
- js/app.js
  - validateDb: require Dynamic Context? (deck) and DyContext Root/Previous (card)
  - newDeck: add defaults for DyContext AI fields (if stored on deck)
  - rate(): hook generation on Good/Easy
  - cloze logic: check all sub-cards Good/Easy before generating new cloze variant
  - retirement: suspend old variants + sync
- js/storage.js (or meta store)
  - add a DyContext generation job queue (separate from Notion queue)

Generation rules (summary)
- Normal card: generate on Good/Easy if Dynamic Context? is true, not in preview mode, and no existing variant for current.
- Cloze card: generate when all sub-cards of the parent are Good/Easy and not suspended.
- Offline: enqueue generation job; process when online.
- If AI config is missing (both default + DyContext), skip generation silently (or show a single toast).

Variant creation (summary)
- New variant uses same deck and card type as current.
- DyContext Root Card = root (self if empty).
- DyContext Previous Card = current card.
- Content from DyContext AI: front (required), back (optional), notes (required).
- Tags copied; order preserved if present.

Retirement policy (summary)
- If no variants yet: only root active.
- Once variants exist: active window = previous + current only.
- Suspend all older variants (including root) and sync changes.
- For cloze: suspend old parent and all its sub-cards.

Pseudo-logic: Front-Back
```
onRate(card, rating):
  if previewMode: return
  if rating not in {Good, Easy}: return
  if deck.DynamicContext? != true: return

  if card.DyRoot is empty:
    card.DyRoot = card.id
    persist+queue(card)

  if existsCardWhere(DyPrev == card.id): return

  if offline:
    enqueueDyContextJob(card)
    return

  prompt = buildDyContextPrompt(root=card.DyRoot, prev=card, type=card.type)
  res = callDyContextAI(prompt, provider/model/key)
  if invalid JSON: return

  newCard = createCard(deckId=card.deckId, type=card.type)
  newCard.name  = res.front
  newCard.back  = res.back || ''
  newCard.notes = res.notes || ''
  newCard.tags  = card.tags
  newCard.order = card.order (if set)
  newCard.DyRoot = card.DyRoot
  newCard.DyPrev = card.id

  persist+queue(newCard)

  retireOldVariants(root=card.DyRoot, keep=[card.id, newCard.id])
```

Pseudo-logic: Cloze
```
onRate(subCard, rating):
  if previewMode: return
  if rating not in {Good, Easy}: return
  if deck.DynamicContext? != true: return

  parent = findClozeParent(subCard)
  if !parent: return

  if parent.DyRoot is empty:
    parent.DyRoot = parent.id
    persist+queue(parent)

  if not allSubCardsGoodEasy(parent): return

  if existsCardWhere(DyPrev == parent.id): return

  if offline:
    enqueueDyContextJob(parent)
    return

  prompt = buildDyContextPrompt(root=parent.DyRoot, prev=parent, type="Cloze")
  res = callDyContextAI(prompt, provider/model/key)
  if invalid JSON: return

  newParent = createCard(deckId=parent.deckId, type="Cloze")
  newParent.name  = res.front   // cloze markup here
  newParent.back  = res.back || ''
  newParent.notes = res.notes || ''
  newParent.tags  = parent.tags
  newParent.order = parent.order (if set)
  newParent.DyRoot = parent.DyRoot
  newParent.DyPrev = parent.id
  // Do NOT set Cloze Parent Card on newParent

  persist+queue(newParent)
  reconcileClozeSubItems(newParent)

  retireOldVariants(root=parent.DyRoot, keep=[parent.id, newParent.id], includeSubCards=true)
```

Example DyContext generation prompt (default)
```
You are generating the next flashcard variant in a linear study chain.
Preserve the original meaning/energy, but make the task slightly more difficult than the previous variant.
Return ONLY a single JSON object with keys: \"front\", \"back\", \"notes\". No extra text, no code fences.

Context (available variables):
- Root front: {{root_front}}
- Root back: {{root_back}}
- Previous front: {{prev_front}}
- Previous back: {{prev_back}}
- Tags: {{tags}}               // optional, may be empty
- Card type: {{card_type}}     // \"Front-Back\" or \"Cloze\"

Guidelines:
- Identify the exact target item the learner is trying to memorize (word, phrase, definition, mechanism, formula, etc.).
- The new variant MUST still test the same target item; do not shift to a different concept.
- Compare root vs previous to gauge how far the learner has progressed. The new variant should be one small step harder than previous (not a huge jump).
- Keep the same domain and core idea; do NOT change the subject.
- Avoid repeating the exact phrasing from the previous card.
- If input contains images, embeds, or URLs, ignore them (do not copy or invent images/links).
- Keep length concise and similar to the previous card unless difficulty requires a small increase in complexity.

Output rules:
- If card_type is \"Front-Back\":
  - front = question/prompt
  - back = answer/explanation
- If card_type is \"Cloze\":
  - front MUST include valid cloze markup (e.g., {{c1::...}}).
  - Prefer 1–2 cloze deletions max; do not reveal the answer elsewhere in the sentence.
  - back can be empty or a brief explanation.
- notes = a short learning hint or meta-note (not the full answer).

Return format example (not content):
{\"front\":\"...\",\"back\":\"...\",\"notes\":\"...\"}
```

Setup behavior
- If Dynamic Context is enabled but AI settings are missing, do nothing.
- After AI is configured, variants are generated the next time a card is rated Good/Easy.
- Optional (future): add a manual “Generate next variants now” action instead of auto-scanning.
