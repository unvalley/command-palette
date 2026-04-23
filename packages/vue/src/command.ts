import { type CommandFilter, createCommand } from "@command-palette/core"
import {
  type DefineComponent,
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  type VNode,
  watch,
} from "vue"
import {
  CommandA11yKey,
  CommandIdAllocatorKey,
  CommandStoreKey,
  CommandVersionKey,
} from "./context"
import { commandProps, type CommandProps as SharedCommandProps } from "./shared"

let nextCommandRootId = 0

/**
 * Props for the root Vue command palette container.
 */
export type CommandProps = SharedCommandProps & {
  /** Custom item filtering implementation. */
  filter?: CommandFilter
}

/**
 * Provides command palette state to descendant Vue primitives and wires up the
 * keyboard interactions used to move and activate items.
 */
export const Command: DefineComponent<CommandProps> = defineComponent({
  name: "Command",
  inheritAttrs: false,
  props: commandProps,
  emits: {
    "update:modelValue": (_value: string): boolean => true,
    "update:search": (_search: string): boolean => true,
  },
  setup(props, { attrs, emit, slots }): () => VNode {
    let nextId = 0
    const commandId = `command-palette-vue-${++nextCommandRootId}`
    const store = createCommand({
      filter: props.filter,
      initialSearch: props.search ?? props.defaultSearch,
      initialValue: props.modelValue ?? props.defaultValue,
      loop: props.loop,
      onSearchChange: (search) => emit("update:search", search),
      onValueChange: (value) => emit("update:modelValue", value),
      selectOnHover: props.selectOnHover,
    })

    const version = shallowRef(0)
    const unsubscribe = store.subscribe(() => {
      version.value += 1
    })

    onScopeDispose(unsubscribe)
    provide(CommandStoreKey, store)
    provide(CommandVersionKey, version)
    provide(CommandA11yKey, {
      getLabel: () => props.label,
      getItemId: (value: string) => createCommandItemId(commandId, value),
      listId: createCommandListId(commandId),
    })
    provide(CommandIdAllocatorKey, (prefix: string) => `${commandId}-${prefix}-${++nextId}`)

    onMounted(() => {
      if (props.modelValue !== undefined) {
        store.setValue(props.modelValue)
      }
      if (props.search !== undefined) {
        store.setSearch(props.search)
      }
    })

    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) store.setValue(value)
      },
      { flush: "post", immediate: true },
    )

    watch(
      () => props.search,
      (search) => {
        if (search !== undefined) store.setSearch(search)
      },
      { flush: "post", immediate: true },
    )

    watch(
      [() => props.filter, () => props.loop, () => props.selectOnHover],
      ([filter, loop, selectOnHover]) => {
        store.updateOptions({
          filter,
          loop,
          onSearchChange: (search) => emit("update:search", search),
          onValueChange: (value) => emit("update:modelValue", value),
          selectOnHover,
        })
      },
      { immediate: true },
    )

    const handleKeydown = (event: KeyboardEvent): void => {
      if (store.getState().isComposing) return

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          store.selectNext()
          break
        case "ArrowUp":
          event.preventDefault()
          store.selectPrev()
          break
        case "Home":
          event.preventDefault()
          store.selectFirst()
          break
        case "End":
          event.preventDefault()
          store.selectLast()
          break
        case "Enter":
          event.preventDefault()
          store.triggerSelect(event)
          break
      }
    }

    return (): VNode =>
      h(
        "div",
        mergeProps(
          {
            "command-palette-root": "",
            role: "group",
            "aria-label": props.label,
            onKeydown: handleKeydown,
          },
          attrs,
        ),
        slots.default?.(),
      )
  },
})

const encodeItemValue = (value: string): string => {
  return `${value.length}:${encodeURIComponent(value)}`
}

const createCommandListId = (baseId: string): string => `${baseId}-list`

const createCommandItemId = (baseId: string, value: string): string =>
  `${baseId}-item-${encodeItemValue(value)}`
