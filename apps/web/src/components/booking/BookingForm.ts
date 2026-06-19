import { div, el } from '../../utils/dom.js';
import { applyPhoneMask } from '../../utils/phoneMask.js';
import { calcQuestPrice, calcPackagePrice } from '../../utils/priceCalc.js';
import { createBooking } from '../../api/bookings.js';
import { api } from '../../api/client.js';
import { formatPrice, formatDate } from '../../utils/formatters.js';
import { trackEvent } from '../../utils/analytics.js';
import type { Package } from '@veilworlds/shared';

interface BookingFormProps {
  questSlug: string | null;
  packageSlug: string | null;
  date: string;
  time: string;
  onSubmit: (players: number, price: number, booking?: any) => void;
}

export class BookingForm extends HTMLElement {
  private props: BookingFormProps;
  private players = 4;
  private withActor = false;
  private price = 2500;
  private selectedPackage: Package | null = null;
  private formEl!: HTMLFormElement;
  private questMin = 1;
  private questMax = 20;

  constructor(props: BookingFormProps) {
    super();
    this.props = props;
  }

  async connectedCallback() {
    this.className = 'flex flex-col gap-5 py-2 select-none';

    // Load package info
    if (this.props.packageSlug) {
      try {
        const pkgs = await api.get<Package[]>('/packages');
        this.selectedPackage = pkgs.find(p => p.slug === this.props.packageSlug) || null;
        if (this.selectedPackage) {
          this.players = this.selectedPackage.basePlayers;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load quest limits for min/max enforcement
    if (this.props.questSlug && !this.props.packageSlug) {
      try {
        const { fetchQuests } = await import('../../api/quests.js');
        const quests = await fetchQuests();
        const q = quests.find((x: any) => x.slug === this.props.questSlug);
        if (q) {
          this.questMin = q.minPlayers;
          this.questMax = q.maxPlayers;
          if (this.players > q.maxPlayers) this.players = q.maxPlayers;
          if (this.players < q.minPlayers) this.players = q.minPlayers;
        }
      } catch (e) { console.error(e); }
    }

    this.recalc();

    const subtitleText = this.props.time === 'Час обговорюється' 
      ? `${formatDate(this.props.date)} · ${this.props.time}`
      : `${formatDate(this.props.date)} о ${this.props.time}`;

    this.innerHTML = `
      <h2 class="text-xl font-bold">Ваші дані</h2>
      <p class="text-text-secondary text-sm font-mono">${subtitleText}</p>
    `;

    this.formEl = el('form', { class: 'space-y-4', novalidate: 'true' }) as HTMLFormElement;

    const fields = [
      { label: 'Імʼя', name: 'firstName', type: 'text', required: true, autocomplete: 'given-name' },
      { label: 'Прізвище', name: 'lastName', type: 'text', required: true, autocomplete: 'family-name' },
      { label: 'Телефон', name: 'phone', type: 'tel', required: true, autocomplete: 'tel' },
      { label: 'Email (необовʼязково)', name: 'email', type: 'email', required: false, autocomplete: 'email' },
    ];

    for (const f of fields) {
      const grp = div({ class: 'flex flex-col gap-1.5' });
      grp.innerHTML = `<label class="text-sm font-medium text-text-secondary">${f.label}</label>`;
      const attrs: Record<string, string> = {
        type: f.type, name: f.name,
        autocomplete: f.autocomplete,
        class: 'bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none transition-colors w-full',
        placeholder: f.label,
      };
      if (f.required) attrs.required = 'true';
      const inp = el('input', attrs) as HTMLInputElement;

      // Realtime validation visual states
      inp.addEventListener('blur', () => {
        inp.dataset.touched = 'true';
        this.validateInput(inp);
        this.checkLoudValidation();
      });

      inp.addEventListener('input', () => {
        if (inp.dataset.touched === 'true') {
          this.validateInput(inp);
        }
        this.checkLoudValidation();
      });

      if (f.name === 'phone') {
        applyPhoneMask(inp);
        // iOS focus lock: force selection position after prefix
        inp.addEventListener('focus', () => {
          setTimeout(() => {
            const val = inp.value;
            inp.setSelectionRange(val.length, val.length);
          }, 50);
        });
      }

      grp.appendChild(inp);
      
      const errSpan = el('span', { class: 'text-red-400 text-xs mt-1 hidden transition-all' });
      grp.appendChild(errSpan);

      this.formEl.appendChild(grp);
    }

    // Players selector
    const playersGrp = div({ class: 'flex flex-col gap-1.5' });
    playersGrp.innerHTML = '<label class="text-sm font-medium text-text-secondary">Кількість гравців</label>';
    const playersRow = div({ class: 'flex items-center gap-3' });
    const minus = el('button', { type: 'button', class: 'w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 active:scale-90 transition-all text-white text-lg font-mono flex items-center justify-center' }, '−');
    const countEl = el('span', { class: 'text-lg font-bold font-mono w-8 text-center' }, String(this.players));
    const plus = el('button', { type: 'button', class: 'w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 active:scale-90 transition-all text-white text-lg font-mono flex items-center justify-center' }, '+');
    playersRow.append(minus, countEl, plus);
    playersGrp.appendChild(playersRow);
    this.formEl.appendChild(playersGrp);

    minus.addEventListener('click', () => {
      const min = this.selectedPackage ? 1 : this.questMin;
      if (this.players > min) {
        this.players--;
        countEl.textContent = String(this.players);
        this.recalc();
      }
    });

    plus.addEventListener('click', () => {
      const max = this.selectedPackage ? this.selectedPackage.maxPlayers : this.questMax;
      if (this.players < max) {
        this.players++;
        countEl.textContent = String(this.players);
        this.recalc();
      }
    });

    // Harry Potter option actor checkbox
    if (this.props.questSlug === 'harry-potter') {
      const actorGrp = div({ class: 'flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4' });
      actorGrp.innerHTML = `
        <input type="checkbox" id="with-actor" class="w-5 h-5 accent-accent-amber cursor-pointer">
        <label for="with-actor" class="text-sm text-text-secondary cursor-pointer select-none">З актором (+500 грн, також рекомендовано для дітей до 12 р.)</label>
      `;
      actorGrp.querySelector('input')!.addEventListener('change', (e) => {
        this.withActor = (e.target as HTMLInputElement).checked;
        this.recalc();
      });
      this.formEl.appendChild(actorGrp);
    }

    // Comment field
    const commentGrp = div({ class: 'flex flex-col gap-1.5' });
    commentGrp.innerHTML = '<label class="text-sm font-medium text-text-secondary">Коментар (необовʼязково)</label>';
    const ta = el('textarea', {
      name: 'comment', rows: '3',
      class: 'bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none transition-colors resize-none w-full',
      placeholder: 'Побажання щодо рівня страху, вік дітей тощо',
    });
    commentGrp.appendChild(ta);
    this.formEl.appendChild(commentGrp);

    // Upsell Block (Maia or Lounge room info)
    const upsellBlock = div({ class: 'bg-gradient-to-r from-accent-amber/5 to-transparent border border-accent-amber/20 rounded-card p-4 relative overflow-hidden my-4' });
    upsellBlock.innerHTML = `
      <div class="relative z-10 flex gap-3">
        <span class="text-2xl mt-0.5">🛋️</span>
        <div>
          <h4 class="font-bold text-sm text-white">Бажаєте зону відпочинку або Мафію?</h4>
          <p class="text-xs text-text-secondary mt-1">Окрему кімнату та ведучого гри можна замовити під час підтверджуючого дзвінка з менеджером.</p>
        </div>
      </div>
      <div class="absolute -right-8 -bottom-8 w-24 h-24 bg-accent-amber/5 rounded-full blur-xl pointer-events-none"></div>
    `;
    this.formEl.appendChild(upsellBlock);

    // Summary block
    const summary = div({ id: 'price-summary', class: 'bg-white/[0.02] border border-white/[0.06] rounded-card p-4' });
    this.updateSummary(summary);
    this.formEl.appendChild(summary);

    // Submit button
    const submit = el('button', {
      type: 'submit',
      class: 'w-full text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg',
    }) as HTMLButtonElement;
    this.formEl.appendChild(submit);

    const errEl = div({ class: 'hidden text-red-400 text-sm text-center font-semibold' });
    this.formEl.appendChild(errEl);

    // Set accent focus class
    const isSH = this.props.questSlug === 'silent-hill' || (this.props.packageSlug && this.props.packageSlug.includes('mystic'));
    const focusClass = isSH ? 'focus:border-accent-red' : 'focus:border-accent-amber';
    this.formEl.querySelectorAll('input, textarea').forEach(el => {
      el.classList.add(focusClass);
    });

    this.checkLoudValidation();

    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Touch all fields to trigger validation visuals
      const inputs = this.formEl.querySelectorAll('input[required]');
      let isFormValid = true;
      inputs.forEach((inp: any) => {
        inp.dataset.touched = 'true';
        if (!this.validateInput(inp)) {
          isFormValid = false;
        }
      });

      this.checkLoudValidation();

      if (!isFormValid) {
        return;
      }

      const fd = new FormData(this.formEl);
      const data: any = {
        questId: null, packageId: null,
        date: this.props.date,
        time: this.props.time,
        players: this.players,
        withActor: this.withActor,
        price: this.price,
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        phone: fd.get('phone'),
        email: fd.get('email') || null,
        comment: fd.get('comment') || null,
      };

      if (this.props.questSlug) {
        try {
          const quests = await (await import('../../api/quests.js')).fetchQuests();
          const q = quests.find((x: any) => x.slug === this.props.questSlug);
          if (q) data.questId = q.id;
        } catch {}
      }

      if (this.props.packageSlug) {
        try {
          const pkgs = await api.get<Package[]>('/packages');
          const p = pkgs.find((x: any) => x.slug === this.props.packageSlug);
          if (p) data.packageId = p.id;
        } catch {}
      }

      try {
        submit.disabled = true;
        submit.textContent = 'Бронюємо...';
        const booking = await createBooking(data);
        trackEvent('booking_complete');
        this.props.onSubmit(this.players, this.price, booking);
      } catch (err: any) {
        errEl.classList.remove('hidden');
        errEl.textContent = err.message || 'Помилка бронювання';
        submit.disabled = false;
        this.checkLoudValidation();
      }
    });

    this.appendChild(this.formEl);
  }

  private validateInput(inp: HTMLInputElement): boolean {
    const grp = inp.parentElement!;
    const errSpan = grp.querySelector('span')!;
    let isValid = true;
    let errMsg = '';

    if (inp.required && !inp.value.trim()) {
      isValid = false;
      errMsg = 'Це поле є обовʼязковим';
    } else if (inp.type === 'email' && inp.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)) {
      isValid = false;
      errMsg = 'Невірний формат email';
    } else if (inp.name === 'phone') {
      const phoneRegex = /^\+380\s?\(\d{2}\)\s?\d{3}-\d{2}-\d{2}$/;
      if (!phoneRegex.test(inp.value)) {
        isValid = false;
        errMsg = 'Телефон має бути у форматі +380 (XX) XXX-XX-XX';
      }
    }

    if (isValid) {
      inp.className = inp.className.replace(/border-red-500\/50/g, '').replace(/border-white\/10/g, '');
      if (!inp.className.includes('border-green-500/50')) inp.classList.add('border-green-500/50');
      errSpan.classList.add('hidden');
    } else {
      inp.className = inp.className.replace(/border-green-500\/50/g, '').replace(/border-white\/10/g, '');
      if (!inp.className.includes('border-red-500/50')) inp.classList.add('border-red-500/50');
      errSpan.textContent = errMsg;
      errSpan.classList.remove('hidden');
    }

    return isValid;
  }

  private checkLoudValidation() {
    const submitBtn = this.formEl?.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (!submitBtn) return;

    const inputs = this.formEl.querySelectorAll('input[required]');
    let hasErrors = false;

    inputs.forEach((inp: any) => {
      // If field is empty or has mismatched phone format
      if (!inp.value.trim()) {
        hasErrors = true;
      }
      if (inp.name === 'phone') {
        const phoneRegex = /^\+380\s?\(\d{2}\)\s?\d{3}-\d{2}-\d{2}$/;
        if (!phoneRegex.test(inp.value)) {
          hasErrors = true;
        }
      }
    });

    const isSH = this.props.questSlug === 'silent-hill' || (this.props.packageSlug && this.props.packageSlug.includes('mystic'));
    const accentClass = isSH ? 'bg-accent-red hover:bg-red-700' : 'bg-accent-amber hover:bg-amber-600';

    if (hasErrors) {
      submitBtn.className = 'w-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-3.5 rounded-xl transition-all cursor-pointer text-sm tracking-wider uppercase';
      submitBtn.textContent = 'ЗАПОВНІТЬ ОБОВʼЯЗКОВІ ПОЛЯ';
    } else {
      submitBtn.className = `w-full ${accentClass} text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 cursor-pointer text-sm tracking-wider uppercase shadow-lg`;
      submitBtn.textContent = 'Підтвердити бронювання';
    }
  }

  private recalc() {
    if (this.props.questSlug) {
      this.price = calcQuestPrice({
        questSlug: this.props.questSlug as 'silent-hill' | 'harry-potter',
        players: this.players,
        time: this.props.time,
        withActor: this.withActor,
      });
    } else if (this.selectedPackage) {
      this.price = calcPackagePrice({
        basePrice: this.selectedPackage.basePrice,
        basePlayers: this.selectedPackage.basePlayers,
        pricePerExtra: this.selectedPackage.pricePerExtra,
        players: this.players,
      });
    }
    const s = this.querySelector('#price-summary');
    if (s) this.updateSummary(s as HTMLElement);
  }

  private updateSummary(el: HTMLElement) {
    const baseP = this.selectedPackage ? this.selectedPackage.basePlayers : 4;
    el.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-text-secondary text-sm">Разом</span>
        <span class="text-2xl font-mono font-bold text-white">${formatPrice(this.price)}</span>
      </div>
      ${this.players > baseP ? `<p class="text-text-muted text-xs font-mono mt-1 flex items-center gap-1"><i class="ph ph-info"></i> Включно доплата за ${this.players - baseP} дод. гравців</p>` : ''}
    `;
  }
}

customElements.define('vw-booking-form', BookingForm);
