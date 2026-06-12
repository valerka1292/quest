import { div, el } from '../../utils/dom.js';
import { api } from '../../api/client.js';
import { formatPrice } from '../../utils/formatters.js';
import { store } from '../../store.js';
import type { Package } from '@veilworlds/shared';

export class PackagesSection extends HTMLElement {
  async connectedCallback() {
    this.className = 'block max-w-6xl mx-auto px-8 md:px-12 py-20';

    let packages: Package[] = [];
    try {
      packages = await api.get<Package[]>('/packages');
    } catch {
      packages = [];
    }

    this.innerHTML = `
      <h2 class="text-3xl font-bold text-center mb-2">Святкуємо разом</h2>
      <p class="text-text-muted text-center mb-12">Пакети для особливих подій</p>
    `;

    const grid = div({ class: 'grid grid-cols-1 md:grid-cols-2 gap-4' });

    for (const pkg of packages) {
      const isMystic = pkg.slug.includes('mystic');
      const accentGlow = isMystic ? 'hover:shadow-red-950/20 hover:border-accent-red/30 hover:glow-red' : 'hover:shadow-amber-950/20 hover:border-accent-amber/30 hover:glow-amber';
      const btnBg = isMystic ? 'hover:bg-accent-red hover:border-accent-red/50 hover:text-white' : 'hover:bg-accent-amber hover:border-accent-amber/50 hover:text-white';
      
      const card = div({ class: `glass-card rounded-card p-6 flex flex-col transition-all duration-500 shadow-2xl relative overflow-hidden group ${accentGlow}` });

      card.innerHTML = `
        <div class="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity duration-500 group-hover:opacity-20" style="background-color: ${this.accentFor(pkg.slug)}"></div>
        <h3 class="text-xl font-black mb-2.5 transition-colors duration-300" style="color: ${this.accentFor(pkg.slug)}">${pkg.name}</h3>
        <p class="text-text-secondary text-sm mb-5 leading-relaxed">${pkg.description}</p>
        <ul class="space-y-3 mb-8 flex-1 relative z-10">
          ${pkg.includes.map(item => `
            <li class="flex items-start gap-2.5 text-sm text-text-secondary">
              <i class="ph ph-check-circle text-green-400 text-base mt-0.5 flex-shrink-0"></i> <span>${item}</span>
            </li>
          `).join('')}
        </ul>
        <div class="border-t border-white/[0.06] pt-5 relative z-10">
          <p class="text-2xl font-mono font-black text-white tracking-tight">${formatPrice(pkg.basePrice)}</p>
          <p class="text-text-muted text-[11px] font-mono mt-0.5">за ${pkg.basePlayers} осіб + ${formatPrice(pkg.pricePerExtra)}/чол</p>
        </div>
        <button class="mt-5 w-full py-3.5 rounded-xl bg-white/[0.03] border border-white/10 active:scale-95 text-sm font-semibold transition-all duration-300 book-package-btn relative z-10 ${btnBg}" data-package="${pkg.slug}">
          Забронювати
        </button>
      `;

      grid.appendChild(card);
    }

    this.appendChild(grid);

    this.querySelectorAll('.book-package-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = (btn as HTMLElement).dataset.package!;
        store.set('bookingOverlay', { open: true, packageSlug: slug });
      });
    });
  }

  private accentFor(slug: string): string {
    if (slug.includes('mystic')) return '#DC2626'; // Red
    return '#D97706'; // Amber
  }
}

customElements.define('vw-packages-section', PackagesSection);
