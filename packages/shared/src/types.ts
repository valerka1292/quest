export type QuestSlug = 'silent-hill' | 'harry-potter';

export interface Quest {
  id: string;
  slug: QuestSlug;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  plotSummary: string;
  genre: string;
  ageMin: number;
  duration: number;
  minPlayers: number;
  maxPlayers: number;
  hasActor: boolean;
  hasRestZone: boolean;
  accentColor: string;
  heroImage: string;
  photos: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  basePlayers: number;
  pricePerExtra: number;
  maxPlayers: number;
  durationMin: number;
  includes: string[];
  isActive: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'ARCHIVED';

export interface Booking {
  id: string;
  ticketNumber: string;
  questId: string | null;
  quest?: Quest | null;
  packageId: string | null;
  package?: Package | null;
  date: string;
  time: string;
  players: number;
  price: number;
  status: BookingStatus;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  comment: string | null;
  managerNotes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  questId: string;
  quest?: Quest;
  author: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface BlockedSlot {
  id: string;
  questId: string;
  date: string;
  time: string | null;
  reason: string | null;
}

export type CertificateStatus = 'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED';

export interface Certificate {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  email: string | null;
  amount: number;
  status: CertificateStatus;
  createdAt: string;
  expiresAt: string;
}

export interface TimeSlot {
  time: string;
  price: number;
  available: boolean;
}

export interface DayStatus {
  [date: string]: 'available' | 'partial' | 'full' | 'blocked';
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface StatsOverview {
  todayBookings: number;
  monthRevenue: number;
  popularQuest: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export interface RevenueStats {
  date: string;
  revenue: number;
  questId: string;
  questName: string;
}

export interface FunnelStats {
  step: string;
  count: number;
  dropOff: number;
}
