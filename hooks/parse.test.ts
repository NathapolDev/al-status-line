import { describe, expect, test } from 'claude-code/testing'

import { countErrors, isRadEmpty, parseJsonc, publishEnv, publishSucceeded, statusText } from './parse'

const LAUNCH = `{
  "configurations": [
    { "name": "snap", "request": "snapshotInitialize", "environmentName": "production" },
    { "name": "sandbox", "request": "launch", "environmentName": "sandbox", "url": "https://x" },
    // { "name": "old", "request": "launch" },
  ]
}`

describe('al-status', () => {
  test('picks first launch config from JSONC', () => {
    expect(publishEnv(parseJsonc(LAUNCH))).toBe('sandbox')
  })
  test('counts MCP diagnostics errors', () => {
    const r = { content: [{ type: 'text', text: JSON.stringify({ Succeeded: false, Diagnostics: [
      { Severity: 'Error', Code: 'AL0118' }, { Severity: 'Warning' }, { Severity: 'Error' }] }) }] }
    expect(countErrors(r)).toBe(2)
  })
  test('counts alc output errors', () => {
    expect(countErrors({ stdout: 'a.al(1,2): error AL0118: x\nb.al(3,4): error AL0132: y\nwarning AL0432' })).toBe(2)
  })
  test('success shows tick', () => {
    expect(countErrors({ Succeeded: true, Diagnostics: [] })).toBe(0)
    expect(statusText('sandbox', '1.0.0.0', 0)).toBe('☁️ sandbox · v1.0.0.0 · ✓ · Last publish ⬆ never')
    expect(statusText('sandbox', '1.0.0.0', 3)).toBe('☁️ sandbox · v1.0.0.0 · ✗ 3 errors · Last publish ⬆ never')
  })
  test('rad.json emptied by publish (with BOM)', () => {
    expect(isRadEmpty('﻿{"Added":[],"Modified":[],"Removed":[]}')).toBe(true)
    expect(isRadEmpty('{"Added":[],"Modified":[{"ObjectId":50100}],"Removed":[]}')).toBe(false)
    expect(isRadEmpty('garbage')).toBe(false)
  })
  test('publish time and success detection', () => {
    const at = new Date(2026, 9, 15, 9, 5).getTime()
    expect(statusText('sandbox', '1.0.0.0', 0, at)).toBe('☁️ sandbox · v1.0.0.0 · ✓ · Last publish ⬆ 15/10 09:05')
    expect(publishSucceeded({ content: [{ text: JSON.stringify({ success: false }) }] })).toBe(false)
    expect(publishSucceeded({ content: [{ text: JSON.stringify({ success: true }) }] })).toBe(true)
  })
})
