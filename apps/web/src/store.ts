type Listener<T> = (state: T) => void;

class Store<T extends Record<string, any>> {
  private state: T;
  private listeners: Map<string, Set<Listener<T>>> = new Map();

  constructor(initial: T) {
    this.state = { ...initial };
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.state[key] = value;
    this.notify(key);
  }

  update(partial: Partial<T>) {
    const keys = Object.keys(partial) as (keyof T)[];
    for (const key of keys) {
      this.state[key] = partial[key] as T[typeof key];
    }
    for (const key of keys) {
      this.notify(key);
    }
  }

  subscribe<K extends keyof T>(key: K, fn: Listener<T>) {
    if (!this.listeners.has(key as string)) {
      this.listeners.set(key as string, new Set());
    }
    this.listeners.get(key as string)!.add(fn);
    return () => this.listeners.get(key as string)?.delete(fn);
  }

  private notify(key: keyof T) {
    this.listeners.get(key as string)?.forEach(fn => fn(this.state));
  }
}

interface AppState {
  quests: any[];
  packages: any[];
  reviews: any[];
  bookingOverlay: { open: boolean; questSlug?: string; packageSlug?: string } | null;
}

export const store = new Store<AppState>({
  quests: [],
  packages: [],
  reviews: [],
  bookingOverlay: null,
});
