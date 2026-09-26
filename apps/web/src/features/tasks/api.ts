import type { EmployeeInput, EmployeeKind, EmployeeSummary, TaskBranchSummary, TaskInput, TaskSummary, UpdateTaskInput } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface TaskQuery {
  status?: string;
  assigneeId?: string;
  branchId?: string;
  from?: string;
  to?: string;
}

export async function fetchTasks(query: TaskQuery): Promise<TaskSummary[]> {
  const { data } = await apiClient.get<{ data: TaskSummary[] }>("/tasks", { params: query });
  return data.data;
}

export async function createTask(input: TaskInput): Promise<TaskSummary> {
  const { data } = await apiClient.post<TaskSummary>("/tasks", input);
  return data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskSummary> {
  const { data } = await apiClient.patch<TaskSummary>(`/tasks/${id}`, input);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

export async function fetchEmployees(kind: EmployeeKind): Promise<EmployeeSummary[]> {
  const { data } = await apiClient.get<{ data: EmployeeSummary[] }>("/employees", { params: { kind } });
  return data.data;
}

export async function createEmployee(input: EmployeeInput): Promise<EmployeeSummary> {
  const { data } = await apiClient.post<EmployeeSummary>("/employees", input);
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}

export async function fetchTaskBranches(): Promise<TaskBranchSummary[]> {
  const { data } = await apiClient.get<{ data: TaskBranchSummary[] }>("/task-branches");
  return data.data;
}

export async function createTaskBranch(name: string): Promise<TaskBranchSummary> {
  const { data } = await apiClient.post<TaskBranchSummary>("/task-branches", { name });
  return data;
}

export async function deleteTaskBranch(id: string): Promise<void> {
  await apiClient.delete(`/task-branches/${id}`);
}
