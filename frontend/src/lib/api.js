import { supabase } from "./supabase.js";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

const getGoogleRedirectUrl = () => {
  const origin = window.location.origin;
  if (origin.includes("localhost")) return "http://localhost:5173";
  return origin;
};

export const authApi = {
  signInWithGoogle: () =>
    requireSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getGoogleRedirectUrl()}/auth/callback`,
        scopes: [
          "https://www.googleapis.com/auth/classroom.courses.readonly",
          "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
          "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
          "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
        ].join(" "),
      },
    }),
  signIn: (email, password) =>
    requireSupabase().auth.signInWithPassword({ email, password }),
  signUp: (email, password, fullName) =>
    requireSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }),
  resetPassword: (email) =>
    requireSupabase().auth.resetPasswordForEmail(email),
  signOut: () => requireSupabase().auth.signOut(),
};
