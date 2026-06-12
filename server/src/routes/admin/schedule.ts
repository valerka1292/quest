import type { FastifyInstance } from 'fastify';
import { blockedSlotSchema } from '@veilworlds/shared';
import { getBlockedSlots, createBlockedSlot, deleteBlockedSlot } from '../../services/schedule.service.js';
import { authMiddleware } from '../../middleware/auth.js';

export async function adminScheduleRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  app.get('/api/admin/blocked-slots', async (request, reply) => {
    const { questId } = request.query as any;
    const slots = await getBlockedSlots(questId);
    return reply.send({ success: true, data: slots });
  });

  app.post('/api/admin/blocked-slots', async (request, reply) => {
    const parsed = blockedSlotSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => e.message).join(', ') },
      });
    }

    const slot = await createBlockedSlot(parsed.data);
    return reply.status(201).send({ success: true, data: slot });
  });

  app.delete('/api/admin/blocked-slots/:id', async (request, reply) => {
    await deleteBlockedSlot((request.params as any).id);
    return reply.send({ success: true, data: null });
  });
}
