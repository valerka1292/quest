import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { reviewSchema } from '@veilworlds/shared';

export async function reviewRoutes(app: FastifyInstance) {
  app.get('/api/quests/:slug/reviews', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const query = request.query as { limit?: string; offset?: string };
    const quest = await prisma.quest.findUnique({ where: { slug } });
    if (!quest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
      });
    }

    const take = Math.min(Math.max(parseInt(query.limit || '20', 10) || 20, 1), 100);
    const skip = Math.max(parseInt(query.offset || '0', 10) || 0, 0);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { questId: quest.id, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.review.count({ where: { questId: quest.id, status: 'APPROVED' } }),
    ]);
    return reply.send({ success: true, data: reviews, total });
  });

  app.post('/api/quests/:slug/reviews', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const quest = await prisma.quest.findUnique({ where: { slug } });
    if (!quest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
      });
    }

    const parsed = reviewSchema.safeParse({ ...(request.body as any), questId: quest.id });
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => e.message).join(', '),
        },
      });
    }

    const review = await prisma.review.create({
      data: {
        questId: quest.id,
        author: parsed.data.author,
        rating: parsed.data.rating,
        text: parsed.data.text,
        status: 'PENDING',
      },
    });

    return reply.status(201).send({ success: true, data: review });
  });
}
