import type { FastifyInstance } from 'fastify';
import { bookingSchema } from '@veilworlds/shared';
import { createBooking, getBookingByTicket } from '../services/booking.service.js';
import { sendBookingConfirmation } from '../services/email.service.js';
import { sendNewBookingNotification } from '../services/telegram.service.js';
import { canSendEmail } from '../services/emailRateLimit.js';
import { getRoomId, externalBookingHour, externalCalculatePrice, ExternalApiError } from '../services/external-api.service.js';
import { prisma } from '../utils/prisma.js';

export async function bookingRoutes(app: FastifyInstance) {
  app.post('/api/bookings', async (request, reply) => {
    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => e.message).join(', '),
        },
      });
    }

    const input = parsed.data;

    try {
      let externalPrice: number | null = null;
      let roomId: number | null = null;

      if (input.questId) {
        const quest = await prisma.quest.findUnique({ where: { id: input.questId } });
        if (!quest) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
          });
        }

        roomId = getRoomId(quest.slug);

        const priceResult = await externalCalculatePrice({
          roomId,
          date: input.date,
          time: input.time,
          nClient: input.players,
        });
        externalPrice = priceResult.price;
      }

      const booking = await createBooking(input, externalPrice);

      if (roomId && booking.time) {
        try {
          const extResult = await externalBookingHour({
            roomId,
            date: input.date,
            time: input.time,
            name: `${input.firstName} ${input.lastName}`,
            email: input.email || undefined,
            phone: input.phone.replace(/[\s\(\)\-]/g, ''),
            nClient: input.players,
            price: booking.price,
            message: input.comment || undefined,
          });
          console.log(`External booking created: bookId=${extResult.bookId}, code=${extResult.code}`);
        } catch (extErr) {
          console.error('External booking failed (booking saved locally):', extErr);
        }
      }

      if (booking.email && canSendEmail(booking.email)) {
        sendBookingConfirmation(booking).catch(err => console.error('Email err:', err));
      }
      sendNewBookingNotification(booking).catch(err => console.error('TG err:', err));

      return reply.status(201).send({ success: true, data: booking });
    } catch (err: any) {
      if (err instanceof ExternalApiError) {
        if (err.code === 'SLOT_BUSY' || err.code === 'TIME_BLOCKED') {
          return reply.status(409).send({
            success: false,
            error: { code: 'SLOT_TAKEN', message: 'Цей час уже зайнято' },
          });
        }
        return reply.status(502).send({
          success: false,
          error: { code: err.code, message: 'Сервіс бронювання тимчасово недоступний' },
        });
      }

      if (err.message === 'SLOT_TAKEN') {
        return reply.status(409).send({
          success: false,
          error: { code: 'SLOT_TAKEN', message: 'Цей час уже зайнято' },
        });
      }
      if (err.message?.startsWith('PLAYER_LIMIT:')) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PLAYER_LIMIT', message: err.message.slice('PLAYER_LIMIT:'.length) },
        });
      }
      throw err;
    }
  });

  app.get('/api/bookings/:ticketNumber', async (request, reply) => {
    const { ticketNumber } = request.params as { ticketNumber: string };
    const booking = await getBookingByTicket(ticketNumber);
    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Бронювання не знайдено' },
      });
    }
    return reply.send({ success: true, data: booking });
  });
}
