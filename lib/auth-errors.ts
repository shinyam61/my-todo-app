import type { AuthError } from "@supabase/supabase-js";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  email_not_confirmed:
    "メールアドレスの確認が完了していません。確認メールのリンクを押してください。",
  user_already_exists: "このメールアドレスはすでに登録されています。",
  weak_password: "パスワードが短すぎます。6文字以上にしてください。",
  validation_failed: "メールアドレスの形式が正しくありません。",
  email_address_invalid: "このメールアドレスは使用できません。",
  over_email_send_rate_limit:
    "メールの送信回数が上限に達しました。しばらく待ってからお試しください。",
  over_request_rate_limit:
    "リクエストが多すぎます。しばらく待ってからお試しください。",
};

export function toJapaneseMessage(error: AuthError): string {
  return (
    (error.code && MESSAGES[error.code]) ||
    `エラーが発生しました（${error.message}）`
  );
}
