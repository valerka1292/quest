import { api } from './client.js';
import type { Quest } from '@veilworlds/shared';

export function fetchQuests(): Promise<Quest[]> {
  return api.get<Quest[]>('/quests');
}

export function fetchQuest(slug: string): Promise<Quest> {
  return api.get<Quest>(`/quests/${slug}`);
}
