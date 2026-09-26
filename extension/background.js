// ─── StudyTrack Extension — Background Service Worker ────────────────────────
// Слухає навігацію на moodle.uzhnu.edu.ua, автоматично читає MoodleSession
// cookie і витягує sesskey зі сторінки, потім відправляє в StudyTrack.

import { CONFIG } from "./config.js";

const MOODLE_ORIGIN = new URL(CONFIG.MOODLE_URL).origin;

// ── Утиліти ──────────────────────────────────────────────────────────────────

/**
 * Зберігає статус і дані сесії в chrome.storage.local.
 * @param {"idle"|"capturing"|"connected"|"error"} status
 * @param {object} extra - додаткові поля для збереження
 */
async function saveState(status, extra = {}) {
  await chrome.storage.local.set({ status, updatedAt: Date.now(), ...extra });
}

/**
 * Читає MoodleSession cookie для домену Moodle.
 * @returns {Promise<string|null>}
 */
async function getMoodleCookie() {
  const cookie = await chrome.cookies.get({
    url: CONFIG.MOODLE_URL,
    name: CONFIG.MOODLE_COOKIE_NAME,
  });
  return cookie?.value ?? null;
}

/**
 * Виконує скрипт на вкладці Moodle і повертає sesskey.
 * Moodle зберігає sesskey в глобальному об'єкті window.M.cfg.sesskey.
 * @param {number} tabId
 * @returns {Promise<string|null>}
 */
async function getSesskey(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.M?.cfg?.sesskey ?? null,
    });
    return result?.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Відправляє MoodleSession + sesskey в StudyTrack через moodle-proxy Edge Function.
 * Для авторизації використовує збережений Supabase access token.
 * @param {string} moodleSession
 * @param {string} sesskey
 * @param {string} accessToken
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendToStudyTrack(moodleSession, sesskey, accessToken) {
  const res = await fetch(
    `${CONFIG.SUPABASE_URL}/functions/v1/moodle-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        moodleUrl: CONFIG.MOODLE_URL,
        moodleSession,
        sesskey,
        action: "connect",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    return { ok: false, error: text };
  }

  const data = await res.json().catch(() => ({}));
  if (data.error) return { ok: false, error: data.error };
  return { ok: true };
}

// ── Основна логіка захоплення ─────────────────────────────────────────────────

/**
 * Головна функція: читає cookie + sesskey і відправляє в StudyTrack.
 * @param {number} tabId
 */
async function captureAndSync(tabId) {
  await saveState("capturing");

  // 1. Перевіряємо чи є збережений Supabase access token
  const { accessToken } = await chrome.storage.local.get("accessToken");
  if (!accessToken) {
    await saveState("error", { errorMsg: "Спочатку введи Supabase токен у розширенні." });
    return;
  }

  // 2. Читаємо MoodleSession cookie
  const moodleSession = await getMoodleCookie();
  if (!moodleSession) {
    await saveState("error", { errorMsg: "MoodleSession cookie не знайдено. Залогінься в Moodle." });
    return;
  }

  // 3. Витягуємо sesskey зі сторінки
  const sesskey = await getSesskey(tabId);
  if (!sesskey) {
    await saveState("error", { errorMsg: "sesskey не знайдено на сторінці. Спробуй ще раз." });
    return;
  }

  // 4. Відправляємо в StudyTrack
  const result = await sendToStudyTrack(moodleSession, sesskey, accessToken);

  if (!result.ok) {
    await saveState("error", { errorMsg: result.error ?? "Помилка відправки в StudyTrack." });
    // Показуємо notification про помилку
    chrome.notifications.create("sync-error", {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "StudyTrack — помилка",
      message: result.error ?? "Не вдалося синхронізувати з Moodle.",
    });
    return;
  }

  // 5. Зберігаємо успішний стан
  await saveState("connected", {
    moodleSession,
    sesskey,
    syncedAt: Date.now(),
  });

  // Показуємо notification про успіх
  chrome.notifications.create("sync-ok", {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "StudyTrack — синхронізовано ✓",
    message: "Moodle підключено! Курси та дедлайни оновлено.",
  });
}

// ── Слухачі подій ─────────────────────────────────────────────────────────────

/**
 * Автоматично запускає захоплення коли юзер заходить на Moodle і сторінка
 * повністю завантажилась (щоб window.M.cfg.sesskey вже був доступний).
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Чекаємо повного завантаження сторінки на домені Moodle
  if (changeInfo.status !== "complete") return;
  if (!tab.url?.startsWith(MOODLE_ORIGIN)) return;

  // Не захоплюємо на сторінці логіну — там ще немає сесії
  if (tab.url.includes("/login/")) return;

  // Перевіряємо чи вже є актуальна сесія (не старіша за 12 годин)
  const { status, syncedAt } = await chrome.storage.local.get(["status", "syncedAt"]);
  const twelveHours = 12 * 60 * 60 * 1000;
  const isRecent = syncedAt && (Date.now() - syncedAt) < twelveHours;

  // Якщо вже синхронізовано недавно — не заважаємо знову
  if (status === "connected" && isRecent) return;

  await captureAndSync(tabId);
});

/**
 * Слухає повідомлення від popup.js для ручного тригеру.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "MANUAL_SYNC") {
    // Знаходимо активну вкладку з Moodle
    chrome.tabs.query({ url: `${MOODLE_ORIGIN}/*` }, async (tabs) => {
      if (!tabs.length) {
        await saveState("error", { errorMsg: "Відкрий Moodle у браузері спочатку." });
        sendResponse({ ok: false, error: "Moodle не відкрито" });
        return;
      }
      await captureAndSync(tabs[0].id);
      sendResponse({ ok: true });
    });
    return true; // тримаємо канал відкритим для async відповіді
  }

  if (message.type === "SAVE_TOKEN") {
    chrome.storage.local.set({ accessToken: message.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "CLEAR") {
    chrome.storage.local.clear(() => sendResponse({ ok: true }));
    return true;
  }
});
