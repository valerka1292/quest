import { div, el } from '../utils/dom.js';
import { api } from '../api/client.js';
import { AdminLayout } from '../components/AdminLayout.js';

interface Booking {
  id: string;
  ticketNumber: string;
  questId?: string;
  quest?: { name: string };
  packageId?: string;
  package?: { name: string };
  date: string;
  time: string;
  players: number;
  price: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'ARCHIVED';
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  comment?: string;
  managerNotes?: string;
  createdAt: string;
}

export class BookingsPage extends HTMLElement {
  private currentPage = 1;
  private currentStatus = '';
  private currentQuestId = '';
  private currentSearch = '';
  private bookings: Booking[] = [];
  private quests: any[] = [];
  private totalBookings = 0;

  async connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base text-white';

    const layout = new AdminLayout('bookings');
    this.appendChild(layout);

    const main = layout.querySelector('#admin-content')!;
    main.innerHTML = '';

    const header = div({ class: 'flex justify-between items-center mb-6' });
    header.innerHTML = '<h2 class="text-2xl font-bold">Управление заявками</h2>';
    main.appendChild(header);

    // Filters row
    const filtersContainer = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-4 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4' });
    filtersContainer.innerHTML = `
      <div class="flex-1 min-w-[200px]">
        <input type="text" id="search-input" placeholder="Поиск (Имя, телефон, билет)..." class="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple transition-colors">
      </div>
      <div>
        <select id="status-filter" class="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple transition-colors">
          <option value="">Все статусы</option>
          <option value="PENDING">Ожидает (PENDING)</option>
          <option value="CONFIRMED">Подтвержден (CONFIRMED)</option>
          <option value="CANCELLED">Отменен (CANCELLED)</option>
          <option value="COMPLETED">Выполнен (COMPLETED)</option>
          <option value="ARCHIVED">В архиве (ARCHIVED)</option>
        </select>
      </div>
      <div>
        <select id="quest-filter" class="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple transition-colors">
          <option value="">Все квесты</option>
        </select>
      </div>
    `;
    main.appendChild(filtersContainer);

    // List container
    const listContainer = div({ id: 'bookings-list' });
    main.appendChild(listContainer);

    // Pagination row
    const paginationContainer = div({ class: 'flex justify-between items-center mt-6 text-sm text-text-muted' });
    paginationContainer.innerHTML = `
      <div id="pagination-info">Показано 0 из 0</div>
      <div class="flex gap-2">
        <button id="prev-btn" class="bg-bg-card hover:bg-bg-elevated border border-border-subtle px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Назад</button>
        <button id="next-btn" class="bg-bg-card hover:bg-bg-elevated border border-border-subtle px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Вперед</button>
      </div>
    `;
    main.appendChild(paginationContainer);

    // Fetch quests for the filter
    try {
      this.quests = await api.get<any[]>('/api/quests');
      const qFilter = filtersContainer.querySelector('#quest-filter') as HTMLSelectElement;
      for (const q of this.quests) {
        const opt = el('option', { value: q.id }, q.name);
        qFilter.appendChild(opt);
      }
    } catch (e) {
      console.error(e);
    }

    // Set up event listeners
    filtersContainer.querySelector('#search-input')!.addEventListener('input', (e) => {
      this.currentSearch = (e.target as HTMLInputElement).value;
      this.currentPage = 1;
      this.loadBookings();
    });

    filtersContainer.querySelector('#status-filter')!.addEventListener('change', (e) => {
      this.currentStatus = (e.target as HTMLSelectElement).value;
      this.currentPage = 1;
      this.loadBookings();
    });

    filtersContainer.querySelector('#quest-filter')!.addEventListener('change', (e) => {
      this.currentQuestId = (e.target as HTMLSelectElement).value;
      this.currentPage = 1;
      this.loadBookings();
    });

    paginationContainer.querySelector('#prev-btn')!.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadBookings();
      }
    });

    paginationContainer.querySelector('#next-btn')!.addEventListener('click', () => {
      if (this.currentPage * 20 < this.totalBookings) {
        this.currentPage++;
        this.loadBookings();
      }
    });

    // Load initial bookings
    await this.loadBookings();
  }

  private async loadBookings() {
    const list = this.querySelector('#bookings-list')!;
    list.innerHTML = '<p class="text-text-muted text-sm py-8 text-center">Загрузка заявок...</p>';

    try {
      const url = `/bookings?page=${this.currentPage}&perPage=20` +
        (this.currentStatus ? `&status=${this.currentStatus}` : '') +
        (this.currentQuestId ? `&questId=${this.currentQuestId}` : '') +
        (this.currentSearch ? `&search=${encodeURIComponent(this.currentSearch)}` : '');

      const response = await api.get<{ data: Booking[], meta: { total: number } } | any>(url);
      
      // Fastify might return the unwrapped object or list
      let bookingsList: Booking[] = [];
      let totalCount = 0;

      if (response && Array.isArray(response)) {
        bookingsList = response;
        totalCount = response.length;
      } else if (response && Array.isArray(response.data)) {
        bookingsList = response.data;
        totalCount = response.meta?.total ?? response.data.length;
      }

      this.bookings = bookingsList;
      this.totalBookings = totalCount;

      const prevBtn = this.querySelector('#prev-btn') as HTMLButtonElement;
      const nextBtn = this.querySelector('#next-btn') as HTMLButtonElement;
      const infoEl = this.querySelector('#pagination-info')!;

      prevBtn.disabled = this.currentPage === 1;
      nextBtn.disabled = this.currentPage * 20 >= this.totalBookings;
      
      const start = (this.currentPage - 1) * 20 + 1;
      const end = Math.min(this.currentPage * 20, this.totalBookings);
      infoEl.textContent = this.totalBookings > 0 ? `Показано ${start}–${end} из ${this.totalBookings}` : 'Показано 0 из 0';

      if (this.bookings.length === 0) {
        list.innerHTML = '<p class="text-text-muted text-sm py-8 text-center">Заявки не найдены</p>';
        return;
      }

      list.innerHTML = '';
      
      const table = div({ class: 'overflow-x-auto bg-bg-card border border-border-subtle rounded-card' });
      const tableEl = el('table', { class: 'w-full text-left border-collapse text-sm' });
      tableEl.innerHTML = `
        <thead>
          <tr class="border-b border-border-subtle text-text-muted bg-bg-elevated/50">
            <th class="p-4 font-semibold">Билет / Квест</th>
            <th class="p-4 font-semibold">Дата / Время</th>
            <th class="p-4 font-semibold">Клиент</th>
            <th class="p-4 font-semibold">Игроки / Цена</th>
            <th class="p-4 font-semibold">Статус</th>
            <th class="p-4 font-semibold text-right">Действия</th>
          </tr>
        </thead>
        <tbody id="bookings-tbody"></tbody>
      `;
      
      const tbody = tableEl.querySelector('#bookings-tbody')!;
      
      for (const b of this.bookings) {
        const tr = el('tr', { class: 'border-b border-border-subtle/50 hover:bg-bg-elevated/20 transition-colors' });
        
        const questName = b.quest?.name || b.package?.name || 'Одиночный квест';
        const dateStr = new Date(b.date).toLocaleDateString('ru');
        
        const td1 = el('td', { class: 'p-4' });
        const ticketDiv = el('div', { class: 'font-bold text-white' }, b.ticketNumber);
        const questDiv = el('div', { class: 'text-text-muted text-xs mt-0.5' }, questName);
        td1.append(ticketDiv, questDiv);

        const td2 = el('td', { class: 'p-4' });
        const dateDiv = el('div', {}, dateStr);
        const timeDiv = el('div', { class: 'text-text-muted text-xs mt-0.5' }, b.time || '—');
        td2.append(dateDiv, timeDiv);

        const td3 = el('td', { class: 'p-4' });
        const clientNameDiv = el('div', { class: 'font-semibold' }, `${b.firstName} ${b.lastName}`);
        const clientPhoneDiv = el('div', { class: 'text-text-muted text-xs mt-0.5' }, b.phone);
        td3.append(clientNameDiv, clientPhoneDiv);

        const td4 = el('td', { class: 'p-4' });
        const playersDiv = el('div', {}, `${b.players} чел.`);
        const priceDiv = el('div', { class: 'text-accent-purple text-xs font-semibold mt-0.5' }, `${b.price.toLocaleString()} грн`);
        td4.append(playersDiv, priceDiv);

        const td5 = el('td', { class: 'p-4' });
        let badgeClass = 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
        let badgeText: string = b.status;
        if (b.status === 'PENDING') {
          badgeClass = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
          badgeText = 'Ожидает';
        } else if (b.status === 'CONFIRMED') {
          badgeClass = 'bg-green-500/10 text-green-500 border border-green-500/20';
          badgeText = 'Подтвержден';
        } else if (b.status === 'CANCELLED') {
          badgeClass = 'bg-red-500/10 text-red-500 border border-red-500/20';
          badgeText = 'Отменен';
        } else if (b.status === 'COMPLETED') {
          badgeClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
          badgeText = 'Выполнен';
        }
        const badgeSpan = el('span', { class: `px-2.5 py-1 text-xs font-semibold rounded-full ${badgeClass}` }, badgeText);
        td5.appendChild(badgeSpan);

        const td6 = el('td', { class: 'p-4 text-right space-x-2' });
        if (b.status === 'PENDING') {
          const confirmBtn = el('button', { class: 'bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors action-btn', 'data-action': 'confirm', 'data-id': b.id }, 'OK');
          confirmBtn.addEventListener('click', async () => {
            await api.patch(`/bookings/${b.id}/status`, { status: 'CONFIRMED' });
            this.loadBookings();
          });
          const cancelBtn = el('button', { class: 'bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors action-btn', 'data-action': 'cancel', 'data-id': b.id }, 'X');
          cancelBtn.addEventListener('click', async () => {
            await api.patch(`/bookings/${b.id}/status`, { status: 'CANCELLED' });
            this.loadBookings();
          });
          td6.append(confirmBtn, cancelBtn);
        }
        const editBtn = el('button', { class: 'bg-bg-elevated hover:bg-border-subtle border border-border-subtle text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors action-btn', 'data-action': 'edit', 'data-id': b.id }, 'Изменить');
        editBtn.addEventListener('click', () => {
          this.showEditModal(b);
        });
        td6.appendChild(editBtn);

        tr.append(td1, td2, td3, td4, td5, td6);
        tbody.appendChild(tr);
      }
      
      table.appendChild(tableEl);
      list.appendChild(table);

    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="text-red-400 text-sm py-8 text-center">Ошибка при загрузке заявок</p>';
    }
  }

  private showEditModal(b: Booking) {
    const modal = div({ class: 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4' });
    
    const formattedDate = new Date(b.date).toISOString().slice(0, 10);

    modal.innerHTML = `
      <div class="bg-bg-card border border-border-subtle rounded-card p-6 w-full max-w-lg text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold">Редактирование заявки ${b.ticketNumber}</h3>
        <form id="edit-booking-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Имя</label>
              <input type="text" name="firstName" value="${b.firstName}" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Фамилия</label>
              <input type="text" name="lastName" value="${b.lastName}" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Телефон</label>
              <input type="text" name="phone" value="${b.phone}" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Email</label>
              <input type="email" name="email" value="${b.email || ''}" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Дата</label>
              <input type="date" name="date" value="${formattedDate}" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Время</label>
              <input type="text" name="time" value="${b.time || ''}" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Статус</label>
              <select name="status" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
                <option value="PENDING" ${b.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
                <option value="CONFIRMED" ${b.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
                <option value="CANCELLED" ${b.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                <option value="COMPLETED" ${b.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                <option value="ARCHIVED" ${b.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Игроки</label>
              <input type="number" name="players" value="${b.players}" min="1" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-muted">Цена (грн)</label>
              <input type="number" name="price" value="${b.price}" min="0" required class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors">
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-muted">Комментарий клиента</label>
            <textarea name="comment" rows="2" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors resize-none">${b.comment || ''}</textarea>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-muted">Заметки менеджера</label>
            <textarea name="managerNotes" rows="2" class="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-purple transition-colors resize-none">${b.managerNotes || ''}</textarea>
          </div>

          <div class="flex justify-between items-center pt-2">
            <button type="button" id="delete-booking-btn" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">Удалить заявку</button>
            <div class="flex gap-2">
              <button type="button" id="close-modal-btn" class="bg-bg-elevated hover:bg-border-subtle border border-border-subtle px-4 py-2 rounded-xl transition-colors text-sm">Отмена</button>
              <button type="submit" class="bg-accent-purple hover:bg-purple-600 text-white font-semibold px-6 py-2 rounded-xl transition-colors text-sm">Сохранить</button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-modal-btn')!;
    closeBtn.addEventListener('click', () => modal.remove());

    const deleteBtn = modal.querySelector('#delete-booking-btn')!;
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
        try {
          await api.delete(`/bookings/${b.id}`);
          modal.remove();
          this.loadBookings();
        } catch (e: any) {
          alert(e.message || 'Ошибка удаления');
        }
      }
    });

    const form = modal.querySelector('#edit-booking-form')!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form as HTMLFormElement);
      const data = {
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        phone: fd.get('phone'),
        email: fd.get('email') || null,
        date: fd.get('date'),
        time: fd.get('time') || null,
        status: fd.get('status'),
        players: Number(fd.get('players')),
        price: Number(fd.get('price')),
        comment: fd.get('comment') || null,
        managerNotes: fd.get('managerNotes') || null,
      };

      try {
        await api.put(`/bookings/${b.id}`, data);
        modal.remove();
        this.loadBookings();
      } catch (e: any) {
        alert(e.message || 'Ошибка обновления');
      }
    });
  }
}

customElements.define('vw-bookings-page', BookingsPage);
