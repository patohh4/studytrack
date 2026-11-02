import { request, setToken, clearToken } from "./client.js";

/** POST /api/auth/register {name, email, password} -> {token, user} */
export async function register(name, email, password) {
  const data = await request("/auth/register", {
    method: "POST",
    body: { name, email, password },
    // Не використовуємо токен при реєстрації
    token: null,
  });
  setToken(data.token);
  return data;
}

/** POST /api/auth/login {email, password} -> {token, user} */
export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
  });
  setToken(data.token);
  return data;
}

/** GET /api/auth/me -> поточний користувач */
export async function getMe() {
  return request("/auth/me");
}

export function logout() {
  clearToken();
}
