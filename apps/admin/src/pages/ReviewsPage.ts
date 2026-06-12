import { div, el } from '../utils/dom.js';
import { api } from '../api/client.js';
import { AdminLayout } from '../components/AdminLayout.js';
import type { Quest, Review } from '@veilworlds/shared';

export class ReviewsPage extends HTMLElement {
  async connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base';

    const layout = new AdminLayout('reviews');
    this.appendChild(layout);

    const main = layout.querySelector('#admin-content')!;
    main.innerHTML = '<h2 class="text-xl font-bold mb-4">Отзывы</h2>';

    const form = await this.createForm();
    main.appendChild(form);

    const list = div({ id: 'reviews-list' });
    main.appendChild(list);

    await this.load(list);
  }

  private async createForm(): Promise<HTMLElement> {
    const quests = await api.get<Quest[]>('/api/quests');

    const container = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-5 mb-6' });
    container.innerHTML = `<h3 class="text-lg font-semibold mb-3">Додати фейковий відгук</h3>`;

    const questSelect = el('select', { class: 'w-full bg-bg-base border border-border-subtle rounded-card px-3 py-2 text-sm mb-3' });
    questSelect.innerHTML = '<option value="">— Оберіть квест —</option>';
    for (const q of quests) {
      const opt = document.createElement('option');
      opt.value = q.id;
      opt.textContent = q.name;
      questSelect.appendChild(opt);
    }

    const authorInput = el('input', {
      type: 'text', placeholder: 'Ім\'я автора',
      class: 'w-full bg-bg-base border border-border-subtle rounded-card px-3 py-2 text-sm mb-3',
    }) as HTMLInputElement;

    const starRow = div({ class: 'flex items-center gap-1 mb-3' });
    let selectedRating = 5;
    const starBtns: HTMLButtonElement[] = [];
    for (let i = 1; i <= 5; i++) {
      const btn = el('button', {
        type: 'button',
        class: `text-xl ${i <= selectedRating ? 'text-yellow-400' : 'text-gray-600'}`,
      }, '★') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        selectedRating = i;
        starBtns.forEach((b, idx) => b.className = `text-xl ${idx < selectedRating ? 'text-yellow-400' : 'text-gray-600'}`);
      });
      starBtns.push(btn);
      starRow.appendChild(btn);
    }

    const textInput = el('textarea', {
      placeholder: 'Текст відгуку',
      class: 'w-full bg-bg-base border border-border-subtle rounded-card px-3 py-2 text-sm mb-3 resize-none',
    }) as HTMLTextAreaElement;
    textInput.rows = 3;

    const errorEl = el('p', { class: 'text-red-400 text-xs mb-2 hidden' });

    const submitBtn = el('button', {
      type: 'button',
      class: 'px-4 py-2 bg-accent-green text-white rounded-card text-sm font-medium hover:opacity-90',
    }, 'Додати відгук') as HTMLButtonElement;
    submitBtn.addEventListener('click', async () => {
      const questId = questSelect.value;
      const author = authorInput.value.trim();
      const text = textInput.value.trim();

      if (!questId || !author || !text) {
        errorEl.textContent = 'Заповніть усі поля';
        errorEl.className = 'text-red-400 text-xs mb-2';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Додавання...';

      try {
        await api.post('/reviews', { questId, author, rating: selectedRating, text });
        authorInput.value = '';
        textInput.value = '';
        selectedRating = 5;
        starBtns.forEach((b, idx) => b.className = `text-xl ${idx < selectedRating ? 'text-yellow-400' : 'text-gray-600'}`);
        errorEl.className = 'text-green-400 text-xs mb-2';
        errorEl.textContent = 'Відгук додано!';
        await this.load(document.getElementById('reviews-list')!);
      } catch {
        errorEl.className = 'text-red-400 text-xs mb-2';
        errorEl.textContent = 'Помилка при додаванні';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Додати відгук';
      }
    });

    container.append(questSelect, authorInput, starRow, textInput, errorEl, submitBtn);
    return container;
  }

  private async load(list: HTMLElement) {
    list.innerHTML = '<p class="text-text-muted text-sm py-4">Загрузка...</p>';

    try {
      const reviews = await api.get<Review[]>('/reviews');

      if (reviews.length === 0) {
        list.innerHTML = '<p class="text-text-muted text-sm py-4">Нет отзывов</p>';
        return;
      }

      list.innerHTML = '';
      for (const r of reviews) {
        const card = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-5 mb-3' });
        
        const header = div({ class: 'flex items-center justify-between mb-2' });
        const leftSide = div({});
        const authorEl = el('span', { class: 'font-semibold' }, r.author);
        const questEl = el('span', { class: 'text-text-muted text-xs ml-2' }, r.quest?.name || '');
        leftSide.append(authorEl, questEl);
        
        const starsEl = el('span', { class: 'text-yellow-400' }, '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating));
        header.append(leftSide, starsEl);

        const textEl = el('p', { class: 'text-text-secondary text-sm mb-3' }, r.text);
        
        const footer = div({ class: 'flex items-center gap-2' });
        const badgeClass = r.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : r.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400';
        const badgeText = r.status === 'APPROVED' ? 'Одобрен' : r.status === 'REJECTED' ? 'Отклонён' : 'На модерации';
        const statusBadge = el('span', { class: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}` }, badgeText);
        footer.appendChild(statusBadge);

        if (r.status === 'PENDING') {
          const approveBtn = el('button', { class: 'text-xs text-green-400 hover:underline approve-btn', 'data-id': r.id }, 'Одобрить');
          approveBtn.addEventListener('click', async () => {
            await api.patch(`/reviews/${r.id}/status`, { status: 'APPROVED' });
            await this.load(list);
          });

          const rejectBtn = el('button', { class: 'text-xs text-red-400 hover:underline reject-btn', 'data-id': r.id }, 'Отклонить');
          rejectBtn.addEventListener('click', async () => {
            await api.patch(`/reviews/${r.id}/status`, { status: 'REJECTED' });
            await this.load(list);
          });

          footer.append(approveBtn, rejectBtn);
        }

        const deleteBtn = el('button', { class: 'text-xs text-red-400 hover:underline ml-auto' }, '🗑');
        deleteBtn.addEventListener('click', async () => {
          if (!confirm('Видалити відгук?')) return;
          await api.delete(`/reviews/${r.id}`);
          await this.load(list);
        });
        footer.appendChild(deleteBtn);

        card.append(header, textEl, footer);
        list.appendChild(card);
      }
    } catch {
      list.innerHTML = '<p class="text-red-400 text-sm py-4">Ошибка загрузки</p>';
    }
  }
}

customElements.define('vw-reviews-page', ReviewsPage);
