"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, AuthCard, Field, SubmitButton } from "@/components/auth-card";
import { toJapaneseMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError(toJapaneseMessage(error));
      return;
    }
    // メール確認が有効な場合、登録済みのアドレスでもエラーにならず identities が空で返る
    if (data.user && data.user.identities?.length === 0) {
      setError("このメールアドレスはすでに登録されています。");
      return;
    }
    setSentTo(email);
  }

  return (
    <AuthCard
      title="新規登録"
      description="メールアドレスとパスワードでアカウントを作成します。"
      footer={
        <>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            ログイン
          </Link>
        </>
      }
    >
      {sentTo ? (
        <Alert tone="success">
          {sentTo} に確認メールを送りました。メール内のリンクを押すと登録が完了します。
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field
            label="メールアドレス"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="パスワード（6文字以上）"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <SubmitButton loading={loading}>登録する</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
