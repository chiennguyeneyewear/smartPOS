import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function errorHandler(error: FastifyError | ZodError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "ValidationError",
      message: "Dữ liệu không hợp lệ",
      details: error.flatten(),
    });
  }

  const statusCode = "statusCode" in error && error.statusCode ? error.statusCode : 500;

  if (statusCode >= 500) {
    request.log.error(error);
  }

  return reply.code(statusCode).send({
    error: error.name ?? "InternalServerError",
    message: statusCode >= 500 ? "Đã xảy ra lỗi hệ thống" : error.message,
  });
}
