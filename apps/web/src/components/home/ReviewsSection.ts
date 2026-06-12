import { div } from '../../utils/dom.js';
import { fetchReviews } from '../../api/reviews.js';
import type { Review } from '@veilworlds/shared';

export class ReviewsSection extends HTMLElement {
  async connectedCallback() {
    this.className = 'block max-w-6xl mx-auto px-8 md:px-12 py-16';

    let allReviews: Review[] = [];
    try {
      const [sh, hp] = await Promise.all([
        fetchReviews('silent-hill'),
        fetchReviews('harry-potter'),
      ]);
      allReviews = [...sh, ...hp].sort((a, b) => b.rating - a.rating).slice(0, 6);
    } catch {
      allReviews = [];
    }

    this.innerHTML = `
      <h2 class="text-3xl font-bold text-center mb-2">Відгуки</h2>
      <p class="text-text-muted text-center mb-12">Що кажуть наші гості</p>
    `;

    if (allReviews.length === 0) {
      const empty = div({ class: 'text-center text-text-muted py-8' }, 'Поки що немає відгуків. Будьте першими!');
      this.appendChild(empty);
      return;
    }

    const grid = div({ class: 'grid grid-cols-1 md:grid-cols-3 gap-4' });

    for (const r of allReviews) {
      const card = div({ class: 'bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-card p-5 shadow-xl hover:border-white/20 transition-all duration-300' });
      card.innerHTML = `
        <div class="flex items-center gap-0.5 mb-3 text-yellow-400 text-xs">
          ${Array(r.rating).fill('<i class="ph-fill ph-star"></i>').join('')}${Array(5 - r.rating).fill('<i class="ph ph-star text-white/20"></i>').join('')}
        </div>
        <p class="text-text-secondary text-sm mb-4 line-clamp-4 leading-relaxed">«${r.text}»</p>
        <p class="text-text-muted text-xs font-mono">— ${r.author}</p>
      `;
      grid.appendChild(card);
    }

    this.appendChild(grid);
  }
}

customElements.define('vw-reviews-section', ReviewsSection);
