import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { config } from './config'
import { framesRouter } from './routers/frames'
import { passepartoutsRouter } from './routers/passepartouts'
import { quoteRouter } from './routers/quote'
import { ordersRouter } from './routers/orders'
import { checkoutRouter } from './routers/checkout'
import { stripeWebhookRouter } from './routers/webhooks'

// ESM-safe __dirname (tsx runs as ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

async function bootstrap() {
  const app = Fastify({ logger: true })

  // ── CORS ────────────────────────────────────────────────────────────────────
  await app.register(cors, { origin: config.corsOrigins })

  // ── Static files ─────────────────────────────────────────────────────────────
  // Serves GET /static/* from <repo>/services/catalog-api/public/*
  // Seed thumbnail paths are  /static/frames/*.jpg  and  /static/mats/*.jpg
  await app.register(staticPlugin, {
    root:       path.join(__dirname, '..', 'public'),
    prefix:     '/static/',
    decorateReply: false,   // avoid conflicts if other plugins also decorate reply
  })

  // ── Health ───────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', service: 'catalog-api' }))

  // ── Routers ──────────────────────────────────────────────────────────────────
  await app.register(framesRouter)
  await app.register(passepartoutsRouter)
  await app.register(quoteRouter)
  await app.register(ordersRouter)
  await app.register(checkoutRouter)
  // Webhook router must be registered AFTER other JSON-parsing routes.
  // Its scoped raw-body parser only affects /webhooks/* routes.
  await app.register(stripeWebhookRouter)

  await app.listen({ port: config.port, host: config.host })
  console.log(`Catalog API  →  http://${config.host}:${config.port}`)
  console.log(`Static files →  http://${config.host}:${config.port}/static/`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
