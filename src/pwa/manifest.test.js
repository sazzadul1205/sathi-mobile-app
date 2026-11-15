// src/pwa/manifest.test.js
// Guards PWA readiness: every icon declared in the manifest must exist in
// public/ and be a valid PNG with the declared pixel dimensions.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { manifest } from './manifest.js'

const publicDir = join(import.meta.dirname, '..', '..', 'public')

function readPngDimensions(relPath) {
  const buffer = readFileSync(join(publicDir, relPath))
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG') // PNG signature
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

describe('PWA manifest', () => {
  it('defines the required fields', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('declares 192px and 512px PNG icons plus a maskable icon', () => {
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
        expect.objectContaining({
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    )
  })

  it.each(manifest.icons)('icon $src exists and matches its declared size', ({ src, sizes }) => {
    const [width, height] = sizes.split('x').map(Number)
    expect(readPngDimensions(src)).toEqual({ width, height })
  })

  it('generates the apple touch icon referenced by index.html', () => {
    expect(readPngDimensions('icons/apple-touch-icon.png')).toEqual({
      width: 180,
      height: 180,
    })
  })
})