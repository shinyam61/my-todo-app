"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type {
  CreateTodoRequest,
  CreateTodoResponse,
  ErrorResponse,
  GetTodosResponse,
  Todo,
} from "@/app/api/todos/route";
import type {
  DeleteTodoResponse,
  UpdateTodoRequest,
  UpdateTodoResponse,
} from "@/app/api/todos/[id]/route";
import {
  addDays,
  addDaysFromToday,
  daysBetween,
  DUE_DAYS_MAX,
  dueStatus,
  formatDueDate,
  remainingLabel,
  todayString,
  type DueStatus,
} from "@/lib/due-date";
import { TITLE_MAX_LENGTH } from "@/lib/todos";
import { createClient } from "@/lib/supabase/client";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await res.json().catch(() => null)) as T | ErrorResponse | null;
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? data.error
        : "通信エラーが発生しました。";
    throw new ApiError(message, res.status);
  }
  return data as T;
}

const DUE_STYLES: Record<DueStatus, string> = {
  normal: "text-zinc-400",
  soon: "text-yellow-400",
  urgent: "text-orange-400",
  overdue: "text-red-400",
};

/** 入力された「何日後」を検証。空欄は null（期限なし）、不正なら undefined */
function parseDueDays(value: string): number | null | undefined {
  if (value.trim() === "") return null;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const n = Number(value);
  return n <= DUE_DAYS_MAX ? n : undefined;
}

function DueDateLabel({ todo, today }: { todo: Todo; today: string | null }) {
  if (!todo.dueDate) return null;
  // today が決まるまで（初回描画）は日付だけ表示する
  if (!today) {
    return (
      <p className="mt-0.5 text-xs text-zinc-400">
        期限日：{formatDueDate(todo.dueDate)}
      </p>
    );
  }
  const remaining = daysBetween(today, todo.dueDate);
  // 完了済みは期限を過ぎていても色を付けない
  const color = todo.isCompleted
    ? "text-zinc-600"
    : DUE_STYLES[dueStatus(remaining)];
  return (
    <p className={`mt-0.5 text-xs ${color}`}>
      期限日：{formatDueDate(todo.dueDate)}
      {!todo.isCompleted && <span className="ml-1">（{remainingLabel(remaining)}）</span>}
    </p>
  );
}

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDays, setDueDays] = useState("");
  // 「今日」の日付。描画中に現在時刻を読むとプリレンダーでエラーになるため、
  // マウント後に設定し、画面に戻ってきたときにも計算し直す
  const [today, setToday] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace("/login");
      return;
    }
    setError(e instanceof Error ? e.message : "エラーが発生しました。");
  }

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));

    api<GetTodosResponse>("/api/todos")
      .then((data) => setTodos(data.todos))
      .catch(handleError)
      .finally(() => setLoading(false));

    const refreshToday = () => setToday(todayString());
    refreshToday();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshToday();
    };
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const days = parseDueDays(dueDays);
    if (days === undefined) {
      setError(`期限は 0〜${DUE_DAYS_MAX} の整数で入力してください。`);
      return;
    }

    setAdding(true);
    setError(null);
    try {
      const { todo } = await api<CreateTodoResponse>("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          title: trimmed,
          dueDate: days === null ? null : addDaysFromToday(days),
        } satisfies CreateTodoRequest),
      });
      setTodos((prev) => [todo, ...prev]);
      setTitle("");
      setDueDays("");
    } catch (e) {
      handleError(e);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(target: Todo) {
    const isCompleted = !target.isCompleted;
    setError(null);
    // 先に画面を更新し、失敗したら元に戻す
    setTodos((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, isCompleted } : t)),
    );
    try {
      const { todo } = await api<UpdateTodoResponse>(`/api/todos/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted } satisfies UpdateTodoRequest),
      });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
    } catch (e) {
      setTodos((prev) => prev.map((t) => (t.id === target.id ? target : t)));
      handleError(e);
    }
  }

  async function handleDelete(target: Todo) {
    setError(null);
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== target.id));
    try {
      await api<DeleteTodoResponse>(`/api/todos/${target.id}`, {
        method: "DELETE",
      });
    } catch (e) {
      setTodos(snapshot);
      handleError(e);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const remaining = todos.filter((t) => !t.isCompleted).length;
  const parsedDueDays = parseDueDays(dueDays);
  const duePreview =
    today && typeof parsedDueDays === "number"
      ? formatDueDate(addDays(today, parsedDueDays))
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="shrink-0 text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
            My TODO App
          </h1>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="hidden min-w-0 truncate text-sm text-zinc-400 sm:block"
              title={email ?? undefined}
            >
              {email ?? "…"}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {signingOut ? "ログアウト中…" : "ログアウト"}
            </button>
          </div>
        </div>
        {/* スマホではメールアドレスをヘッダーの下段に表示 */}
        {email && (
          <p className="truncate px-4 pb-2 text-xs text-zinc-500 sm:hidden">{email}</p>
        )}
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/40 sm:p-8">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="new-todo" className="sr-only">
                新しい TODO
              </label>
              <input
                id="new-todo"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="やることを入力…"
                maxLength={TITLE_MAX_LENGTH}
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              />
              <button
                type="submit"
                disabled={adding || !title.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? "追加中…" : "追加"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <label htmlFor="due-days" className="text-zinc-400">
                期限
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="due-days"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={DUE_DAYS_MAX}
                  step={1}
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                  placeholder="なし"
                  aria-describedby="due-preview"
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                />
                <span className="text-zinc-400">日後</span>
              </div>
              <span id="due-preview" className="text-xs text-zinc-500">
                {duePreview
                  ? `期限日：${duePreview}`
                  : parsedDueDays === undefined
                    ? `0〜${DUE_DAYS_MAX} の整数で入力`
                    : "空欄なら期限なし"}
              </span>
            </div>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <div className="mt-6">
            {loading ? (
              <p className="py-8 text-center text-sm text-zinc-500">読み込み中…</p>
            ) : todos.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                TODO はまだありません。上の入力欄から追加しましょう。
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-zinc-500">
                  残り {remaining} 件 / 全 {todos.length} 件
                </p>
                <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
                  {todos.map((todo) => (
                    <li key={todo.id} className="group flex items-center gap-3 py-3">
                      <input
                        id={`todo-${todo.id}`}
                        type="checkbox"
                        checked={todo.isCompleted}
                        onChange={() => handleToggle(todo)}
                        className="size-5 shrink-0 cursor-pointer accent-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`todo-${todo.id}`}
                          className={`block cursor-pointer break-words ${
                            todo.isCompleted
                              ? "text-zinc-500 line-through"
                              : "text-zinc-100"
                          }`}
                        >
                          {todo.title}
                        </label>
                        <DueDateLabel todo={todo} today={today} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(todo)}
                        aria-label={`「${todo.title}」を削除`}
                        className="shrink-0 rounded-md px-2.5 py-1 text-sm text-zinc-400 transition hover:bg-red-950/60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
