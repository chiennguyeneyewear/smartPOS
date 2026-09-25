import type { TaskInput, TaskSummary, UpdateTaskInput } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface TaskQuery {
  status?: string;
  assigneeId?: string;
  from?: string;
  to?: string;
}

export interface Assignee {
  id: string;
  username: string;
}

export async function fetchTasks(query: TaskQuery): Promise<TaskSummary[]> {
  const { data } = await apiClient.get<{ data: TaskSummary[] }>("/tasks", { params: query });
  return data.data;
}

export async function fetchAssignees(): Promise<Assignee[]> {
  const { data } = await apiClient.get<{ data: Assignee[] }>("/tasks/assignees");
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
