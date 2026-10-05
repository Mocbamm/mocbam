"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function AccountForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch("/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, next, ...Object.fromEntries(data) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.confirmation)
        setMessage(
          "Hãy kiểm tra email và mở liên kết xác nhận tài khoản. Sau đó bạn có thể đăng nhập.",
        );
      else {
        router.push(result.next);
        router.refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chưa thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-8 border-t border-[#d1d9c2] pt-7 text-left">
      <div className="mb-5 flex gap-3" aria-label="Chọn đăng nhập hoặc đăng ký">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError("");
              setMessage("");
            }}
            aria-pressed={mode === value}
            className={`flex-1 border px-3 py-2 text-sm ${mode === value ? "border-[#29412d] bg-[#29412d] text-white" : "border-[#cbd4be]"}`}
          >
            {value === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" ? (
          <>
            <div>
              <Label htmlFor="account-name">Họ và tên</Label>
              <Input
                id="account-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="account-phone">Số điện thoại</Label>
              <Input
                id="account-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                minLength={7}
                maxLength={30}
              />
            </div>
          </>
        ) : null}
        <div>
          <Label htmlFor="account-email">Email</Label>
          <Input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </div>
        <div>
          <Label htmlFor="account-password">Mật khẩu</Label>
          <Input
            id="account-password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            maxLength={128}
          />
          {mode === "register" ? (
            <p className="mt-1 text-xs text-[#7c866b]">Ít nhất 8 ký tự.</p>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-sm leading-6">
            {message}
          </p>
        ) : null}
        <Button disabled={busy || !configured} className="w-full" type="submit">
          {busy
            ? "Đang xử lý..."
            : mode === "login"
              ? "Đăng nhập bằng email"
              : "Tạo tài khoản"}
        </Button>
      </form>
    </div>
  );
}
export function ProfileForm({
  profile,
}: {
  profile: { full_name: string; phone: string };
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const d = await r.json();
      setMessage(r.ok ? "Đã lưu thông tin của bạn." : d.error);
    } catch {
      setMessage("Chưa thể lưu. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mb-8 border border-[#dde1d0] p-5">
      <summary className="cursor-pointer text-sm">Thông tin của bạn</summary>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-name">Họ và tên</Label>
          <Input
            id="profile-name"
            name="full_name"
            defaultValue={profile.full_name}
            required
            minLength={2}
            maxLength={100}
          />
        </div>
        <div>
          <Label htmlFor="profile-phone">Số điện thoại</Label>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone}
            required
            minLength={7}
            maxLength={30}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Đang lưu..." : "Lưu thông tin"}
        </Button>
        <p role="status" className="text-xs">
          {message}
        </p>
      </form>
    </details>
  );
}
