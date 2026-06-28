import { div } from '../../utils/dom.js';
import { store } from '../../store.js';
import type { Quest } from '@veilworlds/shared';

export class QuestHero extends HTMLElement {
  private quest: Quest;

  constructor(quest: Quest) {
    super();
    this.quest = quest;
  }

  connectedCallback() {
    const isSH = this.quest.slug === 'silent-hill';
    const accent = isSH ? '#DC2626' : '#D97706';
    const gradient = isSH
      ? 'linear-gradient(to bottom, rgba(26,8,8,0.75), rgba(9,9,11,0.98))'
      : 'linear-gradient(to bottom, rgba(8,8,26,0.75), rgba(9,9,11,0.98))';

    this.className = 'block relative pt-16 select-none overflow-hidden';
    const position = isSH ? 'center right' : 'center left';
    this.style.background = `${gradient}, url(${this.quest.heroImage}) ${position}/cover no-repeat`;
    this.style.minHeight = '70dvh';

    const glow = div({ class: 'pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl' });
    glow.style.background = `radial-gradient(circle, ${accent}, transparent)`;

    const content = div({ class: 'relative max-w-4xl mx-auto px-6 md:px-12 pt-24 pb-16 flex flex-col justify-end min-h-[70dvh] z-10' });

    const btnBg = isSH ? 'bg-accent-red hover:bg-red-700' : 'bg-accent-amber hover:bg-amber-600';
    const glowClass = isSH ? 'glow-red' : 'glow-amber';

    content.innerHTML = `
      <p class="animate-fade-in text-xs font-mono tracking-[0.2em] text-text-muted mb-3 uppercase">${this.quest.genre} · ${this.quest.hasActor ? 'З АКТОРОМ' : 'СІМЕЙНИЙ'}</p>
      <h1 class="text-4xl md:text-6xl lg:text-7xl font-black mb-3 tracking-tight text-white text-glow">${this.quest.name}</h1>
      <p class="text-text-secondary text-lg md:text-xl mb-8 italic max-w-2xl">«${this.quest.tagline}»</p>
      <div class="flex flex-wrap gap-3 text-sm font-mono text-text-secondary mb-8">
        <span class="flex items-center gap-2 bg-white/[0.03] backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl"><i class="ph ph-user-focus text-text-muted"></i> <span class="text-white font-bold">${this.quest.ageMin}+</span> років</span>
        <span class="flex items-center gap-2 bg-white/[0.03] backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl"><i class="ph ph-users text-text-muted"></i> <span class="text-white font-bold">${this.quest.minPlayers}-${this.quest.maxPlayers}</span> гравців</span>
        <span class="flex items-center gap-2 bg-white/[0.03] backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl"><i class="ph ph-clock text-text-muted"></i> <span class="text-white font-bold">${this.quest.duration}</span> хв</span>
        ${this.quest.hasActor ? `<span class="flex items-center gap-2 bg-accent-red/10 border border-accent-red/20 px-3 py-1.5 rounded-xl text-accent-red"><i class="ph ph-mask-happy text-base"></i> Актор</span>` : ''}
        <span class="flex items-center gap-2 bg-white/[0.03] backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl"><i class="ph ph-map-pin text-text-muted"></i> <span class="text-white font-bold">вул. Короленко, 14</span></span>
        <span class="flex items-center gap-2 bg-white/[0.03] backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl"><i class="ph ph-coin text-text-muted"></i> <span class="text-white font-bold">Від 2 500 грн</span></span>
      </div>
      <button class="book-quest-btn inline-flex items-center gap-2 ${btnBg} ${glowClass} text-white font-semibold px-8 py-4 rounded-xl active:scale-95 hover:scale-[1.02] transition-all duration-300 self-start shadow-xl shadow-black/50">
        <i class="ph ph-calendar-plus text-lg"></i> Забронювати
      </button>
    `;

    this.append(glow, content);

    const btn = this.querySelector('.book-quest-btn')!;
    btn.addEventListener('click', () => {
      store.set('bookingOverlay', { open: true, questSlug: this.quest.slug });
    });
  }
}

customElements.define('vw-quest-hero', QuestHero);
