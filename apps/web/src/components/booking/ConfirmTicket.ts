import { div, el } from '../../utils/dom.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';

interface ConfirmTicketProps {
  questSlug: string | null;
  packageSlug: string | null;
  date: string;
  time: string;
  players: number;
  price: number;
  externalBookingSuccess?: boolean;
  onDone: () => void;
}

export class ConfirmTicket extends HTMLElement {
  private props: ConfirmTicketProps;

  constructor(props: ConfirmTicketProps) {
    super();
    this.props = props;
  }

  connectedCallback() {
    this.className = 'flex flex-col items-center gap-6 py-6 text-center select-none';

    if (this.props.externalBookingSuccess && typeof gtag_report_conversion === 'function') {
      gtag_report_conversion();
    }

    const check = div({ class: 'w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center' });
    check.innerHTML = '<i class="ph ph-check text-2xl text-green-400"></i>';

    const title = el('h2', { class: 'text-2xl font-black tracking-tight text-white' }, 'Заявку прийнято!');

    const isSH = this.props.questSlug === 'silent-hill' || (this.props.packageSlug && this.props.packageSlug.includes('mystic'));
    const accentClass = isSH ? 'bg-accent-red hover:bg-red-700' : 'bg-accent-amber hover:bg-amber-600';
    const borderAccent = isSH ? 'border-accent-red/20' : 'border-accent-amber/20';

    const card = div({ class: `bg-white/[0.02] border border-white/[0.06] rounded-card p-6 w-full max-w-sm mx-auto shadow-2xl relative overflow-hidden ${borderAccent}` });
    const ticketNum = `VW-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    card.innerHTML = `
      <p class="text-text-muted text-xs font-mono tracking-widest mb-1">КВИТОК БРОНЮВАННЯ</p>
      <p class="text-lg font-mono font-bold tracking-wider text-white mb-4">${ticketNum}</p>
      <div class="border-t border-dashed border-white/10 my-4"></div>
      <div class="space-y-3 text-sm text-left">
        <div class="flex justify-between"><span class="text-text-muted">Квест / Пакет</span><span class="text-white font-semibold">${this.props.questSlug ? (isSH ? 'Silent Hill' : 'Гаррі Поттер') : 'Пакет для події'}</span></div>
        <div class="flex justify-between"><span class="text-text-muted">Дата</span><span class="text-white font-mono">${formatDate(this.props.date)}</span></div>
        <div class="flex justify-between"><span class="text-text-muted">Час</span><span class="text-white font-mono">${this.props.time}</span></div>
        <div class="flex justify-between"><span class="text-text-muted">Гравців</span><span class="text-white font-mono">${this.props.players}</span></div>
        <div class="flex justify-between"><span class="text-text-muted">Сума</span><span class="text-white font-mono font-bold">${formatPrice(this.props.price)}</span></div>
      </div>
      <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#09090b] border-r border-white/[0.06]"></div>
      <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#09090b] border-l border-white/[0.06]"></div>
    `;

    const note = el('p', { class: 'text-text-secondary text-sm max-w-xs' }, 'Очікуйте дзвінка менеджера протягом 30 хвилин для підтвердження детальних деталей.');

    const btn = el('button', {
      class: `text-white font-semibold px-8 py-3.5 rounded-xl transition-all active:scale-95 shadow-lg ${accentClass}`,
    }, 'Зрозуміло');
    btn.addEventListener('click', () => this.props.onDone());

    this.append(check, title, card, note, btn);
  }
}

customElements.define('vw-confirm-ticket', ConfirmTicket);
