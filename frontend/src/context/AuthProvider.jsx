import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./authContext.js";
import { request, getConfig } from "../lib/http.js";
import { clearSession, loadSession, saveSession, toSession } from "../lib/session.js";

const REFRESH_MARGIN_SECONDS = 60;

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(() => loadSession());

  const persist = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  const reset = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      const data = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email, password },
      });
      persist(toSession(data));
    },
    [persist],
  );

  const signUp = useCallback(
    async (email, password, fullName) => {
      const data = await request("/auth/v1/signup", {
        method: "POST",
        body: { email, password, data: { full_name: fullName } },
      });
      if (data?.access_token) {
        persist(toSession(data));
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },
    [persist],
  );

  const signInWithGoogle = useCallback(() => {
    const { url } = getConfig();
    const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.assign(`${url}/auth/v1/authorize?provider=google&redirect_to=${redirect}`);
  }, []);

  /** Завершує вхід через Google: приймає hash із посилання виду #access_token=... */
  const completeOAuth = useCallback(
    async (hash) => {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      if (!accessToken) throw new Error("У посиланні немає токена доступу");

      const user = await request("/auth/v1/user", { token: accessToken });
      persist(
        toSession({
          access_token: accessToken,
          refresh_token: params.get("refresh_token"),
          expires_in: Number(params.get("expires_in")) || 3600,
          user,
        }),
      );
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    if (session) {
      try {
        await request("/auth/v1/logout", { method: "POST", token: session.access_token });
      } catch {
        // навіть якщо сервер недоступний, локальну сесію все одно завершуємо
      }
    }
    reset();
    queryClient.clear();
  }, [session, reset, queryClient]);

  // Автоматичне оновлення токена перед завершенням його терміну дії
  useEffect(() => {
    if (!session?.refresh_token) return undefined;

    const secondsLeft = session.expires_at - Date.now() / 1000 - REFRESH_MARGIN_SECONDS;
    const timer = setTimeout(
      async () => {
        try {
          const data = await request("/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            body: { refresh_token: session.refresh_token },
          });
          persist(toSession(data));
        } catch {
          reset();
        }
      },
      Math.max(secondsLeft, 0) * 1000,
    );

    return () => clearTimeout(timer);
  }, [session, persist, reset]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signInWithGoogle,
      completeOAuth,
      signOut,
    }),
    [session, signIn, signUp, signInWithGoogle, completeOAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
