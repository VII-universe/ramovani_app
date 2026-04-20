import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { QuoteRequestSchema } from '../schemas'
import {
  calculateFrameBOM,
  calculatePassepartoutBOM,
  calculateGlassBOM,
} from '../services/bom.service'
import { PricingEngine } from '../services/pricing.service'

const prisma = new PrismaClient()
const pricingEngine = new PricingEngine()

export async function quoteRouter(app: FastifyInstance) {
  // POST /quote
  app.post('/quote', async (req, reply) => {
    // ── Validate request body ─────────────────────────────────────────────────
    const parsed = QuoteRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid request body',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const {
      artworkWidthMm,
      artworkHeightMm,
      frameProfileId,
      passepartoutProfileId,
      passepartoutOverlapMm,
      includeGlass,
    } = parsed.data

    // ── Load frame profile ────────────────────────────────────────────────────
    const frameProfile = await prisma.frameProfile.findUnique({
      where: { id: frameProfileId },
    })
    if (!frameProfile) {
      return reply.status(404).send({ message: 'Frame profile not found' })
    }

    // ── Load passepartout profile (optional) ──────────────────────────────────
    const passepartoutProfile = passepartoutProfileId
      ? await prisma.passepartoutProfile.findUnique({ where: { id: passepartoutProfileId } })
      : null

    // ── Calculate BOMs ────────────────────────────────────────────────────────
    // calculateFrameBOM provides the full per-rail breakdown (topRailMm, etc.)
    // returned to the client for production cut-sheet use.
    const frameBOM = calculateFrameBOM({
      artworkWidthMm,
      artworkHeightMm,
      profileWidthMm: frameProfile.profileWidthMm,
      rabbetWidthMm: frameProfile.rabbetWidthMm,
    })

    const passepartoutBOM = passepartoutProfile
      ? calculatePassepartoutBOM({
          artworkWidthMm,
          artworkHeightMm,
          overlapPerSideMm: passepartoutOverlapMm,
        })
      : undefined

    const glassBOM = includeGlass
      ? calculateGlassBOM({
          artworkWidthMm,
          artworkHeightMm,
          rabbetWidthMm: frameProfile.rabbetWidthMm,
        })
      : undefined

    // ── Build price quote ─────────────────────────────────────────────────────
    const quote = pricingEngine.buildQuote({
      frameBOM,
      frameProfile,
      passepartoutBOM,
      passepartoutProfile: passepartoutProfile ?? undefined,
      glassBOM,
    })

    return { frameBOM, passepartoutBOM, glassBOM, quote }
  })
}
