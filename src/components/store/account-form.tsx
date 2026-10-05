"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
const subscribeToHydration = () => () => {};
export function AccountForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function resend() {
    if (busy || cooldown || !configured || !email.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (response.status === 429) setCooldown(60);
      if (!response.ok) throw new Error(result.error);
      setConfirmationEmail(email.trim());
      setMessage(
        "Nếu email này đang chờ xác nhận, Mộc đã gửi một liên kết mới. Hãy dùng email mới nhất.",
      );
      setCooldown(60);
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
      if (result.confirmation) {
        setConfirmationEmail(email.trim());
        setCooldown(60);
      } else {
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
  if (confirmationEmail)
    return (
      <section
        className="mt-8 border-t border-[#d1d9c2] pt-7 text-left"
        aria-label="Xác nhận email"
      >
        <div className="border border-[#d1d9c2] bg-[#fafbf6] p-6">
          <MailCheck
            size={32}
            strokeWidth={1.3}
            className="mb-5 text-[#49623d]"
            aria-hidden="true"
          />
          <h2 className="font-serif text-2xl text-[#29412d]">
            Kiểm tra hộp thư nhé.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#596650]">
            Mở email xác nhận được gửi đến{" "}
            <strong className="break-all font-medium text-[#29412d]">
              {confirmationEmail}
            </strong>{" "}
            để hoàn tất tài khoản.
          </p>
          <p className="mt-3 text-xs leading-6 text-[#77866a]">
            Chưa thấy email? Kiểm tra thư rác hoặc mục Quảng cáo. Liên kết chỉ
            dùng một lần; hãy mở email mới nhất.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full"
            disabled={busy || cooldown > 0}
            onClick={resend}
          >
            {busy
              ? "Đang gửi..."
              : cooldown
                ? `Gửi lại sau ${cooldown} giây`
                : "Gửi lại email xác nhận"}
          </Button>
          {message ? (
            <p role="status" className="mt-4 text-xs leading-6">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 text-xs leading-6 text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-5 text-xs underline underline-offset-4"
          onClick={() => {
            setConfirmationEmail("");
            setMode("login");
            setError("");
            setMessage("");
          }}
        >
          Đổi email hoặc quay lại đăng nhập
        </button>
      </section>
    );
  return (
    <div className="mt-8 border-t border-[#d1d9c2] pt-7 text-left">
      <div className="mb-5 flex gap-3" aria-label="Chọn đăng nhập hoặc đăng ký">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={!hydrated}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!hydrated}
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
        <Button
          disabled={!hydrated || busy || !configured}
          className="w-full"
          type="submit"
        >
          {busy
            ? "Đang xử lý..."
            : mode === "login"
              ? "Đăng nhập bằng email"
              : "Tạo tài khoản"}
        </Button>
        {mode === "login" ? (
          <button
            type="button"
            className="w-full text-center text-xs leading-6 underline underline-offset-4 disabled:opacity-50"
            disabled={busy || !configured || !email.trim() || cooldown > 0}
            onClick={resend}
          >
            {cooldown
              ? `Gửi lại sau ${cooldown} giây`
              : "Chưa xác nhận email? Gửi lại liên kết"}
          </button>
        ) : null}
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
