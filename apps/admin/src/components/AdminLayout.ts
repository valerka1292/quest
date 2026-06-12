import { div } from '../utils/dom.js';
import { navigate } from '../router.js';

export class AdminLayout extends HTMLElement {
  private active: string;

  constructor(active: string) {
    super();
    this.active = active;
  }

  connectedCallback() {
    this.className = 'flex min-h-dvh';

    const sidebar = div({ class: 'w-56 bg-bg-card border-r border-border-subtle p-4 flex flex-col gap-1' });
    sidebar.innerHTML = `
      <div class="text-lg font-bold mb-6 px-2">VeilWorlds</div>
    `;

    const items = [
      { id: 'dashboard', label: 'Дашборд', path: '/admin/dashboard' },
      { id: 'bookings', label: 'Заявки', path: '/admin/bookings' },
      { id: 'reviews', label: 'Отзывы', path: '/admin/reviews' },
      { id: 'schedule', label: 'Расписание', path: '/admin/schedule' },
    ];

    for (const item of items) {
      const link = div({
        class: `px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${this.active === item.id ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'}`,
      }, item.label);
      link.addEventListener('click', () => navigate(item.path));
      sidebar.appendChild(link);
    }

    const logout = div({
      class: 'mt-auto px-3 py-2 rounded-lg text-sm cursor-pointer text-text-muted hover:text-red-400 transition-colors',
    }, 'Выйти');
    logout.addEventListener('click', () => {
      localStorage.removeItem('vw_admin_token');
      localStorage.removeItem('vw_admin_refresh');
      navigate('/admin');
    });
    sidebar.appendChild(logout);

    const main = div({ id: 'admin-content', class: 'flex-1 p-6 overflow-y-auto' });

    this.append(sidebar, main);
  }
}

customElements.define('vw-admin-layout', AdminLayout);
