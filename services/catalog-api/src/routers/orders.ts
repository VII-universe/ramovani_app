import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { OrderCreateSchema } from '../schemas'

const prisma = new PrismaClient()

// Valid status values (mirrors the Prisma enum)
const ORDER_STATUSES = ['PENDING', 'PAID', 'IN_PRODUCTION', 'SHIPPED', 'CANCELLED'] as const
type OrderStatus = typeof ORDER_STATUSES[number]

/** Shape we expect to find inside configSnapshot */
interface ConfigSnapshot {
  artworkWidthMm?: number
  artworkHeightMm?: number
  frameProfileName?: string
  frameProfileWidthMm?: number
  passepartoutProfileName?: string
  passepartoutOverlapMm?: number
  includeGlass?: boolean
  frameBOM?: Record<string, unknown>
  passepartoutBOM?: Record<string, unknown>
  glassBOM?: Record<string, unknown>
}

function parseSnapshot(raw: unknown): ConfigSnapshot {
  if (raw && typeof raw === 'object') return raw as ConfigSnapshot
  return {}
}

export async function ordersRouter(app: FastifyInstance) {

  // ── GET /orders — full list for the admin dashboard ─────────────────────────
  app.get('/orders', async (_req, reply) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id:            true,
        status:        true,
        createdAt:     true,
        updatedAt:     true,
        totalPrice:    true,
        currency:      true,
        customerEmail: true,
        configSnapshot: true,
      },
    })

    // Flatten configSnapshot fields that the workshop UI needs so the client
    // doesn't have to dig into the JSON blob itself.
    const rows = orders.map((o) => {
      const snap = parseSnapshot(o.configSnapshot)
      return {
        id:            o.id,
        status:        o.status,
        createdAt:     o.createdAt,
        updatedAt:     o.updatedAt,
        customerEmail: o.customerEmail,
        totalPrice:    o.totalPrice,
        currency:      o.currency,
        // Production specs (flattened for display)
        artworkWidthMm:          snap.artworkWidthMm  ?? null,
        artworkHeightMm:         snap.artworkHeightMm ?? null,
        frameProfileName:        snap.frameProfileName        ?? null,
        passepartoutProfileName: snap.passepartoutProfileName ?? null,
        passepartoutOverlapMm:   snap.passepartoutOverlapMm   ?? null,
        includeGlass:            snap.includeGlass ?? false,
        // Full snapshot for PDF generation
        configSnapshot: o.configSnapshot,
      }
    })

    return reply.send(rows)
  })

  // ── GET /orders/:id — single order detail ───────────────────────────────────
  app.get('/orders/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id:             true,
        status:         true,
        createdAt:      true,
        updatedAt:      true,
        totalPrice:     true,
        currency:       true,
        customerEmail:  true,
        configSnapshot: true,
      },
    })

    if (!order) {
      return reply.status(404).send({ message: 'Order not found' })
    }

    return reply.send(order)
  })

  // ── PATCH /orders/:id/status — workshop status update ───────────────────────
  app.patch('/orders/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string }

    const parsed = z.object({
      status: z.enum(ORDER_STATUSES),
    }).safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid status',
        validValues: ORDER_STATUSES,
      })
    }

    const order = await prisma.order.findUnique({ where: { id }, select: { id: true } })
    if (!order) {
      return reply.status(404).send({ message: 'Order not found' })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status as OrderStatus },
      select: { id: true, status: true, updatedAt: true },
    })

    return reply.send(updated)
  })

  // ── POST /orders — create a new order from the configurator snapshot ─────────
  app.post('/orders', async (req, reply) => {
    const parsed = OrderCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid request body',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const {
      customerEmail,
      artworkWidthMm,
      artworkHeightMm,
      frameProfileId,
      frameProfileName,
      passepartoutProfileId,
      passepartoutProfileName,
      passepartoutOverlapMm,
      includeGlass,
      totalPrice,
      currency,
      configSnapshot,
    } = parsed.data

    const frameProfile = await prisma.frameProfile.findUnique({
      where: { id: frameProfileId },
    })
    if (!frameProfile) {
      return reply.status(404).send({ message: `Frame profile '${frameProfileId}' not found` })
    }

    const order = await prisma.order.create({
      data: {
        customerEmail,
        totalPrice,
        currency,
        configSnapshot: {
          artworkWidthMm,
          artworkHeightMm,
          frameProfileId,
          frameProfileName,
          ...(passepartoutProfileId   && { passepartoutProfileId }),
          ...(passepartoutProfileName && { passepartoutProfileName }),
          ...(passepartoutOverlapMm   && { passepartoutOverlapMm }),
          includeGlass,
          ...configSnapshot,
        },
      },
      select: {
        id:            true,
        status:        true,
        createdAt:     true,
        totalPrice:    true,
        currency:      true,
        customerEmail: true,
      },
    })

    return reply.status(201).send(order)
  })
}
