# cmdk: Framework-Agnostic Command Menu — Design

**Date:** 2026-04-17
**Status:** Draft, awaiting review
**Author:** unvalley (with Claude)

## Summary

A command-menu library inspired by [`pacocoursey/cmdk`](https://github.com/pacocoursey/cmdk) (referenced as `dip/cmdk`), redesigned around a **framework-agnostic core** so it can be used without React. v1 ships two packages:

- `@unvalley/cmdk-core` — pure TypeScript store. No DOM, no framework deps.
- `@unvalley/cmdk-react` — React adapter that mirrors cmdk's compound-component API.

The React adapter is the v1 flagship for familiarity. Future adapters (Vue, Svelte, Solid, vanilla DOM helpers, Web Component) build on the same core.

## Goals

1. **Composable customization.** Users control visual styling, DOM structure, behavior, and composition (matching cmdk's compound-component DX).
2. **Framework-agnostic core.** Works without React. React adapter is one consumer among many.
3. **Fix the recurring cmdk issues** by architecture, not patches:
   - Async/dynamic items lose selection (`pacocoursey/cmdk` issues #280, #267, #389, #365, #63)
   - `querySelector` injection via unescaped `value` (#387)
   - Items with empty-string value not selectable (#357)
   - Diacritics not normalized (`café` ≠ `cafe`) (#386, #173)
   - IME composition triggers search prematurely (#363)
   - Excessive re-renders on hover (#377)
   - Mouse hover steals keyboard focus (#49)

## Non-Goals (v1)

- **Dialog wrapper.** Easy to wrap in userland; pulling in Radix bloats the React adapter.
- **Pages / routing.** Users compose with their own state.
- **Multi-select.** Niche; revisit post-v1.
- **Vue/Svelte/Solid adapters.** After v1 proves the core API.
- **Web Component distribution.** Likely v1.1 once the core is battle-tested.

## Decision History

### Decision 1: Distribution model — Framework-agnostic core + adapters

Considered:

- **(A) Pure vanilla JS / DOM API.** Simplest, but no style isolation, no reactivity, awkward in framework code.
- **(B) Web Component (`<cmdk-root>`).** Universal, native lifecycle. But Shadow DOM hampers styling/theming, SSR is awkward, React 18 prop interop still rough.
- **(C) Headless core + adapters.** Most code, but maximum reach and idiomatic per-framework usage.

**Chosen: (C).** The user requirement "users should customize visual, structural, behavioral, and compositional aspects — all essential" rules out (B) (Shadow DOM friction) and makes (A)'s missing reactivity model painful. (C) is also the only model where the same core can later power Web Component or vanilla distributions.

### Decision 2: v1 adapter scope — Core + React only

Considered: core-only, core + 1 adapter, core + several, core + Web Component.

**Chosen: Core + React.** React is the dominant ecosystem and lets us preserve cmdk's compound-component API (the reason to use cmdk). One adapter de-risks the core API design — adding more adapters before the core is proven means redoing them.

The "without React" promise is satisfied because the **core** is React-free; vanilla and other-framework users can call it directly today, with first-class adapters following.

### Decision 3: Core architecture — JS store as source of truth

Considered:

- **(1) DOM-as-source-of-truth (cmdk's model, ported).** Items register themselves on mount; rendering driven by DOM presence. Inherits cmdk's async race conditions — exactly what we want to fix.
- **(2) JS state-as-source-of-truth + reactive store.** Items live in `Map<value, ItemData>` inside the store. Adapter calls `store.registerItem()` from mount effects. Filtering/sorting/selection happen in the store.
- **(3) Pure data-driven (no compound components).** Users pass an `items` array. Loses cmdk's mixed static-and-dynamic composition story.

**Chosen: (2).** Preserves the compound-component DX users want, while making the JS store (not the DOM) authoritative — which directly fixes:

| Pain point | How (2) fixes it |
|---|---|
| Async race (#280, #267, #389, #63) | Single source of truth; no DOM-vs-state ordering bugs |
| `querySelector` injection (#387) | Item lookup by `Map.get(value)`, never `querySelector('[data-value="…"]')` |
| Empty-string value (#357) | `Map.has("")` works; no `if (value)` truthiness checks |
| Re-renders on hover (#377) | Adapter subscribes to per-item slices; only changed items re-render |
| Diacritic normalization (#386) | Owned by the store's default scorer |
| IME composition (#363) | Input handler in adapter swallows updates during composition |
| Mouse vs keyboard (#49) | `pointerSelection: 'hover' \| 'click'` config in store |

(1) was rejected because it inherits the bugs we want to fix. (3) was rejected because mixing static items with dynamic items is cmdk's core differentiator, and (3) breaks it.

## Architecture

### Package layout (pnpm monorepo)

```
cmdk/
├── packages/
│   ├── core/           # @unvalley/cmdk-core
│   │   ├── src/
│   │   │   ├── store.ts    # createCommand() — main entry
│   │   │   ├── score.ts    # default fuzzy scorer (port of command-score + NFD)
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── tests/
│   └── react/          # @unvalley/cmdk-react
│       ├── src/
│       │   ├── command.tsx     # <Command> root
│       │   ├── input.tsx       # <Command.Input>
│       │   ├── list.tsx        # <Command.List>
│       │   ├── item.tsx        # <Command.Item>
│       │   ├── group.tsx       # <Command.Group>
│       │   ├── empty.tsx
│       │   ├── loading.tsx
│       │   ├── separator.tsx
│       │   ├── context.ts      # store context + hooks
│       │   └── index.ts
│       └── tests/
├── pnpm-workspace.yaml
└── package.json
```

### Core API (`@unvalley/cmdk-core`)

```ts
import { createCommand } from '@unvalley/cmdk-core'

const cmd = createCommand({
  // Behavior
  shouldFilter?: boolean         // default true
  filter?: (value: string, search: string, keywords: string[]) => number
  loop?: boolean                 // arrow-key wrap, default false
  pointerSelection?: 'hover' | 'click'  // default 'hover' (cmdk-compat); 'click' = Raycast-style

  // Controlled state (optional)
  value?: string
  search?: string
  onValueChange?: (value: string) => void
  onSearchChange?: (search: string) => void
})
```

#### Returned interface

```ts
interface CommandStore {
  // Item / group registration (returns unregister fn)
  registerItem(item: ItemInput): () => void
  registerGroup(group: GroupInput): () => void
  updateItem(value: string, patch: Partial<ItemInput>): void

  // Search / selection — all operate over `filteredOrder` (visible items)
  setSearch(search: string): void
  setValue(value: string): void
  selectNext(): void
  selectPrev(): void
  selectFirst(): void   // first item in filteredOrder
  selectLast(): void    // last item in filteredOrder
  triggerSelect(): void  // fires onSelect for current value

  // State access
  getState(): CommandState
  subscribe(listener: (state: CommandState) => void): () => void
  subscribeSlice<T>(
    selector: (state: CommandState) => T,
    listener: (slice: T) => void,
    isEqual?: (a: T, b: T) => boolean
  ): () => void
}

interface ItemInput {
  value: string                  // required, can be ""
  keywords?: string[]
  groupId?: string
  disabled?: boolean
  forceMount?: boolean
  onSelect?: (value: string, event?: Event) => void
}

interface CommandState {
  search: string
  value: string                  // currently highlighted value
  items: ReadonlyMap<string, ItemData>
  groups: ReadonlyMap<string, GroupData>
  filteredOrder: readonly string[]   // visible items, sorted by score
  visibleGroups: ReadonlySet<string>
  isComposing: boolean           // IME composition in progress
}
```

#### Invariants

- `value` is the canonical identity for an item. It is **never** used as a CSS selector or DOM lookup key.
- Empty string `""` is a valid value.
- Duplicate-value registration: warn in dev (last-write-wins).
- The store recomputes `filteredOrder` synchronously after every mutation that affects it (search, items, groups).
- When `filteredOrder` changes and the current `value` is no longer visible, selection moves to `filteredOrder[0]` (or `''` if empty).

### React adapter (`@unvalley/cmdk-react`)

API mirrors cmdk's compound components for migration ease:

```tsx
import { Command } from '@unvalley/cmdk-react'

<Command label="Command Menu" loop>
  <Command.Input placeholder="Search…" />
  <Command.List>
    <Command.Empty>No results.</Command.Empty>
    <Command.Group heading="Letters">
      <Command.Item value="a" onSelect={(v, e) => …}>a</Command.Item>
      <Command.Item value="b" keywords={['letter']}>b</Command.Item>
    </Command.Group>
  </Command.List>
</Command>
```

**Differences vs. cmdk:**
- `value` is **required** on `Command.Item` (no implicit textContent inference). Fixes #74, #387.
- `onSelect` receives `(value, event?)`. Fixes #156.
- `pointerSelection="click"` prop on `Command` for Raycast-style mouse behavior. Fixes #49.
- Default scorer normalizes diacritics. Fixes #386, #173.
- Input handler suppresses search during IME composition. Fixes #363.

**Internals:**
- `<Command>` creates a store instance, exposes via React context.
- Each item subscribes via `useSyncExternalStore` to **its own slice** (`isSelected`, `isVisible`). Items not affected by a state change do not re-render. Fixes #377.
- Item registration in `useEffect` (synchronous to React's commit phase), unregister in cleanup.

## Data Flow

```
User types in <Command.Input>
        │
        ▼
adapter handles compositionstart/end ──► (during composition: do nothing)
        │
        ▼
cmd.setSearch(s)
        │
        ▼
store: recompute scores for all items
        │
        ▼
store: rebuild filteredOrder (sorted by score desc, then registration order)
        │
        ▼
store: if current `value` not in filteredOrder → setValue(filteredOrder[0] ?? '')
        │
        ▼
store: notify subscribers (per-slice)
        │
        ▼
React adapter: only items whose slice changed re-render
```

For mount-time registration:

```
<Command.Item> mounts
        │
        ▼
useEffect → cmd.registerItem({ value, keywords, … })
        │
        ▼
store: items.set(value, data); recompute filter; notify
```

For unmount:

```
<Command.Item> unmounts
        │
        ▼
useEffect cleanup → unregister()
        │
        ▼
store: items.delete(value); recompute filter; notify
        │      (if removed item was selected → select next visible)
```

## Filtering & Scoring

- **Default scorer:** port of [`command-score`](https://github.com/dip/cmdk/blob/main/cmdk/src/command-score.ts), with addition: input strings and item value+keywords are first normalized via `String.prototype.normalize('NFD').replace(/\p{Diacritic}/gu, '')`.
- **Custom scorer:** `filter(value, search, keywords) => number` (≤ 0 hides the item).
- **No filter mode:** `shouldFilter: false` returns all items in registration order; useful when consumer filters externally (async API search).

## Keyboard

| Key | Action |
|---|---|
| ArrowDown | `selectNext()` |
| ArrowUp | `selectPrev()` |
| Home | `selectFirst()` |
| End | `selectLast()` |
| Enter | `triggerSelect()` |

`loop: true` makes `selectNext` past last item wrap to first (and vice versa).

Per-item keydown (#133) — **out of scope for v1**, but the adapter can pass through standard React events on the item element. A formal API can come in v1.1.

## Error Handling

| Condition | Behavior |
|---|---|
| Register item with non-string value | Throw (dev + prod) |
| Register item with duplicate value | Dev: warn; prod: silent. Last-write-wins. |
| Register group with duplicate id | Dev: warn; prod: silent. Last-write-wins. |
| `setValue(v)` for unregistered v | Allowed; selection becomes "no current visible" until v is registered. |
| Custom `filter` throws | Catch, treat as score 0, log in dev. |

The core has no DOM access; adapter handles DOM-related errors (focus, scroll-into-view) with try/catch.

## Testing Strategy

- **Core (`@unvalley/cmdk-core`):** Vitest, no jsdom needed. Pure functions and store mutations.
  - Registration / unregistration
  - Filtering with default + custom scorer, including empty-string values, diacritics, special chars
  - Selection persistence across item set changes (regression tests for issues #280, #267, #63, #389)
  - IME composition flag behavior
  - Subscribe / subscribeSlice notifications

- **React adapter (`@unvalley/cmdk-react`):** Vitest + React Testing Library + jsdom.
  - Composition: `<Command><Command.Input /><Command.List>…</Command.List></Command>`
  - Keyboard nav (arrows, home/end, enter, loop)
  - Async items: render initial set, replace with new set, assert first visible is selected (#280)
  - `pointerSelection="click"` doesn't change selection on hover (#49)
  - `<Command.Item value="">` is selectable (#357)
  - `<Command.Item value="<script>">` doesn't crash on hover (#387)
  - Per-item re-render count when an unrelated item's selection changes (#377)

Each fixed-by-design issue gets a dedicated regression test referencing the upstream issue number.

## Build & Tooling

- **Language:** TypeScript (strict)
- **Bundler:** `tsup` (ESM + d.ts; add CJS only if a consumer reports needing it)
- **Package manager:** `pnpm` (workspaces)
- **Test runner:** `vitest`
- **Lint/format:** `biome` (matches user's existing dotfiles preference)
- **Node version:** ≥ 20

## Open Questions

None blocking. Items deferred to follow-up specs:

- Per-item keydown API design (#133)
- Pages / routing built-in (#132)
- Multi-select API (#358)
- Dialog wrapper packaging (separate `@unvalley/cmdk-dialog`?)
- Vue/Svelte/Solid adapter design

## Migration Notes (for cmdk users — informational, not v1 scope)

A migration guide will accompany v1.0 release. Breaking deltas vs `cmdk`:

- `<Command.Item>` requires `value` (no textContent inference).
- `onSelect` signature is `(value, event?) => void`.
- Default scorer normalizes diacritics (may change result order vs cmdk).
- No `<Command.Dialog>` in v1.0; wrap in your own dialog component.
- Pages pattern unchanged (still userland).
