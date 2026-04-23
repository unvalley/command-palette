import { describe, expect, it } from "vitest"
import { createCommand } from "../src/store"

describe("createCommand: selection", () => {
  it("selectFirst sets value to first visible item", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectFirst()
    expect(cmd.getState().value).toBe("a")
  })

  it("selectLast sets value to last visible item", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectLast()
    expect(cmd.getState().value).toBe("b")
  })

  it("selectNext moves selection forward", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.registerItem({ value: "c" })
    cmd.selectFirst()
    cmd.selectNext()
    expect(cmd.getState().value).toBe("b")
  })

  it("selectPrev moves selection backward", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectLast()
    cmd.selectPrev()
    expect(cmd.getState().value).toBe("a")
  })

  it("selectNext at end is a no-op when loop=false", () => {
    const cmd = createCommand({ loop: false })
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectLast()
    cmd.selectNext()
    expect(cmd.getState().value).toBe("b")
  })

  it("selectNext at end wraps when loop=true", () => {
    const cmd = createCommand({ loop: true })
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectLast()
    cmd.selectNext()
    expect(cmd.getState().value).toBe("a")
  })

  it("selectPrev at start wraps when loop=true", () => {
    const cmd = createCommand({ loop: true })
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b" })
    cmd.selectFirst()
    cmd.selectPrev()
    expect(cmd.getState().value).toBe("b")
  })

  it("setValue updates the highlighted value", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.setValue("a")
    expect(cmd.getState().value).toBe("a")
  })

  it("setValue ignores values that are not navigable", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.setValue("missing")
    expect(cmd.getState().hasValue).toBe(false)
  })

  it("setValue clears selection when moving to a disabled item", () => {
    const calls: string[] = []
    const cmd = createCommand({ onValueChange: (value) => calls.push(value) })
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b", disabled: true })

    cmd.setValue("a")
    cmd.setValue("b")

    expect(cmd.getState().hasValue).toBe(false)
    expect(cmd.getState().value).toBe("")
    expect(calls).toEqual(["a", ""])
  })

  it("setValue clears selection when moving to a filtered-out item", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "apple" })
    cmd.registerItem({ value: "banana" })

    cmd.setValue("banana")
    cmd.setSearch("app")
    cmd.setValue("banana")

    expect(cmd.getState().hasValue).toBe(false)
  })

  it("onValueChange is called when value changes", () => {
    const calls: string[] = []
    const cmd = createCommand({ onValueChange: (v) => calls.push(v) })
    cmd.registerItem({ value: "a" })
    cmd.setValue("a")
    expect(calls).toEqual(["a"])
  })

  it("onValueChange not called if value unchanged", () => {
    const calls: string[] = []
    const cmd = createCommand({
      initialValue: "a",
      onValueChange: (v) => calls.push(v),
    })
    cmd.registerItem({ value: "a" })
    cmd.setValue("a")
    expect(calls).toEqual([])
  })

  it("navigation skips disabled items", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "a" })
    cmd.registerItem({ value: "b", disabled: true })
    cmd.registerItem({ value: "c" })
    cmd.selectFirst()
    cmd.selectNext()
    expect(cmd.getState().value).toBe("c")
  })

  it("empty-string value can be selected (regression #357)", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "" })
    cmd.registerItem({ value: "a" })
    cmd.setValue("")
    expect(cmd.getState().value).toBe("")
    expect(cmd.getState().hasValue).toBe(true)
  })

  it("selectFirst can highlight an empty-string item", () => {
    const cmd = createCommand()
    cmd.registerItem({ value: "" })
    cmd.registerItem({ value: "a" })
    cmd.selectFirst()
    expect(cmd.getState().value).toBe("")
    expect(cmd.getState().hasValue).toBe(true)
  })
})
