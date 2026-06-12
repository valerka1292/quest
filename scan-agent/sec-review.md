# Security Audit: VeilWorlds
_Дата: 2026-06-12 | Метод: Static Analysis Only_

## Attack Surface Summary
Проект є платформою для бронювання квестів VeilWorlds, що складається з клієнтського фронтенду (`apps/web`), адмін-панелі (`apps/admin`), спільного пакета валідації (`packages/shared`) та Fastify/Node.js сервера (`server`) з базою даних PostgreSQL (Prisma ORM). Вся система деплоїться за допомогою Nginx як зворотного проксі. Основна поверхня атаки включає публічні ендпойнти для створення бронювань та відгуків, а також адміністративні API, захищені JWT-токенами з механізмом ротації.

---

## 🔴 Critical (возможен RCE / утечка всех данных / полный обход auth)

### VULN-01: Hardcoded Telegram Bot Token та Chat ID у файлі `.env`

**CWE:** CWE-798 — Use of Hardcoded Credentials
**Attack Vector:** Network
**Auth Required:** No

У конфігураційному файлі `.env` зафіксовані чутливі дані для доступу до Telegram Bot API:
```javascript
// server/.env:L13-14
13: TELEGRAM_BOT_TOKEN=8380679501:AAEGi1QyWi-fx34jMHKZ7v9BIWXq2f1So8Q
14: TELEGRAM_CHAT_ID=-5148635764
```

**Сценарий атаки:**
Атакувальник отримує токен бота з репозиторію або витоку конфігураційних файлів і використовує його для повного контролю над Telegram-ботом, читання повідомлень, перехоплення внутрішніх повідомлень компанії, або перенаправлення запитів підтвердження/скасування бронювань.

**Impact:**
Втрата конфіденційності повідомлень про бронювання клієнтів (ім'я, телефон, адреса пошти, коментарі), а також несанкціонована зміна статусів бронювань через Telegram API.

> 🏭 В индустрии защита реализована через использование систем управления секретами (Vault, AWS Secrets Manager, Docker Secrets) або передачу змінних оточення під час розгортання без збереження у сховищі вихідного коду — стандарт OWASP ASVS 3.5.

**Remediation:**
Видалити токен бота з `.env` у репозиторії та передавати секрети виключно через змінні оточення середовища виконання Docker/сервера.

---

## 🟠 High (значимые уязвимости, реальный impact)

### VULN-02: Небезпечне використання `innerHTML` з несанованим користувацьким вводом у клієнтських додатках (DOM XSS)

**CWE:** CWE-79 — Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')
**Attack Vector:** Network
**Auth Required:** No

У багатьох файлах клієнтського додатку та адмін-панелі дані користувачів виводяться безпосередньо через властивість `innerHTML`, наприклад, при відображенні номера квитка:
```typescript
// apps/web/src/components/booking/ConfirmTicket.ts:L37-39
37:     card.innerHTML = `
38:       <p class="text-text-muted text-xs font-mono tracking-widest mb-1">КВИТОК БРОНЮВАННЯ</p>
39:       <p class="text-lg font-mono font-bold tracking-wider text-white mb-4">${ticketNum}</p>
```
Та в адмін-панелі при відображенні даних клієнтів:
```typescript
// apps/admin/src/pages/BookingsPage.ts:L283-295
283:       <div class="bg-bg-card border border-border-subtle rounded-card p-6 w-full max-w-lg text-white space-y-4 max-h-[90vh] overflow-y-auto">
284:         <h3 class="text-lg font-bold">Редактирование заявки ${b.ticketNumber}</h3>
285:         <form id="edit-booking-form" class="space-y-4">
286:           <div class="grid grid-cols-2 gap-4">
287:             <div class="flex flex-col gap-1">
288:               <label class="text-xs text-text-muted">Имя</label>
289:               <input type="text" name="firstName" value="${b.firstName}" ...>
```

**Сценарий атаки:**
Користувач робить бронювання, вказавши як ім'я (`firstName`) або прізвище (`lastName`) XSS-навантаження, наприклад: `<img src=x onerror=alert(document.cookie)>`. Коли адміністратор відкриває сторінку бронювань в адмін-панелі, XSS-вектор виконується у його браузері.

**Impact:**
Викрадення адміністративних JWT-токенів з `localStorage`, виконання несанкціонованих дій від імені адміністратора (видалення бронювань, схвалення фейкових відгуків тощо).

> 🏭 В индустрии защита реализована через використання безпечних методів роботи з DOM, таких як `textContent`, `setAttribute`, або санітизацію HTML-рядків за допомогою DOMPurify перед вставкою — стандарт OWASP WSTG-client-03.

**Remediation:**
Використовувати безпечні функції створення елементів `el` та `div` з додаванням текста через текстові вузли (як реалізовано в `apps/web/src/utils/dom.ts`) замість прямої шаблонізації в `innerHTML`.

---

## 🟡 Medium (ограниченный impact или сложная эксплуатация)

### VULN-03: Відсутність перевірки авторизації при отриманні бронювання за номером квитка

**CWE:** CWE-306 — Missing Authentication for Critical Function
**Attack Vector:** Network
**Auth Required:** No

Публічний ендпойнт `/api/bookings/:ticketNumber` повертає детальну інформацію про бронювання без будь-якої авторизації:
```typescript
// server/src/routes/bookings.ts:L54-64
54:   app.get('/api/bookings/:ticketNumber', async (request, reply) => {
55:     const { ticketNumber } = request.params as { ticketNumber: string };
56:     const booking = await getBookingByTicket(ticketNumber);
57:     if (!booking) {
58:       return reply.status(404).send({
59:         success: false,
60:         error: { code: 'NOT_FOUND', message: 'Бронювання не знайдено' },
61:       });
62:     }
63:     return reply.send({ success: true, data: booking });
64:   });
```

**Сценарий атаки:**
Хоча номер квитка генерується з використанням UUID, атакуючий може отримати номери квитків за допомогою інших векторів (наприклад, перехоплення листування, витік логів або підглядання) і отримати повний доступ до персональних даних клієнта.

**Impact:**
Утечка персональних даних клієнтів (ПІБ, телефон, email, коментарі до замовлення).

> 🏭 В индустрии защита реализована через обмеження доступу до персональних даних лише для авторизованого власника сесії або використання короткоживучих одноразових токенів доступу — стандарт OWASP ASVS 4.1.

**Remediation:**
Вимагати автентифікацію для отримання деталей квитка або обмежити повертаємі дані лише нечутливими полями (час, дата, назва квесту), маснуючи контакти клієнта.

---

## 🟢 Low / Best Practices

### VULN-04: Слабкий механізм визначення часу життя Refresh-токенів

**CWE:** CWE-613 — Insufficient Session Expiration
**Attack Vector:** Local
**Auth Required:** Yes

Функція `parseExpiresIn` не підтримує значення терміну дії в годинах або хвилинах для обчислення дати закінчення в БД, повертаючи значення за замовчуванням (7 днів) при будь-котрих невідомих суфіксах:
```typescript
// server/src/routes/admin/auth.ts:L10-21
10: function parseExpiresIn(expiresIn: string): number {
11:   const match = expiresIn.match(/^(\d+)([dhms])$/);
12:   if (!match) return 7;
13:   const val = parseInt(match[1], 10);
14:   switch (match[2]) {
15:     case 'd': return val;
16:     case 'h': return 0; // Означає додавання 0 днів!
17:     case 'm': return 0;
18:     case 's': return 0;
19:     default: return 7;
20:   }
21: }
```

**Impact:**
Refresh-токени в базі даних матимуть невірну дату завершення життєвого циклу, якщо в конфігурації вказано формати відмінні від днів (наприклад, `12h`), що призводить до негайної інвалідації або некоректной перевірки термінів дії.

**Remediation:**
Використовувати бібліотеки на кшталт `ms` для точного розрахунку мілісекунд терміну дії токенів замість власного обмеженого парсера.

---

## Итоговая таблица

| # | Файл | CWE | Тип | Severity |
|---|------|-----|-----|----------|
| 1 | `server/.env` | CWE-798 | Hardcoded Telegram credentials | 🔴 Critical |
| 2 | Multiple in `apps/` | CWE-79 | DOM XSS via innerHTML | 🟠 High |
| 3 | `server/src/routes/bookings.ts` | CWE-306 | Unauthorized ticket information retrieval | 🟡 Medium |
| 4 | `server/src/routes/admin/auth.ts` | CWE-613 | Flawed refresh token expiration calculation | 🟢 Low |

## Что НЕ покрывает этот аудит
— Динамическое тестирование (runtime)
— Зависимости (отдельный инструмент: npm audit / safety / trivy)
— Инфраструктура (вне scope)

## 🔵 Критические цепочки атак

**VULN-01 → Telegram Bot API:**
Атакувальник отримує токен бота з `.env` -> Надсилає запити до офіційного Telegram API від імені бота -> Отримує історію повідомлень та ідентифікатори адміністраторів -> Надсилає фейкові запити `confirm` або `cancel` на callback-ендпойнти сервера -> Несанкціоновано змінює статус або скасовує легітимні бронювання квестів.
