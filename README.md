# cmdk

Library-agnostic command menu primitives:

- `@unvalley/cmdk-core`: filtering, ordering, selection, IME handling, registration
- `@unvalley/cmdk-react`: unstyled React components on top of the core store

## Install

```bash
pnpm add @unvalley/cmdk-core
# depends on the ui library you use
pnpm add @unvalley/cmdk-react
```

## React Quick Start

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@unvalley/cmdk-react'

export function CommandMenu() {
  return (
    <Command label="Command Menu">
      <CommandInput placeholder="Search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Letters">
          <CommandItem value="a">A</CommandItem>
          <CommandItem value="b">B</CommandItem>
        </CommandGroup>
        <CommandItem value="apple" keywords={['fruit']}>
          Apple
        </CommandItem>
      </CommandList>
    </Command>
  )
}
```

For a modal command palette, use `CommandDialog`.

```tsx
<CommandDialog open={open} onOpenChange={setOpen} label="Global Command Menu">
  <CommandInput placeholder="Type a command…" />
  <CommandList>
    <CommandItem value="theme">Change theme</CommandItem>
    <CommandItem value="settings">Open settings</CommandItem>
  </CommandList>
</CommandDialog>
```

## Core Quick Start

```ts
import { createCommand } from '@unvalley/cmdk-core'

const command = createCommand({
  onSearchChange: (search) => console.log(search),
  onValueChange: (value) => console.log(value),
})

command.registerItem({ value: 'apple' })
command.registerItem({ value: 'banana', keywords: ['fruit'] })

command.setSearch('app')
command.selectFirst()
command.triggerSelect()
```

## Filtering

Built-in filtering is controlled by `filterMode`:

```tsx
<Command filterMode="fuzzy" />
<Command filterMode="contains" />
<Command filterMode="none" />
```

- `fuzzy`: default fuzzy scorer
- `contains`: normalized substring matching, with a slight preference for matches at the start or after a separator
- `none`: disables internal filtering and sorting

Custom filters are also supported:

```tsx
<Command filter={(value, search, keywords) => (`${value} ${keywords.join(' ')}`).includes(search) ? 1 : 0} />
```

Rules:

- `0` hides an item
- `> 0` keeps it visible
- higher scores sort earlier
- built-in modes normalize diacritics, so `cafe` matches `café`

## React API

### `Command`

Root component. It owns keyboard navigation, filtering, and highlighted value.

Props:

- `label?: string`
  Accessible label for the root command surface.
- `value?: string`
  Controlled highlighted item value. Use with `onValueChange`.
- `search?: string`
  Controlled search query. Use with `onSearchChange`.
- `onValueChange?: (value: string) => void`
  Called whenever the highlighted item changes.
- `onSearchChange?: (search: string) => void`
  Called whenever the search query changes.
- `filterMode?: 'fuzzy' | 'contains' | 'none'`
  Selects the built-in filtering behavior.
- `filter?: (value, search, keywords) => number`
  Custom scoring function. Ignored when `filterMode="none"`.
- `loop?: boolean`
  Wraps arrow-key navigation from end to start and back.
- `pointerSelection?: 'hover' | 'click'`
  `hover` selects items on pointer move. `click` only changes selection on click.

These props stay in sync after rerender.

### `CommandInput`

Search input wired to the command store.

Props:

- all normal `input` props except `onChange`
- `value?: string`
  Controlled input value.
- `onValueChange?: (value: string) => void`
  Called after the search value is committed.

IME composition is handled so partial composition does not trigger intermediate search updates.

### `CommandItem`

Selectable result row.

Props:

- `value: string`
  Stable item identity.
- `keywords?: readonly string[]`
  Extra search aliases.
- `disabled?: boolean`
  Keeps the item rendered but removes it from keyboard navigation and selection.
- `forceMount?: boolean`
  Keeps the item visible even when the current filter would hide it.
- `groupId?: string`
  Explicit group association. Usually inherited from `CommandGroup`.
- `onSelect?: (value: string, event?: Event) => void`
  Called when the item is activated.

### `CommandGroup`

Groups related items under an optional `heading`. Hidden automatically when none of its items are visible, unless `forceMount` is set.

### `CommandDialog`

Native `<dialog>` wrapper around `Command`.

Extra props:

- `open: boolean`
  Controls whether the dialog is shown.
- `onOpenChange: (open: boolean) => void`
  Called when the dialog opens or closes.
- `dialogClassName?: string`
  Class name for the `<dialog>` element itself.
- `resetSearchOnClose?: boolean`
  Clears uncontrolled search when the dialog closes. Defaults to `true`.

### Other components

- `CommandList`: listbox wrapper
- `CommandEmpty`: only renders when there are no visible results
- `CommandSeparator`: separator, hidden while searching unless `alwaysRender`
- `CommandLoading`: progressbar helper for loading states

## Hooks

### `useCommandStore()`

Returns the underlying `CommandStore`.

### `useCommandSlice(selector)`

Subscribes to derived state from `CommandState`.

```tsx
function ResultCount() {
  const count = useCommandSlice((state) => state.filteredOrder.length)
  return <span>{count} results</span>
}
```

## Core API

### `createCommand(options?)`

Creates a `CommandStore`.

```ts
const command = createCommand({ filterMode: 'contains', loop: true })
```

Main methods:

- `registerItem(item)` / `registerGroup(group)`
- `updateItem(value, patch)`
- `updateOptions(patch)`
- `setSearch(search)` / `setValue(value)` / `setComposing(isComposing)`
- `selectNext()` / `selectPrev()` / `selectFirst()` / `selectLast()`
- `triggerSelect(event?)`
- `getState()`
- `subscribe(listener)`
- `subscribeSlice(selector, listener, isEqual?)`

`getState()` exposes:

- `search`
- `value`
- `items`
- `groups`
- `filteredOrder`
- `visibleSet`
- `navigableOrder`
- `visibleGroups`
- `isComposing`
- `pointerSelection`

## Styling

The React package is unstyled. Useful selectors:

- `[cmdk-root]`
- `[cmdk-dialog]`
- `[cmdk-input]`
- `[cmdk-list]`
- `[cmdk-item]`
- `[cmdk-group]`
- `[cmdk-group-heading]`
- `[cmdk-group-items]`
- `[cmdk-empty]`
- `[cmdk-separator]`
- `[cmdk-loading]`
- `[data-selected]`
- `[data-disabled]`
