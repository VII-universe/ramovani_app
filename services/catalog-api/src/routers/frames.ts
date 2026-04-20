import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function framesRouter(app: FastifyInstance) {
  // GET /frames
  app.get('/frames', async (req) => {
    const { inStockOnly, material, finish, page = '1', pageSize = '20' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (inStockOnly === 'true') where['inStock'] = true
    if (material) where['material'] = material
    if (finish) where['finish'] = finish

    const take = Math.min(Number(pageSize), 100)
    const skip = (Number(page) - 1) * take

    const [items, total] = await Promise.all([
      prisma.frameProfile.findMany({ where, take, skip, orderBy: { name: 'asc' } }),
      prisma.frameProfile.count({ where }),
    ])

    return { items, total, page: Number(page), pageSize: take }
  })

  // GET /frames/:id
  app.get<{ Params: { id: string } }>('/frames/:id', async (req, reply) => {
    const frame = await prisma.frameProfile.findUnique({ where: { id: req.params.id } })
    if (!frame) return reply.status(404).send({ message: 'Frame not found' })
    return frame
  })
}
