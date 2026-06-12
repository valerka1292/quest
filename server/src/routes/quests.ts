import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';

export async function questRoutes(app: FastifyInstance) {
  app.get('/api/quests', async (_req, reply) => {
    const quests = await prisma.quest.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({ success: true, data: quests });
  });

  app.get('/api/quests/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const quest = await prisma.quest.findUnique({ where: { slug } });
    if (!quest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
      });
    }
    return reply.send({ success: true, data: quest });
  });
}
