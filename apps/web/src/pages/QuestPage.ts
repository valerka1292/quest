import { div } from '../utils/dom.js';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { QuestHero } from '../components/quest/QuestHero.js';
import { QuestInfo } from '../components/quest/QuestInfo.js';
import { PhotoGallery } from '../components/quest/PhotoGallery.js';
import { ReviewList } from '../components/quest/ReviewList.js';
import { ReviewForm } from '../components/quest/ReviewForm.js';
import { BookingOverlay } from '../components/booking/BookingOverlay.js';
import { fetchQuest } from '../api/quests.js';
import { staticQuests } from '../data/staticQuests.js';
import type { Quest } from '@veilworlds/shared';

export class QuestPage extends HTMLElement {
  private slug: string;
  private quest: Quest | null = null;

  constructor(slug: string) {
    super();
    this.slug = slug;
  }

  async connectedCallback() {
    this.className = 'block min-h-dvh bg-bg-base text-text-primary';
    this.innerHTML = '';

    const nav = new Nav();
    const footer = new Footer();
    const bookingOverlay = new BookingOverlay();
    this.append(nav, footer, bookingOverlay);

    const loading = div({ class: 'flex items-center justify-center min-h-[60dvh]' },
      div({ class: 'animate-pulse text-text-muted text-lg' }, 'Завантаження...')
    );
    this.insertBefore(loading, footer);

    try {
      this.quest = await fetchQuest(this.slug);
    } catch {
      this.quest = staticQuests.find(q => q.slug === this.slug) || null;
    }

    loading.remove();

    if (!this.quest) {
      this.insertBefore(
        div({ class: 'flex items-center justify-center min-h-[60dvh]' },
          div({ class: 'text-text-muted text-lg' }, 'Квест не знайдено')
        ),
        footer
      );
      return;
    }

    const hero = new QuestHero(this.quest);
    hero.setAttribute('data-animate', 'fade-in');

    const info = new QuestInfo(this.quest);
    info.setAttribute('data-animate', 'slide-up');
    info.id = 'contacts';

    const gallery = new PhotoGallery(this.quest.photos);
    gallery.setAttribute('data-animate', 'fade-in');
    gallery.id = 'gallery';

    const reviewList = new ReviewList(this.slug);
    reviewList.setAttribute('data-animate', 'slide-up');
    reviewList.id = 'reviews';

    const reviewForm = new ReviewForm(this.slug);
    reviewForm.setAttribute('data-animate', 'fade-in');

    const fragment = document.createDocumentFragment();
    fragment.append(hero, info, gallery, reviewList, reviewForm);
    this.insertBefore(fragment, footer);
  }
}

customElements.define('vw-quest-page', QuestPage);
