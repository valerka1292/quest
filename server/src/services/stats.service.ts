import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export async function getOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Single aggregation query to find the most popular quest (eliminates N+1)
  const popularQuestResult = await prisma.booking.groupBy({
    by: ['questId'],
    where: { questId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  });

  const [
    todayBookings,
    monthBookings,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    popularQuestData,
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: today } } }),
    prisma.booking.aggregate({
      where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { price: true },
    }),
    prisma.booking.count({ where: { status: { notIn: ['CANCELLED', 'ARCHIVED'] } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
    popularQuestResult.length > 0 && popularQuestResult[0].questId
      ? prisma.quest.findUnique({ where: { id: popularQuestResult[0].questId! }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return {
    todayBookings,
    monthRevenue: monthBookings._sum.price || 0,
    popularQuest: popularQuestData?.name || '—',
    totalBookings,
    confirmedBookings,
    cancelledBookings,
  };
}

export async function getRevenue(dateFrom?: string, dateTo?: string) {
  // Build conditions using Prisma.sql tagged template — safe against SQL injection
  // and resistant to parameter-numbering mistakes.
  const conditions: Prisma.Sql[] = [
    Prisma.sql`b.status NOT IN ('CANCELLED', 'ARCHIVED')`,
  ];

  if (dateFrom) {
    conditions.push(Prisma.sql`b."createdAt" >= ${new Date(dateFrom)}`);
  }
  if (dateTo) {
    conditions.push(Prisma.sql`b."createdAt" <= ${new Date(dateTo)}`);
  }

  const where = Prisma.join(conditions, ' AND ');

  // LIMIT 365 prevents returning unbounded rows for long-running businesses
  return prisma.$queryRaw<
    Array<{ date: string; revenue: number; questId: string | null; questName: string }>
  >`
    SELECT
      DATE_TRUNC('day', b."createdAt")::text AS "date",
      SUM(b.price)::int                      AS "revenue",
      b."questId"                            AS "questId",
      COALESCE(q.name, 'Невідомо')           AS "questName"
    FROM "Booking" b
    LEFT JOIN "Quest" q ON b."questId" = q.id
    WHERE ${where}
    GROUP BY DATE_TRUNC('day', b."createdAt"), b."questId", q.name
    ORDER BY "date" ASC
    LIMIT 365
  `;
}

export async function getFunnel() {
  const counts = await prisma.booking.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const total = counts.reduce((sum, c) => sum + c._count.id, 0);
  const confirmed = counts.find(c => c.status === 'CONFIRMED')?._count.id ?? 0;
  const completed = counts.find(c => c.status === 'COMPLETED')?._count.id ?? 0;
  const cancelled = counts.find(c => c.status === 'CANCELLED')?._count.id ?? 0;

  return [
    { step: 'Всього заявок', count: total, dropOff: 0 },
    { step: 'Підтверджено', count: confirmed, dropOff: total - confirmed },
    { step: 'Зіграно', count: completed, dropOff: confirmed - completed },
    { step: 'Скасовано', count: cancelled, dropOff: 0 },
  ];
}
