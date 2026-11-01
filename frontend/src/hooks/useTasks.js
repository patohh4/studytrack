import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth.js";
import { request } from "../lib/http.js";

const TASKS_PATH = "/rest/v1/tasks";
const RETURN = { Prefer: "return=representation" };

/** GET: список завдань поточного користувача (RLS на сервері відфільтрує чужі). */
export function useTasks() {
  const { session } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ["tasks", session?.user?.id],
    enabled: Boolean(token),
    queryFn: () =>
      request(`${TASKS_PATH}?select=*,courses(name,color)&order=due_at.asc.nullslast`, { token }),
  });
}

function useTaskMutation(mutationFn) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const token = session?.access_token;
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: (variables) => mutationFn({ token, userId, ...variables }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/** POST: створення завдання. */
export function useCreateTask() {
  return useTaskMutation(({ token, userId, title, description, dueAt, courseId }) =>
    request(TASKS_PATH, {
      method: "POST",
      token,
      headers: RETURN,
      body: {
        user_id: userId,
        title,
        description: description || null,
        due_at: dueAt || null,
        course_id: courseId || null,
      },
    }),
  );
}

/** PATCH: позначити завдання виконаним або повернути в роботу. */
export function useToggleTask() {
  return useTaskMutation(({ token, id, done }) =>
    request(`${TASKS_PATH}?id=eq.${id}`, {
      method: "PATCH",
      token,
      headers: RETURN,
      body: { completed_at: done ? new Date().toISOString() : null },
    }),
  );
}

/** DELETE: видалення завдання. */
export function useDeleteTask() {
  return useTaskMutation(({ token, id }) =>
    request(`${TASKS_PATH}?id=eq.${id}`, { method: "DELETE", token }),
  );
}
