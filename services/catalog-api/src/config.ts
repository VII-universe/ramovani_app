export const config = {
  port: Number(process.env['PORT'] ?? 8002),
  host: process.env['HOST'] ?? '0.0.0.0',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
} as const
