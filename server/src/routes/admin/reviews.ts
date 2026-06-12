import type { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { reviewSchema } from '@veilworlds/shared';
import { authMiddleware } from '../../middleware/auth.js';
import { auditLog } from '../../utils/auditLog.js';

/**
 * Recomputes and persists the average rating and review count for a quest.
 * Called after any CUD operation on reviews.
 */
async function recalculateQuestRating(questId: string): Promise<void> {
  const stats = await prisma.review.aggregate({
    where: { questId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.quest.update({
    where: { id: questId },
    data: {
      rating: stats._avg.rating || 0,
      reviewCount: stats._count.id || 0,
    },
  });
}

export async function adminReviewRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  app.get('/api/admin/reviews', async (request, reply) => {
    const { status, questId } = request.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (questId) where.questId = questId;

    const reviews = await prisma.review.findMany({
      where,
      include: { quest: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: reviews });
  });

  app.patch('/api/admin/reviews/:id/status', async (request, reply) => {
    const { status } = request.body as any;
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Статус має бути APPROVED або REJECTED' },
      });
    }

    const review = await prisma.review.update({
      where: { id: (request.params as any).id },
      data: { status },
      include: { quest: true },
    });

    await recalculateQuestRating(review.questId);

    auditLog({
      action: 'REVIEW_STATUS_CHANGE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Review',
      resourceId: (request.params as any).id,
      details: { newStatus: status },
      ip: request.ip,
    });

    return reply.send({ success: true, data: review });
  });

  app.post('/api/admin/reviews', async (request, reply) => {
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => e.message).join(', ') },
      });
    }

    const review = await prisma.review.create({
      data: {
        questId: parsed.data.questId,
        author: parsed.data.author,
        rating: parsed.data.rating,
        text: parsed.data.text,
        status: 'APPROVED',
      },
      include: { quest: true },
    });

    await recalculateQuestRating(review.questId);

    auditLog({
      action: 'REVIEW_CREATE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Review',
      resourceId: review.id,
      ip: request.ip,
    });

    return reply.status(201).send({ success: true, data: review });
  });

  app.delete('/api/admin/reviews/:id', async (request, reply) => {
    const deletedReview = await prisma.review.delete({
      where: { id: (request.params as any).id },
    });
    await recalculateQuestRating(deletedReview.questId);

    auditLog({
      action: 'REVIEW_DELETE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Review',
      resourceId: (request.params as any).id,
      ip: request.ip,
    });

    return reply.send({ success: true, data: null });
  });
}
