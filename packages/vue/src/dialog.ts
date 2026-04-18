import type { CommandFilter } from '@unvalley/cmdk-core'
import {
  computed,
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { Command } from './command'
import { commandProps, type CommandProps as SharedCommandProps } from './shared'

export type CommandDialogProps = SharedCommandProps & {
  filter?: CommandFilter
  open: boolean
  dialogClass?: string
  resetSearchOnClose?: boolean
}

export const CommandDialog = defineComponent({
  name: 'CommandDialog',
  inheritAttrs: false,
  props: {
    ...commandProps,
    open: {
      type: Boolean,
      required: true,
    },
    dialogClass: String,
    resetSearchOnClose: {
      type: Boolean,
      default: true,
    },
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    'update:search': (_search: string) => true,
    'update:open': (_open: boolean) => true,
  },
  setup(props, { attrs, emit, slots }) {
    const dialogRef = ref<HTMLDialogElement | null>(null)
    const isSearchControlled = computed(() => props.search !== undefined)
    const commandInstanceKey = ref(0)

    const syncDialogState = (open: boolean): void => {
      const dialog = dialogRef.value
      if (!dialog) return

      if (open && !dialog.open) {
        dialog.showModal()
      } else if (!open && dialog.open) {
        dialog.close()
      }
    }

    const handleSearchChange = (nextSearch: string): void => {
      emit('update:search', nextSearch)
    }

    const handleClose = (): void => {
      emit('update:open', false)
    }

    onMounted(() => {
      const dialog = dialogRef.value
      if (!dialog) return

      dialog.addEventListener('close', handleClose)
      syncDialogState(props.open)
    })

    onBeforeUnmount(() => {
      dialogRef.value?.removeEventListener('close', handleClose)
    })

    watch(
      () => props.open,
      (open) => {
        syncDialogState(open)
      },
    )

    watch(
      () => props.open,
      (open) => {
        if (!open && props.resetSearchOnClose && !isSearchControlled.value) {
          commandInstanceKey.value += 1
        }
      },
    )

    const handleClick = (event: MouseEvent): void => {
      if (event.target === event.currentTarget) {
        emit('update:open', false)
      }
    }

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (event.defaultPrevented || event.isComposing) return
      event.preventDefault()
      emit('update:open', false)
    }

    return () =>
      h(
        'dialog',
        mergeProps(
          {
            ref: dialogRef,
            'cmdk-dialog': '',
            class: props.dialogClass,
            onClick: handleClick,
            onKeydown: handleKeydown,
          },
          attrs,
        ),
        h(
          Command,
          {
            key: commandInstanceKey.value,
            label: props.label,
            modelValue: props.modelValue,
            defaultValue: props.defaultValue,
            defaultSearch: props.defaultSearch,
            filter: props.filter,
            loop: props.loop,
            selectOnHover: props.selectOnHover,
            ...(isSearchControlled.value ? { search: props.search } : {}),
            'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
            'onUpdate:search': handleSearchChange,
          },
          slots,
        ),
      )
  },
})
