import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAdmin } from "@/lib/use-admin";
import { useSiteConfig } from "@/lib/use-site-config";

export function AdminLoginPage() {
  const { authed, login } = useAdmin();
  const { config, ready: configReady } = useSiteConfig();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const env = import.meta.env as Record<string, string | undefined>;
  const supabaseUrl =
    env["VITE_SUPABASE_URL"]?.trim() || config.admin.supabaseUrl;
  const supabaseKey =
    env["VITE_SUPABASE_ANON_KEY"]?.trim() || config.admin.supabaseAnonKey;
  const email =
    env["VITE_SUPABASE_ADMIN_EMAIL"]?.trim() || config.admin.supabaseAdminEmail;

  useEffect(() => setError(""), [configReady]);

  async function handleSubmit() {
    const ok = await login(
      passwordInputRef.current?.value ?? password,
      "",
      supabaseUrl,
      supabaseKey,
      email,
    );
    if (ok) window.location.assign("/");
    else
      setError(
        "Đăng nhập thất bại. Kiểm tra Supabase Auth và quyền trong admin_users.",
      );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-6 ring-1 ring-white/10">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold">Đăng nhập quản trị</h1>
          <p className="mt-1 text-xs text-white/50">
            Funnel Builder — Supabase Auth
          </p>
        </div>
        {authed ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-emerald-400">Đã đăng nhập.</p>
            <a
              href="/"
              className="block w-full rounded-lg bg-white py-2.5 text-sm font-bold text-neutral-900"
            >
              Vào trang quản trị
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Mật khẩu Supabase Auth"
              autoComplete="current-password"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSubmit();
              }}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2.5 text-sm outline-none ring-1 ring-white/10"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!configReady || !email || !supabaseUrl || !supabaseKey}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-bold text-neutral-900 disabled:opacity-60"
            >
              {configReady ? "Đăng nhập" : "Đang tải cấu hình..."}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
