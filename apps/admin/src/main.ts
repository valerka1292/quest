import './index.css';
import { initRouter } from './router.js';

async function bootstrap() {
  const app = document.getElementById('app')!;
  await initRouter(app);
}

bootstrap();
