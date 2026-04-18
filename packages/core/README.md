# Core

Framework-agnostic command menu store.

This package is the internal foundation for framework adapters such as `@command-palette/react`.

## Usage

```ts
import { createCommand } from './src'

const command = createCommand({
  filter: 'contains',
  initialSearch: 'app',
  onValueChange: (value) => console.log(value),
})

command.registerItem({ value: 'apple' })
command.registerItem({ value: 'banana', keywords: ['fruit'] })

command.selectFirst()
command.triggerSelect()
```

## `createCommand(options?)`

- `initialValue?: string`
  Initial highlighted item.
- `initialSearch?: string`
  Initial search query.
- `filter?: 'fuzzy' | 'contains' | 'none' | FilterFn`
  Built-in filter mode or custom scoring function.
- `loop?: boolean`
  Wrap keyboard navigation.
- `selectOnHover?: boolean`
  Whether pointer hover updates selection.
- `onValueChange?: (value: string) => void`
  Called when highlighted value changes.
- `onSearchChange?: (search: string) => void`
  Called when search changes.

## `CommandStore`

Main methods:

- `registerItem(item)` / `registerGroup(group)`
- `updateItem(value, patch)`
- `updateOptions(patch)`
- `setSearch(search)` / `setValue(value)` / `setComposing(isComposing)`
- `selectNext()` / `selectPrev()` / `selectFirst()` / `selectLast()`
- `triggerSelect(event?)`
- `getState()`
- `getInitialState()`
- `subscribe(listener)` or `subscribe(selector, listener, options?)`

`updateOptions()` updates `filter`, `loop`, `selectOnHover`, and callbacks after creation.
Treat the snapshots returned by `getState()` and `getInitialState()` as read-only; update the store through its methods instead of mutating returned collections.

## Filtering

- `fuzzy`
  Default fuzzy scorer.
- `contains`
  Normalized substring matching, with a slight preference for matches at the start or after a separator.
- `none`
  Disables internal filtering and sorting.

Custom filters return `0` to hide an item and `> 0` to keep it visible. Higher scores sort earlier.
