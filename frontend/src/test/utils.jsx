import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AuthProvider from "../context/AuthProvider.jsx";
import { routes } from "../routes.jsx";

export const TEST_SESSION = {
  access_token: "token-123",
  refresh_token: "refresh-123",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "user-1", email: "stas@uzhnu.edu.ua", user_metadata: { full_name: "Станіслав" } },
};

export const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

/** Обгортка з провайдерами для тестів компонентів і хуків. */
export function Providers({ children, client = makeClient() }) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export function renderApp(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

/** Підміна fetch: відповідь підбирається за частиною адреси. */
export function mockFetch(handlers) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url, ...options });
    const key = Object.keys(handlers).find((part) => url.includes(part));
    const result = key ? handlers[key] : { status: 404, body: { message: "not mocked" } };
    const { status = 200, body = null } = typeof result === "function" ? result(options) : result;
    return new Response(body === null ? "" : JSON.stringify(body), { status });
  };
  fn.calls = calls;
  return fn;
}
