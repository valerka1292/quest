const BASE = '/api/admin';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function getToken(): string | null {
  return localStorage.getItem('vw_admin_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('vw_admin_refresh');
}

function logout() {
  localStorage.removeItem('vw_admin_token');
  localStorage.removeItem('vw_admin_refresh');
  window.location.href = '/admin';
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch('/api/admin/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const newToken = json.data?.accessToken;
    if (newToken) {
      localStorage.setItem('vw_admin_token', newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = getToken();
  const targetUrl = url.startsWith('/api/') ? url : `${BASE}${url}`;
  const res = await fetch(targetUrl, {
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401 && !isRetry) {
    // Attempt token refresh once before logging out
    if (isRefreshing) {
      // Queue concurrent requests until refresh completes
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          const retryOptions = {
            ...options,
            headers: {
              ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
              Authorization: `Bearer ${newToken}`,
            },
          };
          fetch(targetUrl, retryOptions)
            .then(r => r.json())
            .then(j => resolve(j.data))
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    const newToken = await tryRefresh();
    isRefreshing = false;

    if (newToken) {
      // Flush queued requests with the new token
      refreshQueue.forEach(fn => fn(newToken));
      refreshQueue = [];
      // Retry original request with new token
      return request<T>(url, options, true);
    }

    // Refresh failed — log out
    refreshQueue = [];
    logout();
    throw new Error('Unauthorized');
  }

  if (res.status === 401 && isRetry) {
    logout();
    throw new Error('Unauthorized');
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || 'Помилка запроса');
  }

  return json.data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: any) => request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body: any) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: any) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
