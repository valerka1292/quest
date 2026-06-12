import { div, a } from '../utils/dom.js';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';

export class NotFoundPage extends HTMLElement {
  connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base text-text-primary';
    this.innerHTML = '';

    const nav = new Nav();
    const footer = new Footer();
    this.append(nav, footer);

    const main = div({ class: 'flex flex-col items-center justify-center min-h-[60dvh] px-4 text-center' });
    main.innerHTML = `
      <h1 class="text-6xl font-bold text-text-muted mb-4">404</h1>
      <p class="text-text-secondary text-lg mb-8">Сторінку не знайдено</p>
      <a href="/" data-link="/" class="inline-block bg-accent-purple hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">На головну</a>
    `;

    this.insertBefore(main, footer);
  }
}

customElements.define('vw-not-found-page', NotFoundPage);
