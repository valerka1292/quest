import { div, el } from '../../utils/dom.js';
import { store } from '../../store.js';
import { trackEvent } from '../../utils/analytics.js';
import { StepIndicator } from './StepIndicator.js';
import { PackageSelector } from './PackageSelector.js';
import { CalendarStep } from './CalendarStep.js';
import { BookingForm } from './BookingForm.js';
import { ConfirmTicket } from './ConfirmTicket.js';

export class BookingOverlay extends HTMLElement {
  private step = 0;
  private questSlug: string | null = null;
  private packageSlug: string | null = null;
  private selectedDate = '';
  private selectedTime = '';
  private players = 4;
  private price = 2500;
  private externalBookingSuccess = false;

  connectedCallback() {
    this.className = 'hidden fixed inset-0 z-[100]';
    this.render();

    store.subscribe('bookingOverlay', (state) => {
      const ov = state.bookingOverlay;
      if (ov?.open) {
        this.questSlug = ov.questSlug || null;
        this.packageSlug = ov.packageSlug || null;
        this.step = ov.questSlug || ov.packageSlug ? 1 : 0;
        this.open();
      }
    });
  }

  private open() {
    this.classList.remove('hidden');
    trackEvent('booking_start');
    this.renderContent();
  }

  close() {
    if (this.step > 0 && this.step < 3) trackEvent('booking_abandoned');
    this.classList.add('hidden');
    store.set('bookingOverlay', null);
  }

  private render() {
    this.innerHTML = `
      <div class="absolute inset-0 bg-black/70 backdrop-blur-md" id="ov-backdrop"></div>
      <div class="relative z-10 h-full flex flex-col bg-bg-base/95 backdrop-blur-lg border-l border-white/10 md:max-w-lg md:ml-auto">
        <div class="flex items-center justify-between p-4 border-b border-border-subtle bg-white/[0.01]">
          <span class="font-bold tracking-tight">Бронювання</span>
          <button id="ov-close" class="text-text-muted hover:text-white flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all">
            <i class="ph ph-x text-lg"></i>
          </button>
        </div>
        <div id="ov-steps" class="px-4 py-3 border-b border-border-subtle"></div>
        <div id="ov-content" class="flex-1 overflow-y-auto p-4"></div>
      </div>
    `;

    this.querySelector('#ov-backdrop')!.addEventListener('click', () => this.close());
    this.querySelector('#ov-close')!.addEventListener('click', () => this.close());
  }

  private renderContent() {
    const stepsEl = this.querySelector('#ov-steps')!;
    const contentEl = this.querySelector('#ov-content')!;

    const stepIndicator = new StepIndicator(this.step, this.packageSlug ? 3 : 3);
    stepsEl.innerHTML = '';
    stepsEl.appendChild(stepIndicator);

    contentEl.innerHTML = '';

    if (this.step === 0) {
      const selector = new PackageSelector((type, slug) => {
        if (type === 'quest') this.questSlug = slug;
        else this.packageSlug = slug;
        this.step = 1;
        this.renderContent();
      });
      contentEl.appendChild(selector);
      return;
    }

    if (this.step === 1) {
      const cal = new CalendarStep({
        questSlug: this.questSlug,
        packageSlug: this.packageSlug,
        onSelect: (date, time) => {
          this.selectedDate = date;
          this.selectedTime = time;
          this.step = 2;
          trackEvent('booking_step1_complete');
          this.renderContent();
        },
      });
      contentEl.appendChild(cal);
      return;
    }

    if (this.step === 2) {
      const form = new BookingForm({
        questSlug: this.questSlug,
        packageSlug: this.packageSlug,
        date: this.selectedDate,
        time: this.selectedTime,
        onSubmit: (players, price, booking) => {
          this.players = players;
          this.price = price;
          this.externalBookingSuccess = booking?.externalBookingSuccess ?? false;
          this.step = 3;
          trackEvent('booking_step2_complete');
          this.renderContent();
        },
      });
      contentEl.appendChild(form);
      return;
    }

    if (this.step === 3) {
      const confirm = new ConfirmTicket({
        questSlug: this.questSlug,
        packageSlug: this.packageSlug,
        date: this.selectedDate,
        time: this.selectedTime,
        players: this.players,
        price: this.price,
        externalBookingSuccess: this.externalBookingSuccess,
        onDone: () => this.close(),
      });
      contentEl.appendChild(confirm);
    }
  }
}

customElements.define('vw-booking-overlay', BookingOverlay);
