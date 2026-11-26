import type { Todo } from "@/app/api/todos/route";

export const SORT_OPTIONS = [
  { value: "created_desc", label: "作成日：新しい順" },
  { value: "created_asc", label: "作成日：古い順" },
  { value: "due_asc", label: "期限：近い順" },
  { value: "due_desc", label: "期限：遠い順" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortKey = "created_desc";

export function isSortKey(value: unknown): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

// createdAt は ISO 8601（UTC）、dueDate は "YYYY-MM-DD" なので文字列比較で日付順になる
function compareStr(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 作成日が新しい順。同時刻なら id で順番を固定する */
function byCreatedDesc(a: Todo, b: Todo) {
  return compareStr(b.createdAt, a.createdAt) || compareStr(a.id, b.id);
}

/**
 * 並び替えた新しい配列を返す（元の配列は変更しない）
 * - 期限で並べるとき、期限なしは昇順・降順どちらでも一番下
 * - 期限が同じなら作成日が新しい順
 */
export function sortTodos(todos: readonly Todo[], key: SortKey): Todo[] {
  const list = [...todos];
  switch (key) {
    case "created_desc":
      return list.sort(byCreatedDesc);
    case "created_asc":
      return list.sort((a, b) => -byCreatedDesc(a, b));
    case "due_asc":
    case "due_desc": {
      const dir = key === "due_asc" ? 1 : -1;
      return list.sort((a, b) => {
        if (a.dueDate === b.dueDate) return byCreatedDesc(a, b);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dir * compareStr(a.dueDate, b.dueDate);
      });
    }
  }
}

// ---- 選んだ並び順の保存（localStorage。読めない環境では既定値で動く） ----

const STORAGE_KEY = "todo-sort";
const listeners = new Set<() => void>();
let fallbackKey: SortKey | null = null; // localStorage が使えないときの保持先

export function subscribeSortKey(onChange: () => void) {
  listeners.add(onChange);
  // 別タブで変更されたときも反映する
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSortKeySnapshot(): SortKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSortKey(saved) ? saved : DEFAULT_SORT;
  } catch {
    return fallbackKey ?? DEFAULT_SORT;
  }
}

/** サーバー描画とハイドレーション時は既定値を使う */
export function getSortKeyServerSnapshot(): SortKey {
  return DEFAULT_SORT;
}

export function saveSortKey(key: SortKey) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // 保存できなくても、このページを開いている間は反映されるよう通知だけ行う
    fallbackKey = key;
  }
  listeners.forEach((l) => l());
}
