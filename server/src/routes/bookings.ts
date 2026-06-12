import type { FastifyInstance } from 'fastify';
import { bookingSchema } from '@veilworlds/shared';
import { createBooking, getBookingByTicket } from '../services/booking.service.js';
import { sendBookingConfirmation } from '../services/email.service.js';
import { sendNewBookingNotification } from '../services/telegram.service.js';
import { canSendEmail } from '../services/emailRateLimit.js';

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

    try {
      const booking = await createBooking(parsed.data);

      // Rate-limit confirmation emails per recipient to prevent abuse (VULN-09)
      if (booking.email && canSendEmail(booking.email)) {
        sendBookingConfirmation(booking).catch(err => console.error('Email err:', err));
      }
      sendNewBookingNotification(booking).catch(err => console.error('TG err:', err));

      return reply.status(201).send({ success: true, data: booking });
    } catch (err: any) {
      if (err.message === 'SLOT_TAKEN') {
        return reply.status(409).send({
          success: false,
          error: { code: 'SLOT_TAKEN', message: 'Цей час уже зайнято' },
        });
      }
      if (err.message === 'SLOT_BLOCKED') {
        return reply.status(409).send({
          success: false,
          error: { code: 'SLOT_BLOCKED', message: 'Цей час заблоковано' },
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
