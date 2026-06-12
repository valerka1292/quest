import { api } from './client.js';
import type { Review, ReviewInput } from '@veilworlds/shared';

export function fetchReviews(questSlug: string): Promise<Review[]> {
  return api.get<Review[]>(`/quests/${questSlug}/reviews`);
}

export function submitReview(questSlug: string, data: ReviewInput): Promise<Review> {
  return api.post<Review>(`/quests/${questSlug}/reviews`, data);
}
