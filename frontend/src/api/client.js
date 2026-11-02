const TOKEN_KEY = "studytrack.token";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // сховище може бути недоступне (приватний режим)
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ігноруємо
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Базовий URL з VITE_API_URL, без завершального слеша. */
function baseUrl() {
  const url = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
  return url.replace(/\/$/, "");
}

/**
 * Базова обгортка над fetch для запитів до власного API.
 * @param {string} path — шлях без /api (наприклад "/auth/login")
 * @param {{ method?: string, body?: unknown, token?: string, headers?: Record<string,string> }} opts
 * @returns {Promise<any>} — JSON-відповідь або null для 204
 */
export async function request(path, { method = "GET", body, token, headers } = {}) {
  const headersObj = { ...headers };

  const auth = token ?? getToken();
  if (auth) {
    headersObj.Authorization = `Bearer ${auth}`;
  }

  if (body !== undefined) {
    headersObj["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: headersObj,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    const message = data?.message || `Помилка запиту (${response.status})`;
    throw new ApiError(message, response.status);
  }

  // 204 No Content
  if (response.status === 204) return null;

  return data;
}
