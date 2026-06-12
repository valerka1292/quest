# Полная настройка на чистом сервере

## 1. Подготовка сервера

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка базовых пакетов
apt install -y git curl ufw

# Создание отдельного пользователя
adduser quest
usermod -aG sudo quest

# Дальше все команды выполняем от quest, а не от root
su - quest
cd ~
```

## 2. Настройка фаервола (UFW)

```bash
# Разрешить SSH (важно — иначе потеряешь доступ!)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить фаервол
sudo ufw enable

# Проверить
sudo ufw status
```

Другие порты (5432 Postgres, 6379 Redis, 3001 сервер) открывать не нужно — они внутри Docker, наружу смотрит только Nginx на 80 и 443.

## 3. Установка Docker

```bash
curl -fsSL https://get.docker.com | sh

# Добавить quest в группу docker (чтоб не писать sudo)
sudo usermod -aG docker quest

# Выйти и зайти обратно, чтоб применилось
exit
su - quest
cd /opt

# Проверить
docker --version
```

## 4. Клонирование проекта

```bash
git clone https://github.com/valerka1292/quest.git ~/quest
cd ~/quest
```

## 5. Установка Node.js (только для сборки фронтенда, в продакшене не нужен)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash
sudo apt install nodejs -y
node --version
npm --version
```

## 6. Сборка фронтенда

```bash
npm install
npm run build:shared
npm run build:web
npm run build:admin
```

После сборки появятся папки:
- `apps/web/dist` — готовый сайт
- `apps/admin/dist` — админка

## 7. Настройка окружения

```bash
cp server/.env.example server/.env
nano server/.env
```

Приведи `.env` к такому виду (подставь свои значения):

```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/veilworlds?schema=public"
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=https://veilworlds.quest
JWT_SECRET=<придумай_случайную_длинную_строку>
JWT_REFRESH_SECRET=<другую_случайную_длинную_строку>
REDIS_URL=redis://redis:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=booking@veilworlds.quest
TELEGRAM_BOT_TOKEN=<если_нужно>
TELEGRAM_CHAT_ID=<если_нужно>
```

Важно: `DATABASE_URL` и `REDIS_URL` указывают на `postgres` и `redis` — это имена сервисов внутри Docker, так и должно быть.

JWT секреты придумай сам (например, `openssl rand -hex 32`).

## 8. Настройка домена в Nginx

```bash
nano nginx/nginx.conf
```

Замени `veilworlds.quest` и `www.veilworlds.quest` на свой домен.

## 9. Запуск

```bash
# Сборка и запуск контейнеров
docker compose up -d

# Проверка
docker compose ps
```

Какие контейнеры поднимутся и какие порты внутри:

| Контейнер | Внутренний порт | Наружу | Назначение |
|-----------|-----------------|--------|------------|
| `postgres` | 5432 | ❌ | База данных |
| `redis` | 6379 | ❌ | Кэш |
| `server` | 3001 | ❌ | Fastify API |
| `nginx` | 80, 443 | ✅ 80/tcp, 443/tcp | Веб-сервер |

Снаружи доступны только порты 80 и 443 (через Nginx). Всё остальное только внутри сети Docker.

## 10. Миграции БД и наполнение данными

```bash
docker compose exec server npx prisma generate
docker compose exec server npx prisma migrate dev
docker compose exec server npx tsx prisma/seed.ts
```

## 11. SSL-сертификат (HTTPS)

Установка certbot и получение сертификата:

```bash
# 1. Установить certbot (написан на Python)
sudo apt install certbot -y

# 2. Создать папки для файлов certbot
mkdir -p certbot/www certbot/conf

# 3. Остановить nginx (чтоб освободить порт 80 для certbot)
docker compose stop nginx

# 4. Получить сертификат (certbot сам поднимает сервер на 80 порту)
sudo certbot certonly --standalone -d veilworlds.quest -d www.veilworlds.quest

# 5. Сертификаты сохранятся в /etc/letsencrypt/live/veilworlds.quest/
#    nginx.conf уже настроен на этот путь, ничего менять не надо

# 6. Запустить всё обратно
docker compose up -d
```

После этого `http://veilworlds.quest` будет редиректить на `https://veilworlds.quest`.

Автообновление сертификата (живёт 90 дней, обновляется раз в 2 месяца):

```bash
sudo crontab -e
# Добавить строку:
0 0 1 */2 * certbot renew --quiet && docker compose -f /home/quest/quest/docker-compose.yml exec nginx nginx -s reload
```

## 12. Перезапуск после обновлений

```bash
cd /home/quest/quest
git pull
npm install
npm run build:shared
npm run build:web
npm run build:admin
docker compose down
docker compose up -d --build
docker compose exec server npx prisma generate
docker compose exec server npx prisma migrate dev
```

## Важные моменты

- **Не работай под root** — создан пользователь `quest`, все рутинные команды делай от него
- `.env` не хранится в git, создаётся вручную на сервере
- Фаервол открывает только 22 (SSH), 80 (HTTP), 443 (HTTPS)
- База данных и Redis доступны только внутри Docker, снаружи — никак
- Статика (фронтенд) собирается заранее и лежит в `apps/web/dist` / `apps/admin/dist`, nginx раздаёт её напрямую
- Все запросы к `/api/` nginx проксирует на сервер (`http://server:3001`)

Готово. После этих шагов сайт будет доступен по `https://veilworlds.quest`.
