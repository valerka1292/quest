import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  adminId: string;
  username: string;
}

// Extend Fastify's request type so TypeScript knows about request.admin
declare module 'fastify' {
  interface FastifyRequest {
    admin?: JwtPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Потрібна авторизація' },
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    request.admin = payload;
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Термін дії токену закінчився' },
    });
  }
}
