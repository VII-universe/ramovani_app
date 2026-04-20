import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function passepartoutsRouter(app: FastifyInstance) {
  // GET /passepartouts
  app.get('/passepartouts', async (req) => {
    const { inStockOnly } = req.query as { inStockOnly?: string }
    const where = inStockOnly === 'true' ? { inStock: true } : {}
    const items = await prisma.passepartoutProfile.findMany({ where, orderBy: { colorName: 'asc' } })
    return { items, total: items.length }
  })

  // GET /passepartouts/:id
  app.get<{ Params: { id: string } }>('/passepartouts/:id', async (req, reply) => {
    const mat = await prisma.passepartoutProfile.findUnique({ where: { id: req.params.id } })
    if (!mat) return reply.status(404).send({ message: 'Passepartout not found' })
    return mat
  })
}
