import { el, a } from '../../utils/dom.js';

export class Nav extends HTMLElement {
  connectedCallback() {
    this.className = 'fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/[0.05] transition-all duration-300';
    this.innerHTML = `
      <div class="max-w-6xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        <a href="/" data-link="/" class="text-lg font-black tracking-wide text-white hover:opacity-90 transition-opacity">
          Veil<span class="text-white/50 font-normal">Worlds</span>
        </a>
        <nav class="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-white/70">
          <a href="/silent-hill" data-link="/silent-hill" class="hover:text-white transition-colors py-1">
            Silent Hill
          </a>
          <a href="/harry-potter" data-link="/harry-potter" class="hover:text-white transition-colors py-1">
            Гаррі Поттер
          </a>
          <a href="/certificate" data-link="/certificate" class="hover:text-white transition-colors py-1">
            Сертифікати
          </a>
        </nav>
        <button class="md:hidden text-text-secondary hover:text-white transition-colors p-2 rounded-lg" id="mobile-menu-btn">
          <i class="ph ph-list text-2xl"></i>
        </button>
      </div>

      <!-- Drawer Backdrop Overlay -->
      <div id="drawer-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 opacity-0 pointer-events-none transition-opacity duration-300"></div>

      <!-- Slide-out Drawer Menu -->
      <div id="drawer-menu" class="fixed inset-y-0 right-0 w-72 z-50 bg-bg-base border-l border-white/[0.08] shadow-2xl flex flex-col p-6 transform translate-x-full transition-transform duration-300 ease-in-out">
        <div class="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6">
          <span class="font-bold text-lg tracking-wide text-white">Навігація</span>
          <button id="drawer-close" class="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 active:scale-95 transition-all">
            <i class="ph ph-x text-2xl"></i>
          </button>
        </div>
        <nav class="flex flex-col gap-5 text-base font-semibold text-text-secondary">
          <a href="/silent-hill" data-link="/silent-hill" class="flex items-center gap-3 hover:text-white py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-all">
            <i class="ph ph-skull text-accent-red text-lg"></i> Silent Hill
          </a>
          <a href="/harry-potter" data-link="/harry-potter" class="flex items-center gap-3 hover:text-white py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-all">
            <i class="ph ph-wand text-accent-amber text-lg"></i> Гаррі Поттер
          </a>
          <a href="/certificate" data-link="/certificate" class="flex items-center gap-3 hover:text-white py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-all">
            <i class="ph ph-gift text-accent-purple text-lg"></i> Сертифікати
          </a>
        </nav>
      </div>
    `;

    const btn = this.querySelector('#mobile-menu-btn')!;
    const closeBtn = this.querySelector('#drawer-close')!;
    const backdrop = this.querySelector('#drawer-backdrop')!;
    const drawer = this.querySelector('#drawer-menu')!;

    const openDrawer = () => {
      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100', 'pointer-events-auto');
    };

    const closeDrawer = () => {
      drawer.classList.add('translate-x-full');
      backdrop.classList.remove('opacity-100', 'pointer-events-auto');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
    };

    btn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    // Dynamic styles on scroll
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        this.className = 'fixed top-0 left-0 right-0 z-50 bg-bg-base/90 border-b border-border-subtle shadow-lg transition-all duration-300';
      } else {
        this.className = 'fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/[0.05] transition-all duration-300';
      }
    });
  }
}

customElements.define('vw-nav', Nav);
