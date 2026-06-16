import { div, el } from '../../utils/dom.js';
import { api } from '../../api/client.js';
import { formatPrice, getMonthKey, getDateKey } from '../../utils/formatters.js';
import type { TimeSlot, DayStatus } from '@veilworlds/shared';

interface CalendarStepProps {
  questSlug: string | null;
  packageSlug: string | null;
  onSelect: (date: string, time: string) => void;
}

export class CalendarStep extends HTMLElement {
  private props: CalendarStepProps;
  private currentMonth: Date;
  private selectedDate = '';
  private selectedTime = '';
  private monthStatus: Record<string, 'available' | 'partial' | 'full' | 'blocked'> = {};
  private daySlots: TimeSlot[] = [];
  private questId = '';

  constructor(props: CalendarStepProps) {
    super();
    this.props = props;
    this.currentMonth = new Date();
  }

  async connectedCallback() {
    this.className = 'flex flex-col gap-6 py-2 select-none';

    if (this.props.packageSlug) {
      this.innerHTML = `
        <h2 class="text-xl font-bold mb-1">Оберіть дату</h2>
        <p class="text-text-secondary text-sm mb-4">Час і тривалість обговорюються при дзвінку менеджеру.</p>
      `;
      this.appendChild(this.buildCalendar());
      const continueContainer = div({ id: 'continue-container', class: 'mt-6' });
      this.appendChild(continueContainer);
      return;
    }

    try {
      const quests = await api.get<any[]>('/quests');
      const q = quests.find((q: any) => q.slug === this.props.questSlug);
      if (q) this.questId = q.id;
    } catch {}

    this.innerHTML = '<h2 class="text-xl font-bold">Оберіть дату і час</h2>';
    this.appendChild(this.buildCalendar());

    const slotsContainer = div({ id: 'time-slots', class: 'hidden' });
    this.appendChild(slotsContainer);

    if (this.selectedDate) await this.loadSlots();
  }

  private getAccentClass(): string {
    const isSH = this.props.questSlug === 'silent-hill' || (this.props.packageSlug && this.props.packageSlug.includes('mystic'));
    return isSH ? 'bg-accent-red' : 'bg-accent-amber';
  }

  private getBorderClass(): string {
    const isSH = this.props.questSlug === 'silent-hill' || (this.props.packageSlug && this.props.packageSlug.includes('mystic'));
    return isSH ? 'hover:border-accent-red/50 focus:border-accent-red' : 'hover:border-accent-amber/50 focus:border-accent-amber';
  }

  private buildCalendar(): HTMLElement {
    const wrapper = div({ class: 'bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-card p-4 shadow-xl' });

    const header = div({ class: 'flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3' });
    const prevBtn = el('button', { class: 'text-text-secondary hover:text-white flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all' });
    prevBtn.innerHTML = '<i class="ph ph-caret-left text-base"></i>';
    
    const nextBtn = el('button', { class: 'text-text-secondary hover:text-white flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all' });
    nextBtn.innerHTML = '<i class="ph ph-caret-right text-base"></i>';
    
    const title = el('span', { class: 'font-bold text-sm tracking-tight capitalize' }, this.monthLabel());
    header.append(prevBtn, title, nextBtn);

    const grid = div({ class: 'grid grid-cols-7 gap-1 text-center text-xs' });
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    dayNames.forEach(d => grid.appendChild(div({ class: 'text-text-muted py-1 font-mono font-bold' }, d)));

    const today = getDateKey(new Date());
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(div({ class: 'py-2' }));
    }

    const activeColorClass = this.getAccentClass();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = this.monthStatus[dateStr] || 'available';
      const isPast = dateStr < today;
      const isSelected = dateStr === this.selectedDate;
      const isToday = dateStr === today;

      const todayBorder = isToday ? 'border border-white/30' : '';
      const cell = div({
        class: `py-3 rounded-xl aspect-square flex items-center justify-center text-sm font-semibold transition-colors relative calendar-cell ${todayBorder} ${this.cellClass(status, isPast, isSelected)}`
      }, String(d));

      if (isSelected) {
        cell.classList.add(activeColorClass, 'text-white');
      }

      // Render dot for partial status
      if (status === 'partial' && !isPast && !isSelected) {
        const dotBg = this.props.questSlug === 'silent-hill' ? 'bg-accent-red' : 'bg-accent-amber';
        const dot = div({ class: `absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dotBg}` });
        cell.appendChild(dot);
      }

      if (!isPast && status !== 'full' && status !== 'blocked') {
        cell.addEventListener('click', async () => {
          this.selectedDate = dateStr;
          this.selectedTime = '';
          this.querySelectorAll('.calendar-cell').forEach(c => {
            c.classList.remove('bg-accent-red', 'bg-accent-amber', 'text-white');
          });
          cell.classList.add(activeColorClass, 'text-white');
          
          if (this.props.packageSlug) {
            this.renderPackageContinueButton();
          } else {
            await this.loadSlots();
          }
        });
      }

      grid.appendChild(cell);
    }

    wrapper.append(header, grid);

    prevBtn.addEventListener('click', async () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      await this.loadMonthStatus();
      this.refreshCalendar();
    });

    nextBtn.addEventListener('click', async () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      await this.loadMonthStatus();
      this.refreshCalendar();
    });

    this.loadMonthStatus();
    return wrapper;
  }

  private cellClass(status: string, isPast: boolean, isSelected: boolean): string {
    if (isPast) return 'opacity-20 cursor-not-allowed';
    if (status === 'full') return 'line-through opacity-30 cursor-not-allowed';
    if (status === 'blocked') return 'line-through opacity-30 cursor-not-allowed';
    return 'cursor-pointer hover:bg-white/10';
  }

  private monthLabel(): string {
    return this.currentMonth.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  }

  private async loadMonthStatus() {
    if (!this.questId) return;
    const monthKey = getMonthKey(this.currentMonth);
    try {
      const data = await api.get<DayStatus>(`/slots/month/${this.questId}?month=${monthKey}`);
      this.monthStatus = data;
    } catch {}
  }

  private renderPackageContinueButton() {
    const container = this.querySelector('#continue-container')!;
    container.innerHTML = '';

    const accentBg = this.props.packageSlug?.includes('mystic')
      ? 'bg-accent-red hover:bg-red-700'
      : 'bg-accent-amber hover:bg-amber-600';

    const confirmBtn = el('button', {
      class: `w-full text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg ${accentBg}`,
    }, 'Продовжити');

    confirmBtn.addEventListener('click', () => {
      this.props.onSelect(this.selectedDate, 'Час обговорюється');
    });
    container.appendChild(confirmBtn);
  }

  private async loadSlots() {
    if (!this.questId || !this.selectedDate) return;
    try {
      this.daySlots = await api.get<TimeSlot[]>(`/slots/${this.questId}?date=${this.selectedDate}`);
    } catch {
      this.daySlots = [];
    }

    const container = this.querySelector('#time-slots')!;
    container.innerHTML = '';
    container.classList.remove('hidden');

    const title = el('h3', { class: 'text-sm font-semibold text-text-secondary mb-3 font-mono' }, 'Вільний час');
    container.appendChild(title);

    const grid = div({ class: 'grid grid-cols-2 md:grid-cols-4 gap-2' });

    const activeColorClass = this.getAccentClass();
    const borderAccent = this.getBorderClass();

    for (const slot of this.daySlots) {
      const isSelected = slot.time === this.selectedTime;
      const btn = el('button', {
        class: `py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 ${
          slot.available
            ? isSelected
              ? `${activeColorClass} text-white`
              : `bg-white/[0.03] border border-white/10 ${borderAccent} text-white`
            : 'opacity-25 cursor-not-allowed bg-white/[0.01] border border-white/5 text-text-muted'
        }`,
      });

      btn.innerHTML = `
        <div class="font-bold font-mono">${slot.time}</div>
        <div class="text-xs font-mono ${slot.available && !isSelected ? 'text-text-muted' : ''}">${slot.available ? formatPrice(slot.price) : 'Зайнято'}</div>
      `;

      if (slot.available) {
        btn.addEventListener('click', () => {
          this.selectedTime = slot.time;
          grid.querySelectorAll('button').forEach(b => {
            b.className = `py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 bg-white/[0.03] border border-white/10 ${borderAccent} text-white`;
          });
          btn.className = `py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 ${activeColorClass} text-white`;
          
          this.renderQuestContinueButton(container);
        });
      }

      grid.appendChild(btn);
    }

    container.appendChild(grid);
    if (this.selectedTime) {
      this.renderQuestContinueButton(container);
    }
  }

  private renderQuestContinueButton(container: Element) {
    const oldBtn = container.querySelector('.continue-booking-btn');
    if (oldBtn) oldBtn.remove();

    const accentBg = this.getAccentClass();
    const hoverBg = this.props.questSlug === 'silent-hill' ? 'hover:bg-red-700' : 'hover:bg-amber-600';

    const confirmBtn = el('button', {
      class: `continue-booking-btn mt-6 w-full ${accentBg} ${hoverBg} text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg`,
    }, 'Продовжити');

    confirmBtn.addEventListener('click', () => {
      this.props.onSelect(this.selectedDate, this.selectedTime);
    });
    container.appendChild(confirmBtn);
  }

  private refreshCalendar() {
    const old = this.querySelector('.bg-white\\/\\[0\\.02\\]')!;
    const newCal = this.buildCalendar();
    old.replaceWith(newCal);
  }
}

customElements.define('vw-calendar-step', CalendarStep);
