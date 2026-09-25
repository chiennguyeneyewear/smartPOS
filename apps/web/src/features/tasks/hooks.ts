import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTaskInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import { createTask, deleteTask, fetchAssignees, fetchTasks, updateTask, type TaskQuery } from "./api";

function errorMessage(error: unknown): string | undefined {
  return error && typeof error === "object" && "response" in error
    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;
}

export function useTasks(query: TaskQuery) {
  return useQuery({ queryKey: ["tasks", query], queryFn: () => fetchTasks(query), refetchInterval: 60_000 });
}

export function useAssignees() {
  return useQuery({ queryKey: ["tasks", "assignees"], queryFn: fetchAssignees, staleTime: 5 * 60_000 });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Đã giao công việc", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không thể giao công việc", description: errorMessage(error), variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Đã cập nhật công việc", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không thể cập nhật công việc", description: errorMessage(error), variant: "destructive" }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Đã xóa công việc", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không thể xóa công việc", description: errorMessage(error), variant: "destructive" }),
  });
}
