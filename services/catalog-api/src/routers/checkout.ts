import React from 'react'
import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { OrderConfirmationEmail } from '../templates/OrderConfirmationEmail'

const prisma = new PrismaClient()

// CZK uses haléře (hundredths) as its smallest unit, same as cents for EUR/USD.
const CZK_UNIT_MULTIPLIER = 100

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key || key === 'sk_test_REPLACE_ME') {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. ' +
      'Set a real test key from https://dashboard.stripe.com/test/apikeys in services/catalog-api/.env',
    )
  }
  return new Stripe(key, { apiVersion: '2025-04-30.basil' })
}

function getAppBaseUrl(): string {
  return (process.env['APP_BASE_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * Returns a Resend client if RESEND_API_KEY is configured, otherwise null.
 * Email sending is best-effort — a missing key silently skips it in dev.
 */
function getResend(): Resend | null {
  const key = process.env['RESEND_API_KEY']
  if (!key || key === 're_REPLACE_ME') return null
  return new Resend(key)
}

const CheckoutRequestSchema = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
})

export async function checkoutRouter(app: FastifyInstance) {

  // ── POST /checkout ───────────────────────────────────────────────────────────
  // Creates a Stripe Checkout Session and saves the session ID on the Order row.
  app.post('/checkout', async (req, reply) => {
    const parsed = CheckoutRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid request body',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const { orderId } = parsed.data

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id:             true,
        status:         true,
        totalPrice:     true,
        currency:       true,
        customerEmail:  true,
        configSnapshot: true,
      },
    })

    if (!order) {
      return reply.status(404).send({ message: `Order '${orderId}' not found` })
    }

    if (['PAID', 'IN_PRODUCTION', 'SHIPPED'].includes(order.status)) {
      return reply.status(409).send({ message: `Order is already ${order.status.toLowerCase()}` })
    }
    if (order.status === 'CANCELLED') {
      return reply.status(410).send({ message: 'Order has been cancelled' })
    }

    // Build a human-readable product name from the stored snapshot
    const snap           = (order.configSnapshot ?? {}) as Record<string, unknown>
    const frameLabel     = (snap['frameProfileName']        as string | undefined) ?? 'Custom frame'
    const matLabel       = (snap['passepartoutProfileName'] as string | undefined)
    const artworkW       = snap['artworkWidthMm']  as number | undefined
    const artworkH       = snap['artworkHeightMm'] as number | undefined
    const dimensionNote  = artworkW && artworkH ? ` — ${Math.round(artworkW)} × ${Math.round(artworkH)} mm` : ''
    const productName    = matLabel ? `${frameLabel} + ${matLabel} mat${dimensionNote}` : `${frameLabel}${dimensionNote}`

    let stripe: Stripe
    try {
      stripe = getStripe()
    } catch (err) {
      return reply.status(500).send({ message: (err as Error).message })
    }

    const baseUrl = getAppBaseUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: order.customerEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.round(order.totalPrice * CZK_UNIT_MULTIPLIER),
          product_data: {
            name: productName,
            description: 'Custom picture frame — Ramovani',
            metadata: { orderId: order.id },
          },
        },
      }],
      success_url: `${baseUrl}/configure/success?orderId=${order.id}&payment=success`,
      cancel_url:  `${baseUrl}/configure/review?cancelled=true`,
      metadata: { orderId: order.id },
    })

    // Persist the Stripe session ID so GET /checkout/success can verify payment later
    await prisma.order.update({
      where: { id: orderId },
      data:  { stripeSessionId: session.id },
    })

    return reply.send({ checkoutUrl: session.url })
  })

  // ── GET /checkout/success ────────────────────────────────────────────────────
  // Called by the frontend success page on mount.
  // Retrieves the Stripe session for the order, and if payment_status === 'paid',
  // updates the order status to PAID in the database.
  // This is the polling-based alternative to webhooks for MVP.
  app.get('/checkout/success', async (req, reply) => {
    const query = req.query as Record<string, string>
    const orderId = query['orderId']

    if (!orderId) {
      return reply.status(400).send({ message: 'Missing orderId query parameter' })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, stripeSessionId: true },
    })

    if (!order) {
      return reply.status(404).send({ message: `Order '${orderId}' not found` })
    }

    // If already past PENDING, no Stripe check needed — just return current status
    if (order.status !== 'PENDING') {
      return reply.send({ orderId: order.id, status: order.status, updated: false })
    }

    if (!order.stripeSessionId) {
      // Order exists but was never sent to Stripe (e.g. created directly via API)
      return reply.send({ orderId: order.id, status: order.status, updated: false })
    }

    let stripe: Stripe
    try {
      stripe = getStripe()
    } catch (err) {
      return reply.status(500).send({ message: (err as Error).message })
    }

    // Retrieve the session from Stripe to check current payment status
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      app.log.error({ orderId, stripeSessionId: order.stripeSessionId, err: msg }, 'Stripe session retrieve failed')
      return reply.status(502).send({ message: `Failed to retrieve Stripe session: ${msg}` })
    }

    app.log.info(
      { orderId, sessionId: session.id, paymentStatus: session.payment_status },
      'Stripe session retrieved for success confirmation',
    )

    if (session.payment_status === 'paid') {
      // Fetch full order details needed for the confirmation email before updating
      const fullOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          customerEmail:  true,
          totalPrice:     true,
          currency:       true,
          configSnapshot: true,
        },
      })

      await prisma.order.update({
        where: { id: orderId },
        data:  { status: 'PAID' },
      })
      app.log.info({ orderId }, 'Order marked PAID via success polling')

      // Send order confirmation email — awaited so errors surface in the terminal
      if (fullOrder) {
        await sendConfirmationEmail(orderId, fullOrder)
      }

      return reply.send({ orderId: order.id, status: 'PAID', updated: true })
    }

    // Payment not confirmed yet (e.g. customer navigated to success URL manually)
    return reply.send({ orderId: order.id, status: order.status, updated: false })
  })
}

// ── Email helper ──────────────────────────────────────────────────────────────

interface MinimalOrder {
  customerEmail:  string
  totalPrice:     number
  currency:       string
  configSnapshot: unknown
}

async function sendConfirmationEmail(orderId: string, order: MinimalOrder) {
  console.log(`[email] Starting confirmation email for order ${orderId} → ${order.customerEmail}`)

  try {
    const resend = getResend()
    if (!resend) {
      console.warn('[email] RESEND_API_KEY not configured or still set to placeholder — skipping')
      return
    }

    const snap = (order.configSnapshot && typeof order.configSnapshot === 'object')
      ? order.configSnapshot as Record<string, unknown>
      : {}

    console.log('[email] Rendering React Email template...')
    const html = await render(
      React.createElement(OrderConfirmationEmail, {
        orderId,
        customerEmail:   order.customerEmail,
        totalPrice:      order.totalPrice,
        currency:        order.currency,
        frameName:       snap['frameProfileName']        as string  | undefined,
        matName:         snap['passepartoutProfileName'] as string  | undefined,
        includeGlass:    snap['includeGlass']            as boolean | undefined,
        artworkWidthMm:  snap['artworkWidthMm']          as number  | undefined,
        artworkHeightMm: snap['artworkHeightMm']         as number  | undefined,
      }),
    )
    console.log(`[email] Template rendered — ${html.length} chars`)

    const shortId = orderId.slice(0, 8).toUpperCase()

    console.log('[email] Attempting to send email via Resend...')
    const result = await resend.emails.send({
      from:    'onboarding@resend.dev',
      to:      order.customerEmail,
      subject: `Your Ramovani order #${shortId} is confirmed`,
      html,
    })

    // Resend returns { data, error } — check both
    if (result.error) {
      console.error('[email] Resend returned an error:', result.error)
    } else {
      console.log(`[email] Sent successfully — Resend message ID: ${result.data?.id}`)
    }
  } catch (error) {
    console.error('[email] Exception during email send:', error)
  }
}
