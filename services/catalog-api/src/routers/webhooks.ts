import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function stripeWebhookRouter(app: FastifyInstance) {
  // ── Startup validation ──────────────────────────────────────────────────────
  // Fail loudly at boot rather than silently per-request.
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']
  const stripeKey     = process.env['STRIPE_SECRET_KEY']

  if (!webhookSecret || webhookSecret === 'whsec_REPLACE_ME') {
    app.log.error(
      'STRIPE_WEBHOOK_SECRET is not set. ' +
      'Run: stripe listen --forward-to localhost:8002/webhooks/stripe ' +
      'and copy the printed whsec_... value into services/catalog-api/.env, ' +
      'then restart the API.',
    )
  }

  // ── Raw body capture ────────────────────────────────────────────────────────
  //
  // Stripe HMAC verification requires the exact raw bytes Stripe sent.
  // Fastify's default JSON parser destroys byte-exact representation before
  // the handler runs.
  //
  // In Fastify 4, addContentTypeParser inside a child plugin creates a
  // scoped override, BUT the parent's parser is still "first in line" unless
  // we explicitly remove it from this scope first.
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  )

  // ── POST /webhooks/stripe ───────────────────────────────────────────────────
  app.post('/webhooks/stripe', async (req, reply) => {
    // ── Guard: secret must be configured ─────────────────────────────────────
    if (!webhookSecret || webhookSecret === 'whsec_REPLACE_ME') {
      req.log.error(
        'Received Stripe webhook but STRIPE_WEBHOOK_SECRET is not configured. ' +
        'Get the secret from `stripe listen` and set it in catalog-api/.env.',
      )
      return reply.status(500).send({
        message: 'Webhook secret not configured on server. Check catalog-api logs.',
      })
    }

    // ── Guard: Stripe-Signature header ────────────────────────────────────────
    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      req.log.warn('Webhook rejected: missing stripe-signature header')
      return reply.status(400).send({ message: 'Missing stripe-signature header' })
    }

    // ── Guard: body must be a Buffer ──────────────────────────────────────────
    const rawBody = req.body
    if (!Buffer.isBuffer(rawBody)) {
      req.log.error(
        { bodyType: typeof rawBody, isBuffer: Buffer.isBuffer(rawBody) },
        'Webhook body is not a Buffer — raw body parser did not activate. ' +
        'This means removeContentTypeParser/addContentTypeParser failed.',
      )
      return reply.status(500).send({ message: 'Internal error: body was not captured as raw bytes' })
    }

    req.log.info(
      { bodyByteLength: rawBody.byteLength, sigPrefix: sig.slice(0, 20) },
      'Stripe webhook: raw body received, attempting constructEvent',
    )

    // ── Signature verification ────────────────────────────────────────────────
    const stripe = new Stripe(stripeKey!, { apiVersion: '2025-04-30.basil' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
      const msg    = err instanceof Error ? err.message : String(err)
      const detail = err instanceof Error ? err.stack  : undefined
      req.log.error(
        { err: { message: msg, stack: detail }, sigPrefix: sig.slice(0, 40), bodyByteLength: rawBody.byteLength },
        `constructEvent FAILED: ${msg}`,
      )
      return reply.status(400).send({ message: `Webhook signature verification failed: ${msg}` })
    }

    req.log.info({ type: event.type, id: event.id }, 'Stripe event verified OK')

    // ── Event dispatch ────────────────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        req.log.info(
          { sessionId: session.id, paymentStatus: session.payment_status, metadata: session.metadata },
          'checkout.session.completed',
        )

        if (session.payment_status !== 'paid') {
          req.log.info({ sessionId: session.id, paymentStatus: session.payment_status }, 'Session not paid yet — skipping')
          break
        }

        const orderId = session.metadata?.orderId
        if (!orderId) {
          req.log.error({ sessionId: session.id }, 'metadata.orderId is missing from session — cannot update order')
          break
        }

        try {
          const result = await prisma.order.updateMany({
            where: { id: orderId, status: { in: ['PENDING'] } },
            data:  { status: 'PAID' },
          })

          if (result.count > 0) {
            req.log.info({ orderId, count: result.count }, 'Order status updated to PAID')
          } else {
            // Either already PAID or orderId not found — both are fine (idempotent)
            const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } })
            req.log.info({ orderId, currentStatus: existing?.status ?? 'NOT FOUND' }, 'updateMany matched 0 rows')
          }
        } catch (dbErr) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
          req.log.error({ orderId, err: msg }, `Prisma update failed: ${msg}`)
          // Still return 200 so Stripe does not keep retrying — the DB error
          // should be investigated manually via the admin dashboard.
        }
        break
      }

      default:
        req.log.info({ type: event.type }, 'Unhandled event type — acknowledged without action')
    }

    return reply.status(200).send({ received: true })
  })
}
