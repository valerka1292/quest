import { div, a } from '../../utils/dom.js';
import { fetchQuests } from '../../api/quests.js';
import { fetchReviews } from '../../api/reviews.js';
import { staticQuests } from '../../data/staticQuests.js';
import { store } from '../../store.js';
import type { Quest, Review } from '@veilworlds/shared';

export class SplitScreen extends HTMLElement {
  private quests: Quest[] = [];
  private active: 'left' | 'right' | null = null;
  private reviews: Record<string, Review | null> = {};

  async connectedCallback() {
    try {
      const [quests, shRev, hpRev] = await Promise.all([
        fetchQuests(),
        fetchReviews('silent-hill').catch(() => [] as Review[]),
        fetchReviews('harry-potter').catch(() => [] as Review[]),
      ]);
      this.quests = quests;
      this.reviews['silent-hill'] = shRev[0] || null;
      this.reviews['harry-potter'] = hpRev[0] || null;
    } catch {
      this.quests = staticQuests;
    }

    this.render();
  }

  private render() {
    this.className = 'flex h-dvh overflow-hidden';
    this.innerHTML = '';

    const sh = this.quests.find(q => q.slug === 'silent-hill') || staticQuests[0];
    const hp = this.quests.find(q => q.slug === 'harry-potter') || staticQuests[1];

    const left = this.makePane(sh, 'left');
    const right = this.makePane(hp, 'right');

    this.append(left, right);
    this.updateSizes();
  }

  private makePane(quest: Quest, side: 'left' | 'right'): HTMLDivElement {
    const pane = div({ class: 'relative flex-1 flex flex-col justify-end p-8 pb-12 cursor-pointer transition-[flex] duration-500 ease-in-out overflow-hidden' });

    const isSH = quest.slug === 'silent-hill';
    const gradient = isSH
      ? 'linear-gradient(to bottom, rgba(26,8,8,0.85), rgba(13,13,26,0.6))'
      : 'linear-gradient(to bottom, rgba(8,8,26,0.85), rgba(13,13,26,0.6))';

    const position = isSH ? 'right center' : 'left center';
    pane.style.background = `${gradient}, url(${quest.heroImage}) ${position}/cover no-repeat`;

    const stars = Math.round(quest.rating);
    const ratingHtml = `
      <div class="absolute top-6 ${side === 'left' ? 'left-6' : 'right-6'} flex items-center gap-2 text-sm font-mono bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 select-none">
        <span class="flex gap-0.5 text-yellow-400 text-xs">
          ${'<i class="ph-fill ph-star"></i>'.repeat(stars)}${'<i class="ph ph-star text-white/20"></i>'.repeat(5 - stars)}
        </span>
        <span class="text-text-muted">· ${quest.reviewCount} відгуків</span>
        <span class="relative flex h-2 w-2 ml-1">
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span class="text-green-400 text-xs font-semibold">є слоти</span>
      </div>
    `;

    const accentBorder = isSH ? 'hover:border-accent-red/60 hover:bg-accent-red/10' : 'hover:border-accent-amber/60 hover:bg-accent-amber/10';
    const accentText = isSH ? 'group-hover:text-accent-red' : 'group-hover:text-accent-amber';

    const rev = this.reviews[quest.slug as keyof typeof this.reviews];
    const revStars = rev ? Math.round(rev.rating) : 0;
    const reviewHtml = rev ? `
      <div class="mt-3 mb-4 flex items-start gap-2.5 text-xs border-l-2 border-white/10 pl-3 leading-relaxed">
        <div>
          <div class="flex gap-0.5 text-yellow-400 mb-1">
            ${'<i class="ph-fill ph-star"></i>'.repeat(revStars)}${'<i class="ph ph-star text-white/20"></i>'.repeat(5 - revStars)}
          </div>
          <p class="text-text-muted italic">«${rev.text.slice(0, 90)}${rev.text.length > 90 ? '…' : ''}»</p>
          <p class="text-white/30 mt-0.5 not-italic">— ${rev.author}</p>
        </div>
      </div>
    ` : '';

    const contentHtml = `
      <div class="relative z-10 min-w-[340px] md:min-w-[380px] max-w-md select-none group">
        <p class="text-xs font-mono tracking-widest text-text-muted mb-2 uppercase">${quest.genre} · ${quest.hasActor ? 'З АКТОРОМ' : 'СІМЕЙНИЙ'} · ${quest.ageMin}+</p>
        <h2 class="text-4xl font-black mb-2 tracking-tight transition-colors duration-300">${quest.name}</h2>
        <p class="text-text-secondary text-sm italic">«${quest.tagline}»</p>
        ${reviewHtml}
        <a href="/${quest.slug}" data-link="/${quest.slug}" class="inline-flex items-center gap-2.5 text-sm font-semibold px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.08] active:scale-95 transition-all duration-300 ${accentBorder}">
          ${isSH ? 'Увійти у місто' : 'Увійти у замок'}
          <i class="ph ph-arrow-right text-base transition-transform group-hover:translate-x-1 ${accentText}"></i>
        </a>
      </div>
    `;

    pane.innerHTML = ratingHtml + contentHtml;

    pane.addEventListener('click', () => {
      if (this.active === side) {
        window.location.href = `/${quest.slug}`;
      } else {
        this.active = side;
        this.updateSizes();
      }
    });

    pane.addEventListener('mouseenter', () => {
      if (this.active === null) {
        const [left, right] = this.children as unknown as [HTMLDivElement, HTMLDivElement];
        if (side === 'left') {
          left.style.flex = '0 0 54%';
          right.style.flex = '0 0 46%';
        } else {
          left.style.flex = '0 0 46%';
          right.style.flex = '0 0 54%';
        }
      }
    });

    pane.addEventListener('mouseleave', () => {
      if (this.active === null) {
        const [left, right] = this.children as unknown as [HTMLDivElement, HTMLDivElement];
        left.style.flex = '0 0 50%';
        right.style.flex = '0 0 50%';
      }
    });

    return pane;
  }

  private updateSizes() {
    const [left, right] = this.children as unknown as [HTMLDivElement, HTMLDivElement];
    if (this.active === 'left') {
      left.style.flex = '0 0 62%';
      right.style.flex = '0 0 38%';
    } else if (this.active === 'right') {
      left.style.flex = '0 0 38%';
      right.style.flex = '0 0 62%';
    } else {
      left.style.flex = '0 0 50%';
      right.style.flex = '0 0 50%';
    }
  }
}

customElements.define('vw-split-screen', SplitScreen);
