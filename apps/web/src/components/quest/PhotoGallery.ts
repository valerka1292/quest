import { div } from '../../utils/dom.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src);
}

export class PhotoGallery extends HTMLElement {
  private photos: string[];
  private current = 0;
  private lightbox: HTMLElement | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _lbKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private mediaContainer: HTMLElement | null = null;
  private player: Plyr | null = null;
  private lbPlayer: Plyr | null = null;

  constructor(photos: string[]) {
    super();
    this.photos = photos;
  }

  connectedCallback() {
    this.className = 'block max-w-5xl mx-auto px-6 md:px-4 py-12';

    this.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-6">Фотогалерея</h2>`;

    if (this.photos.length === 0) {
      const placeholder = div({ class: 'flex flex-col items-center justify-center py-12 rounded-card bg-white/[0.01] border border-dashed border-white/[0.08]' });
      placeholder.innerHTML = `
        <i class="ph ph-camera-slash text-3xl text-text-muted mb-3"></i>
        <p class="text-text-muted text-sm">Фотографії скоро будуть додані</p>
      `;
      this.appendChild(placeholder);
      return;
    }

    const container = div({ class: 'relative select-none' });

    const slide = div({ class: 'relative w-full aspect-[16/10] md:aspect-[16/9] rounded-2xl overflow-hidden bg-bg-elevated ring-1 ring-white/[0.06] group' });

    this.mediaContainer = div({ class: 'w-full h-full' });
    slide.appendChild(this.mediaContainer);
    this.update(); // Initialize first media

    // Prev button
    if (this.photos.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-[100]';
      prevBtn.innerHTML = '<i class="ph ph-caret-left text-xl"></i>';
      prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-[100]';
      nextBtn.innerHTML = '<i class="ph ph-caret-right text-xl"></i>';
      nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

      slide.append(prevBtn, nextBtn);
    }

    // Dots
    if (this.photos.length > 1) {
      const dots = div({ class: 'carousel-dots flex items-center justify-center gap-2 mt-4' });
      for (let i = 0; i < this.photos.length; i++) {
        const dot = document.createElement('button');
        dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${i === 0 ? 'bg-green-500 w-5' : 'bg-white/20 hover:bg-white/40'}`;
        dot.addEventListener('click', () => this.goTo(i));
        dots.appendChild(dot);
      }
      container.appendChild(dots);
    }

    // Counter
    if (this.photos.length > 1) {
      const counter = document.createElement('span');
      counter.className = 'carousel-counter absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium z-[100] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity';
      counter.textContent = `1 / ${this.photos.length}`;
      slide.appendChild(counter);
    }

    // Click to fullscreen
    slide.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      if (target.closest('.plyr')) return; // Plyr handles its own clicks
      if (isVideo(this.photos[this.current])) return; // Video uses inline player
      this.openLightbox(this.current);
    });

    // Touch swipe
    let startX = 0;
    let isDragging = false;
    slide.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.plyr__controls')) return; // Let user interact with player controls
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });
    slide.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) this.prev();
        else this.next();
      }
    }, { passive: true });

    // Keyboard
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { this.prev(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.next(); e.preventDefault(); }
      if (e.key === 'Escape') this.closeLightbox();
    };
    document.addEventListener('keydown', keyHandler);
    this._keyHandler = keyHandler;

    container.prepend(slide);
    this.appendChild(container);
  }

  disconnectedCallback() {
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    this.closeLightbox();
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  private createMedia(src: string): HTMLElement {
    if (isVideo(src)) {
      const wrap = div({ class: 'relative w-full h-full flex items-center justify-center bg-black' });
      const video = document.createElement('video');
      video.className = 'w-full h-full outline-none';
      video.src = src;
      video.playsInline = true;
      video.preload = 'metadata';
      wrap.appendChild(video);
      return wrap;
    }
    const img = document.createElement('img');
    img.className = 'w-full h-full object-cover cursor-zoom-in';
    img.src = src;
    img.alt = 'Фото квесту';
    img.draggable = false;
    return img;
  }

  private update() {
    if (!this.mediaContainer) return;

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    this.mediaContainer.innerHTML = '';
    const src = this.photos[this.current];
    this.mediaContainer.appendChild(this.createMedia(src));

    if (isVideo(src)) {
      const videoElement = this.mediaContainer.querySelector('video');
      if (videoElement) {
        this.player = new Plyr(videoElement, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          hideControls: true,
        });
        
        // Use full height for player wrapper to avoid squished look
        setTimeout(() => {
          const wrapper = this.mediaContainer?.querySelector('.plyr');
          if (wrapper) {
            (wrapper as HTMLElement).style.height = '100%';
            (wrapper as HTMLElement).style.width = '100%';
          }
        }, 0);
      }
    }

    const dots = this.querySelector('.carousel-dots');
    if (dots) {
      const btns = dots.querySelectorAll('button');
      btns.forEach((b, i) => {
        b.className = `w-2 h-2 rounded-full transition-all duration-300 ${i === this.current ? 'bg-green-500 w-5' : 'bg-white/20 hover:bg-white/40'}`;
      });
    }

    const counter = this.querySelector('.carousel-counter');
    if (counter) {
      counter.textContent = `${this.current + 1} / ${this.photos.length}`;
    }
  }

  private next() {
    if (this.photos.length < 2) return;
    this.current = (this.current + 1) % this.photos.length;
    this.update();
  }

  private prev() {
    if (this.photos.length < 2) return;
    this.current = (this.current - 1 + this.photos.length) % this.photos.length;
    this.update();
  }

  private goTo(index: number) {
    if (index === this.current) return;
    this.current = index;
    this.update();
  }

  private openLightbox(index: number) {
    if (this.lightbox) return;
    this.current = index;

    this.lightbox = div({
      class: 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm',
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 text-xl z-[120]';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeLightbox(); });

    const mediaWrap = div({ class: 'flex items-center justify-center w-full h-full max-w-[100vw] max-h-[100vh] md:p-12' });

    const renderMedia = () => {
      if (this.lbPlayer) {
        this.lbPlayer.destroy();
        this.lbPlayer = null;
      }
      mediaWrap.innerHTML = '';
      const src = this.photos[this.current];
      
      if (isVideo(src)) {
        const wrap = div({ class: 'w-full h-full flex items-center justify-center' });
        const video = document.createElement('video');
        video.className = 'max-w-full max-h-full outline-none rounded-lg shadow-2xl';
        video.src = src;
        video.playsInline = true;
        video.autoplay = true;
        wrap.appendChild(video);
        mediaWrap.appendChild(wrap);
        
        this.lbPlayer = new Plyr(video, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          autoplay: true
        });
      } else {
        const img = document.createElement('img');
        img.className = 'max-w-[100vw] max-h-[100vh] md:max-w-[95vw] md:max-h-[95vh] object-contain select-none rounded-lg shadow-2xl';
        img.src = src;
        img.draggable = false;
        mediaWrap.appendChild(img);
      }
      
      prevBtn.style.display = this.photos.length > 1 ? 'flex' : 'none';
      nextBtn.style.display = this.photos.length > 1 ? 'flex' : 'none';
      counter.textContent = `${this.current + 1} / ${this.photos.length}`;
    };

    const prevBtn = document.createElement('button');
    prevBtn.className = 'absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-2xl z-[110]';
    prevBtn.innerHTML = '<i class="ph ph-caret-left"></i>';
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.current = (this.current - 1 + this.photos.length) % this.photos.length; renderMedia(); });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-2xl z-[110]';
    nextBtn.innerHTML = '<i class="ph ph-caret-right"></i>';
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.current = (this.current + 1) % this.photos.length; renderMedia(); });

    const counter = document.createElement('span');
    counter.className = 'absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium z-[110]';

    this.lightbox.addEventListener('click', (e) => {
      // If clicking the backdrop directly, close it
      if (e.target === this.lightbox || e.target === mediaWrap) this.closeLightbox();
    });

    this.lightbox.append(mediaWrap, closeBtn, prevBtn, nextBtn, counter);
    document.body.appendChild(this.lightbox);
    document.body.style.overflow = 'hidden';

    const lbKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this.closeLightbox(); }
      if (e.key === 'ArrowLeft') { this.current = (this.current - 1 + this.photos.length) % this.photos.length; renderMedia(); }
      if (e.key === 'ArrowRight') { this.current = (this.current + 1) % this.photos.length; renderMedia(); }
    };
    document.addEventListener('keydown', lbKey);
    this._lbKeyHandler = lbKey;

    let startX = 0;
    let isDragging = false;
    this.lightbox.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.plyr__controls')) return;
      if (target === closeBtn || target === prevBtn || target === nextBtn) return;
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });
    this.lightbox.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) { this.current = (this.current - 1 + this.photos.length) % this.photos.length; renderMedia(); }
        else { this.current = (this.current + 1) % this.photos.length; renderMedia(); }
      }
    }, { passive: true });

    renderMedia();
  }

  private closeLightbox() {
    if (!this.lightbox) return;
    if (this._lbKeyHandler) document.removeEventListener('keydown', this._lbKeyHandler);
    if (this.lbPlayer) {
      this.lbPlayer.destroy();
      this.lbPlayer = null;
    }
    document.body.style.overflow = '';
    this.lightbox.remove();
    this.lightbox = null;
  }
}

customElements.define('vw-photo-gallery', PhotoGallery);
