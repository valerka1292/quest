import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { getRoomId, getDaysSchedule, ExternalApiError } from '../services/external-api.service.js';
import type { TimeSlot, DayStatus } from '@veilworlds/shared';

export async function slotRoutes(app: FastifyInstance) {
  app.get('/api/slots/:questId', async (request, reply) => {
    const { questId } = request.params as { questId: string };
    const { date } = request.query as { date?: string };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Невірний формат дати. Очікується YYYY-MM-DD' },
      });
    }

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
      });
    }

    try {
      const roomId = getRoomId(quest.slug);
      const schedule = await getDaysSchedule(roomId);
      const daySlots = schedule[date] || {};

      const slots: TimeSlot[] = Object.entries(daySlots).map(([time, slot]) => ({
        time,
        price: slot.price,
        available: slot.free,
      }));

      return reply.send({ success: true, data: slots });
    } catch (err) {
      if (err instanceof ExternalApiError) {
        return reply.status(502).send({
          success: false,
          error: { code: err.code, message: 'Сервіс бронювання тимчасово недоступний' },
        });
      }
      throw err;
    }
  });

  app.get('/api/slots/month/:questId', async (request, reply) => {
    const { questId } = request.params as { questId: string };
    const { month } = request.query as { month?: string };

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_MONTH', message: 'Невірний формат місяця. Очікується YYYY-MM' },
      });
    }

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
      });
    }

    try {
      const roomId = getRoomId(quest.slug);
      const schedule = await getDaysSchedule(roomId);

      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();

      const status: DayStatus = {};

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const daySlots = schedule[dateStr];

        if (!daySlots || Object.keys(daySlots).length === 0) {
          status[dateStr] = 'blocked';
          continue;
        }

        const entries = Object.values(daySlots);
        const totalSlots = entries.length;
        const freeCount = entries.filter(s => s.free).length;

        if (freeCount === 0) {
          status[dateStr] = 'full';
        } else if (freeCount < totalSlots) {
          status[dateStr] = 'partial';
        } else {
          status[dateStr] = 'available';
        }
      }

      return reply.send({ success: true, data: status });
    } catch (err) {
      if (err instanceof ExternalApiError) {
        return reply.status(502).send({
          success: false,
          error: { code: err.code, message: 'Сервіс бронювання тимчасово недоступний' },
        });
      }
      throw err;
    }
  });
}
