/**
 * worksheetPdf — generates an A4 production worksheet PDF for workshop staff.
 *
 * Page layout (A4 = 210 × 297 mm, 20 mm margins → 170 × 257 mm usable):
 *
 *   [0–22]     Dark header band — brand, short order ID, date
 *   [26–36]    Customer email  |  Full UUID
 *   [40]       Horizontal rule
 *   [44–142]   Left: 2D frame schematic (75 mm wide)
 *              Right: material & dimension specs (90 mm wide)
 *   [145]      Horizontal rule
 *   [149–~]    Cutting list (jspdf-autotable)
 *   [after]    Total price (right-aligned)
 *   [291]      Footer rule + timestamp
 */

import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

// ── Snapshot interfaces (mirrors OrderConfiguration in @ramovani/shared-types) ─

interface FrameBOM {
  frameOuterWidthMm:  number
  frameOuterHeightMm: number
  topRailMm:          number
  bottomRailMm:       number
  leftStileMm:        number
  rightStileMm:       number
}

interface PassepartoutBOM {
  outerWidthMm:     number
  outerHeightMm:    number
  innerWidthMm:     number
  innerHeightMm:    number
  overlapPerSideMm: number
}

interface GlassBOM {
  widthMm:  number
  heightMm: number
}

interface OrderSnap {
  artworkWidthMm:          number
  artworkHeightMm:         number
  frameProfileName:        string
  frameProfileWidthMm:     number
  passepartoutProfileName?: string
  passepartoutOverlapMm?:  number
  includeGlass:            boolean
  frameBOM?:               FrameBOM
  passepartoutBOM?:        PassepartoutBOM
  glassBOM?:               GlassBOM
}

export interface WorksheetOrder {
  id:            string
  customerEmail: string
  createdAt:     string
  totalPrice:    number
  currency:      string
  configSnapshot?:          Record<string, unknown>
  artworkWidthMm?:          number | null
  artworkHeightMm?:         number | null
  frameProfileName?:        string | null
  passepartoutProfileName?: string | null
  passepartoutOverlapMm?:   number | null
  includeGlass?:            boolean
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function fmtPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

/** Round to nearest integer, returned as string */
const r = (n: number) => Math.round(n).toString()

// ── Main export ────────────────────────────────────────────────────────────────

export function generateWorksheetPdf(order: WorksheetOrder) {
  const snap = (order.configSnapshot ?? {}) as Partial<OrderSnap>

  // ── Resolve all dimensions ─────────────────────────────────────────────────
  const artW      = snap.artworkWidthMm  ?? order.artworkWidthMm  ?? 0
  const artH      = snap.artworkHeightMm ?? order.artworkHeightMm ?? 0
  const frameName = snap.frameProfileName ?? order.frameProfileName ?? '—'
  const profileW  = snap.frameProfileWidthMm ?? 20
  const overlapMm = snap.passepartoutOverlapMm ?? order.passepartoutOverlapMm ?? 0
  const hasGlass  = snap.includeGlass ?? order.includeGlass ?? false
  const hasMat    = !!(snap.passepartoutBOM ?? order.passepartoutProfileName)
  const matName   = snap.passepartoutProfileName ?? order.passepartoutProfileName ?? '—'

  const frameBOM = snap.frameBOM
  const passBOM  = snap.passepartoutBOM
  const glassBOM = snap.glassBOM

  // Frame opening (inner rabbet) dimensions
  const openingW = frameBOM?.frameOuterWidthMm  ?? (artW + 2 * overlapMm)
  const openingH = frameBOM?.frameOuterHeightMm ?? (artH + 2 * overlapMm)

  // Outer moulding piece lengths (measured at long/outer edge)
  const topLen    = frameBOM?.topRailMm    ?? (openingW + 2 * profileW)
  const bottomLen = frameBOM?.bottomRailMm ?? (openingW + 2 * profileW)
  const leftLen   = frameBOM?.leftStileMm  ?? (openingH + 2 * profileW)
  const rightLen  = frameBOM?.rightStileMm ?? (openingH + 2 * profileW)

  // Glass / backing: frame opening minus 2 mm tolerance per side
  const glassW = (glassBOM?.widthMm  ?? openingW) - 2
  const glassH = (glassBOM?.heightMm ?? openingH) - 2

  const shortId = order.id.slice(0, 8).toUpperCase()

  // ── Document setup ─────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PAGE_W = 210
  const M      = 20   // 20 mm margin on all sides
  const RIGHT  = PAGE_W - M

  // ── 1. Header band ─────────────────────────────────────────────────────────
  doc.setFillColor(18, 18, 18)
  doc.rect(0, 0, PAGE_W, 22, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('RAMOVANI', M, 12)

  // Sub-brand label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text('PRODUCTION WORKSHEET', M, 17)

  // Short order ID (right-aligned, monospace)
  doc.setFont('courier', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(`#${shortId}`, RIGHT, 12, { align: 'right' })

  // Date (right-aligned, small)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text(fmtDate(order.createdAt), RIGHT, 17, { align: 'right' })

  // ── 2. Customer / UUID row ─────────────────────────────────────────────────
  const COL2 = M + 85   // x-start of right sub-column (UUID)

  const miniLabel = (txt: string, x: number, y: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(140, 140, 140)
    doc.text(txt, x, y)
  }
  const bodyVal = (txt: string, x: number, y: number, size = 8.5) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(20, 20, 20)
    doc.text(txt, x, y)
  }

  miniLabel('CUSTOMER EMAIL', M, 30)
  bodyVal(order.customerEmail, M, 35)

  miniLabel('ORDER UUID', COL2, 30)
  bodyVal(order.id, COL2, 35, 7)

  // Divider
  const ink: [number, number, number] = [200, 198, 192]
  doc.setDrawColor(...ink)
  doc.setLineWidth(0.3)
  doc.line(M, 40, RIGHT, 40)

  // ── 3. Schematic (left) + Specs (right) ────────────────────────────────────
  const SCHEMATIC_X   = M
  const SCHEMATIC_Y   = 46
  const SCHEMATIC_W   = 75   // mm
  const SCHEMATIC_H   = 85   // mm
  const SPECS_X       = M + SCHEMATIC_W + 10  // 105 mm
  const SPECS_END_X   = RIGHT

  // ── 3a. 2-D frame schematic ────────────────────────────────────────────────
  const frameOutW = topLen    // outer moulding width
  const frameOutH = leftLen   // outer moulding height

  const scale = Math.min(SCHEMATIC_W / frameOutW, SCHEMATIC_H / frameOutH)
  const sw    = frameOutW * scale
  const sh    = frameOutH * scale
  const ox    = SCHEMATIC_X + (SCHEMATIC_W - sw) / 2
  const oy    = SCHEMATIC_Y + (SCHEMATIC_H - sh) / 2

  // Minimum visual moulding thickness: 4 mm in PDF space
  const pwS = Math.max(profileW * scale, 4)

  // Frame moulding fill (warm wood)
  doc.setFillColor(185, 158, 118)
  doc.setDrawColor(120, 95, 60)
  doc.setLineWidth(0.4)
  doc.rect(ox, oy, sw, sh, 'FD')

  // Opening fill: glass tint or plain backing
  const innerX = ox + pwS
  const innerY = oy + pwS
  const innerW = sw - 2 * pwS
  const innerH = sh - 2 * pwS

  if (hasGlass) {
    doc.setFillColor(215, 232, 248)   // pale blue
  } else {
    doc.setFillColor(244, 240, 232)   // warm backing
  }
  doc.setDrawColor(170, 165, 155)
  doc.setLineWidth(0.2)
  doc.rect(innerX, innerY, innerW, innerH, 'FD')

  // Passepartout mat
  if (hasMat && passBOM) {
    const mow = passBOM.outerWidthMm  * scale
    const moh = passBOM.outerHeightMm * scale
    const mx  = innerX + (innerW - mow) / 2
    const my  = innerY + (innerH - moh) / 2

    doc.setFillColor(232, 220, 195)   // cream mat
    doc.setDrawColor(175, 160, 135)
    doc.setLineWidth(0.2)
    doc.rect(mx, my, mow, moh, 'FD')

    // Artwork window cutout
    const wiw = passBOM.innerWidthMm  * scale
    const wih = passBOM.innerHeightMm * scale
    doc.setFillColor(248, 245, 238)
    doc.setDrawColor(175, 170, 160)
    doc.rect(mx + (mow - wiw) / 2, my + (moh - wih) / 2, wiw, wih, 'FD')
  } else {
    // No mat — dashed artwork outline
    const aws = artW * scale
    const ahs = artH * scale
    doc.setDrawColor(175, 170, 160)
    doc.setLineWidth(0.2)
    doc.rect(innerX + (innerW - aws) / 2, innerY + (innerH - ahs) / 2, aws, ahs)
  }

  // Glass highlight border
  if (hasGlass) {
    doc.setDrawColor(90, 155, 215)
    doc.setLineWidth(0.5)
    doc.rect(innerX, innerY, innerW, innerH)
  }

  // Re-draw outer moulding border on top
  doc.setDrawColor(98, 72, 38)
  doc.setLineWidth(0.5)
  doc.rect(ox, oy, sw, sh)

  // Dimension labels
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  // Width — below schematic
  doc.text(
    `${r(frameOutW)} mm`,
    ox + sw / 2,
    SCHEMATIC_Y + SCHEMATIC_H + 5,
    { align: 'center' },
  )
  // Height — right of schematic, rotated 270° (reads bottom → top)
  doc.text(
    `${r(frameOutH)} mm`,
    ox + sw + 4,
    oy + sh / 2,
    { angle: 270, align: 'center' },
  )

  // Caption
  doc.setFontSize(5.5)
  doc.setTextColor(160, 155, 148)
  doc.text(
    'Front view — outer moulding dimensions',
    ox + sw / 2,
    SCHEMATIC_Y + SCHEMATIC_H + 9,
    { align: 'center' },
  )

  // ── 3b. Material specs (right column) ─────────────────────────────────────
  const specColW = SPECS_END_X - SPECS_X   // available width for wrapping

  let ry = SCHEMATIC_Y + 4
  const specRow = (label: string, value: string) => {
    miniLabel(label, SPECS_X, ry)
    ry += 5
    // Wrap long values
    const lines = doc.splitTextToSize(value, specColW) as string[]
    bodyVal(lines.join('\n'), SPECS_X, ry, 8)
    ry += lines.length * 4.5 + 5.5
  }

  specRow('FRAME PROFILE',          frameName)
  specRow('ARTWORK DIMENSIONS',     `${r(artW)} × ${r(artH)} mm`)
  specRow('FRAME OPENING (RABBET)', `${r(openingW)} × ${r(openingH)} mm`)

  if (hasMat && passBOM) {
    specRow('MAT BOARD',        matName)
    specRow('MAT OUTER',        `${r(passBOM.outerWidthMm)} × ${r(passBOM.outerHeightMm)} mm`)
    specRow('MAT WINDOW',       `${r(passBOM.innerWidthMm)} × ${r(passBOM.innerHeightMm)} mm`)
    specRow('MAT BORDER WIDTH', `${r(overlapMm)} mm per side`)
  } else if (order.passepartoutProfileName) {
    specRow('MAT BOARD',        matName)
    specRow('MAT BORDER WIDTH', `${r(overlapMm)} mm per side`)
  }

  if (hasGlass) {
    specRow('GLASS', 'Anti-reflective museum glass')
    specRow('GLASS CUT SIZE', `${r(glassW)} × ${r(glassH)} mm`)
  }

  // ── 4. Cutting list section ────────────────────────────────────────────────
  const divY2 = SCHEMATIC_Y + SCHEMATIC_H + 14
  doc.setDrawColor(...ink)
  doc.setLineWidth(0.3)
  doc.line(M, divY2, RIGHT, divY2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(20, 20, 20)
  doc.text('CUTTING LIST', M, divY2 + 7)

  // Build rows for autoTable
  type Row = [string, string, string, string]
  const tableRows: Row[] = [
    ['Moulding — Top rail',    '1×', `${r(topLen)} mm`,    '45° miter both ends'],
    ['Moulding — Bottom rail', '1×', `${r(bottomLen)} mm`, '45° miter both ends'],
    ['Moulding — Left stile',  '1×', `${r(leftLen)} mm`,   '45° miter both ends'],
    ['Moulding — Right stile', '1×', `${r(rightLen)} mm`,  '45° miter both ends'],
  ]

  if (hasGlass) {
    tableRows.push([
      'Glass sheet', '1×',
      `${r(glassW)} × ${r(glassH)} mm`,
      '−2 mm tolerance each side',
    ])
  }

  tableRows.push([
    'Backing board', '1×',
    `${r(glassW)} × ${r(glassH)} mm`,
    hasGlass ? 'Same size as glass sheet' : '−2 mm tolerance each side',
  ])

  if (hasMat && passBOM) {
    tableRows.push([
      'Passepartout — outer cut', '1×',
      `${r(passBOM.outerWidthMm)} × ${r(passBOM.outerHeightMm)} mm`,
      'Fits frame rabbet exactly',
    ])
    tableRows.push([
      'Passepartout — window cut', '1×',
      `${r(passBOM.innerWidthMm)} × ${r(passBOM.innerHeightMm)} mm`,
      `${r(overlapMm)} mm border, centred`,
    ])
  } else if (hasMat) {
    tableRows.push([
      'Passepartout', '1×',
      `${r(openingW)} × ${r(openingH)} mm outer`,
      `${r(overlapMm)} mm border`,
    ])
  }

  autoTable(doc, {
    startY: divY2 + 10,
    margin: { left: M, right: M },
    head: [['Component', 'Qty', 'Dimension', 'Notes']],
    body: tableRows,
    styles: {
      font:      'helvetica',
      fontSize:  7.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      lineColor: [200, 198, 192],
      lineWidth: 0.2,
      textColor: [20, 20, 20],
    },
    headStyles: {
      fillColor:   [237, 234, 228],
      textColor:   [80, 78, 72],
      fontStyle:   'bold',
      fontSize:    7,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    alternateRowStyles: {
      fillColor: [251, 250, 248],
    },
    columnStyles: {
      0: { cellWidth: 62 },   // Component
      1: { cellWidth: 12, halign: 'center' },  // Qty
      2: { cellWidth: 46 },   // Dimension
      3: { cellWidth: 50 },   // Notes — widest so text wraps instead of truncating
    },
    tableWidth: 170,
  })

  // ── 5. Total price (right-aligned, after table) ───────────────────────────
  // jspdf-autotable exposes finalY on the doc instance after rendering
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY

  const priceY = finalY + 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 95)
  doc.text('Total price (incl. 21% VAT)', M, priceY)

  doc.setFont('courier', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  doc.text(fmtPrice(order.totalPrice, order.currency), RIGHT, priceY, { align: 'right' })

  // ── 6. Footer ──────────────────────────────────────────────────────────────
  const footY = 291
  doc.setDrawColor(...ink)
  doc.setLineWidth(0.3)
  doc.line(M, footY - 4, RIGHT, footY - 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(150, 148, 142)
  doc.text(
    `Printed ${new Date().toLocaleString('cs-CZ')}  ·  Order #${shortId}  ·  Ramovani s.r.o.`,
    PAGE_W / 2,
    footY,
    { align: 'center' },
  )

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`worksheet-${shortId}.pdf`)
}
