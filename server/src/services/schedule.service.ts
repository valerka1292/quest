import { prisma } from '../utils/prisma.js';
import { parseLocalDate } from './booking.service.js';

export async function getBlockedSlots(questId?: string) {
  const where: any = {};
  if (questId) where.questId = questId;

  return prisma.blockedSlot.findMany({
    where,
    include: { quest: true },
    orderBy: { date: 'asc' },
  });
}

export async function createBlockedSlot(data: {
  questId: string;
  date: string;
  time?: string | null;
  reason?: string | null;
}) {
  return prisma.blockedSlot.create({
    data: {
      questId: data.questId,
      date: parseLocalDate(data.date),
      time: data.time || null,
      reason: data.reason || null,
    },
    include: { quest: true },
  });
}

export async function deleteBlockedSlot(id: string) {
  return prisma.blockedSlot.delete({ where: { id } });
}
