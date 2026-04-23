import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/vue"
import { describe, expect, it, vi } from "vitest"
import { defineComponent, h, nextTick, ref } from "vue"
import { useCommandSlice } from "../src/context"
import * as commandPalette from "../src/index"
import {
  Command,
  CommandInput,
  CommandList,
  commandSlots,
  commandWithInputSlots,
  itemNode,
} from "./helpers"

describe("<Command>", () => {
  it("renders children", () => {
    render(Command, {
      slots: commandSlots([h("div", "hello")]),
    })

    expect(screen.getByText("hello")).toBeInTheDocument()
  })

  it("renders with command-palette-root data attribute", () => {
    const { container } = render(Command, {
      props: { label: "test" },
    })

    expect(container.querySelector("[command-palette-root]")).toBeInTheDocument()
  })

  it("forwards label as aria-label", () => {
    const { container } = render(Command, {
      props: { label: "My Menu" },
    })

    expect(container.querySelector("[command-palette-root]")?.getAttribute("aria-label")).toBe(
      "My Menu",
    )
  })

  it("uses label as the input accessible name by default", () => {
    render(Command, {
      props: { label: "Global Command Palette" },
      slots: commandSlots([h(CommandInput)]),
    })

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Global Command Palette")
  })

  it("groups command content without application semantics", () => {
    const { container } = render(Command, {
      props: { label: "My Menu" },
    })

    expect(container.querySelector("[command-palette-root]")).toHaveAttribute("role", "group")
  })

  it("updates filter after rerender", async () => {
    const { rerender } = render(Command, {
      props: { search: "app", filter: "none" },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple"), itemNode("banana", "Banana")],
          },
        ),
      ]),
    })

    expect(screen.getByText("Banana")).toBeInTheDocument()

    await rerender({ search: "app", filter: "contains" })

    expect(screen.queryByText("Banana")).not.toBeInTheDocument()
  })

  it("updates custom filter after rerender", async () => {
    const startsWithApp = (value: string, search: string) => (value.startsWith(search) ? 1 : 0)
    const endsWithApp = (value: string, search: string) => (value.endsWith(search) ? 1 : 0)

    const { rerender } = render(Command, {
      props: { search: "app", filter: startsWithApp },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple"), itemNode("snapapp", "Snapapp")],
          },
        ),
      ]),
    })

    expect(screen.queryByText("Snapapp")).not.toBeInTheDocument()

    await rerender({ search: "app", filter: endsWithApp })

    expect(screen.getByText("Snapapp")).toBeInTheDocument()
  })
})

describe("<CommandInput>", () => {
  it("forwards typing to update:search", async () => {
    const onSearchChange = vi.fn()
    render(Command, {
      props: {
        "onUpdate:search": onSearchChange,
      },
      slots: commandSlots([h(CommandInput, { placeholder: "Search" })]),
    })

    const input = screen.getByPlaceholderText("Search")
    await userEvent.type(input, "app")

    expect(onSearchChange).toHaveBeenLastCalledWith("app")
  })

  it("does not fire update:search while IME composing", () => {
    const onSearchChange = vi.fn()
    render(Command, {
      props: {
        "onUpdate:search": onSearchChange,
      },
      slots: commandSlots([h(CommandInput, { placeholder: "Search" })]),
    })

    const input = screen.getByPlaceholderText("Search") as HTMLInputElement
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: "こ" } })
    expect(onSearchChange).not.toHaveBeenCalled()
    fireEvent.input(input, { target: { value: "こんにちは" } })
    fireEvent.compositionEnd(input)
    expect(onSearchChange).toHaveBeenCalledWith("こんにちは")
  })

  it("supports defaultSearch for uncontrolled usage", () => {
    render(Command, {
      props: { defaultSearch: "apple" },
      slots: commandSlots([h(CommandInput, { placeholder: "Search" })]),
    })

    expect(screen.getByPlaceholderText("Search")).toHaveValue("apple")
  })

  it("prefers search over defaultSearch", () => {
    render(Command, {
      props: { search: "banana", defaultSearch: "apple" },
      slots: commandSlots([h(CommandInput, { placeholder: "Search" })]),
    })

    expect(screen.getByPlaceholderText("Search")).toHaveValue("banana")
  })

  it("syncs CommandInput modelValue into the store for programmatic updates", async () => {
    const Wrapper = defineComponent({
      setup() {
        const inputValue = ref("app")

        return () => [
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                inputValue.value = "ban"
              },
            },
            "set-ban",
          ),
          h(
            Command,
            {},
            {
              default: () => [
                h(CommandInput, {
                  placeholder: "Search",
                  modelValue: inputValue.value,
                }),
                h(
                  CommandList,
                  {},
                  {
                    default: () => [itemNode("apple", "Apple"), itemNode("banana", "Banana")],
                  },
                ),
              ],
            },
          ),
        ]
      },
    })

    render(Wrapper)

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.queryByText("Banana")).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("set-ban"))
    await nextTick()

    expect(screen.queryByText("Apple")).not.toBeInTheDocument()
    expect(screen.getByText("Banana")).toBeInTheDocument()
  })

  it("wires combobox accessibility attributes to the active option", async () => {
    render(Command, {
      slots: commandSlots([
        h(CommandInput, { placeholder: "Search" }),
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple"), itemNode("banana", "Banana")],
          },
        ),
      ]),
    })

    const input = screen.getByPlaceholderText("Search")
    const list = document.querySelector("[command-palette-list]")
    expect(list?.id).toBeTruthy()
    expect(input).toHaveAttribute("aria-controls", list?.id)

    fireEvent.keyDown(input, { key: "ArrowDown" })
    await nextTick()

    const activeItem = screen.getByText("Apple").closest("[command-palette-item]")
    expect(activeItem?.id).toBeTruthy()
    expect(input).toHaveAttribute("aria-activedescendant", activeItem?.id)
  })

  it("does not point aria-activedescendant at disabled options", async () => {
    render(Command, {
      props: { defaultValue: "apple" },
      slots: commandSlots([
        h(CommandInput, { placeholder: "Search" }),
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple", { disabled: true })],
          },
        ),
      ]),
    })

    expect(screen.getByPlaceholderText("Search")).not.toHaveAttribute("aria-activedescendant")
    expect(screen.getByText("Apple").closest("[command-palette-item]")).not.toHaveAttribute(
      "data-selected",
    )
  })

  it("uses distinct option ids for empty-string and literal 'empty' values", async () => {
    render(Command, {
      slots: commandSlots([
        h(CommandInput, { placeholder: "Search" }),
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("", "Empty value"), itemNode("empty", "Literal empty")],
          },
        ),
      ]),
    })

    const input = screen.getByPlaceholderText("Search")

    fireEvent.keyDown(input, { key: "ArrowDown" })
    await nextTick()
    const emptyValueId = input.getAttribute("aria-activedescendant")

    fireEvent.keyDown(input, { key: "ArrowDown" })
    await nextTick()
    const literalEmptyId = input.getAttribute("aria-activedescendant")

    expect(emptyValueId).toBeTruthy()
    expect(literalEmptyId).toBeTruthy()
    expect(emptyValueId).not.toBe(literalEmptyId)
  })

  it("uses unique list ids across multiple Vue command roots", () => {
    render(
      defineComponent({
        setup() {
          return () =>
            h("div", [
              h(
                Command,
                {},
                { default: () => [h(CommandInput, { placeholder: "Search 1" }), h(CommandList)] },
              ),
              h(
                Command,
                {},
                { default: () => [h(CommandInput, { placeholder: "Search 2" }), h(CommandList)] },
              ),
            ])
        },
      }),
    )

    const lists = Array.from(document.querySelectorAll("[command-palette-list]"))
    expect(lists).toHaveLength(2)
    expect(lists[0]?.id).toBeTruthy()
    expect(lists[1]?.id).toBeTruthy()
    expect(lists[0]?.id).not.toBe(lists[1]?.id)
  })

  it("emits update:modelValue when keyboard selection changes", () => {
    const onValueChange = vi.fn()
    render(Command, {
      props: {
        "onUpdate:modelValue": onValueChange,
      },
      slots: commandWithInputSlots([itemNode("apple", "Apple")]),
    })

    const input = screen.getByPlaceholderText("Search")
    fireEvent.keyDown(input, { key: "ArrowDown" })

    expect(onValueChange).toHaveBeenCalledWith("apple")
  })

  it("supports defaultValue for uncontrolled usage", () => {
    render(Command, {
      props: { defaultValue: "apple" },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple"), itemNode("banana", "Banana")],
          },
        ),
      ]),
    })

    expect(
      screen.getByText("Apple").closest("[command-palette-item]")?.getAttribute("data-selected"),
    ).toBe("true")
  })

  it("prefers modelValue over defaultValue", async () => {
    render(Command, {
      props: { modelValue: "banana", defaultValue: "apple" },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode("apple", "Apple"), itemNode("banana", "Banana")],
          },
        ),
      ]),
    })

    await nextTick()

    expect(
      screen.getByText("Banana").closest("[command-palette-item]")?.getAttribute("data-selected"),
    ).toBe("true")
  })
})

describe("useCommandSlice", () => {
  it("selects from state directly", () => {
    const SearchValue = defineComponent({
      setup() {
        const search = useCommandSlice((state) => state.search)
        return () => h("div", search.value)
      },
    })

    render(Command, {
      props: { search: "hello" },
      slots: commandSlots([h(SearchValue)]),
    })

    expect(screen.getByText("hello")).toBeInTheDocument()
  })
})

describe("public exports", () => {
  it("exposes all components as named exports", () => {
    expect(commandPalette.Command).toBeDefined()
    expect(commandPalette.CommandInput).toBeDefined()
    expect(commandPalette.CommandList).toBeDefined()
    expect(commandPalette.CommandItem).toBeDefined()
    expect(commandPalette.CommandGroup).toBeDefined()
    expect(commandPalette.CommandEmpty).toBeDefined()
    expect(commandPalette.CommandLoading).toBeDefined()
    expect(commandPalette.CommandSeparator).toBeDefined()
    expect(commandPalette.useCommandStore).toBeDefined()
    expect(commandPalette.useCommandSlice).toBeDefined()
  })
})
