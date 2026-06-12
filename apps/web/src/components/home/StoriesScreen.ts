import { div, el } from '../../utils/dom.js';
import { fetchQuests } from '../../api/quests.js';
import { fetchReviews } from '../../api/reviews.js';
import { staticQuests } from '../../data/staticQuests.js';
import type { Quest, Review } from '@veilworlds/shared';

export class StoriesScreen extends HTMLElement {
  private quests: Quest[] = [];
  private reviews: Record<string, Review | null> = {};
  private current = 0;
  private totalSlides = 3;
  private container!: HTMLDivElement;
  private progressSegments: HTMLDivElement[] = [];
  
  private startX = 0;
  private startY = 0;
  private isPointerDown = false;
  private isDragging = false;
  
  private leftArrow!: HTMLDivElement;
  private rightArrow!: HTMLDivElement;

  async connectedCallback() {
    try {
      const [quests, shRev, hpRev] = await Promise.all([
        fetchQuests(),
        fetchReviews('silent-hill').catch(() => [] as Review[]),
        fetchReviews('harry-potter').catch(() => [] as Review[]),
      ]);
      this.quests = quests;
      this.reviews['silent-hill'] = shRev[0] || null;
      this.reviews['harry-potter'] = hpRev[0] || null;
    } catch {
      this.quests = staticQuests;
    }
    this.totalSlides = this.quests.length + 1;
    this.render();
  }

  private render() {
    this.className = 'block relative h-[100svh] w-full bg-bg-base select-none overflow-hidden';
    this.innerHTML = '';

    // Segmented top progress bar
    const progressContainer = div({ class: 'absolute top-[66px] left-2 right-2 z-40 flex gap-1' });
    this.progressSegments = [];
    for (let i = 0; i < this.totalSlides; i++) {
      const segBg = div({ class: 'h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.5)]' });
      // Removed CSS transition so it syncs perfectly with scroll without jerking
      const segFill = div({ class: 'h-full w-0 bg-white' });
      segBg.appendChild(segFill);
      progressContainer.appendChild(segBg);
      this.progressSegments.push(segFill);
    }
    this.append(progressContainer);

    // Slide container
    this.container = div({ class: 'flex flex-row w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth' });
    this.container.style.scrollbarWidth = 'none'; // Firefox
    
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      @keyframes pulseRight {
        0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
        50% { transform: translateX(4px) scale(1.05); opacity: 1; }
      }
      @keyframes pulseLeft {
        0%, 100% { transform: translateX(0) scale(1); opacity: 0.8; }
        50% { transform: translateX(-4px) scale(1.05); opacity: 1; }
      }
      .animate-swipe-hint-right {
        animation: pulseRight 1.5s infinite ease-in-out;
      }
      .animate-swipe-hint-left {
        animation: pulseLeft 1.5s infinite ease-in-out;
      }
    `;
    this.appendChild(style);
    this.container.classList.add('hide-scrollbar');

    for (let i = 0; i < this.quests.length; i++) {
      const slide = this.makeQuestSlide(this.quests[i], i);
      this.container.appendChild(slide);
    }

    const contactSlide = this.makeContactsSlide();
    this.container.appendChild(contactSlide);

    // Left Arrow
    this.leftArrow = div({ class: 'absolute top-1/2 -translate-y-1/2 left-4 z-40 pointer-events-none transition-opacity duration-300 opacity-0' });
    this.leftArrow.innerHTML = `
      <div class="flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white animate-swipe-hint-left shadow-xl">
        <i class="ph ph-caret-left text-xl"></i>
      </div>
    `;

    // Right Arrow
    this.rightArrow = div({ class: 'absolute top-1/2 -translate-y-1/2 right-4 z-40 pointer-events-none transition-opacity duration-300' });
    this.rightArrow.innerHTML = `
      <div class="flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white animate-swipe-hint-right shadow-xl">
        <i class="ph ph-caret-right text-xl"></i>
      </div>
    `;
    
    this.append(this.container, this.leftArrow, this.rightArrow);

    this.updateProgressBase();
    this.updateArrows();

    // Scroll listener (native swipe handling)
    this.container.addEventListener('scroll', () => {
      const scrollRatio = this.container.scrollLeft / this.container.clientWidth;
      
      const index = Math.round(scrollRatio);
      if (index !== this.current) {
        this.current = index;
        this.updateArrows();
      }

      // Sync progress bars with scroll flawlessly
      for (let i = 0; i < this.totalSlides; i++) {
        const fill = this.progressSegments[i];
        if (!fill) continue;
        
        if (i <= Math.floor(scrollRatio)) {
          fill.style.width = '100%';
        } else if (i === Math.floor(scrollRatio) + 1) {
          fill.style.width = `${(scrollRatio % 1) * 100}%`;
        } else {
          fill.style.width = '0%';
        }
      }
    }, { passive: true });

    // Touch/Mouse events for tap navigation
    this.container.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.isPointerDown = true;
      this.isDragging = false;
    });

    this.container.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      if (Math.abs(e.clientX - this.startX) > 10 || Math.abs(e.clientY - this.startY) > 10) {
        this.isDragging = true;
      }
    });

    this.container.addEventListener('pointerup', (e) => {
      this.isPointerDown = false;
      
      if (this.isDragging) return; // Was dragging/swiping. Native scroll will handle snap and index update.
      if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;

      const width = window.innerWidth;
      const tapX = e.clientX;
      
      if (tapX < width * 0.3) {
        this.prev();
      } else {
        this.next();
      }
    });

    this.container.addEventListener('pointerleave', () => {
      this.isPointerDown = false;
    });
  }

  // --- Navigation Logic ---
  private next() {
    if (this.current < this.totalSlides - 1) {
      this.goTo(this.current + 1);
    }
  }

  private prev() {
    if (this.current > 0) {
      this.goTo(this.current - 1);
    } else {
      this.goTo(0);
    }
  }

  private goTo(index: number) {
    this.current = index;
    this.updateArrows();
    
    this.container.scrollTo({
      left: index * this.container.clientWidth,
      behavior: 'smooth'
    });
  }

  private updateArrows() {
    if (this.current === 0) {
      this.leftArrow.style.opacity = '0';
    } else {
      this.leftArrow.style.opacity = '1';
    }

    if (this.current === this.totalSlides - 1) {
      this.rightArrow.style.opacity = '0';
    } else {
      this.rightArrow.style.opacity = '1';
    }
  }

  private updateProgressBase() {
    for (let i = 0; i < this.totalSlides; i++) {
      const fill = this.progressSegments[i];
      if (!fill) continue;
      
      if (i <= this.current) {
        fill.style.width = '100%';
      } else {
        fill.style.width = '0%';
      }
    }
  }

  // --- Slide Builders ---
  private makeQuestSlide(quest: Quest, index: number): HTMLDivElement {
    const slide = div({ class: 'flex-shrink-0 w-full h-full flex flex-col p-6 pt-24 pb-10 sm:pb-12 snap-center snap-always relative select-none overflow-y-auto hide-scrollbar' });

    const isSH = quest.slug === 'silent-hill';
    const gradient = isSH
      ? 'linear-gradient(to bottom, rgba(26,8,8,0.3) 0%, rgba(26,8,8,0.6) 60%, rgba(9,9,11,0.95) 100%)'
      : 'linear-gradient(to bottom, rgba(8,8,26,0.3) 0%, rgba(8,8,26,0.6) 60%, rgba(9,9,11,0.95) 100%)';

    const position = isSH ? 'right center' : 'left center';
    // Using absolute background to allow scrolling content if needed without moving the background
    const bgDiv = div({ class: 'absolute inset-0 z-0 pointer-events-none' });
    bgDiv.style.background = `${gradient}, url(${quest.heroImage}) ${position}/cover no-repeat`;
    slide.appendChild(bgDiv);

    const nextTime = index === 0 ? 'Сьогодні о 19:15' : 'Сьогодні о 19:30';

    const stars = Math.round(quest.rating);
    const rev = this.reviews[quest.slug as keyof typeof this.reviews];
    const revStars = rev ? Math.round(rev.rating) : 0;
    const reviewHtml = rev ? `
      <div class="mt-2 mb-4 flex items-start gap-2 text-xs border-l-2 border-white/10 pl-3 leading-relaxed">
        <div>
          <div class="flex gap-0.5 text-yellow-400 mb-1">
            ${'<i class="ph-fill ph-star"></i>'.repeat(revStars)}${'<i class="ph ph-star text-white/20"></i>'.repeat(5 - revStars)}
          </div>
          <p class="text-text-muted italic">«${rev.text.slice(0, 80)}${rev.text.length > 80 ? '…' : ''}»</p>
          <p class="text-white/30 mt-0.5 not-italic">— ${rev.author}</p>
        </div>
      </div>
    ` : '';

    const contentWrapper = div({ class: 'relative z-10 flex flex-col h-full' });
    contentWrapper.innerHTML = `
      <div>
        <div class="inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs sm:text-sm font-mono bg-black/45 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 select-none">
          <span class="flex gap-0.5 text-yellow-400">
            ${'<i class="ph-fill ph-star"></i>'.repeat(stars)}${'<i class="ph ph-star text-white/20"></i>'.repeat(5 - stars)}
          </span>
          <span class="text-text-muted">· ${quest.reviewCount} відгуків</span>
          <span class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2 ml-0.5">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span class="text-green-400 font-semibold">${nextTime}</span>
          </span>
        </div>
      </div>
      
      <div class="mt-auto pt-6">
        <p class="text-[10px] sm:text-xs font-mono tracking-widest text-text-muted mb-2 uppercase leading-snug">${quest.genre} · ${quest.hasActor ? 'З АКТОРОМ' : 'СІМЕЙНИЙ'} · ${quest.ageMin}+</p>
        <h2 class="text-3xl sm:text-4xl font-black mb-2 tracking-tight leading-none">${quest.name}</h2>
        <p class="text-text-secondary text-sm italic mb-4">«${quest.tagline}»</p>
        ${reviewHtml}
        <a href="/${quest.slug}" data-link="/${quest.slug}" class="inline-flex items-center gap-2.5 text-sm font-semibold px-6 py-3 rounded-full border border-white/20 bg-white/[0.03] active:scale-95 transition-all">
          Детальніше <i class="ph ph-arrow-right"></i>
        </a>
      </div>
    `;

    slide.appendChild(contentWrapper);

    slide.querySelectorAll('img').forEach(img => {
      img.setAttribute('draggable', 'false');
      img.classList.add('pointer-events-none');
    });

    return slide;
  }

  private makeContactsSlide(): HTMLDivElement {
    const slide = div({ class: 'flex-shrink-0 w-full h-full flex items-center justify-center p-6 pb-20 snap-center snap-always relative bg-gradient-radial from-slate-900 to-black select-none' });

    const card = div({ class: 'bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-card p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative z-10' });
    card.innerHTML = `
      <i class="ph ph-map-pin text-4xl text-accent-amber mb-4 animate-bounce-slow"></i>
      <h2 class="text-2xl font-black mb-1.5 text-white">Як нас знайти</h2>
      <a href="https://maps.app.goo.gl/u5u4hQ2pi6rCc7mg6?g_st=atm" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-amber text-sm mb-6 font-medium underline transition-colors">
        м. Дніпро, вул. Короленко, 14
      </a>

      <div class="w-full h-px bg-white/10 mb-6"></div>

      <a href="tel:+380999773349" class="text-2xl font-bold font-mono tracking-tight text-white hover:text-accent-amber active:scale-95 transition-all mb-2 flex items-center gap-2">
        <i class="ph ph-phone text-accent-amber"></i> +380 99 977-33-49
      </a>
      <p class="text-xs text-text-muted mb-8 font-mono">Дзвінки приймаємо з 10:00 до 22:00</p>

      <a href="tel:+380999773349" class="w-full bg-accent-amber hover:bg-amber-600 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 mb-3 shadow-lg shadow-amber-900/10">
        <i class="ph ph-phone-call"></i> Зателефонувати
      </a>

      <button id="restart-stories" class="text-xs text-text-muted hover:text-white transition-colors py-2 flex items-center gap-1.5 font-semibold uppercase tracking-wider mt-4">
        <i class="ph ph-arrow-counter-clockwise"></i> Повернутись на початок
      </button>
    `;

    card.querySelector('#restart-stories')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.goTo(0);
    });

    slide.appendChild(card);
    return slide;
  }
}

customElements.define('vw-stories-screen', StoriesScreen);
