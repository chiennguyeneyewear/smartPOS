import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductImportRow, ProductInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  fetchUnits,
  importProducts,
  updateProduct,
  type ProductQuery,
} from "./api";

export function useProducts(query: ProductQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query),
    enabled: options.enabled ?? true,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

export function useUnits() {
  return useQuery({ queryKey: ["units"], queryFn: fetchUnits });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Đã thêm sản phẩm", variant: "success" });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) => updateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Đã cập nhật sản phẩm", variant: "success" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Đã xóa sản phẩm", variant: "success" });
    },
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, branchId }: { rows: ProductImportRow[]; branchId?: string }) =>
      importProducts(rows, branchId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      const errorNote = result.errors.length > 0 ? `, ${result.errors.length} lỗi` : "";
      toast({
        title: "Import hoàn tất",
        description: `${result.created} sản phẩm mới, ${result.updated} cập nhật${errorNote}`,
        variant: result.errors.length > 0 ? "default" : "success",
      });
    },
  });
}
