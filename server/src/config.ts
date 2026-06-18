import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: Environment variable "${name}" is required but not set.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'booking@veilworlds.com',
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  externalApi: {
    baseUrl: process.env.EXTERNAL_API_URL || 'https://calendar.questroom.ua/api-out',
  },
};

if (process.env.NODE_ENV === 'production') {
  if (config.jwt.secret === 'change-me-in-production' || config.jwt.secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET is insecure or set to default value in production.');
  }
  if (config.jwt.refreshSecret === 'change-me-refresh-in-production' || config.jwt.refreshSecret.length < 32) {
    throw new Error('FATAL: JWT_REFRESH_SECRET is insecure or set to default value in production.');
  }
}
