import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

function bookingEmailHtml(booking: any): string {
  const questName = booking.quest?.name || booking.package?.name || 'Квест';
  const accentColor = booking.quest?.accentColor || '#8B5CF6';
  const dateStr = new Date(booking.date).toLocaleDateString('uk-UA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0D0D1A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D1A;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1A1A2E;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
<tr><td style="padding:40px 40px 30px;text-align:center;">
<h1 style="color:#fff;font-size:24px;margin:0 0 8px;">VeilWorlds</h1>
<p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0;">Вашу заявку прийнято!</p>
</td></tr>
<tr><td style="background:${accentColor};padding:30px 40px;text-align:center;">
<p style="color:#fff;font-size:13px;margin:0 0 4px;opacity:0.8;">НОМЕР ЗАЯВКИ</p>
<p style="color:#fff;font-size:28px;font-weight:bold;margin:0;letter-spacing:2px;">${booking.ticketNumber}</p>
</td></tr>
<tr><td style="padding:30px 40px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Квест</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${questName}</td></tr>
<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Дата</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${dateStr}</td></tr>
<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Час</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${booking.time}</td></tr>
<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Гравців</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${booking.players}</td></tr>
<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Сума</td><td style="padding:8px 0;color:#fff;font-size:16px;font-weight:bold;text-align:right;">${booking.price.toLocaleString()} грн</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px 40px;text-align:center;">
<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Очікуйте дзвінка менеджера протягом 30 хвилин.</p>
<p style="color:rgba(255,255,255,0.3);font-size:12px;margin:12px 0 0;">Дніпро · VeilWorlds</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendBookingConfirmation(booking: any) {
  if (!booking.email || !config.smtp.user) return;

  try {
    await transporter.sendMail({
      from: `"VeilWorlds" <${config.smtp.from}>`,
      to: booking.email,
      subject: `Бронювання VeilWorlds — ${booking.quest?.name || booking.package?.name || 'Квест'}, ${new Date(booking.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} о ${booking.time}`,
      html: bookingEmailHtml(booking),
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}
