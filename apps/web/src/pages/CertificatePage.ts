import { div, el } from '../utils/dom.js';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { applyPhoneMask } from '../utils/phoneMask.js';
import { createCertificate } from '../api/certificates.js';

export class CertificatePage extends HTMLElement {
  connectedCallback() {
    this.className = 'min-h-dvh bg-bg-base text-text-primary';
    this.innerHTML = '';

    const nav = new Nav();
    const footer = new Footer();
    this.append(nav, footer);

    const main = div({ class: 'max-w-lg mx-auto px-4 py-20' });

    const title = el('h1', { class: 'text-3xl font-bold mb-2' }, 'Подарунковий сертифікат');
    const subtitle = el('p', { class: 'text-text-secondary mb-8' }, 'Подаруйте незабутні емоції! Сертифікат на проходження будь-якого квесту.');

    const form = el('form', { class: 'space-y-5' });

    const fields = [
      { label: 'Імʼя отримувача', name: 'customerName', type: 'text', required: true },
      { label: 'Ваше імʼя', name: 'giverName', type: 'text', required: true },
      { label: 'Телефон', name: 'phone', type: 'tel', required: true },
      { label: 'Email (необовʼязково)', name: 'email', type: 'email', required: false },
    ];

    for (const f of fields) {
      const group = div({ class: 'flex flex-col gap-1.5' });
      const label = el('label', { class: 'text-sm text-text-secondary' }, f.label);
      const input = el('input', {
        type: f.type,
        name: f.name,
        required: f.required ? 'true' : 'false',
        class: 'bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors',
        placeholder: f.label,
      });
      group.append(label, input);
      form.appendChild(group);

      if (f.name === 'phone') {
        applyPhoneMask(input as HTMLInputElement);
      }
    }

    const amountBlock = div({ class: 'bg-bg-card border border-border-subtle rounded-card p-5' });
    amountBlock.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-text-secondary">Номінал</span>
        <span class="text-xl font-bold">2 500 грн</span>
      </div>
      <p class="text-text-muted text-xs mt-2">* Доплата за гравців понад 4 — на місці після гри</p>
    `;
    form.appendChild(amountBlock);

     const submitBtn = el('button', {
      type: 'submit',
      class: 'w-full bg-accent-amber hover:bg-amber-600 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-amber-900/10 font-mono tracking-wider uppercase text-sm',
    }, 'Замовити сертифікат');
    form.appendChild(submitBtn);

    const msg = div({ class: 'hidden text-center text-sm mt-4 font-semibold' });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data: any = {
        customerName: fd.get('customerName') as string,
        giverName: fd.get('giverName') as string,
        phone: fd.get('phone') as string,
        email: fd.get('email') as string || null,
        amount: 2500,
      };

      // Show confirmation modal
      const modal = div({ class: 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 select-none' });
      modal.innerHTML = `
        <div class="bg-bg-base border border-white/10 rounded-card p-6 w-full max-w-sm text-white space-y-5 shadow-2xl">
          <div class="flex items-center gap-2 border-b border-white/10 pb-3">
            <i class="ph ph-gift text-2xl text-accent-amber"></i>
            <h3 class="text-lg font-black tracking-tight">Підтвердження замовлення</h3>
          </div>
          <div class="space-y-2.5 text-sm">
            <div class="flex justify-between"><span class="text-text-muted">Отримувач</span><span class="text-white font-semibold">${data.customerName}</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Дарувальник</span><span class="text-white font-semibold">${data.giverName}</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Телефон</span><span class="text-white font-mono">${data.phone}</span></div>
            ${data.email ? `<div class="flex justify-between"><span class="text-text-muted">Email</span><span class="text-white font-mono">${data.email}</span></div>` : ''}
            <div class="flex justify-between border-t border-white/5 pt-2.5"><span class="text-text-muted">Номінал</span><span class="text-white font-mono font-bold text-base">2 500 грн</span></div>
          </div>
          <div class="flex gap-3 pt-1">
            <button type="button" id="modal-cancel-btn" class="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold py-3 rounded-xl active:scale-95 transition-all text-xs uppercase tracking-wider">Назад</button>
            <button type="button" id="modal-confirm-btn" class="flex-1 bg-accent-amber hover:bg-amber-600 text-white font-semibold py-3 rounded-xl active:scale-95 transition-all text-xs uppercase tracking-wider shadow-md">Підтвердити</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#modal-cancel-btn')!.addEventListener('click', () => {
        modal.remove();
      });

      modal.querySelector('#modal-confirm-btn')!.addEventListener('click', async () => {
        modal.remove();
        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Відправляємо...';
          await createCertificate(data);
          msg.className = 'text-green-400 text-sm mt-4 text-center';
          msg.textContent = '✅ Заявку прийнято! Ми звʼяжемося з вами.';
          form.reset();
        } catch (err: any) {
          msg.className = 'text-red-400 text-sm mt-4 text-center';
          msg.textContent = err.message || 'Помилка. Спробуйте ще раз.';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Замовити сертифікат';
        }
      });
    });

    main.append(title, subtitle, form, msg);
    this.insertBefore(main, footer);
  }
}

customElements.define('vw-certificate-page', CertificatePage);
