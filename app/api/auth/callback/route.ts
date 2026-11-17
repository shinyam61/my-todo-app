import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 確認メールのリンクから戻ってきたときに、code をセッションに交換する
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/", origin));
    }
  }

  const url = new URL("/login", origin);
  url.searchParams.set(
    "error",
    "メールの確認に失敗しました。もう一度ログインするか、登録し直してください。",
  );
  return NextResponse.redirect(url);
}
