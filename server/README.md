# StudyTrack API Server

Власний Node/Express сервер для StudyTrack — студентського органайзера.
Зберігання у JSON-файлі через lowdb, авторизація через JWT, валідація через zod.

## Вимоги

- Node.js 18+

## Налаштування

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Сервер запуститься на `http://localhost:3001`.

## Змінні середовища (.env)

| Змінна        | Опис                              | За замовчуванням |
| ------------- | --------------------------------- | ---------------- |
| PORT          | Порт сервера                      | 3001             |
| JWT_SECRET    | Секрет для підписання JWT         | —                |
| CLIENT_ORIGIN | Origin фронтенду для CORS         | http://localhost:5173 |
| DB_FILE       | Ім'я файлу бази даних lowdb       | db.json           |

## Демо-дані

При реєстрації нового користувача сервер автоматично створює:

- 3 курси (Веб-технології, Алгоритми, Бази даних)
- 4 завдання (з різними статусами та пріоритетами)
- 3 події календаря (лекція, дедлайн, консультація)
- Профіль з першим досягненням

## Скрипти

- `npm run dev` — запуск з nodemon (автоматичний перезапуск)
- `npm start` — запуск без перезапуску

## Структура

```
server/
  src/
    index.js              # точка входу, налаштування Express
    routes/               # роути (auth, tasks, courses, events, profile)
    middleware/            # auth, validate, errorHandler
    data/db.js            # lowdb + seed demo data
  .env.example
  README.md
```

## Примітка

`db.json` створюється автоматично при першому запуску та доданий у .gitignore.
