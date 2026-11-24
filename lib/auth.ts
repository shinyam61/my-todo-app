import { createClient } from "@/lib/supabase/server";

/** Route Handler 用: Cookie のセッションを Supabase Auth に問い合わせて検証し、ログイン中のユーザーを返す */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
