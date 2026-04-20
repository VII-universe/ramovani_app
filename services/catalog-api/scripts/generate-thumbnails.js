#!/usr/bin/env node
/**
 * generate-thumbnails.js
 * ──────────────────────
 * Generates solid-colour PNG thumbnail files for every catalog item.
 * The files are written to public/ with the same paths stored in the seed data
 * so that GET /static/frames/*.jpg and GET /static/mats/*.jpg return 200.
 *
 * Zero external dependencies — uses Node.js built-in `zlib` only.
 * PNG files are saved with the .jpg extension that the seed uses; every modern
 * browser (and Next.js <Image>) identifies image format from the binary magic
 * bytes, not the file extension, so they display correctly.
 *
 * Usage (run from services/catalog-api/):
 *   node scripts/generate-thumbnails.js
 */

'use strict'

const zlib = require('node:zlib')
const fs   = require('node:fs')
const path = require('node:path')

// ── Thumbnail dimensions ──────────────────────────────────────────────────────
const WIDTH  = 400
const HEIGHT = 300

// ── Catalog items: path (relative to public/) and fill colour ─────────────────
// Colours match pbr.colorHex from the Prisma seed so thumbnails are immediately
// recognisable without any image assets on disk.
const THUMBNAILS = [
  // Frame profiles
  { file: 'frames/oslo-oak-natural.jpg', hex: '#C8A97A', label: 'Oslo Oak Natural' },
  { file: 'frames/milano-nero.jpg',      hex: '#1A1714', label: 'Milano Nero'      },
  { file: 'frames/arc-chrome.jpg',       hex: '#C8C8C8', label: 'Arc Chrome'       },
  // Passepartout profiles
  { file: 'mats/warm-white.jpg', hex: '#FAF8F4', label: 'Warm White' },
  { file: 'mats/ivory.jpg',      hex: '#F5F0E8', label: 'Ivory'      },
  { file: 'mats/charcoal.jpg',   hex: '#3A3836', label: 'Charcoal'   },
]

// ── CRC-32 (required for every PNG chunk) ────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk builder ─────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')  // always 4 ASCII bytes
  const lenBuf    = Buffer.allocUnsafe(4)
  const crcBuf    = Buffer.allocUnsafe(4)

  lenBuf.writeUInt32BE(data.length, 0)

  const crcInput = Buffer.concat([typeBytes, data])
  crcBuf.writeUInt32BE(crc32(crcInput), 0)

  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

// ── Solid-colour PNG builder ──────────────────────────────────────────────────

function makePng(w, h, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR (image header)
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(w, 0)   // width
  ihdr.writeUInt32BE(h, 4)   // height
  ihdr[8]  = 8  // bit depth per channel
  ihdr[9]  = 2  // colour type: truecolour (RGB)
  ihdr[10] = 0  // compression method: deflate
  ihdr[11] = 0  // filter method
  ihdr[12] = 0  // interlace: none

  // Raw scanline data: each row = 1 filter-type byte (0 = None) + w×3 RGB bytes
  const rowStride = 1 + w * 3
  const raw = Buffer.allocUnsafe(h * rowStride)
  for (let y = 0; y < h; y++) {
    raw[y * rowStride] = 0  // filter byte: None
    for (let x = 0; x < w; x++) {
      const off = y * rowStride + 1 + x * 3
      raw[off]     = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  // Compress with zlib deflate (level 1 = fast; the data is trivially compressible)
  const idat = zlib.deflateSync(raw, { level: 1 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Hex → RGB ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PUBLIC_DIR = path.join(__dirname, '..', 'public')

console.log(`\nGenerating ${THUMBNAILS.length} thumbnails → ${PUBLIC_DIR}\n`)

for (const { file, hex, label } of THUMBNAILS) {
  const [r, g, b] = hexToRgb(hex)
  const outPath   = path.join(PUBLIC_DIR, file)

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, makePng(WIDTH, HEIGHT, r, g, b))

  console.log(`  ✓  ${file.padEnd(36)}  ${hex}  (${label})`)
}

console.log('\nDone. Files written to public/\n')
