import { div, a } from '../../utils/dom.js';

export class Footer extends HTMLElement {
  connectedCallback() {
    this.className = 'border-t border-border-subtle bg-bg-base mt-20';
    this.innerHTML = `
      <div class="max-w-6xl mx-auto px-6 md:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="font-bold text-lg mb-3">VeilWorlds</h3>
          <p class="text-text-muted text-sm">Квест-кімнати у Дніпрі. Два світи — одна завіса.</p>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm text-text-secondary">Квести</h4>
          <div class="space-y-2 text-sm">
            <a href="/silent-hill" data-link="/silent-hill" class="block text-text-muted hover:text-white transition-colors">Silent Hill</a>
            <a href="/harry-potter" data-link="/harry-potter" class="block text-text-muted hover:text-white transition-colors">Гаррі Поттер</a>
            <a href="/certificate" data-link="/certificate" class="block text-text-muted hover:text-white transition-colors">Сертифікати</a>
          </div>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm text-text-secondary">Контакти</h4>
          <div class="space-y-2 text-sm text-text-muted">
            <a href="https://maps.app.goo.gl/u5u4hQ2pi6rCc7mg6?g_st=atm" target="_blank" rel="noopener noreferrer" class="block hover:text-white transition-colors">м. Дніпро, вул. Короленко, 14</a>
            <a href="tel:+380999773349" class="block hover:text-white transition-colors">+380 (99) 977-33-49</a>
            <p>irinatishyk@gmail.com</p>
          </div>
        </div>
      </div>
      <div class="border-t border-border-subtle py-4 text-center text-text-muted text-xs">
        © 2026 VeilWorlds. Усі права захищено.
      </div>
    `;
  }
}

customElements.define('vw-footer', Footer);
