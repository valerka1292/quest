import { div, el } from '../utils/dom.js';
import { api } from '../api/client.js';
import { AdminLayout } from '../components/AdminLayout.js';
import type { BlockedSlot } from '@veilworlds/shared';

export class SchedulePage extends HTMLElement {
  async connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base';

    const layout = new AdminLayout('schedule');
    this.appendChild(layout);

    const main = layout.querySelector('#admin-content')!;
    main.innerHTML = '<h2 class="text-xl font-bold mb-4">Расписание</h2>';

    const form = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-5 mb-6' });
    form.innerHTML = `
      <h3 class="font-semibold mb-3">Заблокировать слот</h3>
      <form id="block-form" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select name="questId" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors">
            <option value="">Выберите квест</option>
          </select>
          <input type="date" name="date" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors">
          <input type="time" name="time" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors" placeholder="Весь день (пусто)">
        </div>
        <input type="text" name="reason" class="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors" placeholder="Причина (необязательно)">
        <button type="submit" class="bg-accent-red hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">Заблокировать</button>
      </form>
    `;

    main.appendChild(form);

    const list = div({ id: 'blocked-list' });
    main.appendChild(list);

    try {
      const quests = await api.get<any[]>('/../quests');
      const sel = form.querySelector('select')!;
      for (const q of quests) {
        sel.innerHTML += `<option value="${q.id}">${q.name}</option>`;
      }
    } catch {}

    form.querySelector('form')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      const data: any = {
        questId: fd.get('questId'),
        date: fd.get('date'),
        time: fd.get('time') || null,
        reason: fd.get('reason') || null,
      };
      try {
        await api.post('/blocked-slots', data);
        (e.target as HTMLFormElement).reset();
        await this.loadList(list);
      } catch {}
    });

    await this.loadList(list);
  }

  private async loadList(list: HTMLElement) {
    list.innerHTML = '<p class="text-text-muted text-sm py-4">Загрузка...</p>';

    try {
      const slots = await api.get<BlockedSlot[]>('/blocked-slots');

      if (slots.length === 0) {
        list.innerHTML = '<p class="text-text-muted text-sm py-4">Нет заблокированных слотов</p>';
        return;
      }

      list.innerHTML = '';
      for (const s of slots) {
        const row = div({ class: 'flex items-center justify-between bg-bg-card border border-border-subtle rounded-card p-4 mb-2' });
        row.innerHTML = `
          <div>
            <span class="font-semibold text-sm">${(s as any).quest?.name || s.questId}</span>
            <span class="text-text-muted text-sm ml-3">${new Date(s.date).toLocaleDateString('ru')}</span>
            <span class="text-text-muted text-sm ml-2">${s.time || 'Весь день'}</span>
            ${s.reason ? `<span class="text-text-muted text-xs ml-2">— ${s.reason}</span>` : ''}
          </div>
          <button class="text-red-400 hover:text-red-300 text-sm delete-btn" data-id="${s.id}">Удалить</button>
        `;

        row.querySelector('.delete-btn')!.addEventListener('click', async () => {
          await api.delete(`/blocked-slots/${s.id}`);
          await this.loadList(list);
        });

        list.appendChild(row);
      }
    } catch {
      list.innerHTML = '<p class="text-red-400 text-sm py-4">Ошибка загрузки</p>';
    }
  }
}

customElements.define('vw-schedule-page', SchedulePage);
