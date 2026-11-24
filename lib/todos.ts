import type { ErrorResponse, Todo } from "@/app/api/todos/route";

export const TITLE_MAX_LENGTH = 200;

export function toTodo(row: {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
}): Todo {
  return {
    id: row.id,
    title: row.title,
    isCompleted: row.isCompleted,
    createdAt: row.createdAt.toISOString(),
  };
}

export function errorJson(error: string, status: number) {
  return Response.json({ error } satisfies ErrorResponse, { status });
}
