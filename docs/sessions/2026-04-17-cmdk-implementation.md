# Session log — 2026-04-17

One-session build of [`@unvalley/cmdk-core`](../../packages/core) and [`@unvalley/cmdk-react`](../../packages/react) from empty repo to working demo.

## Goal

> "cmdkをReactなしでも使えるライブラリとして実装したい"
> ( = a cmdk-style command menu that works even without React)

Reference: [`pacocoursey/cmdk`](https://github.com/pacocoursey/cmdk) (`dip/cmdk`).

## Architectural decisions

| Decision | Choice | Alternatives rejected |
|---|---|---|
| Distribution model | **Core + adapters** | Vanilla DOM API, Web Components |
| v1 adapter scope | Core + **React only** | Core-only, multiple adapters |
| Core architecture | **JS store as source of truth** (`Map<value, ItemData>`) | DOM-as-source (cmdk's model), pure data-driven |
| Dialog strategy | **Native `<dialog>` element** | Radix Dialog, Base UI Dialog, self-built focus trap |
| Component naming | `Command` + `CommandInput`/`CommandItem`/… | Compound `Command.Input` (hurts tree-shaking) |

The "JS store as source of truth" choice solves nine long-running upstream issues by design (see [`docs/superpowers/specs/2026-04-17-cmdk-headless-core-design.md`](../superpowers/specs/2026-04-17-cmdk-headless-core-design.md) Decision 3 for the mapping).

## Process

1. **Brainstorm** → spec `docs/superpowers/specs/2026-04-17-cmdk-headless-core-design.md`
2. **Plan** → plan `docs/superpowers/plans/2026-04-17-cmdk-headless-core.md` (22 bite-sized tasks, TDD throughout)
3. **Execute** via `superpowers:subagent-driven-development`: fresh implementer subagent per task, spec-compliance review, code-quality review
4. **Final review** surfaced six issues; fixed all in follow-up commits
5. **Dependency upgrade** — Node 20 → 24, pnpm 9 → 10, TS 5.6 → 6.0, Biome 1 → 2, Vitest 2 → 4, React 18 → 19
6. **Refactor** — dropped the compound-API barrel, `interface` → `type`, `function` → arrow, `forwardRef` → ref-as-prop (React 19)
7. **Rename** — `Input` → `CommandInput` etc. for namespace safety (shadcn/ui convention)
8. **Dialog support** — `CommandDialog` wrapping native `<dialog>` (~0.22 KB gz)
9. **Demo app** — Vite + React at `demo/react`

## Packages (final)

```
cmdk/
├── packages/
│   ├── core/          # @unvalley/cmdk-core   (zero deps)
│   └── react/         # @unvalley/cmdk-react  (peer: react ^19)
└── demo/
    └── react/         # Vite playground, http://localhost:5173
```

### `@unvalley/cmdk-core` — framework-agnostic store

`createCommand(options)` returns a `CommandStore` with:
- **Registration:** `registerItem`, `registerGroup`, `updateItem` (return unregister fns)
- **State mutation:** `setSearch`, `setValue`, `setComposing`
- **Navigation:** `selectFirst / selectLast / selectNext / selectPrev`, `triggerSelect(event?)`
- **Subscription:** `subscribe`, `subscribeSlice<T>(selector, listener, isEqual?)`, `getState()`

Key state invariants:
- `filteredOrder` — all visible items (includes disabled) for rendering order
- `visibleSet` — O(1) `has()` lookup, same set as `filteredOrder`
- `navigableOrder` — filters out `disabled`; used by selection nav
- `hasBeenSelected` — distinguishes "never selected yet" from "cleared by recompute"; auto-correct fires only after the user has engaged

### `@unvalley/cmdk-react` — compound-component adapter

Named exports: `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandGroup`, `CommandEmpty`, `CommandLoading`, `CommandSeparator`, `CommandDialog`, `useCommandStore`, `useCommandSlice`.

- `useSyncExternalStore` with primitive-returning selectors → per-item re-render isolation
- `GroupContext` so `CommandItem` auto-inherits its `groupId` from the nearest `CommandGroup`
- IME composition handled in `CommandInput` (swallows `onChange` until `compositionend`)
- Keyboard (ArrowUp/Down/Home/End/Enter) captured on the root div; ESC handled at `CommandDialog` level for Safari `<input>`-swallow safety

### `CommandDialog` (native `<dialog>` wrapper)

The browser provides, for free:
- Focus trap (between dialog descendants)
- ESC → `cancel` event → close
- Return-focus to previously-focused element
- Top-layer rendering above all stacking contexts
- `aria-modal` semantics
- `::backdrop` pseudo-element

Library adds on top:
- `open` / `onOpenChange` controlled API
- Click on the `<dialog>` itself (backdrop click) → close
- Explicit `onKeyDown` for ESC (Safari can let the inner input swallow ESC before the native handler)
- `resetSearchOnClose` (default `true`, uncontrolled only) — clear search text when the dialog closes

## Regression tests for upstream cmdk issues

Every pain point in the referenced issues was reproduced with a test. The file and approach:

| Upstream issue | What we tested | Fix mechanism |
|---|---|---|
| `#49` mouse steals focus | `pointerSelection="click"` skips hover selects | Store config |
| `#156` onSelect needs event | `onSelect(value, e)` is fired with the native event | Signature |
| `#267` async items don't update | `rerender` with new items list → old items gone, new present | Store recompute on register |
| `#280` first visible after replace | unregister all → register new → value snaps to first | `hasBeenSelected` + auto-correct |
| `#357` empty-string value | Items with `value=""` register and are selectable | `Map<string,…>` not truthiness |
| `#363` IME composition | Typing during composition does not fire `setSearch` | `setComposing` gate |
| `#377` hover re-renders siblings | Hovering B does not bump A's render count | `useSyncExternalStore` slice |
| `#386` diacritics | `cafe` matches `café` | `normalize('NFD')` in scorer |
| `#387` special chars in value | `<script>` value doesn't crash on hover | Store keys by value, no `querySelector` |

## Bugs discovered during the session

- **Item/Group wiring.** `CommandItem` nested in `CommandGroup` needed `groupId` prop to be associated. Tests never covered the pair, so the demo shipped with every group `hidden=""` and only the input visible. Fix: `GroupContext` provided by `CommandGroup`, consumed by `CommandItem` as fallback.
- **ESC on input doesn't close.** Reported in screenshot. Browser behavior varies: some (Safari) let `<input>` consume the ESC keydown before the dialog's native `cancel` fires. Fix: explicit `onKeyDown` on `<dialog>` that calls `onOpenChange(false)`.
- **Task 18 regressed test #280.** Adding a `value !== ''` guard fixed the keyboard test but re-introduced the #280 failure. Reconciled with the `hasBeenSelected` flag, which distinguishes the two states the guard was trying to separate.
- **Disabled item visibility impedance mismatch.** Initial design scored disabled items as 0, removing them from `visibleSet`. Fixed by splitting `filteredOrder` (render) from `navigableOrder` (navigation).

## Bundle size (final)

Measured at commit `a635931`:

| Target | raw | gz | **prod+min+gz (what consumers ship)** |
|---|---|---|---|
| `@unvalley/cmdk-core` | 9.71 KB | 2.59 KB | **1.45 KB** |
| `@unvalley/cmdk-react` | 9.30 KB | 2.51 KB | **1.76 KB** |
| **Combined** | 19.01 KB | 5.10 KB | **3.21 KB** |

Zero runtime dependencies. Demo production build 63.5 KB gz total (React bundled: ~60 KB, cmdk ~3 KB).

## Tooling snapshot (final)

| Tool | Version |
|---|---|
| Node | 24.15.0 (LTS) |
| pnpm | 10.33.0 |
| TypeScript | 6.0.3 |
| Biome | 2.4.12 |
| Vitest | 4.1.4 |
| React | 19.2.5 |
| tsup | 8.5.1 |
| jsdom | 29.0.2 |

## Test coverage

| Package | Tests |
|---|---|
| `@unvalley/cmdk-core` | 64 |
| `@unvalley/cmdk-react` | 41 |
| **Total** | **105** |

Suites: `normalize`, `score`, `registration`, `search`, `selection`, `controlled`, `regressions` (core); `command`, `input`, `item`, `keyboard`, `dialog`, `group`, `async`, `regressions` (react).

Browser verification: Playwright probes confirmed the demo renders correctly in Chromium + installed Chrome (input, filter, ESC-close, reset-on-close all observed via real `<dialog>` semantics).

## Notable commits

| SHA | Meaning |
|---|---|
| `e39a652` | spec committed |
| `dee6917` | implementation plan committed |
| `9680f74` | monorepo scaffold (Task 1) |
| `2c6e78d` | core public API export (end of core phase) |
| `fe4e8fb` | compound `Command.Input` API exported (last pre-refactor state) |
| `8491f8b` | runtime + deps upgrade to latest majors |
| `2c4abfb` | compound API dropped; arrow + type refactor |
| `d6de776` | components renamed to `Command*` namespace |
| `355cd18` | `CommandDialog` via native `<dialog>` |
| `35c1a0d` | demo app added |
| `3217838` | `GroupContext` fix (items auto-inherit groupId) |
| `1af3b7a` | ESC from input closes dialog (Safari safe path) |
| `a635931` | search resets on close (current HEAD) |

## What's left for v1.0 / v1.1

- Decide what happens to the value/selection on close (search is reset; value survives)
- `asChild` / `Slot` primitive (~30 lines, no deps)
- Pages / nested commands as a first-class pattern (currently userland)
- Multi-select (cmdk upstream issue #358)
- Per-item `onKeyDown` (upstream #133)
- Additional adapters: Vue, Svelte, Solid, vanilla DOM, or a Web Component — all build on the existing core unchanged
