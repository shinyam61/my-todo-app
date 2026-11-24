import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI（db push / migrate）はプーラーを経由しない直接接続を使う。
    // env("DIRECT_URL") だと未設定時に設定ファイルの読み込み自体が失敗し、
    // DB 接続が不要な `prisma generate`（postinstall）まで落ちるため process.env で読む
    url: process.env.DIRECT_URL,
  },
});
