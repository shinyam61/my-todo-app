import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { errorJson, TITLE_MAX_LENGTH, toTodo } from "@/lib/todos";

// ---- API の型（画面側は import type で使う） ----

export type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string; // ISO 8601
};

export type ErrorResponse = { error: string };

export type GetTodosResponse = { todos: Todo[] };

export type CreateTodoRequest = { title: string };
export type CreateTodoResponse = { todo: Todo };

// ---- ハンドラー ----

/** ログイン中のユーザーの TODO 一覧（新しい順） */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorJson("ログインが必要です。", 401);

  const rows = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ todos: rows.map(toTodo) } satisfies GetTodosResponse);
}

/** TODO の追加 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorJson("ログインが必要です。", 401);

  const body = (await request.json().catch(() => null)) as
    | Partial<CreateTodoRequest>
    | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) return errorJson("タイトルを入力してください。", 400);
  if (title.length > TITLE_MAX_LENGTH) {
    return errorJson(`タイトルは${TITLE_MAX_LENGTH}文字以内にしてください。`, 400);
  }

  // user_id は必ずサーバー側でセッションから設定する（リクエストの値は使わない）
  const row = await prisma.todo.create({
    data: { title, userId: user.id },
  });

  return Response.json({ todo: toTodo(row) } satisfies CreateTodoResponse, {
    status: 201,
  });
}
