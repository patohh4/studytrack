import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth.js";
import { request } from "../lib/http.js";

const COURSES_PATH = "/rest/v1/courses";

/** GET: список курсів користувача. */
export function useCourses() {
  const { session } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ["courses", session?.user?.id],
    enabled: Boolean(token),
    queryFn: () => request(`${COURSES_PATH}?select=*&order=name.asc`, { token }),
  });
}

/** POST: створення курсу. */
export function useCreateCourse() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }) =>
      request(COURSES_PATH, {
        method: "POST",
        token: session?.access_token,
        headers: { Prefer: "return=representation" },
        body: { user_id: session?.user?.id, name },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}
