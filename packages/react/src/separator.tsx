import type { HTMLAttributes, Ref } from 'react'
import { useCommandSlice } from './context'

export type CommandSeparatorProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  alwaysRender?: boolean
}

export const CommandSeparator = ({ ref, alwaysRender, ...rest }: CommandSeparatorProps) => {
  const search = useCommandSlice((s) => s.search)
  if (!alwaysRender && search !== '') return null
  // biome-ignore lint/a11y/useFocusableInteractive: separator is a visual divider, not interactive
  return <div ref={ref} command-palette-separator="" role="separator" {...rest} />
}
