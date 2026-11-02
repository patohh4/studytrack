# StudyTrack

Студентський органайзер: завдання, курси, календар дедлайнів.
Фронтенд — React + Vite, бекенд — власний Node/Express API з JWT-авторизацією.

## Швидкий старт

### 1. Встановити залежності

```bash
# Сервер
cd server && npm install && cd ..

# Фронтенд
cd frontend && npm install && cd ..

# Кореневі скрипти (concurrently)
npm install
```

### 2. Налаштувати .env

```bash
# Сервер
cp server/.env.example server/.env

# Фронтенд
cp frontend/.env.example frontend/.env
```

### 3. Запустити

**Обидва сервери одночасно:**

```bash
npm run dev:all
```

**Або окремо (два термінали):**

```bash
# Термінал 1 — бекенд
cd server && npm run dev

# Термінал 2 — фронтенд
cd frontend && npm run dev
```

- API: http://localhost:3001/api
- Фронтенд: http://localhost:5173

## Команди

| Команда               | Де       | Опис                          |
| --------------------- | -------- | ----------------------------- |
| `npm run dev:all`     | корінь   | Запуск сервера + клієнта     |
| `npm run dev`         | server/  | Запуск API (nodemon)          |
| `npm run dev`         | frontend/| Запуск Vite dev-сервера       |
| `npm run build`       | frontend/| Production-збірка            |
| `npm run lint`        | frontend/| ESLint                        |
| `npm run format`      | frontend/| Prettier                      |
| `npm run test`        | frontend/| Vitest (unit-тести)           |
| `npm run e2e`         | frontend/| Cypress e2e                   |

## Ендпоінти API

Префікс: `/api` · Авторизація: `Authorization: Bearer <JWT>` · Помилки: `{ "message": "..." }`

| Метод  | Шлях             | Опис                              | Авторизація | Статус-коди     |
| ------ | ---------------- | --------------------------------- | ----------- | --------------- |
| POST   | /auth/register   | Реєстрація + демо-дані            | ні          | 201, 400        |
| POST   | /auth/login      | Вхід → { token, user }            | ні          | 200, 401        |
| GET    | /auth/me         | Поточний користувач               | так         | 200, 401        |
| GET    | /tasks           | Список завдань                    | так         | 200, 401        |
| POST   | /tasks           | Створити завдання                 | так         | 201, 400, 401   |
| PATCH  | /tasks/:id       | Оновити завдання                  | так         | 200, 400, 404, 401 |
| DELETE | /tasks/:id       | Видалити завдання                 | так         | 204, 404, 401   |
| GET    | /courses         | Список курсів                    | так         | 200, 401        |
| POST   | /courses         | Створити курс                    | так         | 201, 400, 401   |
| GET    | /events          | Події (фільтр ?from=&to=)         | так         | 200, 401        |
| GET    | /profile         | Профіль користувача              | так         | 200, 401        |
| PATCH  | /profile         | Оновити профіль                  | так         | 200, 400, 401   |
| GET    | /health          | Перевірка працездатності          | ні          | 200             |

## Приклади запитів (curl)

Дивіться `api-requests.http` — містить готові curl-команди для всіх ендпоінтів.

### Реєстрація

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Іван","email":"ivan@uzhnu.edu.ua","password":"secret123"}'
```

### Логін

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@uzhnu.edu.ua","password":"secret123"}'
```

### Завдання (з токеном)

```bash
curl http://localhost:3001/api/tasks \
  -H "Authorization: Bearer <токен>"
```

## Структура

```
studytrack/
  server/          # Express API (порт 3001)
    src/
      index.js
      routes/      # auth, tasks, courses, events, profile
      middleware/    # auth (JWT), validate (zod), errorHandler
      data/db.js    # lowdb JSON-сховище + seed
    .env.example
    README.md
  frontend/        # React + Vite (порт 5173)
    src/
      api/          # client.js, auth.js, tasks.js, courses.js, events.js, profile.js
      context/      # AuthProvider (JWT)
      hooks/        # useAuth, useTasks, useCourses
      lib/          # tasks.js, calendar.js, progress.js
      components/   # Dashboard, Calendar, CourseList, Login, TaskDetails, ...
    .env.example
  api-requests.http # Приклади всіх запитів
  package.json      # dev:all (concurrently)
```

## Технології

- **Бекенд:** Express, lowdb (JSON), jsonwebtoken, bcryptjs, zod, cors, dotenv
- **Фронтенд:** React 19, Vite, React Router 7, TanStack Query 5
- **Тести:** Vitest (unit), Cypress (e2e)
- **Якість:** ESLint, Prettier, Husky + lint-staged
