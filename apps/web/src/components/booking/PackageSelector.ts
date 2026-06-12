import { div, el } from '../../utils/dom.js';
import { api } from '../../api/client.js';
import { formatPrice } from '../../utils/formatters.js';
import type { Package } from '@veilworlds/shared';

export class PackageSelector extends HTMLElement {
  private onSelect: (type: 'quest' | 'package', slug: string) => void;

  constructor(onSelect: (type: 'quest' | 'package', slug: string) => void) {
    super();
    this.onSelect = onSelect;
  }

  async connectedCallback() {
    this.className = 'flex flex-col gap-6 py-4';

    const title = el('h2', { class: 'text-xl font-bold text-center' }, 'Що бронюємо?');

    const questBlock = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-6 cursor-pointer hover:border-accent-red/30 transition-colors' });
    questBlock.innerHTML = `
      <h3 class="font-bold text-lg mb-1">Одиночний квест</h3>
      <p class="text-text-secondary text-sm">Silent Hill або Гаррі Поттер</p>
    `;
    questBlock.addEventListener('click', () => {
      const sub = div({ class: 'mt-4 space-y-2' });
      sub.innerHTML = `
        <button class="w-full text-left px-4 py-3 rounded-xl border border-border-subtle hover:border-accent-red/30 transition-colors text-sm" data-slug="silent-hill">
          <span class="font-semibold">Silent Hill</span> — хоррор, 14+
        </button>
        <button class="w-full text-left px-4 py-3 rounded-xl border border-border-subtle hover:border-accent-purple/30 transition-colors text-sm" data-slug="harry-potter">
          <span class="font-semibold">Гаррі Поттер</span> — фентезі, 8+
        </button>
      `;
      questBlock.appendChild(sub);
      sub.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSelect('quest', (b as HTMLElement).dataset.slug!);
        });
      });
    });

    let packages: Package[] = [];
    try { packages = await api.get<Package[]>('/packages'); } catch {}

    const pkgBlock = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-6 cursor-pointer hover:border-accent-purple/30 transition-colors' });
    pkgBlock.innerHTML = `
      <h3 class="font-bold text-lg mb-1">Пакет для події</h3>
      <p class="text-text-secondary text-sm">День народження, вечірка тощо</p>
    `;
    pkgBlock.addEventListener('click', () => {
      const sub = div({ class: 'mt-4 space-y-2' });
      for (const p of packages) {
        const btn = el('button', {
          class: 'w-full text-left px-4 py-3 rounded-xl border border-border-subtle hover:border-accent-purple/30 transition-colors text-sm',
          'data-slug': p.slug,
        });
        btn.innerHTML = `<span class="font-semibold">${p.name}</span> — ${formatPrice(p.basePrice)}`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSelect('package', p.slug);
        });
        sub.appendChild(btn);
      }
      pkgBlock.appendChild(sub);
    });

    this.append(title, questBlock, pkgBlock);
  }
}

customElements.define('vw-package-selector', PackageSelector);
