import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tasksApi from "../api/tasks.js";

/** GET: список завдань поточного користувача. */
export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: tasksApi.fetchTasks });
}

/** POST: створення завдання. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/** PATCH: оновити завдання (статус, поля). */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }) => tasksApi.updateTask(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/** PATCH: позначити завдання виконаним / повернути в роботу. */
export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }) =>
      tasksApi.updateTask(id, {
        status: done ? "done" : "todo",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/** DELETE: видалення завдання. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
