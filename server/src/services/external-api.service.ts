import { config } from '../config.js';

export class ExternalApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ExternalApiError';
  }
}

const ROOM_IDS: Record<string, number> = {
  'silent-hill': 1462,
  'harry-potter': 1463,
};

export function getRoomId(questSlug: string): number {
  const id = ROOM_IDS[questSlug];
  if (!id) throw new ExternalApiError('UNKNOWN_QUEST', `Невідомий квест: ${questSlug}`);
  return id;
}

type ExternalMethod =
  | 'room:showDays'
  | 'room:showHour'
  | 'room:bookingHour'
  | 'room:calculatePrice'
  | 'room:getSales';

function now(): string {
  return new Date().toISOString();
}

async function callExternalApi<T>(
  method: ExternalMethod,
  params: Record<string, unknown>
): Promise<T> {
  const url = config.externalApi.baseUrl;
  const body = new URLSearchParams({ task: method, ...Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  )});

  console.log(`[EXT-API] ${now()} REQ ${method} params=${JSON.stringify(params)}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err: any) {
    const msg = `Зовнішній API недоступний: ${err.message}`;
    console.error(`[EXT-API] ${now()} ERR ${method} — ${msg}`);
    throw new ExternalApiError('NETWORK_ERROR', msg);
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    const msg = 'Невірний формат відповіді від зовнішнього API';
    console.error(`[EXT-API] ${now()} PARSE_ERR ${method} — status=${response.status}, body=${await response.text().catch(() => 'unknown')}`);
    throw new ExternalApiError('PARSE_ERROR', msg);
  }

  if (json?.error == 1 || json?.error === '1') {
    const code = String(json.error_code || 'EXTERNAL_ERROR');
    const msg = json.error_message || 'Помилка зовнішнього API';
    console.error(`[EXT-API] ${now()} ERR ${method} — code=${code} msg=${msg}`);
    throw new ExternalApiError(code, msg);
  }

  console.log(`[EXT-API] ${now()} OK ${method} — response=${JSON.stringify(json).slice(0, 200)}`);
  return json as T;
}

export interface ExternalSlot {
  price: number;
  free: boolean;
  closeNumb: number;
  price_pl?: number;
}

export type ExternalDaysResponse = Record<string, Record<string, ExternalSlot>>;

export async function getDaysSchedule(roomId: number): Promise<ExternalDaysResponse> {
  return callExternalApi<ExternalDaysResponse>('room:showDays', { id: roomId });
}

export type ExternalHourResponse = Record<string, Record<string, ExternalSlot>>;

export async function getHourSlot(roomId: number, date: string, time: string): Promise<ExternalSlot | null> {
  const res = await callExternalApi<ExternalHourResponse>('room:showHour', { id: roomId, date, time });
  const daySlots = res[date];
  if (!daySlots) return null;
  return daySlots[time] || null;
}

export interface BookingHourParams {
  roomId: number;
  date: string;
  time: string;
  name: string;
  email?: string;
  phone: string;
  nClient: number;
  price: number;
  sale?: string;
  promocode?: string;
  langOfPlay?: string;
  message?: string;
  lang?: string;
}

export interface BookingHourResponse {
  success: true;
  bookId: number;
  code: string;
}

export async function externalBookingHour(params: BookingHourParams): Promise<BookingHourResponse> {
  return callExternalApi<BookingHourResponse>('room:bookingHour', {
    id: params.roomId,
    date: params.date,
    time: params.time,
    name: params.name,
    email: params.email || '',
    phone: params.phone,
    nClient: params.nClient,
    price: params.price,
    ...(params.sale ? { sale: params.sale } : {}),
    ...(params.promocode ? { promocode: params.promocode } : {}),
    ...(params.langOfPlay ? { langOfPlay: params.langOfPlay } : {}),
    ...(params.message ? { message: params.message } : {}),
    ...(params.lang ? { lang: params.lang } : {}),
  });
}

export interface CalculatePriceResponse {
  price: number;
  sale?: string;
  isValidPromocode?: boolean;
}

export async function externalCalculatePrice(params: {
  roomId: number;
  date: string;
  time: string;
  nClient: number;
  price: number;
}): Promise<CalculatePriceResponse> {
  return callExternalApi<CalculatePriceResponse>('room:calculatePrice', {
    id: params.roomId,
    date: params.date,
    time: params.time,
    nClient: params.nClient,
    price: params.price,
  });
}
