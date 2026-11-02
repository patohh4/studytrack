import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./authContext.js";
import * as authApi from "../api/auth.js";
import { getToken } from "../api/client.js";

/**
 * Провайдер авторизації для власного Express API.
 * Токен зберігається в localStorage, користувач — у стані.
 */
export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const signIn = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const data = await authApi.register(name, email, password);
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    authApi.logout();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(getToken()),
      signIn,
      signUp,
      signOut,
    }),
    [user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
