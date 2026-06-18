import { config } from '../config.js';
import cron from 'node-cron';

let bot: any = null;
const remindedIds = new Set<string>();

async function getBot() {
  if (!bot && config.telegram.token) {
    try {
      // @ts-ignore
      const { default: TelegramBot } = await import('node-telegram-bot-api');
      const isProd = process.env.NODE_ENV === 'production';
      bot = new TelegramBot(config.telegram.token, { polling: !isProd });
    } catch {
      return null;
    }
  }
  return bot;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanPhone(phone: string): string {
  return phone.replace(/[\s\(\)\-]/g, '');
}

export async function sendNewBookingNotification(booking: any) {
  const b = await getBot();
  if (!b || !config.telegram.chatId) return;

  const questName = booking.quest?.name || booking.package?.name || 'Невідомо';
  const dateStr = new Date(booking.date).toLocaleDateString('uk-UA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const message = [
    `🆕 <b>НОВА ЗАЯВКА ${escapeHtml(booking.ticketNumber)}</b>`,
    '',
    `🎮 <b>Квест:</b> ${escapeHtml(questName)}`,
    `📅 <b>Дата:</b> ${escapeHtml(dateStr)}`,
    `⏰ <b>Час:</b> ${escapeHtml(booking.time)}`,
    `👥 <b>Гравців:</b> ${booking.players}`,
      `💰 <b>Сума:</b> ${booking.price.toLocaleString()} грн`,
      '',
      `👤 <b>Клієнт:</b> ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}`,
      `📞 ${escapeHtml(cleanPhone(booking.phone))}`,
      booking.email ? `📧 ${escapeHtml(booking.email)}` : '',
      '',
      booking.comment ? `💬 <i>${escapeHtml(booking.comment)}</i>` : '',
      '',
      '🔄 Зареєстровано в зовнішній системі',
    ].filter(Boolean).join('\n');

  try {
    await b.sendMessage(config.telegram.chatId, message, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

export async function sendNewCertificateNotification(certificate: any) {
  const b = await getBot();
  if (!b || !config.telegram.chatId) return;

  const message = [
    `🎟 <b>ЗАЯВКА НА СЕРТИФІКАТ ${escapeHtml(certificate.code)}</b>`,
    '',
    `💰 <b>Сума:</b> ${certificate.amount.toLocaleString()} грн`,
    '',
    `👤 <b>Клієнт:</b> ${escapeHtml(certificate.customerName)}`,
    `📞 ${escapeHtml(cleanPhone(certificate.phone))}`,
    certificate.email ? `📧 ${escapeHtml(certificate.email)}` : '',
    '',
    '📞 <i>Менеджер зв\'яжеться з клієнтом для підтвердження та оплати</i>',
  ].filter(Boolean).join('\n');

  try {
    await b.sendMessage(config.telegram.chatId, message, { parse_mode: 'HTML' });
  } catch {
    // silent
  }
}

export async function sendUpcomingBookingReminders() {
  const b = await getBot();
  if (!b || !config.telegram.chatId) return;

  const now = new Date();

  try {
    const { prisma } = await import('../utils/prisma.js');
    const bookings = await prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      include: { quest: true, package: true },
    });

    for (const booking of bookings) {
      if (remindedIds.has(booking.id)) continue;

      const bookingStart = new Date(booking.date);
      const [h, m] = booking.time.split(':').map(Number);
      bookingStart.setHours(h, m, 0, 0);

      const diff = bookingStart.getTime() - now.getTime();
      const diffMinutes = Math.round(diff / 60000);

      if (diffMinutes >= 55 && diffMinutes <= 65) {
        remindedIds.add(booking.id);
        scheduledRebookingCheck(booking, b);
      }
    }

    // Cleanup old entries once a day
    if (remindedIds.size > 1000) {
      remindedIds.clear();
    }
  } catch {
    // silent
  }
}

async function scheduledRebookingCheck(booking: any, b: any) {
  const questName = booking.quest?.name || booking.package?.name || 'Невідомо';
  const dateStr = new Date(booking.date).toLocaleDateString('uk-UA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const message = [
    `⏰ <b>НАГАДУВАННЯ ${escapeHtml(booking.ticketNumber)}</b>`,
    '',
    `🎮 <b>Квест:</b> ${escapeHtml(questName)}`,
    `📅 <b>Дата:</b> ${escapeHtml(dateStr)}`,
    `⏰ <b>Час:</b> ${escapeHtml(booking.time)}`,
    `👥 <b>Гравців:</b> ${booking.players}`,
    `💰 <b>Сума:</b> ${booking.price.toLocaleString()} грн`,
    '',
    `👤 <b>Клієнт:</b> ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}`,
    `📞 ${escapeHtml(cleanPhone(booking.phone))}`,
    booking.email ? `📧 ${escapeHtml(booking.email)}` : '',
    '',
    '⏳ <i>Через годину починається!</i>',
  ].filter(Boolean).join('\n');

  try {
    await b.sendMessage(config.telegram.chatId, message, { parse_mode: 'HTML' });
  } catch {
    // silent
  }
}

export function startReminderCron() {
  if (!config.telegram.token) return;
  cron.schedule('* * * * *', () => {
    sendUpcomingBookingReminders().catch(() => {});
  });
  console.log('⏰ Telegram reminder cron started (every minute)');
}


