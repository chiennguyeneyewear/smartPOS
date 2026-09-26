// The message the API sent with an error response, if there is one.
export function errorMessage(error: unknown): string | undefined {
  return error && typeof error === "object" && "response" in error
    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;
}
