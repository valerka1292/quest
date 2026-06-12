import type { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { paginationSchema, adminBookingUpdateSchema } from '@veilworlds/shared';
import { getBookings, updateBooking, updateBookingStatus, deleteBooking } from '../../services/booking.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { auditLog } from '../../utils/auditLog.js';

export async function adminBookingRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  app.get('/api/admin/bookings', async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Невірні параметри' },
      });
    }

    const result = await getBookings(parsed.data);
    return reply.send({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, perPage: result.perPage },
    });
  });

  app.get('/api/admin/bookings/:id', async (request, reply) => {
    const booking = await prisma.booking.findUnique({
      where: { id: (request.params as any).id },
      include: { quest: true, package: true },
    });
    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Бронювання не знайдено' },
      });
    }
    return reply.send({ success: true, data: booking });
  });

  app.put('/api/admin/bookings/:id', async (request, reply) => {
    const parsed = adminBookingUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => e.message).join(', ') },
      });
    }

    const id = (request.params as any).id;
    const booking = await updateBooking(id, parsed.data);

    auditLog({
      action: 'BOOKING_UPDATE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Booking',
      resourceId: id,
      details: parsed.data,
      ip: request.ip,
    });

    return reply.send({ success: true, data: booking });
  });

  app.patch('/api/admin/bookings/:id/status', async (request, reply) => {
    const { status } = request.body as any;
    if (!status) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_STATUS', message: 'Статус обовʼязковий' },
      });
    }

    const id = (request.params as any).id;
    const booking = await updateBookingStatus(id, status);

    auditLog({
      action: 'BOOKING_STATUS_CHANGE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Booking',
      resourceId: id,
      details: { newStatus: status },
      ip: request.ip,
    });

    return reply.send({ success: true, data: booking });
  });

  app.delete('/api/admin/bookings/:id', async (request, reply) => {
    const id = (request.params as any).id;
    await deleteBooking(id);

    auditLog({
      action: 'BOOKING_DELETE',
      adminId: request.admin?.adminId ?? 'unknown',
      resourceType: 'Booking',
      resourceId: id,
      ip: request.ip,
    });

    return reply.send({ success: true, data: null });
  });
}
