import { api } from './client.js';
import type { Booking, BookingInput } from '@veilworlds/shared';

export function createBooking(data: BookingInput): Promise<Booking> {
  return api.post<Booking>('/bookings', data);
}

export function getBooking(ticketNumber: string): Promise<Booking> {
  return api.get<Booking>(`/bookings/${ticketNumber}`);
}
