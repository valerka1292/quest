import { prisma } from '../utils/prisma.js';
import type { BookingInput } from '@veilworlds/shared';
import { calcQuestPrice, calcPackagePrice } from '../utils/priceCalc.js';
import crypto from 'node:crypto';

function generateTicketNumber(): string {
  return `VW-${crypto.randomUUID().toUpperCase()}`;
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  return new Date(dateStr);
}

export async function createBooking(input: BookingInput) {
  const ticketNumber = generateTicketNumber();
  const targetDate = parseLocalDate(input.date);

  // Compute price server-side — never trust client-supplied price.
  let price: number;
  if (input.questId) {
    const quest = await prisma.quest.findUnique({ where: { id: input.questId } });
    if (!quest) throw new Error('QUEST_NOT_FOUND');
    if (input.players < quest.minPlayers || input.players > quest.maxPlayers) {
      throw new Error(`PLAYER_LIMIT:Кількість гравців має бути від ${quest.minPlayers} до ${quest.maxPlayers}`);
    }
    price = calcQuestPrice({
      questSlug: quest.slug as 'silent-hill' | 'harry-potter',
      players: input.players,
      time: input.time,
      withActor: input.withActor ?? false,
    });
  } else if (input.packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
    if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
    if (input.players < 1 || input.players > pkg.maxPlayers) {
      throw new Error(`PLAYER_LIMIT:Кількість гравців має бути від 1 до ${pkg.maxPlayers}`);
    }
    price = calcPackagePrice({
      basePrice: pkg.basePrice,
      basePlayers: pkg.basePlayers,
      pricePerExtra: pkg.pricePerExtra,
      players: input.players,
    });
  } else {
    throw new Error('BOOKING_REQUIRES_QUEST_OR_PACKAGE');
  }

  try {
    const booking = await prisma.$transaction(async (tx: any) => {
      if (input.questId && input.time) {
        const blocked = await tx.blockedSlot.findFirst({
          where: {
            questId: input.questId,
            date: targetDate,
            OR: [{ time: input.time }, { time: null }],
          },
        });
        if (blocked) {
          throw new Error('SLOT_BLOCKED');
        }
      }

      return tx.booking.create({
        data: {
          ticketNumber,
          questId: input.questId || null,
          packageId: input.packageId || null,
          date: targetDate,
          time: input.time,
          players: input.players,
          price,
          status: 'PENDING',
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email || null,
          comment: input.comment || null,
          source: input.source || null,
        },
        include: { quest: true, package: true },
      });
    });

    return booking;
  } catch (err: any) {
    // P2002 = unique constraint violation → slot already taken
    if (err?.code === 'P2002' || err?.message?.includes('booking_slot_unique')) {
      throw new Error('SLOT_TAKEN');
    }
    throw err;
  }
}

export async function getBookingByTicket(ticketNumber: string) {
  return prisma.booking.findUnique({
    where: { ticketNumber },
    include: { quest: true, package: true },
  });
}

export async function getBookings(filters: {
  page: number;
  perPage: number;
  status?: string;
  questId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.questId) where.questId = filters.questId;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = parseLocalDate(filters.dateFrom);
    if (filters.dateTo) where.date.lte = parseLocalDate(filters.dateTo);
  }
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
      { ticketNumber: { contains: filters.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { quest: true, package: true },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.perPage,
      take: filters.perPage,
    }),
    prisma.booking.count({ where }),
  ]);

  return { data, total, page: filters.page, perPage: filters.perPage };
}

export async function updateBooking(id: string, data: any) {
  return prisma.booking.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? parseLocalDate(data.date) : undefined,
    },
    include: { quest: true, package: true },
  });
}

export async function updateBookingStatus(id: string, status: string) {
  return prisma.booking.update({
    where: { id },
    data: { status: status as any },
    include: { quest: true, package: true },
  });
}

export async function deleteBooking(id: string) {
  return prisma.booking.delete({ where: { id } });
}

export async function getBookedTimesForDate(questId: string, date: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      questId,
      date: parseLocalDate(date),
      status: { notIn: ['CANCELLED', 'ARCHIVED'] },
    },
    select: { time: true },
  });
  return bookings.map((b: { time: string }) => b.time);
}

export async function getBookedSlotsForMonth(questId: string, month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const bookings = await prisma.booking.findMany({
    where: {
      questId,
      date: { gte: start, lt: end },
      status: { notIn: ['CANCELLED', 'ARCHIVED'] },
    },
    select: { date: true, time: true },
  });

  const map = new Map<string, string[]>();
  for (const b of bookings) {
    const ds = b.date.toISOString().slice(0, 10);
    if (!map.has(ds)) map.set(ds, []);
    map.get(ds)!.push(b.time);
  }
  return map;
}

export async function getBlockedSlotsForMonth(questId: string, month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const slots = await prisma.blockedSlot.findMany({
    where: {
      questId,
      date: { gte: start, lt: end },
    },
    select: { date: true, time: true },
  });

  const map = new Map<string, string[]>();
  for (const s of slots) {
    const ds = s.date.toISOString().slice(0, 10);
    if (!map.has(ds)) map.set(ds, []);
    map.get(ds)!.push(s.time || '__full_day__');
  }
  return map;
}
