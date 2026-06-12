import type { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { adminLoginSchema } from '@veilworlds/shared';
import { config } from '../../config.js';
import { authMiddleware } from '../../middleware/auth.js';
import rateLimit from '@fastify/rate-limit';

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd': return val;
    case 'h': return 0;
    case 'm': return 0;
    case 's': return 0;
    default: return 7;
  }
}

export async function adminAuthRoutes(app: FastifyInstance) {
  // Strict rate limit on login: 5 attempts per 15 minutes per IP (VULN-06)
  app.post('/api/admin/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Забагато спроб входу. Спробуйте через 15 хвилин.',
          },
        }),
      },
    },
  }, async (request, reply) => {
    const parsed = adminLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Невірні дані' },
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { username: parsed.data.username },
    });
    if (!admin) {
      // Use the same response as wrong password to avoid username enumeration
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Невірний логін або пароль' },
      });
    }

    const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Невірний логін або пароль' },
      });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = jwt.sign(
      { adminId: admin.id, username: admin.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as any
    );
    const refreshToken = jwt.sign(
      { adminId: admin.id, username: admin.username },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn } as any
    );

    // Store hashed refresh token in DB for future revocation (VULN-07)
    const tokenHash = (await import('node:crypto')).createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseExpiresIn(config.jwt.refreshExpiresIn));

    await prisma.refreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash,
        expiresAt,
      },
    });

    return reply.send({
      success: true,
      data: { accessToken, refreshToken, username: admin.username },
    });
  });

  app.post('/api/admin/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as any;
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token відсутній' },
      });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Невірний refresh token' },
      });
    }

    // Check token is not revoked (VULN-07)
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Refresh token відкликано або прострочено' },
      });
    }

    // Rotate: revoke old token, issue new pair
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = jwt.sign(
      { adminId: payload.adminId, username: payload.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as any
    );
    const newRefreshToken = jwt.sign(
      { adminId: payload.adminId, username: payload.username },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn } as any
    );

    const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseExpiresIn(config.jwt.refreshExpiresIn));

    await prisma.refreshToken.create({
      data: {
        adminId: payload.adminId,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    return reply.send({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  });

  app.post('/api/admin/auth/logout', { onRequest: [authMiddleware] }, async (request, reply) => {
    const { refreshToken } = request.body as any;
    if (refreshToken) {
      const { createHash } = await import('node:crypto');
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return reply.send({ success: true, data: null });
  });
}
