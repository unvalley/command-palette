# Vue adapter architecture — 2026-04-18

Current implementation memo for [`@command-palette/vue`](../../packages/vue), added on top of the existing headless core and React adapter.

## Goal

Build a Vue adapter that feels native to Vue users while preserving the same core behavior as the React adapter:

- core store remains the single source of truth
- adapter owns framework-specific reactivity, lifecycle wiring, and ergonomics
- public API should favor Vue conventions such as `v-model` and prop/event control boundaries

## Package layout

```
packages/vue/
├── src/
│   ├── command.ts      # <Command> root, store creation, provide/inject
│   ├── context.ts      # injected store, version signal, id allocator helpers
│   ├── input.ts        # <CommandInput>, IME + search sync
│   ├── item.ts         # <CommandItem>, registration + activation
│   ├── group.ts        # <CommandGroup>, group registration + inherited groupId
│   ├── list.ts         # listbox wrapper
│   ├── empty.ts        # conditional empty state
│   ├── loading.ts      # progressbar helper
│   ├── separator.ts    # conditional separator
│   ├── dialog.ts       # native <dialog> wrapper
│   ├── shared.ts       # shared prop shapes
│   └── index.ts        # public exports
└── tests/
```

## Design summary

The Vue adapter is intentionally thin. It does not reimplement filtering, ordering, navigation, or selection logic. All of that stays in [`@unvalley/cmdk-core`](../../packages/core/src).

The adapter layer is responsible for three things:

1. Creating a core store and exposing it through Vue `provide/inject`
2. Translating store state into Vue reactivity so components re-render when needed
3. Presenting a Vue-friendly API around controlled/uncontrolled props, `v-model`, slots, and lifecycle

## Source of truth

The core store remains authoritative for:

- `search`
- selected `value`
- item/group registration
- visibility and ordering
- keyboard navigation
- IME composing state

Vue components do not derive command state from rendered DOM. They subscribe to the store and render from store slices.

This preserves the same architectural choice as the React adapter: JS state is the source of truth, not the DOM tree.

## Reactivity model

[`Command`](../../packages/vue/src/command.ts) creates one store instance per root and provides:

- `CommandStoreKey`: the raw core store
- `CommandVersionKey`: a `shallowRef<number>` bumping on every store notification
- `CommandIdAllocatorKey`: a per-command id generator used by items/groups

[`useCommandSlice`](../../packages/vue/src/context.ts) works by reading `version.value` inside a `computed()`, then re-running a selector against `store.getState()`. This is a minimal bridge from the external store into Vue's dependency graph.

That means:

- Vue components stay decoupled from the store internals
- slice consumers only re-evaluate when the store notifies
- the adapter does not need to wrap the whole store in deep reactive proxies

## Component responsibilities

### `Command`

[`packages/vue/src/command.ts`](../../packages/vue/src/command.ts)

Responsibilities:

- create the core store once
- sync root-level controlled props into the store
- update runtime options (`filter`, `loop`, `selectOnHover`)
- handle root keyboard events
- provide store, version signal, and id allocator

Vue API decisions:

- selected item uses `modelValue` / `update:modelValue`
- search uses `search` / `update:search`
- uncontrolled paths use `defaultValue` and `defaultSearch`

Keyboard handling stays on the root surface, matching the React adapter and core expectations.

### `CommandInput`

[`packages/vue/src/input.ts`](../../packages/vue/src/input.ts)

Responsibilities:

- render the input UI
- sync input text to `store.search`
- emit `update:modelValue` for Vue `v-model`
- suppress intermediate updates during IME composition

Important API decision:

- `modelValue` is treated as a real Vue-controlled value
- inbound `modelValue` changes are mirrored into `store.setSearch()`

This avoids a mismatch where the displayed input text differs from the actual filter state.

### `CommandItem`

[`packages/vue/src/item.ts`](../../packages/vue/src/item.ts)

Responsibilities:

- register/unregister itself with the core store
- patch mutable item metadata (`keywords`, `disabled`, `forceMount`, `groupId`)
- render only when visible
- surface selection/disabled state as DOM attrs
- activate via click or hover selection

Vue-specific note:

- activation emits `select`
- group membership is inherited through injection unless explicitly overridden

### `CommandGroup`

[`packages/vue/src/group.ts`](../../packages/vue/src/group.ts)

Responsibilities:

- register/unregister the group with the store
- provide its generated `groupId` to descendant items
- hide itself when the store reports the group as not visible

This mirrors the React adapter's `GroupContext` behavior, but through Vue `provide/inject`.

### `CommandDialog`

[`packages/vue/src/dialog.ts`](../../packages/vue/src/dialog.ts)

Responsibilities:

- wrap `Command` in native `<dialog>`
- expose `open` / `update:open`
- bridge native close behavior back to Vue state
- support controlled and uncontrolled search correctly
- reset uncontrolled search on close

Important design detail:

- if the consumer passes `search`, the dialog forwards it and behaves as controlled
- if the consumer does not pass `search`, the dialog does not force a controlled prop into the child
- uncontrolled reset is implemented by remounting the inner `Command` instance via a changing `key`

This keeps `defaultSearch` meaningful and respects Vue's prop ownership model.

## ID strategy

Items and groups need stable ids for DOM relationships such as `aria-labelledby`.

The first draft used a module-global counter. That was replaced with a per-`Command` allocator provided from the root:

- allocator lives inside `Command.setup()`
- descendants call `useCommandId(prefix)`
- ids are scoped to one command tree

This is safer for SSR, hydration, and multiple command roots on the same page than a process-global counter.

## Controlled vs uncontrolled rules

The adapter now follows these rules consistently:

- `modelValue` present: selection is controlled
- `search` present: search is controlled
- `defaultValue` and `defaultSearch`: initial values only
- uncontrolled components may emit updates, but parent state is optional

This is especially important for Vue users because prop presence is the control boundary. The adapter should not implicitly invent controlled mode behind the user's back.

## Data flow

### Search flow

Uncontrolled input:

1. User types in `CommandInput`
2. `CommandInput` calls `store.setSearch()`
3. store recomputes visible/navigable state
4. store notifies subscribers
5. `CommandVersionKey` increments
6. all relevant `useCommandSlice()` consumers recompute
7. input emits `update:modelValue` as an optional notification for parent listeners

Controlled input:

1. User types in `CommandInput`
2. component emits `update:modelValue`
3. parent updates the bound value
4. watcher mirrors inbound `modelValue` back into `store.setSearch()`

### Selection flow

1. keyboard, hover, or click changes selected value
2. store updates `value`
3. `Command` emits `update:modelValue`
4. items re-render their `data-selected` / `aria-selected` state from store slices

### Dialog flow

1. parent sets `open`
2. `CommandDialog` synchronizes native `<dialog>` state with `showModal()` / `close()`
3. native close or ESC/backdrop interaction emits `update:open`
4. if uncontrolled search reset is enabled, the dialog bumps a key and remounts the inner `Command`

## Why render functions instead of `.vue` SFCs

The adapter is currently implemented with `defineComponent()` and render functions.

Reasons:

- package internals stay close to the React adapter's component granularity
- no SFC build pipeline is required inside the library package
- slot forwarding and prop merging stay explicit in one language (`.ts`)

This is acceptable for a library internals layer, even though an app-facing Vue demo might prefer SFCs for readability.

## Testing coverage

Current Vue tests cover:

- root behavior and exports
- IME handling
- keyboard navigation
- item activation and hover selection
- group inheritance/visibility
- dialog open/close/reset behavior
- controlled/uncontrolled search semantics
- `CommandInput` inbound `modelValue` synchronization

See [`packages/vue/tests`](../../packages/vue/tests).

## Current tradeoffs

The adapter is intentionally conservative:

- it favors explicit `defineComponent` + render functions over SFC ergonomics
- it uses a simple version-counter bridge rather than a richer reactive store wrapper
- it keeps API parity with React where possible, but not at the expense of Vue control semantics

That tradeoff is intentional. The package should feel familiar to cmdk users, but not by violating what Vue users expect from props and `v-model`.

## Practical mental model

When changing the Vue adapter, treat it as:

- **Core owns behavior**
- **Vue adapter owns lifecycle and API shape**
- **DOM is a projection of store state, not the source of truth**

If a future change starts deriving command behavior from rendered DOM or from local component state that duplicates core state, that is probably moving in the wrong direction.
