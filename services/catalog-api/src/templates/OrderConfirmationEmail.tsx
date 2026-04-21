import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Row,
  Column,
} from '@react-email/components'

export interface OrderConfirmationEmailProps {
  orderId:       string
  customerEmail: string
  totalPrice:    number
  currency:      string
  frameName?:    string
  matName?:      string
  includeGlass?: boolean
  artworkWidthMm?:  number
  artworkHeightMm?: number
}

function fmtPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

// ── Shared style tokens ────────────────────────────────────────────────────────

const FONT_SANS  = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const FONT_MONO  = '"Courier New", Courier, monospace'
const COLOR_INK  = '#1a1a1a'
const COLOR_MUTE = '#6b6b6b'
const COLOR_RULE = '#e4e2dc'
const COLOR_BG   = '#f7f6f3'
const COLOR_CARD = '#ffffff'

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderConfirmationEmail({
  orderId,
  totalPrice,
  currency,
  frameName,
  matName,
  includeGlass,
  artworkWidthMm,
  artworkHeightMm,
}: OrderConfirmationEmailProps) {
  const shortId = orderId.slice(0, 8).toUpperCase()
  const hasDimensions = artworkWidthMm && artworkHeightMm

  return (
    <Html lang="cs">
      <Head />
      <Preview>Your Ramovani order #{shortId} is confirmed — we are preparing your frame.</Preview>

      <Body style={{ backgroundColor: COLOR_BG, fontFamily: FONT_SANS, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>

          {/* ── Brand header ── */}
          <Section style={{ marginBottom: 32 }}>
            <Text style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: '0.2em',
              color: COLOR_MUTE,
              textTransform: 'uppercase',
              margin: 0,
            }}>
              Ramovani
            </Text>
          </Section>

          {/* ── Main card ── */}
          <Section style={{
            backgroundColor: COLOR_CARD,
            border: `1px solid ${COLOR_RULE}`,
            padding: '36px 36px 28px',
          }}>

            {/* Heading */}
            <Heading as="h1" style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              fontWeight: 400,
              color: COLOR_INK,
              margin: '0 0 8px',
            }}>
              Order confirmed
            </Heading>
            <Text style={{ fontSize: 14, color: COLOR_MUTE, margin: '0 0 28px' }}>
              Thank you — your custom frame is in the queue.
            </Text>

            <Hr style={{ borderColor: COLOR_RULE, margin: '0 0 24px' }} />

            {/* Order ID */}
            <Row style={{ marginBottom: 20 }}>
              <Column>
                <Text style={{ fontSize: 11, color: COLOR_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  Order ID
                </Text>
                <Text style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: COLOR_INK, margin: 0 }}>
                  #{shortId}
                </Text>
                <Text style={{ fontFamily: FONT_MONO, fontSize: 10, color: COLOR_MUTE, margin: '2px 0 0' }}>
                  {orderId}
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{ fontSize: 11, color: COLOR_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  Total paid
                </Text>
                <Text style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: COLOR_INK, margin: 0 }}>
                  {fmtPrice(totalPrice, currency)}
                </Text>
                <Text style={{ fontSize: 10, color: COLOR_MUTE, margin: '2px 0 0' }}>
                  incl. 21% VAT
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: COLOR_RULE, margin: '0 0 24px' }} />

            {/* Specifications */}
            <Text style={{ fontSize: 11, color: COLOR_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px' }}>
              Your frame
            </Text>

            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <tbody>
                {hasDimensions && (
                  <SpecRow label="Artwork size" value={`${Math.round(artworkWidthMm)} × ${Math.round(artworkHeightMm)} mm`} />
                )}
                {frameName && (
                  <SpecRow label="Frame moulding" value={frameName} />
                )}
                {matName ? (
                  <SpecRow label="Mat board" value={matName} />
                ) : (
                  <SpecRow label="Mat board" value="None" muted />
                )}
                <SpecRow
                  label="Anti-reflective glass"
                  value={includeGlass ? 'Included' : 'Not included'}
                  muted={!includeGlass}
                />
              </tbody>
            </table>

            <Hr style={{ borderColor: COLOR_RULE, margin: '28px 0 20px' }} />

            {/* Next steps */}
            <Text style={{ fontSize: 13, color: COLOR_MUTE, margin: '0 0 4px' }}>
              <strong style={{ color: COLOR_INK }}>What happens next?</strong>
              {' '}Our workshop has received your order and will begin production shortly.
              You will receive a separate shipping notification once your frame is on its way.
            </Text>

          </Section>

          {/* ── Footer ── */}
          <Section style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 11, color: COLOR_MUTE, textAlign: 'center' as const, margin: 0 }}>
              Ramovani s.r.o. · Custom picture framing
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ── Helper sub-component ───────────────────────────────────────────────────────

function SpecRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '5px 0', fontSize: 13, color: COLOR_MUTE, width: '45%', verticalAlign: 'top' as const }}>
        {label}
      </td>
      <td style={{ padding: '5px 0', fontSize: 13, color: muted ? COLOR_MUTE : COLOR_INK, fontWeight: muted ? 400 : 500, textAlign: 'right' as const, verticalAlign: 'top' as const }}>
        {value}
      </td>
    </tr>
  )
}

export default OrderConfirmationEmail
