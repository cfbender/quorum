import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { DEFAULT_CONFIG } from "../src/config.js"
import { createHooks } from "../src/plugin.js"
import type { QuorumConfig } from "../src/types.js"

const TEST_SKILLS_DIR = "/test/skills"

describe("plugin hooks", () => {
  it("registers config hook and bootstrap in auto mode", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    expect(hooks.config).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()

    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toContain("quorum-sonnet")

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    expect(output.system.join("\n")).toContain("quorum-sonnet")
    expect(output.system.join("\n")).toContain("task")
    expect(output.system.join("\n")).toContain("Trigger gate")
    expect(output.system.join("\n")).toContain("obvious bug fixes")
    expect(output.system.join("\n")).toContain("If you are unsure")
  })

  it("registers only config hook in manual mode", () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "manual" }, TEST_SKILLS_DIR)
    expect(hooks.config).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()
  })

  it("registers config hook (with skills path) but no agents in off mode", async () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "off" }, TEST_SKILLS_DIR)
    expect(hooks.config).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()

    const cfg = {} as Record<string, unknown>
    await hooks.config?.(cfg as never)
    expect((cfg as { skills?: { paths?: string[] } }).skills?.paths).toContain(TEST_SKILLS_DIR)
    expect(cfg.agent).toBeUndefined()
  })

  it("always registers skills path even when triggerMode is off", async () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "off" }, TEST_SKILLS_DIR)
    const cfg = {} as Record<string, unknown>
    await hooks.config?.(cfg as never)
    expect((cfg as { skills?: { paths?: string[] } }).skills?.paths).toEqual([TEST_SKILLS_DIR])
  })

  it("initializes skills when input.skills is undefined", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect((cfg as { skills?: { paths?: string[] } }).skills?.paths).toContain(TEST_SKILLS_DIR)
  })

  it("does not duplicate skills path when already present", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    const cfg = { agent: {} as Record<string, unknown>, skills: { paths: [TEST_SKILLS_DIR] } }
    await hooks.config?.(cfg as never)
    expect(cfg.skills.paths.filter((p) => p === TEST_SKILLS_DIR)).toHaveLength(1)
  })

  it("appends skills path without replacing existing paths", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    const existing = "/some/other/skills"
    const cfg = { agent: {} as Record<string, unknown>, skills: { paths: [existing] } }
    await hooks.config?.(cfg as never)
    expect(cfg.skills.paths).toContain(existing)
    expect(cfg.skills.paths).toContain(TEST_SKILLS_DIR)
    expect(cfg.skills.paths.indexOf(existing)).toBeLessThan(cfg.skills.paths.indexOf(TEST_SKILLS_DIR))
  })

  it("in off mode: skills path populated, agent NOT populated", async () => {
    const hooks = createHooks({ ...DEFAULT_CONFIG, triggerMode: "off" }, TEST_SKILLS_DIR)
    const cfg = {} as Record<string, unknown>
    await hooks.config?.(cfg as never)
    const typed = cfg as { skills?: { paths?: string[] }; agent?: unknown }
    expect(typed.skills?.paths).toContain(TEST_SKILLS_DIR)
    expect(typed.agent).toBeUndefined()
  })

  it("in auto mode: both skills path and agents populated", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    const typed = cfg as { skills?: { paths?: string[] }; agent?: Record<string, unknown> }
    expect(typed.skills?.paths).toContain(TEST_SKILLS_DIR)
    expect(Object.keys(typed.agent ?? {})).toContain("quorum-sonnet")
  })

  it("deep agents appear in input.agent when deepMembers configured", async () => {
    const config: QuorumConfig = {
      ...DEFAULT_CONFIG,
      deepMembers: [
        { name: "quorum-deep-a", providerID: "openrouter", modelID: "anthropic/claude-opus-4-5", label: "opus" },
      ],
    }
    const hooks = createHooks(config, TEST_SKILLS_DIR)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toContain("quorum-sonnet")
    expect(Object.keys(cfg.agent)).toContain("quorum-deep-a")
  })

  it("hook shape unchanged for configs without deepMembers", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR)
    const cfg = { agent: {} as Record<string, unknown> }
    await hooks.config?.(cfg as never)
    expect(Object.keys(cfg.agent)).toHaveLength(3)
    expect(Object.keys(cfg.agent)).toEqual(["quorum-sonnet", "quorum-gpt5", "quorum-gemini"])
  })

  // --- config-issues injection ---

  it("config-issues block injected when issues present", async () => {
    const issues = ["Invalid member entry at index 0: field 'providerID' must be a non-empty string", "Fewer than 2 valid members parsed (got 0); config falling back to defaults"]
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, { issues })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    const text = output.system.join("\n")
    expect(text).toContain("<quorum-config-issues>")
    expect(text).toContain("- Invalid member entry at index 0: field 'providerID' must be a non-empty string")
    expect(text).toContain("- Fewer than 2 valid members parsed")
    expect(text).toContain("Tell the user so they can fix their config")
  })

  it("no config-issues block when issues is empty", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, { issues: [] })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    expect(output.system.join("\n")).not.toContain("<quorum-config-issues>")
  })

  // --- restart-required injection ---

  it("restart-required block injected when mtime newer than boot", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quorum-test-"))
    const configPath = path.join(tmpDir, "quorum.json")
    fs.writeFileSync(configPath, "{}")
    const bootMtime = fs.statSync(configPath).mtimeMs

    // Bump mtime by writing again after a small delay to ensure newer timestamp
    // Use utimes to guarantee mtime is strictly newer
    const futureMs = bootMtime + 2000
    fs.utimesSync(configPath, new Date(futureMs), new Date(futureMs))

    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, { configPath, bootMtime })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    const text = output.system.join("\n")
    expect(text).toContain("<quorum-restart-required>")
    expect(text).toContain("quorum.json has been edited since opencode started")
    expect(text).toContain("Restart opencode to apply changes")

    fs.rmSync(tmpDir, { recursive: true })
  })

  it("restart-required block absent when file mtime unchanged", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quorum-test-"))
    const configPath = path.join(tmpDir, "quorum.json")
    fs.writeFileSync(configPath, "{}")
    const bootMtime = fs.statSync(configPath).mtimeMs

    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, { configPath, bootMtime })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    expect(output.system.join("\n")).not.toContain("<quorum-restart-required>")

    fs.rmSync(tmpDir, { recursive: true })
  })

  it("transform hook is resilient to stat failure (non-existent configPath)", async () => {
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, {
      configPath: "/nonexistent/path/quorum.json",
      bootMtime: Date.now(),
    })
    const output = { system: [] as string[] }
    await expect(
      hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never),
    ).resolves.toBeUndefined()
    // bootstrap still emitted, no throw
    expect(output.system.join("\n")).toContain("<quorum-bootstrap>")
    expect(output.system.join("\n")).not.toContain("<quorum-restart-required>")
  })

  it("restart-required block appears before config-issues block", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quorum-test-"))
    const configPath = path.join(tmpDir, "quorum.json")
    fs.writeFileSync(configPath, "{}")
    const bootMtime = fs.statSync(configPath).mtimeMs
    const futureMs = bootMtime + 2000
    fs.utimesSync(configPath, new Date(futureMs), new Date(futureMs))

    const issues = ["Some issue"]
    const hooks = createHooks(DEFAULT_CONFIG, TEST_SKILLS_DIR, { issues, configPath, bootMtime })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ model: { id: "unused" } } as never, output as never)
    const text = output.system.join("\n")
    expect(text.indexOf("<quorum-restart-required>")).toBeLessThan(text.indexOf("<quorum-config-issues>"))

    fs.rmSync(tmpDir, { recursive: true })
  })
})
