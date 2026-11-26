// 期限日はすべて "YYYY-MM-DD"（時刻なしの日付）で扱う。
// 「今日」はブラウザのローカル日付（日本なら日本時間）を基準にする。

export const DUE_DAYS_MAX = 365;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" が実在する日付なら true（2026-02-30 などは false） */
export function isValidDateString(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toISOString().slice(0, 10) === value;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** ローカル日付の今日を "YYYY-MM-DD" で返す */
export function todayString(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ローカル日付の今日から days 日後を "YYYY-MM-DD" で返す */
export function addDaysFromToday(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return todayString(d);
}

/** "YYYY-MM-DD" の days 日後を "YYYY-MM-DD" で返す（現在時刻を読まない） */
export function addDays(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 日付文字列どうしの差（due - today）を日数で返す */
export function daysBetween(today: string, due: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(due) - toUtc(today)) / 86_400_000);
}

/** "2026-12-01" → "2026年12月01日" */
export function formatDueDate(due: string): string {
  const [y, m, d] = due.split("-");
  return `${y}年${m}月${d}日`;
}

export type DueStatus = "normal" | "soon" | "urgent" | "overdue";

/**
 * 残り日数から状態を決める
 * - 4日以上: normal / 3〜2日: soon（黄） / 1日・当日: urgent（オレンジ） / 期限切れ: overdue（赤）
 */
export function dueStatus(remaining: number): DueStatus {
  if (remaining < 0) return "overdue";
  if (remaining <= 1) return "urgent";
  if (remaining <= 3) return "soon";
  return "normal";
}

/** 色だけに頼らないための補足文 */
export function remainingLabel(remaining: number): string {
  if (remaining < 0) return `${-remaining}日超過`;
  if (remaining === 0) return "今日まで";
  return `あと${remaining}日`;
}
