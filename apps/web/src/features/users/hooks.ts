import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { createUser, deleteUser, fetchRoles, fetchUsers, updateUser, type UpdateUserInput } from "./api";

function errorMessage(error: unknown): string | undefined {
  return error && typeof error === "object" && "response" in error
    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: fetchUsers });
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Đã thêm nhân viên", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({ title: "Không thể thêm nhân viên", description: errorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Đã cập nhật nhân viên", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({ title: "Không thể cập nhật nhân viên", description: errorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Đã xóa nhân viên", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({ title: "Không thể xóa nhân viên", description: errorMessage(error), variant: "destructive" });
    },
  });
}
