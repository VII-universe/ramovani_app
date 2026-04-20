import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ── Frame profiles ──────────────────────────────────────────────────────────
  await prisma.frameProfile.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Oslo Oak Natural',
        slug: 'oslo-oak-natural',
        material: 'wood',
        finish: 'natural',
        profileWidthMm: 40,
        totalDepthMm: 18,
        rabbetDepthMm: 10,
        rabbetWidthMm: 7,
        pbr: { colorHex: '#C8A97A', roughness: 0.85, metalness: 0 },
        pricePerMeter: 380,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/frames/oslo-oak-natural.jpg',
        imageUrls: ['/static/frames/oslo-oak-natural.jpg'],
      },
      {
        name: 'Milano Nero',
        slug: 'milano-nero',
        material: 'wood',
        finish: 'lacquered',
        profileWidthMm: 30,
        totalDepthMm: 14,
        rabbetDepthMm: 8,
        rabbetWidthMm: 6,
        pbr: { colorHex: '#1A1714', roughness: 0.15, metalness: 0 },
        pricePerMeter: 420,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/frames/milano-nero.jpg',
        imageUrls: ['/static/frames/milano-nero.jpg'],
      },
      {
        name: 'Arc Chrome',
        slug: 'arc-chrome',
        material: 'metal',
        finish: 'brushed',
        profileWidthMm: 20,
        totalDepthMm: 12,
        rabbetDepthMm: 7,
        rabbetWidthMm: 5,
        pbr: { colorHex: '#C8C8C8', roughness: 0.25, metalness: 0.95 },
        pricePerMeter: 560,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/frames/arc-chrome.jpg',
        imageUrls: ['/static/frames/arc-chrome.jpg'],
      },
    ],
  })

  // ── Passepartout profiles ───────────────────────────────────────────────────
  await prisma.passepartoutProfile.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Warm White',
        colorName: 'Warm White',
        colorHex: '#FAF8F4',
        style: 'single',
        thicknessMm: 1.4,
        bevelAngleDeg: 45,
        pricePerSqMeter: 180,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/mats/warm-white.jpg',
      },
      {
        name: 'Ivory',
        colorName: 'Ivory',
        colorHex: '#F5F0E8',
        style: 'single',
        thicknessMm: 1.4,
        bevelAngleDeg: 45,
        pricePerSqMeter: 180,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/mats/ivory.jpg',
      },
      {
        name: 'Charcoal',
        colorName: 'Charcoal',
        colorHex: '#3A3836',
        style: 'single',
        thicknessMm: 1.4,
        bevelAngleDeg: 45,
        pricePerSqMeter: 200,
        currency: 'CZK',
        inStock: true,
        thumbnailUrl: '/static/mats/charcoal.jpg',
      },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
