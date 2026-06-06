# TON Wallets

> События кошельков TON, синхронизация, аналитика свапов и PnL жеттонов/портфеля — на Next.js 16, Prisma 7 и TonAPI.

[🇬🇧 English documentation](./README.md)

---

## ✨ Возможности

- **Обозреватель кошельков** — просмотр проанализированных кошельков TON, событий, действий и истории транзакций с пагинацией и фильтрами.
- **Портфель жеттонов и PnL** — отслеживание балансов жеттонов, изменений цен (24ч / 7д / 30д) и прибыли/убытка портфеля.
- **Аналитика свапов** — инференс свапов из транзакций, агрегация статистики и отображение сводок PnL по жеттонам.
- **Кросс-чейн свапы (Omnistone)** — обмен токенами между сетями через STON.fi Omniston SDK с подключением EVM-кошельков (Reown / WalletConnect).
- **Авторизация** — вход через TON Connect кошелёк, GitHub или Google; ролевой доступ (админ по email или адресу кошелька); JWT + ротация refresh-токенов.
- **Движок синхронизации** — загрузка данных кошельков из TonAPI в Postgres для быстрых запросов и исторического анализа.
- **Docker-ready** — многоэтапный Dockerfile, `docker-compose.yml` с health checks, лимитами ресурсов и поддержкой Dokploy/Traefik.

---

## 🛠 Технологический стек

| Слой | Технология |
|------|------------|
| Фреймворк | Next.js 16 (App Router, standalone output) |
| Язык | TypeScript |
| База данных | PostgreSQL через Prisma 7 |
| Авторизация | Auth.js v5 (NextAuth) + TON Connect |
| UI | React 19, Radix UI, shadcn/ui, Tailwind CSS 4 |
| Блокчейн | @ton/core, @ton/ton, @tonconnect/sdk, TonAPI |
| Свапы | STON.fi Omniston SDK, Reown AppKit (WalletConnect) |
| Состояние | TanStack React Query, TanStack Table |
| Контейнеризация | Docker (Node 24 Alpine), Docker Compose |

---

## 📋 Требования

- **Node.js** ≥ 20 (рекомендуется 24)
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 15 (или используйте сервис из Docker Compose)
- **Аккаунт TonAPI** — [tonapi.io](https://tonapi.io) для получения API-ключа
- **Секрет Auth.js** — генерируется через `npx auth secret`

---

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/rAndom1zeeeR/ton-wallets.git
cd ton-wallets
pnpm install
```

### 2. Настройка окружения

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local` — см. [Переменные окружения](#-переменные-окружения).

### 3. Настройка базы данных

```bash
pnpm prisma:generate
pnpm prisma:migrate   # dev: создаёт и применяет миграции
# или для production:
pnpm prisma:deploy    # применяет отложенные миграции
```

### 4. Запуск dev-сервера

```bash
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) — приложение перенаправит на `/wallets`.

---

## 🐳 Docker

### Сборка и запуск

```bash
docker compose up -d
```

`docker-compose.yml` включает health check на `/api/health` и лимиты ресурсов (1 CPU / 2 ГБ RAM).

### Обязательные переменные (Docker)

Установите перед `docker compose up`:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/ton_wallets"
export NEXT_PUBLIC_TONAPI_BASE_URL="https://tonapi.io"
export TONAPI_API_KEY="ваш-ключ"
```

> **Важно:** Выполните `pnpm prisma:deploy` с той же `DATABASE_URL` перед первым деплоем.

---

## 🔧 Переменные окружения

### Обязательные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | Строка подключения PostgreSQL | `postgresql://user:pass@localhost:5432/ton_wallets` |
| `AUTH_SECRET` | Ключ для подписи JWT/сессий Auth.js. Генерация: `npx auth secret` | вывод `openssl rand hex 32` |

### TonAPI

| Переменная | Область видимости | Описание |
|------------|-------------------|----------|
| `NEXT_PUBLIC_TONAPI_BASE_URL` | клиент + сервер | Базовый URL TonAPI (по умолчанию: `https://tonapi.io`) |
| `TONAPI_API_KEY` | только сервер | API-ключ для авторизованных запросов к TonAPI. **Никогда** не используйте префикс `NEXT_PUBLIC_` для этого ключа. |

### Авторизация

| Переменная | Описание |
|------------|----------|
| `AUTH_GITHUB_ID` | Client ID GitHub OAuth App (опционально) |
| `AUTH_GITHUB_SECRET` | Client Secret GitHub OAuth App (опционально) |
| `AUTH_GOOGLE_ID` | Client ID Google Cloud Console OAuth (опционально) |
| `AUTH_GOOGLE_SECRET` | Client Secret Google Cloud Console OAuth (опционально) |
| `AUTH_ADMIN_EMAILS` | Email-адреса через запятую, получающие роль ADMIN при входе |
| `AUTH_ADMIN_WALLETS` | Адреса кошельков TON через запятую (raw `workchain:hex`) для роли ADMIN |
| `AUTH_TON_PROOF_DOMAINS` | Дополнительные разрешённые домены `ton_proof` (через запятую, опционально) |

### URL приложения

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_APP_URL` | Публичный URL приложения (манифест, fallback для ton_proof). По умолчанию используется хост запроса при включённом `trustHost`. |

### Omnistone (кросс-чейн свапы)

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | ID проекта Reown (WalletConnect) — [cloud.reown.com](https://cloud.reown.com) |
| `NEXT_PUBLIC_OMNISTON_WS_URL` | URL WebSocket Omniston (по умолчанию: `wss://omni-ws.ston.fi` — боевой endpoint) |

> **Примечание:** Боевой WebSocket endpoint Omniston (`wss://omni-ws.ston.fi`) настроен по умолчанию. Устанавливать `NEXT_PUBLIC_OMNISTON_WS_URL` нужно только для переопределения (например, для тестирования на staging).

---

## 📁 Структура проекта

```
ton-wallets/
├── prisma/                  # Схема и миграции Prisma
│   └── schema.prisma        # Модели БД (ChainAddress, ChainJetton, ChainAction и др.)
├── public/
│   └── tonconnect-manifest.json  # Манифест TON Connect dApp
├── src/
│   ├── app/                 # Страницы и API-маршруты Next.js App Router
│   │   ├── api/             # API-эндпоинты (health, wallets, sync и др.)
│   │   ├── wallets/         # Страницы списка и деталей кошельков
│   │   ├── omnistone/       # Страница кросс-чейн свапов (STON.fi Omniston)
│   │   ├── sign-in/         # Страница входа
│   │   ├── profile/         # Профиль пользователя
│   │   ├── layout.tsx       # Корневой layout (провайдеры, тема, авторизация)
│   │   └── page.tsx         # Главная → редирект на /wallets
│   ├── modules/
│   │   ├── auth/            # Авторизация (TON Connect, OAuth, роли, refresh-токены)
│   │   ├── wallet/          # Обозреватель кошельков, события, синхронизация
│   │   ├── jetton/          # Цены жеттонов, PnL, портфель
│   │   ├── swap/            # Инференс свапов, статистика, сводки PnL
│   │   └── omniston/        # Интеграция Omniston SDK, демо-данные, провайдеры
│   ├── shared/
│   │   ├── config/          # Валидация env (Zod), конфигурация авторизации, публичный конфиг
│   │   ├── components/      # Общие UI-компоненты (theme provider и др.)
│   │   ├── infrastructure/  # Prisma-клиент, API-хелперы
│   │   ├── lib/             # Утилиты
│   │   └── presentation/    # Общие UI-примитивы (на базе shadcn)
│   ├── auth.ts              # Конфигурация NextAuth
│   └── proxy.ts             # Реэкспорт авторизации
├── Dockerfile               # Многоэтапная production-сборка (Node 24 Alpine)
├── docker-compose.yml       # Production-деплой с health checks
├── next.config.ts           # Конфигурация Next.js (standalone, transpile, aliases)
└── package.json
```

---

## 🔐 Авторизация

Приложение поддерживает несколько способов входа:

1. **TON Connect** — основной способ. Пользователи входят, доказывая владение кошельком TON через `ton_proof`. Манифест расположен по адресу `/tonconnect-manifest.json`.
2. **GitHub OAuth** — опционально, настраивается через `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
3. **Google OAuth** — опционально, настраивается через `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

### Роли

- **User** — роль по умолчанию при входе.
- **Admin** — назначается при совпадении `AUTH_ADMIN_EMAILS` или `AUTH_ADMIN_WALLETS`.

### Стратегия токенов

- **Access-токен** — JWT, срок действия 15 минут.
- **Refresh-токен** — HTTP-only cookie, ротация при каждом входе; отзыв при выходе.

---

## 🔄 Интеграция Omnistone

Страница `/omnistone` предоставляет функциональность кросс-чейн свапов через [STON.fi Omniston](https://ston.fi):

- **Omniston SDK** — маршрутизация и выполнение свапов через WebSocket.
- **Reown AppKit** — подключение EVM-кошельков (MetaMask, WalletConnect и др.).
- **Демо-режим** — моковые данные доступны в `src/modules/omniston/demo/` для разработки без доступа к живому API.

### Настройка

1. Создайте проект на [cloud.reown.com](https://cloud.reown.com) и скопируйте ID проекта.
2. Установите `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` в `.env.local`.
3. Боевой WebSocket Omniston (`wss://omni-ws.ston.fi`) уже настроен по умолчанию — дополнительная настройка не требуется.
4. (Опционально) Переопределите URL WebSocket через `NEXT_PUBLIC_OMNISTON_WS_URL` для тестирования.

---

## 🗄 База данных

Схема Prisma включает следующие основные модели:

- **ChainAddress** — адреса TON с флагами скама, счётчиками событий/действий.
- **ChainJetton** — метаданные жеттонов, цены (USD/TON), изменения за 24ч/7д/30д.
- **ChainAction** — действия транзакций (переводы, свапы, минты, сжигания).
- **ChainWalletPnl** — отслеживание PnL жеттонов по кошелькам.
- **User / Account / Session** — модели Auth.js с ролью и адресом кошелька.

### Миграции

```bash
pnpm prisma:migrate   # Development: создание и применение миграции
pnpm prisma:deploy    # Production: применение отложенных миграций
pnpm prisma:studio    # Просмотр БД на localhost:5555
```

---

## 📡 API-эндпоинты

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/health` | GET | Проверка доступности (проверяет подключение к БД) |
| `/api/wallets/[address]/summary` | GET | Сводка по кошельку (балансы, PnL) |
| `/api/wallets/[address]/events` | GET | История событий кошелька (пагинация, фильтры) |
| `/api/sync` | POST | Запуск синхронизации кошелька из TonAPI |

### Smoke-тесты

```bash
curl -sS "http://localhost:3000/api/health"
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/summary"
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/events?limit=2"
```

---

## 🧪 Скрипты

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Запуск dev-сервера (порт 3000) |
| `pnpm build` | Production-сборка |
| `pnpm start` | Запуск production-сервера |
| `pnpm lint` | Проверка ESLint |
| `pnpm lint:fix` | Автоисправление ESLint |
| `pnpm format` | Форматирование Prettier |
| `pnpm format:check` | Проверка Prettier |
| `pnpm prisma:generate` | Генерация Prisma-клиента |
| `pnpm prisma:migrate` | Создание и применение миграции (dev) |
| `pnpm prisma:deploy` | Применение отложенных миграций (prod) |
| `pnpm prisma:studio` | Открытие Prisma Studio |
| `pnpm prisma:reset` | Сброс базы данных (только dev) |

---

## 🚢 Деплой

### Vercel

Приложение развёрнуто на [ton-wallets.vercel.app](https://ton-wallets.vercel.app). Установите все переменные окружения в дашборде Vercel.

### Docker / Dokploy

```bash
docker compose up -d
```

Убедитесь, что `DATABASE_URL` и `TONAPI_API_KEY` установлены перед запуском. Health check контейнера проверяет `/api/health` каждые 15 секунд.

### Заметки для production

- `AUTH_SECRET` **обязателен** в production — без него `/api/auth/session` возвращает 500.
- `TONAPI_API_KEY` должен быть серверной переменной (без префикса `NEXT_PUBLIC_`).
- `tonconnect-manifest.json` в `public/` использует production URL — обновите его для кастомных доменов.
- Next.js `output: "standalone"` включён для оптимальных Docker-образов.

---

## 📄 Лицензия

Приватный репозиторий. Все права защищены.