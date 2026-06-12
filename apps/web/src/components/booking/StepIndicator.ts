import { div } from '../../utils/dom.js';

export class StepIndicator extends HTMLElement {
  private step: number;
  private total: number;

  constructor(step: number, total: number) {
    super();
    this.step = step;
    this.total = total;
  }

  connectedCallback() {
    this.className = 'flex items-center gap-2';
    const labels = ['Тип', 'Дата', 'Дані', 'Готово'];

    for (let i = 0; i < this.total; i++) {
      const dot = div({
        class: `w-3 h-3 rounded-full transition-colors ${
          i < this.step ? 'bg-accent-purple' : i === this.step ? 'bg-accent-purple ring-2 ring-accent-purple/30' : 'bg-white/10'
        }`,
      });
      this.appendChild(dot);

      const label = div({
        class: `text-xs transition-colors ${
          i <= this.step ? 'text-white' : 'text-text-muted'
        }`,
      }, labels[i] || '');
      this.appendChild(label);

      if (i < this.total - 1) {
        const line = div({
          class: `flex-1 h-px transition-colors ${
            i < this.step ? 'bg-accent-purple' : 'bg-white/10'
          }`,
        });
        this.appendChild(line);
      }
    }
  }
}

customElements.define('vw-step-indicator', StepIndicator);
