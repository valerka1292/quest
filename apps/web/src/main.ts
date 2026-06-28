import './index.css';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/fill';
import './router.js';
import { initRouter } from './router.js';
import { store } from './store.js';
import Clarity from '@microsoft/clarity';

Clarity.init('xe1k5v501k');

async function bootstrap() {
  const app = document.getElementById('app')!;
  await initRouter(app);
}

bootstrap();
