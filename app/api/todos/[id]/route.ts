import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { errorJson, toTodo } from "@/lib/todos";
import type { Todo } from "../route";

// ---- API の型（画面側は import type で使う） ----

export type UpdateTodoRequest = { isCompleted: boolean };
export type UpdateTodoResponse = { todo: Todo };
export type DeleteTodoResponse = { id: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 完了状態の切り替え */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/todos/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return errorJson("ログインが必要です。", 401);

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return errorJson("TODO が見つかりません。", 404);

  const body = (await request.json().catch(() => null)) as
    | Partial<UpdateTodoRequest>
    | null;
  if (typeof body?.isCompleted !== "boolean") {
    return errorJson("isCompleted には true か false を指定してください。", 400);
  }

  // id と user_id の両方で絞り込み、他人の TODO は更新できないようにする
  const [row] = await prisma.todo.updateManyAndReturn({
    where: { id, userId: user.id },
    data: { isCompleted: body.isCompleted },
  });
  if (!row) return errorJson("TODO が見つかりません。", 404);

  return Response.json({ todo: toTodo(row) } satisfies UpdateTodoResponse);
}

/** TODO の削除 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/todos/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return errorJson("ログインが必要です。", 401);

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return errorJson("TODO が見つかりません。", 404);

  // id と user_id の両方で絞り込み、他人の TODO は削除できないようにする
  const { count } = await prisma.todo.deleteMany({
    where: { id, userId: user.id },
  });
  if (count === 0) return errorJson("TODO が見つかりません。", 404);

  return Response.json({ id } satisfies DeleteTodoResponse);
}
