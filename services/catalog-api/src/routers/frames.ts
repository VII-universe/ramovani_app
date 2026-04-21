import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { FrameCreateSchema, FrameUpdateSchema } from '../schemas'

const prisma = new PrismaClient()

export async function framesRouter(app: FastifyInstance) {

  // ── GET /frames ──────────────────────────────────────────────────────────────
  // Public (configurator) + Admin view.
  // ?admin=true  → return all frames including inactive/out-of-stock (no filters)
  // ?inStockOnly=true → filter to inStock && isActive (default configurator view)
  app.get('/frames', async (req) => {
    const {
      admin,
      inStockOnly,
      material,
      finish,
      page     = '1',
      pageSize = '100',
    } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}

    if (admin === 'true') {
      // No filters — return everything for inventory management
    } else {
      // Customer-facing configurator: active + in-stock only
      if (inStockOnly === 'true') {
        where['inStock']  = true
        where['isActive'] = true
      }
      if (material) where['material'] = material
      if (finish)   where['finish']   = finish
    }

    const take = Math.min(Number(pageSize), 200)
    const skip = (Number(page) - 1) * take

    const [items, total] = await Promise.all([
      prisma.frameProfile.findMany({
        where,
        take,
        skip,
        orderBy: { name: 'asc' },
      }),
      prisma.frameProfile.count({ where }),
    ])

    return { items, total, page: Number(page), pageSize: take }
  })

  // ── GET /frames/:id ──────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/frames/:id', async (req, reply) => {
    const frame = await prisma.frameProfile.findUnique({ where: { id: req.params.id } })
    if (!frame) return reply.status(404).send({ message: 'Frame not found' })
    return frame
  })

  // ── POST /frames ─────────────────────────────────────────────────────────────
  app.post('/frames', async (req, reply) => {
    const parsed = FrameCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid frame data',
        errors:  parsed.error.flatten().fieldErrors,
      })
    }

    const { slug, pbr, imageUrls, ...rest } = parsed.data

    // Check slug uniqueness
    const existing = await prisma.frameProfile.findUnique({ where: { slug } })
    if (existing) {
      return reply.status(409).send({ message: `A frame with slug '${slug}' already exists` })
    }

    const frame = await prisma.frameProfile.create({
      data: { ...rest, slug, pbr, imageUrls },
    })

    return reply.status(201).send(frame)
  })

  // ── PATCH /frames/:id ────────────────────────────────────────────────────────
  app.patch<{ Params: { id: string } }>('/frames/:id', async (req, reply) => {
    const { id } = req.params

    const existing = await prisma.frameProfile.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ message: 'Frame not found' })

    const parsed = FrameUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid update data',
        errors:  parsed.error.flatten().fieldErrors,
      })
    }

    const { slug, pbr, imageUrls, ...rest } = parsed.data

    // If slug is being changed, check it's still unique
    if (slug && slug !== existing.slug) {
      const conflict = await prisma.frameProfile.findUnique({ where: { slug } })
      if (conflict) {
        return reply.status(409).send({ message: `A frame with slug '${slug}' already exists` })
      }
    }

    const frame = await prisma.frameProfile.update({
      where: { id },
      data: {
        ...rest,
        ...(slug      !== undefined && { slug }),
        ...(pbr       !== undefined && { pbr }),
        ...(imageUrls !== undefined && { imageUrls }),
      },
    })

    return reply.send(frame)
  })

  // ── DELETE /frames/:id ───────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/frames/:id', async (req, reply) => {
    const { id } = req.params

    const existing = await prisma.frameProfile.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ message: 'Frame not found' })

    await prisma.frameProfile.delete({ where: { id } })
    return reply.status(204).send()
  })
}
