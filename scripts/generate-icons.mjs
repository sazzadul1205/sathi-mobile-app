// scripts/generate-icons.mjs
// Generates the PWA icon set (PNG) from an inline SVG source using sharp.
// Run: npm run generate:icons
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')

const THEME = '#1f6f8b'
const GRADIENT_FROM = '#2a8bab'
const GRADIENT_TO = '#155e77'

const HEART_PATH =
  'M256 424C256 424 96 330 96 208C96 136 152 96 208 96C236 96 256 112 256 112C256 112 276 96 304 96C360 96 416 136 416 208C416 330 256 424 256 424Z'

const CROSS = {
  v: { x: 228, y: 168, width: 56, height: 176, rx: 14 },
  h: { x: 168, y: 228, width: 176, height: 56, rx: 14 },
}

function brandSvg({ fullBleed = false } = {}) {
  const rx = fullBleed ? 0 : 108
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GRADIENT_FROM}"/>
      <stop offset="100%" stop-color="${GRADIENT_TO}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <path d="${HEART_PATH}" fill="#ffffff"/>
  <rect x="${CROSS.v.x}" y="${CROSS.v.y}" width="${CROSS.v.width}" height="${CROSS.v.height}" rx="${CROSS.v.rx}" fill="${THEME}"/>
  <rect x="${CROSS.h.x}" y="${CROSS.h.y}" width="${CROSS.h.width}" height="${CROSS.h.height}" rx="${CROSS.h.rx}" fill="${THEME}"/>
</svg>`
}

function faviconSvg(size) {
  // Simplified mark (cross only) for very small sizes.
  const scale = size / 512
  const arm = 96 * scale
  const length = 288 * scale
  const r = 20 * scale
  const c = size / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.21}" fill="${THEME}"/>
  <rect x="${c - arm / 2}" y="${c - length / 2}" width="${arm}" height="${length}" rx="${r}" fill="#ffffff"/>
  <rect x="${c - length / 2}" y="${c - arm / 2}" width="${length}" height="${arm}" rx="${r}" fill="#ffffff"/>
</svg>`
}

async function renderPng(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log(`generated ${outPath}`)
}

await mkdir(iconsDir, { recursive: true })

const iconFiles = [
  [192, false, join(iconsDir, 'icon-192.png')],
  [512, false, join(iconsDir, 'icon-512.png')],
  [512, true, join(iconsDir, 'icon-512-maskable.png')],
]

for (const [size, fullBleed, outPath] of iconFiles) {
  await renderPng(brandSvg({ fullBleed }), size, outPath)
}

await renderPng(brandSvg(), 180, join(iconsDir, 'apple-touch-icon.png'))
await renderPng(faviconSvg(32), 32, join(root, 'public', 'favicon-32x32.png'))
await renderPng(faviconSvg(16), 16, join(root, 'public', 'favicon-16x16.png'))

// Scalable favicon (full brand mark).
await writeFile(join(root, 'public', 'favicon.svg'), brandSvg(), 'utf8')
console.log('generated public/favicon.svg')

console.log('icon generation complete')