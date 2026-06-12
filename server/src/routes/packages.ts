import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';

export async function packageRoutes(app: FastifyInstance) {
  app.get('/api/packages', async (_req, reply) => {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { basePrice: 'asc' },
    });
    return reply.send({ success: true, data: packages });
  });
}
