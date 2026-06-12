import { div, el, span } from '../../utils/dom.js';
import { fetchReviews } from '../../api/reviews.js';
import type { Review } from '@veilworlds/shared';

export class ReviewList extends HTMLElement {
  private slug: string;

  constructor(slug: string) {
    super();
    this.slug = slug;
  }

  async connectedCallback() {
    this.className = 'block max-w-4xl mx-auto px-6 md:px-4 py-12';

    let reviews: Review[] = [];
    try {
      reviews = await fetchReviews(this.slug);
    } catch {
      reviews = [];
    }

    this.innerHTML = '<h2 class="text-xl md:text-2xl font-bold mb-6">Відгуки</h2>';

    if (reviews.length === 0) {
      const empty = div({ class: 'flex flex-col items-center justify-center py-12 rounded-card bg-white/[0.01] border border-dashed border-white/[0.08]' });
      empty.innerHTML = `
        <i class="ph ph-chats-circle text-3xl text-text-muted mb-3"></i>
        <p class="text-text-muted text-sm">Поки що немає відгуків. Будьте першими!</p>
      `;
      this.appendChild(empty);
      return;
    }

    const list = div({ class: 'space-y-4' });

    for (const r of reviews) {
      const card = div({ class: 'bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-card p-5 shadow-lg ring-1 ring-white/[0.03]' });

      const header = div({ class: 'flex items-center justify-between mb-3' });
      const avatar = span({ class: 'w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0' }, r.author.charAt(0).toUpperCase());
      const authorSpan = span({ class: 'font-semibold text-sm text-white' }, r.author);

      const nameGroup = div({ class: 'flex items-center gap-2.5' });
      nameGroup.append(avatar, authorSpan);

      const starsSpan = span({ class: 'text-yellow-400 text-xs flex gap-0.5' });
      starsSpan.innerHTML = `${Array(r.rating).fill('<i class="ph-fill ph-star"></i>').join('')}${Array(5 - r.rating).fill('<i class="ph ph-star text-white/20"></i>').join('')}`;

      header.append(nameGroup, starsSpan);

      const textP = el('p', { class: 'text-text-secondary text-sm leading-relaxed' }, r.text);

      card.append(header, textP);
      list.appendChild(card);
    }

    this.appendChild(list);
  }
}

customElements.define('vw-review-list', ReviewList);
