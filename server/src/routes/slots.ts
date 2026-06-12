import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { generateDaySlots, getMonthDayStatus } from '../utils/slots.js';
import { getBookedTimesForDate, getBookedSlotsForMonth, getBlockedSlotsForMonth } from '../services/booking.service.js';

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

    const bookedTimes = await getBookedTimesForDate(questId, date);

    const blockedSlots = await prisma.blockedSlot.findMany({
      where: { questId, date: new Date(date) },
      select: { time: true },
    });
    
    const hasFullDayBlock = blockedSlots.some(s => s.time === null);
    if (hasFullDayBlock) {
      return reply.send({ success: true, data: [] });
    }

    const blockedTimes = blockedSlots.map((s: { time: string | null }) => s.time).filter(Boolean) as string[];

    const slots = generateDaySlots(quest.slug, bookedTimes, blockedTimes);
    return reply.send({ success: true, data: slots });
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

    const bookedMap = await getBookedSlotsForMonth(questId, month);
    const blockedMap = await getBlockedSlotsForMonth(questId, month);

    const status = getMonthDayStatus(quest.slug, bookedMap, blockedMap, month);
    return reply.send({ success: true, data: status });
  });
}
