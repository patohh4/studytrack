import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as coursesApi from "../api/courses.js";

/** GET: список курсів користувача. */
export function useCourses() {
  return useQuery({ queryKey: ["courses"], queryFn: coursesApi.fetchCourses });
}

/** POST: створення курсу. */
export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: coursesApi.createCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}
