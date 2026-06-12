import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { certificateSchema } from '@veilworlds/shared';
import crypto from 'node:crypto';
import { sendNewCertificateNotification } from '../services/telegram.service.js';

/**
 * Generate a cryptographically secure certificate code.
 * Uses crypto.randomBytes instead of Math.random() to prevent predictability.
 * Retries on unique constraint collision.
 */
async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = crypto.randomBytes(8);
    let code = 'VW-';
    for (const byte of bytes) {
      code += chars[byte % chars.length];
    }
    // Check uniqueness in DB
    const existing = await prisma.certificate.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique certificate code after 10 attempts');
}

export async function certificateRoutes(app: FastifyInstance) {
  app.post('/api/certificates', async (request, reply) => {
    const parsed = certificateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => e.message).join(', '),
        },
      });
    }

    const code = await generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const certificate = await prisma.certificate.create({
      data: {
        code,
        customerName: parsed.data.customerName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        amount: parsed.data.amount,
        status: 'PENDING',
        expiresAt,
      },
    });

    sendNewCertificateNotification(certificate).catch(() => {});

    // NOTE: Payment activation is handled exclusively through the admin panel.
    // There is no public payment endpoint — activation requires admin confirmation.
    return reply.status(201).send({
      success: true,
      data: { certificate },
    });
  });
}
