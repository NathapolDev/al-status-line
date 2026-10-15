// launch.json is JSONC: drop comments (outside strings) and trailing commas.
export function parseJsonc(text: string): any {
  let out = ''
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      const start = i
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++
      out += text.slice(start, i + 1)
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2)
      if (i < 0) break
      i++
    } else out += c
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

// Publish target = first "launch" config (snapshotInitialize/attach can't publish).
export function publishEnv(launch: any): string | undefined {
  const cfg = (launch?.configurations ?? []).find((c: any) => c?.request === 'launch')
  return cfg ? cfg.environmentName ?? cfg.serverInstance ?? cfg.name : undefined
}

// Errors in a compile result: MCP diagnostics ("Severity":"Error", possibly JSON-in-text) or alc lines ("error AL0118").
export function countErrors(result: unknown): number {
  const s = typeof result === 'string' ? result : JSON.stringify(result ?? '')
  const mcp = s.match(/\\*"severity\\*"\s*:\s*\\*"error/gi)?.length ?? 0
  if (mcp > 0) return mcp
  return new Set(s.match(/[^\s"\\]*: error AL\d{4}[^\n"\\]*/gi) ?? []).size
}

// MCP publish reports failure in its payload, not always as a tool error.
export function publishSucceeded(result: unknown): boolean {
  const s = typeof result === 'string' ? result : JSON.stringify(result ?? '')
  return !/\\*"succe(ss|eded)\\*"\s*:\s*false/i.test(s)
}

// The AL extension empties .vscode/rad.json after a successful publish (RAD docs).
export function isRadEmpty(text: string): boolean {
  try {
    const rad = parseJsonc(text)
    return ['Added', 'Modified', 'Removed'].every(k => Array.isArray(rad[k]) && rad[k].length === 0)
  } catch {
    return false
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function statusText(env: string | undefined, version: string | undefined, errors: number | undefined, publishedAt?: number): string {
  const build = errors === undefined ? '? not compiled' : errors === 0 ? '✓' : `✗ ${errors} error${errors > 1 ? 's' : ''}`
  const published = publishedAt === undefined ? 'never' : formatTime(publishedAt)
  return `☁️ ${env ?? '-'} · v${version ?? '-'} · ${build} · Last publish ⬆ ${published}`
}
