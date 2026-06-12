const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || 'Помилка запиту');
  }

  return json.data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
};
