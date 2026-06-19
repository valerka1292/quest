import type { FastifyInstance } from 'fastify';
import { bookingSchema } from '@veilworlds/shared';
import { createBooking, getBookingByTicket } from '../services/booking.service.js';
import { sendBookingConfirmation } from '../services/email.service.js';
import { sendNewBookingNotification } from '../services/telegram.service.js';
import { canSendEmail } from '../services/emailRateLimit.js';
import { getRoomId, externalBookingHour, externalCalculatePrice, getHourSlot, ExternalApiError } from '../services/external-api.service.js';
import { prisma } from '../utils/prisma.js';

function now(): string {
  return new Date().toISOString();
}

export async function bookingRoutes(app: FastifyInstance) {
  app.post('/api/bookings', async (request, reply) => {
    console.log(`[BOOKING] ${now()} POST /api/bookings body=${JSON.stringify(request.body)}`);

    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) {
      console.warn(`[BOOKING] ${now()} VALIDATION_ERROR ${parsed.error.errors.map(e => e.message).join(', ')}`);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => e.message).join(', '),
        },
      });
    }

    const input = parsed.data;
    console.log(`[BOOKING] ${now()} INPUT validated questId=${input.questId} date=${input.date} time=${input.time} players=${input.players}`);

    try {
      let externalPrice: number | null = null;
      let roomId: number | null = null;

      if (input.questId) {
        console.log(`[BOOKING] ${now()} Loading quest ${input.questId}...`);
        const quest = await prisma.quest.findUnique({ where: { id: input.questId } });
        if (!quest) {
          console.warn(`[BOOKING] ${now()} QUEST_NOT_FOUND ${input.questId}`);
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Квест не знайдено' },
          });
        }

        roomId = getRoomId(quest.slug);
        console.log(`[BOOKING] ${now()} Quest found slug=${quest.slug} roomId=${roomId}`);

        console.log(`[BOOKING] ${now()} Getting base price for slot date=${input.date} time=${input.time}`);
        const slotInfo = await getHourSlot(roomId, input.date, input.time);
        const basePrice = slotInfo?.price;
        console.log(`[BOOKING] ${now()} Slot base price=${basePrice}`);

        if (basePrice != null) {
          console.log(`[BOOKING] ${now()} Calling calculatePrice roomId=${roomId} date=${input.date} time=${input.time} players=${input.players} basePrice=${basePrice}`);
          const priceResult = await externalCalculatePrice({
            roomId,
            date: input.date,
            time: input.time,
            nClient: input.players,
            price: basePrice,
          });
          externalPrice = priceResult.price;
          console.log(`[BOOKING] ${now()} calculatePrice result price=${externalPrice} sale=${priceResult.sale}`);
        } else {
          console.log(`[BOOKING] ${now()} No base price from external API, will use local calculation`);
        }
      }

      console.log(`[BOOKING] ${now()} Creating booking in local DB with price=${externalPrice}...`);
      const booking = await createBooking(input, externalPrice);
      console.log(`[BOOKING] ${now()} Local booking created id=${booking.id} ticket=${booking.ticketNumber} price=${booking.price}`);

      let externalBookingSuccess = false;
      if (roomId && booking.time) {
        const phone = input.phone.replace(/\D/g, '');
        console.log(`[BOOKING] ${now()} Calling externalBookingHour roomId=${roomId} date=${input.date} time=${input.time} players=${input.players} price=${booking.price} phone=${phone}`);
        try {
          const extResult = await externalBookingHour({
            roomId,
            date: input.date,
            time: input.time,
            name: `${input.firstName} ${input.lastName}`,
            email: input.email || undefined,
            phone,
            nClient: input.players,
            price: booking.price,
            message: input.comment || undefined,
          });
          externalBookingSuccess = true;
          console.log(`[BOOKING] ${now()} External booking SUCCESS bookId=${extResult.bookId} code=${extResult.code}`);
        } catch (extErr: any) {
          console.error(`[BOOKING] ${now()} External booking FAILED: ${extErr?.message || extErr}`, extErr);
        }
      }

      const responseData = { ...booking, externalBookingSuccess }; else {
        console.log(`[BOOKING] ${now()} Skipping external booking roomId=${roomId} bookingTime=${booking.time}`);
      }

      if (booking.email && canSendEmail(booking.email)) {
        console.log(`[BOOKING] ${now()} Sending email to ${booking.email}`);
        sendBookingConfirmation(booking).catch(err => console.error(`[BOOKING] ${now()} Email err:`, err));
      }
      console.log(`[BOOKING] ${now()} Sending TG notification`);
      sendNewBookingNotification(booking).catch(err => console.error(`[BOOKING] ${now()} TG err:`, err));

      console.log(`[BOOKING] ${now()} SUCCESS returning 201 externalBookingSuccess=${externalBookingSuccess}`);
      return reply.status(201).send({ success: true, data: responseData });
    } catch (err: any) {
      console.error(`[BOOKING] ${now()} ERROR: ${err.message} stack=${err.stack}`);

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
