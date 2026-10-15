import type { EngineInterface, Register } from 'claude-code'

import { countErrors, isRadEmpty, parseJsonc, publishEnv, publishSucceeded, statusText } from './parse'

const COMPILE_TOOLS = new Set(['mcp__al__al_compile', 'mcp__al__al_build'])
const SHELL_COMPILE = /\balc(\.exe)?\b|compile\.ps1/i
const IDE_DIAGNOSTICS = 'mcp__ide__getDiagnostics'

async function setCompile($: EngineInterface, root: string, errors: number, at: number) {
  await $.store.set(`errors:${root}`, errors)
  await $.store.set(`compiledAt:${root}`, at)
}

// Picks up builds/publishes done in VS Code from the files the AL extension writes.
async function syncFromVsCode($: EngineInterface, root: string) {
  // A new .app = a successful build or publish (VS Code or al_build).
  const apps = (await $.fs.list(root)).filter(f => f.kind === 'file' && f.name.endsWith('.app'))
  const newestApp = Math.max(0, ...apps.map(f => f.mtimeMs))
  const compiledAt = Number((await $.store.get(`compiledAt:${root}`)) ?? 0)
  if (newestApp > compiledAt) await setCompile($, root, 0, newestApp)

  // ponytail: an emptied rad.json = publish; a build with no changes since the last publish also counts
  const rad = `${root}/.vscode/rad.json`
  if (await $.fs.exists(rad)) {
    const { mtimeMs } = await $.fs.stat(rad)
    const publishedAt = Number((await $.store.get(`published:${root}`)) ?? 0)
    if (mtimeMs > publishedAt && isRadEmpty(await $.fs.read(rad))) await $.store.set(`published:${root}`, mtimeMs)
  }

  // Live errors from the VS Code AL language server, only when the IDE tool is already allowed (no prompts).
  const verdict = await $.tool.check({ tool: IDE_DIAGNOSTICS, input: {} }).catch(() => undefined)
  if (verdict?.decision === 'allow') {
    const found = await $.tool.call({ tool: IDE_DIAGNOSTICS }).catch(() => undefined)
    if (found && found.deny === undefined && !found.isError) await setCompile($, root, countErrors(found.result), await $.clock.now())
  }
}

async function refresh($: EngineInterface, root: string) {
  if (!(await $.fs.exists(`${root}/app.json`))) return $.ui.status(undefined)
  await syncFromVsCode($, root).catch(() => undefined)
  const version = await $.fs.read(`${root}/app.json`).then(t => parseJsonc(t).version, () => undefined)
  const env = await $.fs.read(`${root}/.vscode/launch.json`).then(t => publishEnv(parseJsonc(t)), () => undefined)
  const errors = (await $.store.get(`errors:${root}`)) as number | undefined
  const publishedAt = (await $.store.get(`published:${root}`)) as number | undefined
  $.ui.status(statusText(env, version, errors, publishedAt))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const root = await $.session.root()
    await refresh($, root)
    // ponytail: 15s poll catches VS Code builds/publishes and app.json/launch.json edits; no file-watch event needed
    $.clock.every(15000, () => void refresh($, root))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.tool === IDE_DIAGNOSTICS || ran.deny !== undefined) return ran
    const command = (e as { command?: unknown }).command
    const isCompile = COMPILE_TOOLS.has(e.tool)
      || ((e.tool === 'Bash' || e.tool === 'PowerShell') && typeof command === 'string' && SHELL_COMPILE.test(command))
    if (isCompile) {
      const root = await $.session.root()
      const errors = countErrors(ran.result)
      // a failed compile with no parsable diagnostics still must not show ✓
      await setCompile($, root, ran.isError && errors === 0 ? 1 : errors, await $.clock.now())
      await refresh($, root)
    }
    if (e.tool === 'mcp__al__al_publish' && !ran.isError && publishSucceeded(ran.result)) {
      const root = await $.session.root()
      await $.store.set(`published:${root}`, await $.clock.now())
      await refresh($, root)
    }
    return ran
  }).catch(($, e, next) => next(e)) // a status failure must never block the tool
}
