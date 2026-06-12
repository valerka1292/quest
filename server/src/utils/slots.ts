import type { TimeSlot } from '@veilworlds/shared';

const SILENT_HILL_TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'];
const HARRY_POTTER_TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'];

export function getTimesForQuest(questSlug: string): string[] {
  return questSlug === 'silent-hill' ? SILENT_HILL_TIMES : HARRY_POTTER_TIMES;
}

export function getSlotBasePrice(time: string): number {
  const [h] = time.split(':').map(Number);
  return h >= 19 ? 3000 : 2500;
}

export function generateDaySlots(
  questSlug: string,
  bookedTimes: string[],
  blockedTimes: string[]
): TimeSlot[] {
  const times = getTimesForQuest(questSlug);
  return times.map(time => ({
    time,
    price: getSlotBasePrice(time),
    available: !bookedTimes.includes(time) && !blockedTimes.includes(time),
  }));
}

export function getMonthDayStatus(
  questSlug: string,
  bookedSlots: Map<string, string[]>,
  blockedSlots: Map<string, string[]>,
  month: string
): Record<string, 'available' | 'partial' | 'full' | 'blocked'> {
  const totalSlots = getTimesForQuest(questSlug).length;
  const result: Record<string, 'available' | 'partial' | 'full' | 'blocked'> = {};

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const blocked = blockedSlots.get(dateStr) || [];
    const booked = bookedSlots.get(dateStr) || [];

    if (blocked.includes('__full_day__')) {
      result[dateStr] = 'blocked';
    } else {
      const unavailable = new Set([...blocked, ...booked]);
      const available = totalSlots - unavailable.size;
      if (available === 0) result[dateStr] = 'full';
      else if (available < totalSlots) result[dateStr] = 'partial';
      else result[dateStr] = 'available';
    }
  }

  return result;
}
