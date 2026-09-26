# StudyTrack — Chrome Extension

Автоматично захоплює `MoodleSession` cookie і `sesskey` коли ти заходиш на
`moodle.uzhnu.edu.ua`, і відправляє їх у StudyTrack без жодних ручних дій.

---

## Як це працює

```
Ти заходиш на Moodle (Google OAuth, як завжди)
        ↓
Розширення бачить що сторінка завантажилась
        ↓
Читає MoodleSession cookie + sesskey зі сторінки
        ↓
Відправляє в StudyTrack (moodle-proxy Edge Function)
        ↓
Курси та дедлайни оновлено ✓
```

Синхронізація відбувається **автоматично** при кожному заході на Moodle,
але не частіше ніж раз на 12 годин (щоб не заважати).

---

## Встановлення (1 раз)

### 1. Заповни config.js

Відкрий `extension/config.js` і встав свої значення:

```js
const CONFIG = {
  SUPABASE_URL:     "https://xxxx.supabase.co",   // Supabase → Settings → API
  SUPABASE_ANON_KEY: "eyJhbGci...",               // anon public key
  MOODLE_URL:       "https://moodle.uzhnu.edu.ua",
  MOODLE_COOKIE_NAME: "MoodleSession",
};
```

### 2. Встанови в Chrome

1. Відкрий `chrome://extensions`
2. Увімкни **"Режим розробника"** (правий верхній кут)
3. Натисни **"Завантажити розпаковане розширення"**
4. Обери папку `extension/`
5. Розширення з'явиться в панелі

### 3. Додай Access Token

Розширенню потрібен твій Supabase access token щоб знати **який** користувач
підключає Moodle.

1. Відкрий StudyTrack у браузері
2. Відкрий DevTools → Application → Local Storage → `sb-...-auth-token`
3. Скопіюй значення поля `access_token`
4. Натисни іконку розширення → встав токен → **Зберегти**

> Токен живе ~1 годину. Якщо синхронізація перестала працювати — оновити
> сторінку StudyTrack (токен оновиться) і повтори крок 3-4.

> **В майбутньому** це можна автоматизувати через `chrome.identity` API.

---

## Структура файлів

```
extension/
├── manifest.json   — конфіг розширення (Manifest V3)
├── background.js   — service worker: слухає Moodle, захоплює сесію
├── popup.html      — UI розширення
├── popup.js        — логіка UI
├── config.js       — твої ключі (не комітити в git!)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

> **Важливо:** додай `extension/config.js` в `.gitignore` щоб не засвітити ключі.

---

## Іконки

Розширення очікує іконки в папці `extension/icons/`. Потрібні три розміри:
`icon16.png`, `icon48.png`, `icon128.png`.

Можеш використати будь-яке зображення або згенерувати через
[favicon.io](https://favicon.io).

---

## Troubleshooting

| Проблема | Рішення |
|----------|---------|
| "MoodleSession cookie не знайдено" | Залогінься в Moodle через Google |
| "sesskey не знайдено" | Перейди на будь-яку сторінку Moodle (не на login) |
| "Спочатку введи Supabase токен" | Відкрий popup і збережи access token |
| Синхронізація не спрацьовує автоматично | Перевір чи розширення має доступ до `moodle.uzhnu.edu.ua` в `chrome://extensions` |
| Помилка 401 від Supabase | Access token протух — оновити в popup |
