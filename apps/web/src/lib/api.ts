// ─────────────────────────────────────────────────────────────────────────────
// Typed API client — thin wrapper around fetch with base URL injection.
// All hooks call through here. Swap to a real SDK (e.g. ky) later if needed.
// ─────────────────────────────────────────────────────────────────────────────

const VISION_API = process.env['NEXT_PUBLIC_VISION_API_URL'] ?? 'http://localhost:8001'
const CATALOG_API = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'

/**
 * Exported so components can prefix catalog-relative URLs (e.g. thumbnail paths)
 * without duplicating the env-var lookup.
 */
export const CATALOG_API_BASE = CATALOG_API

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!response.ok) {
    let body: unknown
    try { body = await response.json() } catch { body = null }
    throw new ApiError(response.status, `HTTP ${response.status}`, body)
  }

  return response.json() as Promise<T>
}

// ── Vision API (Node Alpha) ───────────────────────────────────────────────────

export const visionApi = {
  /**
   * POST /analyze — multipart form upload.
   * Caller is responsible for building the FormData.
   */
  analyze: async <T>(formData: FormData): Promise<T> => {
    const response = await fetch(`${VISION_API}/analyze`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — browser must set multipart boundary
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new ApiError(response.status, `Vision API error`, body)
    }
    return response.json() as Promise<T>
  },
}

// ── Catalog API (Node Beta) ───────────────────────────────────────────────────

export const catalogApi = {
  getFrames: <T>(params?: Record<string, string | number | boolean>) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      )
    ).toString() : ''
    return request<T>(`${CATALOG_API}/frames${qs}`)
  },

  getPassepartouts: <T>() =>
    request<T>(`${CATALOG_API}/passepartouts`),

  postQuote: <TReq, TRes>(body: TReq) =>
    request<TRes>(`${CATALOG_API}/quote`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
