export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Налаштування читаються під час виклику, щоб їх можна було підмінити в тестах. */
export function getConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const isConfigured = () => {
  const { url, key } = getConfig();
  return Boolean(url && key);
};

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Базова обгортка над fetch для запитів до Supabase (REST та Auth).
 * token — JWT користувача; без нього використовується публічний anon-ключ.
 */
export async function request(path, { method = "GET", body, token, headers } = {}) {
  const { url, key } = getConfig();
  if (!url || !key) {
    throw new ApiError(
      "Supabase не налаштований: додайте VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY",
      0,
    );
  }

  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    const message =
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.error ||
      `Помилка запиту (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data;
}
