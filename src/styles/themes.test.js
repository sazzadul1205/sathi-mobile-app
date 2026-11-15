// src/styles/themes.test.js
// Guards the modular color template system: every theme variant file must
// define the complete token contract, so no variant can ship half-styled.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const themesDir = join(import.meta.dirname, 'themes')

// The full token contract — keep in sync with src/index.css (@theme inline).
const REQUIRED_TOKENS = [
  '--t-bg',
  '--t-app',
  '--t-card',
  '--t-line',
  '--t-line-2',
  '--t-ink',
  '--t-ink-2',
  '--t-muted',
  '--t-brand',
  '--t-brand-dk',
  '--t-brand-soft',
  '--t-brand-gradient-from',
  '--t-brand-gradient-to',
  '--t-given',
  '--t-given-soft',
  '--t-missed',
  '--t-missed-soft',
  '--t-refused',
  '--t-refused-soft',
  '--t-other',
  '--t-other-soft',
  '--t-pending',
  '--t-pending-soft',
  '--t-transit',
  '--t-transit-soft',
  '--t-sync',
  '--t-sync-soft',
  '--t-warn',
  '--t-warn-soft',
  '--t-danger',
  '--t-danger-soft',
  '--t-admin',
  '--t-admin-soft',
]

const themeFiles = readdirSync(themesDir).filter((f) => f.endsWith('.css'))

describe('color template system', () => {
  it('ships at least the default and dark variants', () => {
    expect(themeFiles).toEqual(
      expect.arrayContaining(['default.css', 'dark.css']),
    )
  })

  it('defines every color token in the default (teal) theme', () => {
    const css = readFileSync(join(themesDir, 'default.css'), 'utf8')
    for (const token of REQUIRED_TOKENS) {
      expect(css).toMatch(new RegExp(`${token}:\\s*#`))
    }
  })
})

describe.each(themeFiles)('%s', (file) => {
  const css = readFileSync(join(themesDir, file), 'utf8')

  it.each(REQUIRED_TOKENS)('defines %s', (token) => {
    expect(css).toMatch(new RegExp(`${token}:\\s*#`))
  })
})