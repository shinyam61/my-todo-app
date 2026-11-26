import type { ErrorResponse, Todo } from "@/app/api/todos/route";

export const TITLE_MAX_LENGTH = 200;

export function toTodo(row: {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: Date | null;
  createdAt: Date;
}): Todo {
  return {
    id: row.id,
    title: row.title,
    isCompleted: row.isCompleted,
    // @db.Date は UTC の 0 時として返るので、日付部分だけを取り出す
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** "YYYY-MM-DD" を @db.Date 列に保存するための Date（UTC 0 時）に変換 */
export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function errorJson(error: string, status: number) {
  return Response.json({ error } satisfies ErrorResponse, { status });
}
