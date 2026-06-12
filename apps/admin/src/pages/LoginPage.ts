import { div, el } from '../utils/dom.js';
import { api } from '../api/client.js';
import { navigate } from '../router.js';

export class LoginPage extends HTMLElement {
  connectedCallback() {
    this.className = 'min-h-dvh flex items-center justify-center bg-bg-base p-4';

    const card = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-8 w-full max-w-sm' });

    card.innerHTML = `
      <h1 class="text-2xl font-bold text-center mb-6">VeilWorlds Admin</h1>
      <form id="login-form" class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-text-secondary">Логин</label>
          <input type="text" name="username" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors" placeholder="admin">
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-text-secondary">Пароль</label>
          <input type="password" name="password" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors" placeholder="••••">
        </div>
        <button type="submit" class="w-full bg-accent-purple hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition-colors">Войти</button>
        <p id="login-error" class="hidden text-red-400 text-sm text-center"></p>
      </form>
    `;

    this.appendChild(card);

    const form = card.querySelector('#login-form')!;
    const errEl = card.querySelector('#login-error')!;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form as HTMLFormElement);

      try {
        const data = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', {
          username: fd.get('username'),
          password: fd.get('password'),
        });
        localStorage.setItem('vw_admin_token', data.accessToken);
        localStorage.setItem('vw_admin_refresh', data.refreshToken);
        navigate('/admin/dashboard');
      } catch (err: any) {
        errEl.classList.remove('hidden');
        errEl.textContent = err.message || 'Ошибка входа';
      }
    });
  }
}

customElements.define('vw-login-page', LoginPage);
