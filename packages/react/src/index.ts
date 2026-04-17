import { type CommandProps, Command as CommandRoot } from './command'
import { Empty, type EmptyProps } from './empty'
import { Group, type GroupProps } from './group'
import { Input, type InputProps } from './input'
import { Item, type ItemProps } from './item'
import { List, type ListProps } from './list'
import { Loading, type LoadingProps } from './loading'
import { Separator, type SeparatorProps } from './separator'

export { useCommandSlice, useCommandStore } from './context'
export type {
  CommandProps,
  EmptyProps,
  GroupProps,
  InputProps,
  ItemProps,
  ListProps,
  LoadingProps,
  SeparatorProps,
}

type CommandComponent = typeof CommandRoot & {
  Input: typeof Input
  List: typeof List
  Item: typeof Item
  Group: typeof Group
  Empty: typeof Empty
  Loading: typeof Loading
  Separator: typeof Separator
}

const Command = CommandRoot as CommandComponent
Command.Input = Input
Command.List = List
Command.Item = Item
Command.Group = Group
Command.Empty = Empty
Command.Loading = Loading
Command.Separator = Separator

export { Command }
