import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTaskInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import {
  createEmployee,
  createTask,
  deleteEmployee,
  deleteTask,
  fetchEmployees,
  fetchTasks,
  updateTask,
  type TaskQuery,
} from "./api";

function errorMessage(error: unknown): string | undefined {
  return error && typeof error === "object" && "response" in error
    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;
}

export function useTasks(query: TaskQuery) {
  return useQuery({ queryKey: ["tasks", query], queryFn: () => fetchTasks(query), refetchInterval: 60_000 });
}

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
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

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Đã thêm nhân viên", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không thể thêm nhân viên", description: errorMessage(error), variant: "destructive" }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Đã xóa nhân viên", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không thể xóa nhân viên", description: errorMessage(error), variant: "destructive" }),
  });
}
