import { useContext } from "react";
import { AuthContext } from "../context/authContext.js";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth потрібно викликати всередині AuthProvider");
  return context;
}
