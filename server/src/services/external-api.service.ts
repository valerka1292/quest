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

export function getQuestId(roomId: number): string | null {
  return Object.entries(ROOM_IDS).find(([, v]) => v === roomId)?.[0] ?? null;
}

type ExternalMethod =
  | 'room:showDays'
  | 'room:showHour'
  | 'room:bookingHour'
  | 'room:calculatePrice'
  | 'room:getSales';

async function callExternalApi<T>(
  method: ExternalMethod,
  params: Record<string, unknown>
): Promise<T> {
  const url = new URL(config.externalApi.baseUrl);
  const body = new URLSearchParams({ task: method, ...Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  )});

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err: any) {
    throw new ExternalApiError('NETWORK_ERROR', `Зовнішній API недоступний: ${err.message}`);
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ExternalApiError('PARSE_ERROR', 'Невірний формат відповіді від зовнішнього API');
  }

  if (json?.error === 1) {
    throw new ExternalApiError(
      String(json.error_code || 'EXTERNAL_ERROR'),
      json.error_message || 'Помилка зовнішнього API'
    );
  }

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
  price?: number;
}): Promise<CalculatePriceResponse> {
  return callExternalApi<CalculatePriceResponse>('room:calculatePrice', {
    id: params.roomId,
    date: params.date,
    time: params.time,
    nClient: params.nClient,
    ...(params.price ? { price: params.price } : {}),
  });
}
