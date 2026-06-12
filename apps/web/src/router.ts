type RouteFactory = () => Promise<HTMLElement>;

const routes: Record<string, RouteFactory> = {
  '/': async () => {
    const { HomePage } = await import('./pages/HomePage.js');
    return new HomePage();
  },
  '/silent-hill': async () => {
    const { QuestPage } = await import('./pages/QuestPage.js');
    return new QuestPage('silent-hill');
  },
  '/harry-potter': async () => {
    const { QuestPage } = await import('./pages/QuestPage.js');
    return new QuestPage('harry-potter');
  },
  '/certificate': async () => {
    const { CertificatePage } = await import('./pages/CertificatePage.js');
    return new CertificatePage();
  },
};

let container: HTMLElement | null = null;

export function navigate(path: string) {
  history.pushState({}, '', path);
  render(path);
}

async function render(path: string) {
  if (!container) return;

  const factory = routes[path] ?? (async () => {
    const { NotFoundPage } = await import('./pages/NotFoundPage.js');
    return new NotFoundPage();
  });

  const page = await factory();
  container.innerHTML = '';
  container.appendChild(page);

  window.scrollTo(0, 0);
}

export async function initRouter(appContainer: HTMLElement) {
  container = appContainer;

  window.addEventListener('popstate', () => {
    render(window.location.pathname);
  });

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-link]') as HTMLAnchorElement | null;
    if (target) {
      e.preventDefault();
      navigate(target.getAttribute('data-link')!);
    }
  });

  await render(window.location.pathname);
}
