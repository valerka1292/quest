import { div } from '../utils/dom.js';
import { Nav } from '../components/layout/Nav.js';
import { Footer } from '../components/layout/Footer.js';
import { SplitScreen } from '../components/home/SplitScreen.js';
import { StoriesScreen } from '../components/home/StoriesScreen.js';
import { PackagesSection } from '../components/home/PackagesSection.js';
import { ExtrasSection } from '../components/home/ExtrasSection.js';
import { CertificateBanner } from '../components/home/CertificateBanner.js';
import { ReviewsSection } from '../components/home/ReviewsSection.js';
import { BookingOverlay } from '../components/booking/BookingOverlay.js';
import { store } from '../store.js';

export class HomePage extends HTMLElement {
  private isMobile = window.innerWidth < 768;

  connectedCallback() {
    this.render();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (wasMobile !== this.isMobile) this.render();
  };

  private render() {
    this.innerHTML = '';
    this.className = 'min-h-dvh bg-bg-base text-text-primary';

    const nav = new Nav();
    const footer = new Footer();
    const bookingOverlay = new BookingOverlay();

    const hero = this.isMobile ? new StoriesScreen() : new SplitScreen();
    const packages = new PackagesSection();
    const extras = new ExtrasSection();
    const certBanner = new CertificateBanner();
    const reviews = new ReviewsSection();

    this.append(nav, hero, packages, extras, certBanner, reviews, footer, bookingOverlay);
  }
}

customElements.define('vw-home-page', HomePage);
