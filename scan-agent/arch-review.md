# Технический аудит: VeilWorlds
_Дата: 2026-06-12_

## 🔴 Критические проблемы

### 1. `apps/admin/src/api/client.ts` — Потеря refresh-токена при ротации сессии

```typescript
20: async function tryRefresh(): Promise<string | null> {
21:   const refreshToken = getRefreshToken();
22:   if (!refreshToken) return null;
23: 
24:   try {
25:     const res = await fetch('/api/admin/auth/refresh', {
26:       method: 'POST',
27:       headers: { 'Content-Type': 'application/json' },
28:       body: JSON.stringify({ refreshToken }),
29:     });
30:     if (!res.ok) return null;
31:     const json = await res.json();
32:     const newToken = json.data?.accessToken;
33:     if (newToken) {
34:       localStorage.setItem('vw_admin_token', newToken);
35:       return newToken;
36:     }
37:     return null;
38:   } catch {
39:     return null;
40:   }
41: }
```

**Проблема:** При обновлении токена на сервере старый `refreshToken` аннулируется и генерируется новая пара (Token Rotation). Однако на клиенте метод `tryRefresh` сохраняет только новый `accessToken` (`vw_admin_token`), игнорируя возвращаемый новый `refreshToken`. При следующем истечении `accessToken` (каждые 15 минут) клиент отправляет старый (уже отозванный на сервере) `refreshToken`, что приводит к ошибке 401 и принудительному логауту администратора.

> 🏭 В индустрии это решается через `Token Rotation Storage Pattern` — так устроено в `Auth0 / Okta`.

**Решение:** Обновить клиент для сохранения обоих токенов:
```typescript
const newToken = json.data?.accessToken;
const newRefreshToken = json.data?.refreshToken;
if (newToken && newRefreshToken) {
  localStorage.setItem('vw_admin_token', newToken);
  localStorage.setItem('vw_admin_refresh', newRefreshToken);
  return newToken;
}
```

---

### 2. `apps/admin/src/api/client.ts` — Игнорирование ошибок HTTP при повторении конкурентных запросов

```typescript
58:       return new Promise<T>((resolve, reject) => {
59:         refreshQueue.push((newToken) => {
60:           const retryOptions = {
61:             ...options,
62:             headers: {
63:               ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
64:               Authorization: `Bearer ${newToken}`,
65:             },
66:           };
67:           fetch(targetUrl, retryOptions)
68:             .then(r => r.json())
69:             .then(j => resolve(j.data))
70:             .catch(reject);
71:         });
72:       });
```

**Проблема:** Очередь конкурентных запросов, ожидающих обновления токена, отправляет повторные запросы напрямую через `fetch`, но при этом никак не проверяет статус ответа (`r.ok`). В случае ошибки (например, 400 Bad Request или 500 Internal Error) промис просто разрешается со значением `j.data` (которое будет `undefined`), скрывая ошибку от вызывающего UI-кода.

> 🏭 В индустрии это решается через `Interceptor Pattern` — так устроено в `Axios`.

**Решение:** Выполнять валидацию ответа в цепочке обещаний перед разрешением:
```typescript
fetch(targetUrl, retryOptions)
  .then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error?.message || 'Помилка запроса');
    return json.data;
  })
  .then(resolve)
  .catch(reject);
```

---

## 🟠 Серьёзные архитектурные проблемы

### 3. `server/src/utils/priceCalc.ts` & `apps/web/src/utils/priceCalc.ts` — Дублирование бизнес-логики расчета стоимости

```typescript
// server/src/utils/priceCalc.ts и apps/web/src/utils/priceCalc.ts имеют идентичный код:
export function calcQuestPrice(params: {
  questSlug: 'silent-hill' | 'harry-potter';
  players: number;
  time: string;
  withActor?: boolean;
}): number {
...
```

**Проблема:** Дублирование логики ценообразования на сервере и клиенте нарушает принцип DRY. При изменении тарифов, коэффициентов вечернего времени или стоимости дополнительных игроков изменения придется вносить в оба репозитория вручную, что гарантирует расхождение в расчетах.

> 🏭 В индустрии это решается через `Shared Business Logic Library` — так устроено в `Monorepo / Nx / Turborepo`.

**Решение:** Вынести функции `calcQuestPrice` и `calcPackagePrice` в единый пакет `packages/shared` и импортировать их оттуда как на бэкенде, так и на фронтенде.

---

### 4. `server/src/app.ts` — God-компонент обратных вызовов Telegram без логирования и аудита

```typescript
92: setupTelegramCallbacks(
93:   async (id) => { await updateBookingStatus(id, 'CONFIRMED'); },
94:   async (id) => { await updateBookingStatus(id, 'CANCELLED'); },
95: ).catch(err => console.error('TG setup err:', err));
```

**Проблема:** В отличие от контроллеров HTTP, изменение статуса бронирования через callback-кнопки Telegram-бота происходит напрямую в БД без создания записей в `auditLog`. Администратор не увидит в журнале безопасности, кто и когда подтвердил или отменил бронь. Также в `telegram.service.ts` в режиме разработки запускается поллинг бота (`polling: !isProd`), что приводит к конфликтам `409 Conflict` API при локальном запуске нескольких инстансов/тестов.

> 🏭 В индустрии это решается через `Command Pattern & Event Sourcing` — так устроено в `Uber`.

**Решение:** Инкапсулировать изменение статуса бронирования в сервисный слой, генерирующий события аудита вне зависимости от транспорта (HTTP/Telegram):

```typescript
// Скелет теста для BookingService:
import { updateBookingStatus } from './booking.service';
describe('BookingService Status Updates', () => {
  it('should trigger audit log and update status via telegram handler', async () => {
    const spy = jest.spyOn(AuditLogger, 'auditLog');
    await updateBookingStatus('booking-id', 'CONFIRMED', { origin: 'TELEGRAM', userId: 'tg-user' });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ action: 'BOOKING_STATUS_CHANGE' }));
  });
});
```

---

### 5. `server/src` — Нулевое покрытие автотестами критических бизнес-сценариев

**Проблема:** В проекте полностью отсутствуют unit, integration и E2E тесты. Бизнес-логика создания бронирований, расчёта цены и проверки блокировки слотов не защищена от регрессии. Любые правки могут нарушить работу критического пути оплаты и бронирования.

> 🏭 В индустрии это решается через `Test-Driven Development (TDD)` — так устроено в `Google`.

**Решение:** Настроить Jest или Vitest в пакете `server` и покрыть тестами методы `booking.service.ts` и `priceCalc.ts`.

---

## 🟡 Проблемы производительности и качества

### 6. `server/src/routes/reviews.ts` — Избыточные запросы (N+1-like round-trip) при получении отзывов

```typescript
9:     const quest = await prisma.quest.findUnique({ where: { slug } });
...
21:       prisma.review.findMany({
22:         where: { questId: quest.id, status: 'APPROVED' },
...
```

**Проблема:** Приложение выполняет два последовательных запроса к базе данных: сначала на получение квеста по `slug`, затем на получение отзывов и их количества. Это снижает общую пропускную способность API.

> 🏭 В индустрии это решается через `Relational Filtering / JOIN` — так устроено в `Stripe`.

**Решение:** Объединить запросы в один, фильтруя отзывы по связанному полю `slug` квеста:
```typescript
prisma.review.findMany({
  where: { quest: { slug }, status: 'APPROVED' },
  ...
})
```

---

### 7. `server/src/services/booking.service.ts` — Неконсистентный парсинг дат при пустых параметрах

```typescript
10: export function parseLocalDate(dateStr: string): Date {
11:   if (!dateStr) return new Date();
12:   const parts = dateStr.split('T')[0].split('-');
13:   if (parts.length === 3) {
14:     const [y, m, d] = parts.map(Number);
15:     return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
16:   }
17:   return new Date(dateStr);
18: }
```

**Проблема:** Если `dateStr` не передана, функция возвращает `new Date()` (текущее время сервера с локальными часами, минутами и секундами). Если же дата передана в виде строки, она парсится как UTC 12:00:00. Из-за этого сравнения дат и блокировка слотов на текущий день будут вести себя непредсказуемо в зависимости от часового пояса сервера.

> 🏭 В индустрии это решается через `Strict Date Standard (ISO 8601)` — так устроено в `Netflix`.

**Решение:** Возвращать нормализованную дату для текущего дня без временного смещения:
```typescript
if (!dateStr) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
}
```

---

## 🟢 Структурные недочёты

### 8. `nginx/nginx.conf` — Перезапись заголовков безопасности в блоке статических файлов

```nginx
62:     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
63:       expires 1y;
64:       add_header Cache-Control "public, immutable";
65:     }
```

**Проблема:** В Nginx директивы `add_header` на уровне `location` переопределяют (стирают) все заголовки `add_header`, объявленные на родительском уровне (`http` или `server`). В результате все файлы стилей, скриптов и изображений отдаются без важнейших заголовков безопасности (CSP, HSTS, X-Content-Type-Options, X-Frame-Options).

> 🏭 В индустрии это решается через `Header inheritance / map directive` — так устроено в `Cloudflare`.

**Решение:** Прописать заголовки безопасности в отдельный файл конфигурации и подключать его через `include` во всех блоках `location`, либо дублировать их в блоке статики.

---

## Итоговая таблица

| # | Файл | Тип проблемы | Критичность |
|---|------|--------------|-------------|
| 1 | `apps/admin/src/api/client.ts` | Потеря refresh-токена при ротации | 🔴 Критическая |
| 2 | `apps/admin/src/api/client.ts` | Игнорирование HTTP-ошибок в очереди ретраев | 🔴 Критическая |
| 3 | `server/src/utils/priceCalc.ts` | Дублирование бизнес-логики расчета цен | 🟠 Серьёзная |
| 4 | `server/src/app.ts` | Изменение статуса без логирования и аудита в TG | 🟠 Серьёзная |
| 5 | `--` | Нулевое покрытие автотестами | 🟠 Серьёзная |
| 6 | `server/src/routes/reviews.ts` | Лишний round-trip (N+1) к БД для отзывов | 🟡 Производительность |
| 7 | `server/src/services/booking.service.ts` | Неконсистентность парсинга локальных дат | 🟡 Качество кода |
| 8 | `nginx/nginx.conf` | Сброс заголовков безопасности для статики | 🟢 Структурная |

---

## 🔵 Корневые причины (ТОЛЬКО В КОНЦЕ)

* **Кластер API-клиента админ-панели (проблемы #1, #2):** Спешка при интеграции JWT refresh token rotation привела к неполной реализации логики сохранения токенов на фронтенде и некорректной работе механизма повторения конкурентных запросов.
* **Кластер дублирования и связности (проблемы #3, #4):** Отсутствие единого монорепозиторного подхода к разделению кода привело к дублированию формул расчёта на клиенте и сервере, а также к выносу логики Telegram-бота в обход сервисных абстракций и системы аудита.
* **Кластер инфраструктуры качества (проблемы #5, #7, #8):** Отсутствие линтеров, тестов и стандартизации работы со временем на уровне СУБД/сервера создает высокий риск регрессий при развертывании.
