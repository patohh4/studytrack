const KEY = "studytrack.session";

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // сховище може бути недоступне (приватний режим) — тоді сесія живе лише в пам'яті
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ігноруємо
  }
}

/** Перетворює відповідь Supabase Auth на об'єкт сесії. */
export function toSession(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: data.user,
  };
}
