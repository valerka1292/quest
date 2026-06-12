import { z } from 'zod';

export const phoneRegex = /^\+380\s?\(\d{2}\)\s?\d{3}-\d{2}-\d{2}$/;

export const bookingSchema = z.object({
  questId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  date: z.string().min(1, 'Оберіть дату'),
  time: z.string().min(1, 'Оберіть час'),
  players: z.number().int().min(1, 'Мінімум 1 гравець').max(20, 'Максимум 20 гравців'),
  // NOTE: price is intentionally NOT accepted from the client.
  // It is always computed server-side from quest/package data.
  withActor: z.boolean().optional().default(false),
  firstName: z.string().min(1, 'Вкажіть імʼя').max(100),
  lastName: z.string().min(1, 'Вкажіть прізвище').max(100),
  phone: z.string().regex(phoneRegex, 'Невірний формат телефону'),
  email: z.string().email('Невірний email').optional().nullable().or(z.literal('')),
  comment: z.string().max(1000).optional().nullable(),
  source: z.string().optional().nullable(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const reviewSchema = z.object({
  questId: z.string().min(1),
  author: z.string().min(1, 'Вкажіть імʼя').max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10, 'Мінімум 10 символів').max(2000),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const certificateSchema = z.object({
  customerName: z.string().min(1, 'Вкажіть імʼя отримувача').max(100),
  giverName: z.string().min(1, 'Вкажіть ваше імʼя').max(100),
  phone: z.string().regex(phoneRegex, 'Невірний формат телефону'),
  email: z.string().email('Невірний email').optional().nullable().or(z.literal('')),
  amount: z.number().int().positive().default(2500),
});

export type CertificateInput = z.infer<typeof certificateSchema>;

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1, 'Введіть пароль'),
});

export const adminBookingUpdateSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  players: z.number().int().min(1).optional(),
  price: z.number().int().positive().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ARCHIVED']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  managerNotes: z.string().optional().nullable(),
});

export const blockedSlotSchema = z.object({
  questId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().nullable().optional(),
  reason: z.string().optional().nullable(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  questId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
