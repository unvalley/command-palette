import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { Command } from "../src/command"
import { useCommandSlice } from "../src/context"
import * as commandPalette from "../src/index"
import { CommandInput } from "../src/input"
import { CommandItem } from "../src/item"
import { CommandList } from "../src/list"
import { dispatchCompositionEnd, dispatchCompositionStart, dispatchInput, render } from "./helpers"

describe("<Command>", () => {
  it("renders children", async () => {
    const screen = await render(
      <Command>
        <div>hello</div>
      </Command>,
    )

    await expect.element(screen.getByText("hello")).toBeInTheDocument()
  })

  it("renders with command-palette-root data attribute", async () => {
    const { container } = await render(<Command label="test" />)

    expect(container.querySelector("[command-palette-root]")).not.toBeNull()
  })

  it("forwards label as aria-label", async () => {
    const { container } = await render(<Command label="My Menu" />)

    expect(container.querySelector("[command-palette-root]")?.getAttribute("aria-label")).toBe(
      "My Menu",
    )
  })

  it("uses label as the input accessible name by default", async () => {
    const screen = await render(
      <Command label="Global Command Palette">
        <CommandInput />
      </Command>,
    )

    await expect
      .element(screen.getByRole("combobox"))
      .toHaveAttribute("aria-label", "Global Command Palette")
  })

  it("groups command content without application semantics", async () => {
    const { container } = await render(<Command label="My Menu" />)

    expect(container.querySelector("[command-palette-root]")?.getAttribute("role")).toBe("group")
  })

  it("updates filter after rerender", async () => {
    const screen = await render(
      <Command filter="none" search="app">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Banana")).toBeInTheDocument()

    await screen.rerender(
      <Command filter="contains" search="app">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Banana")).not.toBeInTheDocument()
  })

  it("updates custom filter after rerender", async () => {
    const startsWithApp = (value: string, search: string) => (value.startsWith(search) ? 1 : 0)
    const endsWithApp = (value: string, search: string) => (value.endsWith(search) ? 1 : 0)

    const screen = await render(
      <Command filter={startsWithApp} search="app">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="snapapp">Snapapp</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Snapapp")).not.toBeInTheDocument()

    await screen.rerender(
      <Command filter={endsWithApp} search="app">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="snapapp">Snapapp</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Snapapp")).toBeInTheDocument()
  })
})

describe("<Command.Input>", () => {
  it("forwards typing to store search", async () => {
    const onSearchChange = vi.fn()
    const screen = await render(
      <Command onSearchChange={onSearchChange}>
        <CommandInput placeholder="Search" />
      </Command>,
    )
    const input = screen.getByPlaceholder("Search")

    await input.fill("app")

    expect(onSearchChange).toHaveBeenLastCalledWith("app")
  })

  it("does not fire onSearchChange while IME composing (#363)", async () => {
    const onSearchChange = vi.fn()
    const screen = await render(
      <Command onSearchChange={onSearchChange}>
        <CommandInput placeholder="Search" />
      </Command>,
    )
    const input = screen.getByPlaceholder("Search").element() as HTMLInputElement

    dispatchCompositionStart(input)
    dispatchInput(input, "こ")
    expect(onSearchChange).not.toHaveBeenCalled()

    dispatchInput(input, "こんにちは")
    dispatchCompositionEnd(input)

    expect(onSearchChange).toHaveBeenCalledWith("こんにちは")
  })

  it("uses the latest onSearchChange after rerender", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const screen = await render(
      <Command onSearchChange={first}>
        <CommandInput placeholder="Search" />
      </Command>,
    )

    await screen.rerender(
      <Command onSearchChange={second}>
        <CommandInput placeholder="Search" />
      </Command>,
    )

    await screen.getByPlaceholder("Search").fill("a")

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith("a")
  })

  it("supports defaultSearch for uncontrolled usage", async () => {
    const screen = await render(
      <Command defaultSearch="apple">
        <CommandInput placeholder="Search" />
      </Command>,
    )

    await expect.element(screen.getByPlaceholder("Search")).toHaveValue("apple")
  })

  it("prefers search over defaultSearch", async () => {
    const screen = await render(
      <Command defaultSearch="apple" search="banana">
        <CommandInput placeholder="Search" />
      </Command>,
    )

    await expect.element(screen.getByPlaceholder("Search")).toHaveValue("banana")
  })

  it("syncs CommandInput value into the store for programmatic updates", async () => {
    const Wrapper = () => {
      const [inputValue, setInputValue] = useState("app")

      return (
        <>
          <button onClick={() => setInputValue("ban")} type="button">
            set-ban
          </button>
          <Command>
            <CommandInput placeholder="Search" value={inputValue} />
            <CommandList>
              <CommandItem value="apple">Apple</CommandItem>
              <CommandItem value="banana">Banana</CommandItem>
            </CommandList>
          </Command>
        </>
      )
    }

    const screen = await render(<Wrapper />)

    await expect.element(screen.getByText("Apple")).toBeInTheDocument()
    await expect.element(screen.getByText("Banana")).not.toBeInTheDocument()

    await screen.getByText("set-ban").click()

    await expect.element(screen.getByText("Apple")).not.toBeInTheDocument()
    await expect.element(screen.getByText("Banana")).toBeInTheDocument()
  })

  it("wires combobox accessibility attributes to the active option", async () => {
    const screen = await render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )

    const input = screen.getByPlaceholder("Search")
    const list = screen.container.querySelector("[command-palette-list]")
    expect(list?.id).toBeTruthy()
    await expect.element(input).toHaveAttribute("aria-controls", list?.id ?? "")

    await input.click()
    await userEvent.keyboard("{ArrowDown}")

    const activeItem = screen.getByText("Apple").element()
    expect(activeItem.id).toBeTruthy()
    expect((input.element() as HTMLInputElement).getAttribute("aria-activedescendant")).toBe(
      activeItem.id,
    )
  })

  it("does not point aria-activedescendant at disabled options", async () => {
    const screen = await render(
      <Command defaultValue="apple">
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem disabled value="apple">
            Apple
          </CommandItem>
        </CommandList>
      </Command>,
    )

    await expect
      .element(screen.getByPlaceholder("Search"))
      .not.toHaveAttribute("aria-activedescendant")
    await expect.element(screen.getByText("Apple")).not.toHaveAttribute("data-selected")
  })

  it("uses distinct option ids for empty-string and literal 'empty' values", async () => {
    const screen = await render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="">Empty value</CommandItem>
          <CommandItem value="empty">Literal empty</CommandItem>
        </CommandList>
      </Command>,
    )
    const input = screen.getByPlaceholder("Search")

    await input.click()
    await userEvent.keyboard("{ArrowDown}")
    const emptyValueId = (input.element() as HTMLInputElement).getAttribute("aria-activedescendant")

    await userEvent.keyboard("{ArrowDown}")
    const literalEmptyId = (input.element() as HTMLInputElement).getAttribute(
      "aria-activedescendant",
    )

    expect(emptyValueId).toBeTruthy()
    expect(literalEmptyId).toBeTruthy()
    expect(emptyValueId).not.toBe(literalEmptyId)
  })

  it("uses the latest onValueChange after rerender", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const screen = await render(
      <Command onValueChange={first}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>,
    )

    await screen.rerender(
      <Command onValueChange={second}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>,
    )

    const input = screen.getByPlaceholder("Search")
    await input.click()
    await userEvent.keyboard("{ArrowDown}")

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith("apple")
  })

  it("supports defaultValue for uncontrolled usage", async () => {
    const screen = await render(
      <Command defaultValue="apple">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Apple")).toHaveAttribute("data-selected", "true")
  })

  it("prefers value over defaultValue", async () => {
    const screen = await render(
      <Command defaultValue="apple" value="banana">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )

    await expect.element(screen.getByText("Banana")).toHaveAttribute("data-selected", "true")
  })
})

describe("useCommandSlice", () => {
  it("selects from state directly", async () => {
    const SearchValue = () => <div>{useCommandSlice((state) => state.search)}</div>

    const screen = await render(
      <Command search="hello">
        <SearchValue />
      </Command>,
    )

    await expect.element(screen.getByText("hello")).toBeInTheDocument()
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
