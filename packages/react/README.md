# @command-palette/react

Unstyled React primitives for building command menus.

Built on top of the internal command store.

## Install

```bash
pnpm add @command-palette/react react react-dom
```

## Usage

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@command-palette/react'

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

For modal usage:

```tsx
<CommandDialog open={open} onOpenChange={setOpen} label="Global Command Menu">
  <CommandInput placeholder="Type a command…" />
  <CommandList>
    <CommandItem value="theme">Change theme</CommandItem>
    <CommandItem value="settings">Open settings</CommandItem>
  </CommandList>
</CommandDialog>
```

## Components

### `Command`

Root provider and interactive command surface.

- `label?: string`
  Accessible label for the command surface.
- `value?: string`
  Controlled highlighted item value.
- `defaultValue?: string`
  Initial highlighted item value for uncontrolled usage.
- `onValueChange?: (value: string) => void`
  Called when the highlighted item changes.
- `search?: string`
  Controlled search query.
- `defaultSearch?: string`
  Initial search query for uncontrolled usage.
- `onSearchChange?: (search: string) => void`
  Called when the search query changes.
- `filter?: 'fuzzy' | 'contains' | 'none' | FilterFn`
  Built-in filter mode or a custom scoring function.
- `loop?: boolean`
  Wrap keyboard navigation from end to start and back.
- `selectOnHover?: boolean`
  When `true`, pointer hover updates selection. Defaults to `true`.

### `CommandInput`

Search input wired to the current command store.

- All normal `input` props except `onChange`
- `value?: string`
  Controlled input value.
- `onValueChange?: (value: string) => void`
  Called after the input value is committed.

IME composition is handled so partial composition does not trigger intermediate search updates.

### `CommandItem`

Selectable command row.

- `value: string`
  Stable item identity.
- `keywords?: readonly string[]`
  Extra aliases used by filtering.
- `disabled?: boolean`
  Renders the item but removes it from selection and keyboard navigation.
- `forceMount?: boolean`
  Keeps the item visible even when filtering would hide it.
- `groupId?: string`
  Explicit group association. Usually inherited from `CommandGroup`.
- `onSelect?: (value: string, event?: Event) => void`
  Called when the item is activated.

### `CommandGroup`

Groups related items under an optional `heading`. Hidden automatically when no item in the group is visible, unless `forceMount` is set.

### `CommandDialog`

Native `<dialog>` wrapper around `Command`.

- `open: boolean`
  Controls whether the dialog is open.
- `onOpenChange: (open: boolean) => void`
  Called when the dialog opens or closes.
- `dialogClassName?: string`
  Class name for the native `<dialog>`.
- `resetSearchOnClose?: boolean`
  Clears uncontrolled search when closing. Defaults to `true`.

### Other components

- `CommandList`
  Listbox wrapper for items and groups.
- `CommandEmpty`
  Only renders when no visible items remain.
- `CommandSeparator`
  Hidden while searching unless `alwaysRender` is set.
- `CommandLoading`
  Progressbar helper for async states.

## Hooks

- `useCommandStore()`
  Returns the underlying store instance.
- `useCommandSlice(selector)`
  Subscribes to derived `CommandState`.

```tsx
function ResultCount() {
  const count = useCommandSlice((state) => state.filteredOrder.length)
  return <span>{count} results</span>
}
```

## Styling

The package is unstyled. Useful selectors:

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
