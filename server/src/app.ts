import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import { questRoutes } from './routes/quests.js';
import { packageRoutes } from './routes/packages.js';
import { reviewRoutes } from './routes/reviews.js';
import { bookingRoutes } from './routes/bookings.js';
import { certificateRoutes } from './routes/certificates.js';
import { slotRoutes } from './routes/slots.js';
import { startReminderCron } from './services/telegram.service.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(swagger, {
  openapi: {
    info: {
      title: 'VeilWorlds API',
      version: '1.0.0',
      description: 'API для квест-компанії VeilWorlds',
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  await app.register(swaggerUi, { routePrefix: '/docs' });
} else {
  app.get('/docs', async (_req, reply) =>
    reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } })
  );
  app.get('/docs/*', async (_req, reply) =>
    reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } })
  );
}

await app.register(questRoutes);
await app.register(packageRoutes);
await app.register(reviewRoutes);
await app.register(bookingRoutes);
await app.register(certificateRoutes);
await app.register(slotRoutes);

app.setErrorHandler((error, request, reply) => {
  app.log.error({ err: error, url: request.url, method: request.method }, 'Unhandled error');
  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Сталася помилка сервера' },
    });
  }
  return reply.status(statusCode).send({
    success: false,
    error: { code: error.code ?? 'ERROR', message: error.message },
  });
});

app.get('/api/health', async () => {
  return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
});

startReminderCron();

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`🚀 VeilWorlds API running on http://localhost:${config.port}`);
  console.log(`📚 Swagger docs: http://localhost:${config.port}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
