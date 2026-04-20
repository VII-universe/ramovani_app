'use client'

/**
 * Client-side perspective warp — no OpenCV, no WASM.
 *
 * Algorithm:
 *   1. Compute a 3×3 homography H from the user's 4 corner points → output rectangle.
 *   2. Invert H → H_inv maps each output pixel back to a source pixel.
 *   3. Bilinear-sample the source image at each H_inv(x,y) to fill the output Canvas.
 *
 * Performance: the source image is downscaled to MAX_SRC_DIM on the longer side before
 * pixel-level processing. For a 12 MP photo this keeps the inner loop under ~1 s in V8.
 */

const MAX_SRC_DIM = 1920  // pixels — limits the inner-loop workload

// ─────────────────────────────────────────────────────────────────────────────
// Linear algebra helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Solve Ax = b with Gaussian elimination + partial pivoting (n×n). */
function gaussElim(A: number[][], b: number[]): number[] {
  const n = A.length
  // Build augmented matrix [A | b]
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    // Find the row with the largest absolute value in this column (partial pivot)
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[maxRow]![col]!)) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow]!, M[col]!]

    const pivot = M[col]![col]!
    if (Math.abs(pivot) < 1e-12) throw new Error('Degenerate homography — corners are collinear')

    for (let row = col + 1; row < n; row++) {
      const f = M[row]![col]! / pivot
      for (let k = col; k <= n; k++) M[row]![k]! -= f * M[col]![k]!
    }
  }

  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i]![n]!
    for (let j = i + 1; j < n; j++) x[i]! -= M[i]![j]! * x[j]!
    x[i]! /= M[i]![i]!
  }
  return x
}

/**
 * Compute a 3×3 homography matrix (9-element row-major array) such that
 * dst[i] ≈ H * src[i] in homogeneous coordinates.
 * Requires exactly 4 point correspondences.
 */
function computeHomography(
  src: [number, number][],
  dst: [number, number][],
): number[] {
  // Each point gives 2 equations; h22 is fixed at 1 (scale-free convention).
  const A: number[][] = []
  const b: number[] = []

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]!
    const [u, v] = dst[i]!
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }

  const h = gaussElim(A, b)
  return [...h, 1] // h[0..7], h[8]=1
}

/** Apply a 3×3 row-major homography to (x,y) → (u,v). */
function applyH(H: number[], x: number, y: number): [number, number] {
  const w = H[6]! * x + H[7]! * y + H[8]!
  return [(H[0]! * x + H[1]! * y + H[2]!) / w, (H[3]! * x + H[4]! * y + H[5]!) / w]
}

/** Invert a 3×3 row-major matrix via the adjugate / determinant formula. */
function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, k] = m as [
    number, number, number,
    number, number, number,
    number, number, number,
  ]
  const det = a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g)
  if (Math.abs(det) < 1e-12) throw new Error('Singular homography')
  return [
    (e * k - f * h) / det, (c * h - b * k) / det, (b * f - c * e) / det,
    (f * g - d * k) / det, (a * k - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface WarpResult {
  /** JPEG data URL of the perspective-corrected image */
  dataUrl: string
  /** Output width in pixels */
  widthPx: number
  /** Output height in pixels */
  heightPx: number
}

/**
 * Perspective-correct a region of `img` defined by four corner points into a
 * flat rectangle.
 *
 * @param img        - The source HTMLImageElement (must be fully loaded)
 * @param corners    - [TL, TR, BR, BL] corner coordinates in natural image pixels
 */
export async function warpPerspective(
  img: HTMLImageElement,
  corners: [number, number][],
): Promise<WarpResult> {
  // Yield to the browser so "Processing…" can repaint before the heavy loop
  await new Promise<void>((r) => setTimeout(r, 16))
  return _warp(img, corners)
}

function _warp(img: HTMLImageElement, corners: [number, number][]): WarpResult {
  const [tl, tr, br, bl] = corners as [
    [number, number], [number, number], [number, number], [number, number]
  ]

  // ── Output dimensions from corner distances ───────────────────────────────
  const topW   = Math.hypot(tr[0] - tl[0], tr[1] - tl[1])
  const botW   = Math.hypot(br[0] - bl[0], br[1] - bl[1])
  const leftH  = Math.hypot(bl[0] - tl[0], bl[1] - tl[1])
  const rightH = Math.hypot(br[0] - tr[0], br[1] - tr[1])
  const outW   = Math.max(2, Math.round((topW + botW) / 2))
  const outH   = Math.max(2, Math.round((leftH + rightH) / 2))

  // ── Scale source image down for performance ───────────────────────────────
  const naturalMax = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = naturalMax > MAX_SRC_DIM ? MAX_SRC_DIM / naturalMax : 1

  const srcW = Math.round(img.naturalWidth * scale)
  const srcH = Math.round(img.naturalHeight * scale)

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcW
  srcCanvas.height = srcH
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.drawImage(img, 0, 0, srcW, srcH)
  const srcPx = srcCtx.getImageData(0, 0, srcW, srcH).data

  // Scale corners and output dims proportionally
  const sCorners: [number, number][] = corners.map(([x, y]) => [x * scale, y * scale])
  const sOutW = Math.max(2, Math.round(outW * scale))
  const sOutH = Math.max(2, Math.round(outH * scale))

  // ── Homography: scaled corners → scaled output rect ───────────────────────
  const dst: [number, number][] = [
    [0, 0], [sOutW - 1, 0], [sOutW - 1, sOutH - 1], [0, sOutH - 1],
  ]
  const H    = computeHomography(sCorners, dst)
  const Hinv = invert3(H)

  // ── Inverse warp with bilinear sampling ───────────────────────────────────
  const outCanvas = document.createElement('canvas')
  outCanvas.width  = sOutW
  outCanvas.height = sOutH
  const outCtx  = outCanvas.getContext('2d')!
  const outImg  = outCtx.createImageData(sOutW, sOutH)
  const outData = outImg.data

  for (let oy = 0; oy < sOutH; oy++) {
    for (let ox = 0; ox < sOutW; ox++) {
      const [sx, sy] = applyH(Hinv, ox, oy)
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      if (x0 < 0 || y0 < 0 || x0 >= srcW - 1 || y0 >= srcH - 1) continue

      const fx = sx - x0
      const fy = sy - y0
      const i00 = (y0 * srcW + x0) * 4
      const i10 = i00 + 4
      const i01 = i00 + srcW * 4
      const i11 = i01 + 4
      const idx = (oy * sOutW + ox) * 4

      for (let c = 0; c < 4; c++) {
        outData[idx + c] =
          srcPx[i00 + c]! * (1 - fx) * (1 - fy) +
          srcPx[i10 + c]! * fx       * (1 - fy) +
          srcPx[i01 + c]! * (1 - fx) * fy       +
          srcPx[i11 + c]! * fx       * fy
      }
    }
  }

  outCtx.putImageData(outImg, 0, 0)

  return {
    dataUrl:  outCanvas.toDataURL('image/jpeg', 0.92),
    widthPx:  sOutW,
    heightPx: sOutH,
  }
}
