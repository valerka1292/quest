import { div, a } from '../../utils/dom.js';

export class CertificateBanner extends HTMLElement {
  connectedCallback() {
    this.className = 'block max-w-6xl mx-auto px-8 md:px-12 py-16';
    this.innerHTML = `
      <div class="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden"
           style="background: linear-gradient(135deg, rgba(219,139,6,0.08), rgba(9,9,11,0.98))">
        <div class="flex-1 z-10">
          <h2 class="text-2xl md:text-3xl font-black mb-3 text-white tracking-tight">Подарунковий сертифікат</h2>
          <p class="text-text-secondary mb-6 leading-relaxed">Подаруйте емоції! Сертифікат на будь-який квест — ідеальний подарунок для друзів і близьких.</p>
          <a href="/certificate" data-link="/certificate" class="inline-block bg-accent-amber hover:bg-amber-600 active:scale-95 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-900/20">
            Замовити сертифікат
          </a>
        </div>
        <div class="relative z-10 flex-shrink-0">
          <i class="ph ph-gift text-7xl text-accent-amber/30 animate-pulse"></i>
        </div>
      </div>
    `;
  }
}

customElements.define('vw-certificate-banner', CertificateBanner);
