import { div, el } from '../../utils/dom.js';
import { submitReview } from '../../api/reviews.js';

export class ReviewForm extends HTMLElement {
  private slug: string;

  constructor(slug: string) {
    super();
    this.slug = slug;
  }

  connectedCallback() {
    this.className = 'block max-w-4xl mx-auto px-6 md:px-4 py-12';

    const isSH = this.slug === 'silent-hill';
    const accentBorder = isSH ? 'focus:border-accent-red focus:ring-1 focus:ring-accent-red/30' : 'focus:border-accent-amber focus:ring-1 focus:ring-accent-amber/30';
    const accentBg = isSH ? 'bg-accent-red hover:bg-red-700' : 'bg-accent-amber hover:bg-amber-600';
    const glowClass = isSH ? 'glow-red' : 'glow-amber';
    const accentRing = isSH ? 'ring-accent-red/20' : 'ring-accent-amber/20';

    const wrapper = div({ class: `bg-white/[0.02] backdrop-blur-md border border-white/[0.06] rounded-card p-6 md:p-8 shadow-xl ring-1 ${accentRing}` });
    wrapper.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <i class="ph ph-pencil-line text-xl text-text-muted"></i>
        <h3 class="text-xl md:text-2xl font-bold">Залишити відгук</h3>
      </div>
    `;

    const form = el('form', { class: 'space-y-5' });

    form.innerHTML = `
      <div>
        <label class="block text-sm text-text-secondary mb-1.5 font-medium">Ваше імʼя</label>
        <input type="text" name="author" required class="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none ${accentBorder} transition-all duration-300" placeholder="Імʼя">
      </div>
      <div>
        <label class="block text-sm text-text-secondary mb-1.5 font-medium">Оцінка</label>
        <div class="flex gap-1.5 text-2xl text-text-muted" id="star-rating">
          ${[1,2,3,4,5].map(i => `<span data-rating="${i}" class="cursor-pointer hover:text-yellow-400 transition-all duration-200"><i class="ph ph-star"></i></span>`).join('')}
        </div>
        <input type="hidden" name="rating" value="">
      </div>
      <div>
        <label class="block text-sm text-text-secondary mb-1.5 font-medium">Ваш відгук</label>
        <textarea name="text" required rows="4" class="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none ${accentBorder} transition-all duration-300 resize-none" placeholder="Поділіться враженнями (мінімум 10 символів)"></textarea>
      </div>
      <button type="submit" class="w-full ${accentBg} ${glowClass} text-white font-semibold py-3.5 rounded-xl active:scale-95 hover:scale-[1.01] transition-all duration-300 shadow-lg">Надіслати відгук</button>
      <p class="text-text-muted text-xs text-center">* Відгук зʼявиться після модерації</p>
    `;

    const msg = div({ class: 'hidden text-sm text-center mt-4' });

    const stars = form.querySelectorAll('#star-rating span');
    const ratingInput = form.querySelector('input[name="rating"]') as HTMLInputElement;

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt((star as HTMLElement).dataset.rating!);
        ratingInput.value = String(val);
        stars.forEach((s, i) => {
          const item = s as HTMLElement;
          if (i < val) {
            item.innerHTML = '<i class="ph-fill ph-star"></i>';
            item.className = 'cursor-pointer text-yellow-400 transition-all duration-200';
          } else {
            item.innerHTML = '<i class="ph ph-star"></i>';
            item.className = 'cursor-pointer text-text-muted hover:text-yellow-400 transition-all duration-200';
          }
        });
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const ratingVal = fd.get('rating');
      if (!ratingVal) {
        msg.className = 'text-red-400 text-sm text-center mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20';
        msg.textContent = 'Будь ласка, оберіть оцінку.';
        wrapper.appendChild(msg);
        msg.classList.remove('hidden');
        return;
      }

      const data = {
        questId: '',
        author: fd.get('author') as string,
        rating: parseInt(ratingVal as string),
        text: fd.get('text') as string,
      };

      try {
        const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-lg"></i> Відправляємо...';
        await submitReview(this.slug, data);
        msg.className = 'text-green-400 text-sm text-center mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20';
        msg.innerHTML = '<i class="ph ph-check-circle"></i> Дякуємо! Відгук відправлено на модерацію.';
        form.reset();
        stars.forEach(s => {
          const item = s as HTMLElement;
          item.innerHTML = '<i class="ph ph-star"></i>';
          item.className = 'cursor-pointer text-text-muted hover:text-yellow-400 transition-all duration-200';
        });
        btn.disabled = false;
        btn.innerHTML = 'Надіслати відгук';
      } catch (err: any) {
        msg.className = 'text-red-400 text-sm text-center mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20';
        msg.textContent = err.message || 'Помилка';
      }
    });

    wrapper.appendChild(form);
    wrapper.appendChild(msg);
    this.appendChild(wrapper);
  }
}

customElements.define('vw-review-form', ReviewForm);
