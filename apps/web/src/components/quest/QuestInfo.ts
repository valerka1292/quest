import { div } from '../../utils/dom.js';
import type { Quest } from '@veilworlds/shared';

export class QuestInfo extends HTMLElement {
  private quest: Quest;

  constructor(quest: Quest) {
    super();
    this.quest = quest;
  }

  connectedCallback() {
    this.className = 'block max-w-4xl mx-auto px-6 md:px-4 py-16';

    const isSH = this.quest.slug === 'silent-hill';
    const accentRing = isSH ? 'ring-accent-red/20' : 'ring-accent-amber/20';
    const accentLine = isSH ? 'bg-accent-red' : 'bg-accent-amber';

    this.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div class="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-card p-6 md:p-8 ring-1 ${accentRing}">
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1 h-6 ${accentLine} rounded-full"></span>
            <h2 class="text-xl md:text-2xl font-bold">Опис</h2>
          </div>
          <p class="text-text-secondary leading-relaxed">${this.quest.description}</p>
        </div>
        <div class="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-card p-6 md:p-8 ring-1 ${accentRing}">
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1 h-6 ${accentLine} rounded-full"></span>
            <h2 class="text-xl md:text-2xl font-bold">Сюжет</h2>
          </div>
          <p class="text-text-secondary leading-relaxed">${this.quest.plotSummary}</p>
        </div>
      </div>
      <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-5 md:p-6 bg-gradient-to-r from-white/[0.02] to-transparent backdrop-blur-sm border border-white/[0.06] rounded-card ring-1 ${accentRing} flex items-center gap-4">
          <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center text-lg">
            <i class="ph ph-map-pin text-accent-amber"></i>
          </span>
          <div>
            <h3 class="font-semibold text-sm text-text-secondary mb-0.5">Адреса</h3>
            <a href="https://maps.app.goo.gl/u5u4hQ2pi6rCc7mg6?g_st=atm" target="_blank" rel="noopener noreferrer" class="text-white hover:text-accent-amber underline-offset-2 underline transition-colors">
              м. Дніпро, вул. Короленко, 14
            </a>
          </div>
        </div>
        <div class="p-5 md:p-6 bg-gradient-to-r from-white/[0.02] to-transparent backdrop-blur-sm border border-white/[0.06] rounded-card ring-1 ${accentRing} flex items-center gap-4">
          <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center text-lg">
            <i class="ph ph-phone text-accent-amber"></i>
          </span>
          <div>
            <h3 class="font-semibold text-sm text-text-secondary mb-0.5">Телефон</h3>
            <a href="tel:+380999773349" class="text-white hover:text-accent-amber underline-offset-2 underline transition-colors">
              +38 (099) 977-33-49
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('vw-quest-info', QuestInfo);
