/**
 * In-memory email rate limiter.
 * Prevents abuse of the booking confirmation email endpoint (VULN-09).
 * Max 3 emails per email address per hour.
 *
 * NOTE: This resets on server restart. For multi-replica setups, use Redis instead.
 */

const MAX_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface EmailEntry {
  count: number;
  resetAt: number;
}

const emailCounters = new Map<string, EmailEntry>();

export function canSendEmail(email: string): boolean {
  if (!email) return true;

  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = emailCounters.get(key);

  if (!entry || now >= entry.resetAt) {
    emailCounters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_PER_HOUR) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Periodic cleanup to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailCounters.entries()) {
    if (now >= entry.resetAt) {
      emailCounters.delete(key);
    }
  }
}, WINDOW_MS);
