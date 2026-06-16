import { div } from '../../utils/dom.js';

export class ExtrasSection extends HTMLElement {
  connectedCallback() {
    this.className = 'block max-w-6xl mx-auto px-8 md:px-12 py-16';
    this.innerHTML = `
      <h2 class="text-3xl font-bold text-center mb-2">Додаткові послуги</h2>
      <p class="text-text-muted text-center mb-12">Зробіть ваш візит ще комфортнішим</p>
    `;

    const grid = div({ class: 'grid grid-cols-1 md:grid-cols-2 gap-4' });

    const zone = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-6' });
    zone.innerHTML = `
      <h3 class="text-xl font-bold mb-2">Зона відпочинку</h3>
      <p class="text-text-secondary text-sm mb-4">Окрема кімната для святкування після квесту. Місткість до 12 осіб. Почасова оплата.</p>
      <p class="text-text-muted text-xs mb-4">* Деталі та ціна — при дзвінку менеджеру</p>
      <a href="tel:+380999773349" class="inline-block text-sm font-semibold px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors">Зателефонувати</a>
    `;

    const mafia = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-6' });
    mafia.innerHTML = `
      <h3 class="text-xl font-bold mb-2">Гра «Мафія»</h3>
      <p class="text-text-secondary text-sm mb-4">Класична психологічна гра з ведучим. Тривалість 1 година.</p>
      <p class="text-lg font-bold mb-1">2 500 грн</p>
      <p class="text-text-muted text-xs mb-4">за компанію до 6 осіб</p>
      <a href="tel:+380999773349" class="inline-block text-sm font-semibold px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors">Дізнатись більше</a>
    `;

    grid.append(zone, mafia);
    this.appendChild(grid);
  }
}

customElements.define('vw-extras-section', ExtrasSection);
