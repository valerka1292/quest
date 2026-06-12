import type { FastifyInstance } from 'fastify';
import { getOverview, getRevenue, getFunnel } from '../../services/stats.service.js';
import { authMiddleware } from '../../middleware/auth.js';

export async function adminStatsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  app.get('/api/admin/stats/overview', async (_request, reply) => {
    const stats = await getOverview();
    return reply.send({ success: true, data: stats });
  });

  app.get('/api/admin/stats/revenue', async (request, reply) => {
    const { dateFrom, dateTo } = request.query as any;

    // Validate date params — only allow ISO date strings (YYYY-MM-DD)
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if ((dateFrom && !ISO_DATE.test(dateFrom)) || (dateTo && !ISO_DATE.test(dateTo))) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_DATE', message: 'dateFrom та dateTo мають бути у форматі YYYY-MM-DD' },
      });
    }

    const data = await getRevenue(dateFrom, dateTo);
    return reply.send({ success: true, data });
  });

  app.get('/api/admin/stats/funnel', async (_request, reply) => {
    const data = await getFunnel();
    return reply.send({ success: true, data });
  });
}
