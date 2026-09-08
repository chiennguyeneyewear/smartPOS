import { useQuery } from "@tanstack/react-query";
import { fetchBranches } from "./api";

export function useBranches() {
  return useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
}
