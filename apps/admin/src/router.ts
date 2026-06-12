import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { BookingsPage } from './pages/BookingsPage.js';
import { ReviewsPage } from './pages/ReviewsPage.js';
import { SchedulePage } from './pages/SchedulePage.js';

type RouteHandler = () => HTMLElement;

const routes: Record<string, RouteHandler> = {
  '/admin': () => new LoginPage(),
  '/admin/dashboard': () => new DashboardPage(),
  '/admin/bookings': () => new BookingsPage(),
  '/admin/reviews': () => new ReviewsPage(),
  '/admin/schedule': () => new SchedulePage(),
};

let currentPage: HTMLElement | null = null;
let container: HTMLElement | null = null;

function render(path: string) {
  if (!container) return;

  const token = localStorage.getItem('vw_admin_token');
  if (!token && path !== '/admin') {
    history.replaceState({}, '', '/admin');
    path = '/admin';
  }

  const handler = routes[path] || routes['/admin'];
  const page = handler();

  if (currentPage) container.innerHTML = '';
  container.appendChild(page);
  currentPage = page;
}

export async function initRouter(appContainer: HTMLElement) {
  container = appContainer;

  window.addEventListener('popstate', () => {
    render(window.location.pathname);
  });

  render(window.location.pathname);
}

export function navigate(path: string) {
  history.pushState({}, '', path);
  render(path);
}
