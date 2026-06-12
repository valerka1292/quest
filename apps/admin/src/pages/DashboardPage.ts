import { div, el } from '../utils/dom.js';
import { api } from '../api/client.js';
import { AdminLayout } from '../components/AdminLayout.js';
import type { StatsOverview } from '@veilworlds/shared';

export class DashboardPage extends HTMLElement {
  async connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base';

    const layout = new AdminLayout('dashboard');
    this.appendChild(layout);

    const main = layout.querySelector('#admin-content')!;

    let stats: StatsOverview | null = null;
    try {
      stats = await api.get<StatsOverview>('/stats/overview');
    } catch {}

    const grid = div({ class: 'grid grid-cols-1 md:grid-cols-3 gap-4' });

    const cards = [
      { label: 'Заявок сегодня', value: stats?.todayBookings ?? '—', color: '#7C3AED' },
      { label: 'Выручка за месяц', value: stats ? `${(stats.monthRevenue).toLocaleString()} грн` : '—', color: '#22C55E' },
      { label: 'Популярный квест', value: stats?.popularQuest ?? '—', color: '#DC2626' },
      { label: 'Всего заявок', value: stats?.totalBookings ?? '—', color: '#7C3AED' },
      { label: 'Подтверждено', value: stats?.confirmedBookings ?? '—', color: '#22C55E' },
      { label: 'Отменено', value: stats?.cancelledBookings ?? '—', color: '#DC2626' },
    ];

    for (const c of cards) {
      const card = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-5' });
      card.innerHTML = `
        <p class="text-text-muted text-xs mb-2">${c.label}</p>
        <p class="text-2xl font-bold" style="color:${c.color}">${c.value}</p>
      `;
      grid.appendChild(card);
    }

    main.appendChild(grid);
  }
}

customElements.define('vw-dashboard-page', DashboardPage);
