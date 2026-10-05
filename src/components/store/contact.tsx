"use client";
import { useState } from "react";
import { Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
export function ContactForm({
  configured,
  initial,
  idPrefix = "contact",
}: {
  configured: boolean;
  initial?: { name?: string; email?: string; phone?: string; message?: string };
  idPrefix?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            ["name", "email", "phone", "message"].map((key) => [
              key,
              String(data.get(key) || "").trim(),
            ]),
          ),
        ),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Chưa gửi được lời nhắn.");
      setSent(true);
      form.reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kết nối đang gián đoạn. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div role="status" className="border border-[#cbd8bc] bg-[#edf0e5] p-8">
        <Check size={27} className="text-[#627f4d]" />
        <h2 className="mt-5 font-serif text-3xl text-[#29412d]">
          Mộc đã nhận lời nhắn.
        </h2>
        <p className="mt-4 text-sm leading-7 text-[#7c866b]">
          Cảm ơn bạn đã ghé. Chúng mình sẽ trao đổi qua thông tin bạn để lại.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setSent(false)}
        >
          Gửi một lời nhắn khác
        </Button>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-name`}>Tên của bạn *</Label>
          <Input
            id={`${idPrefix}-name`}
            defaultValue={initial?.name}
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-email`}>Email *</Label>
          <Input
            id={`${idPrefix}-email`}
            defaultValue={initial?.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="mt-2"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`${idPrefix}-phone`}>Số điện thoại</Label>
          <Input
            id={`${idPrefix}-phone`}
            defaultValue={initial?.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            className="mt-2"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`${idPrefix}-message`}>Lời nhắn *</Label>
          <Textarea
            id={`${idPrefix}-message`}
            defaultValue={initial?.message}
            name="message"
            required
            maxLength={4000}
            placeholder="Bạn muốn kể Mộc nghe điều gì?"
            className="mt-2 min-h-40"
          />
        </div>
      </div>
      {!configured ? (
        <p
          role="status"
          className="mt-5 bg-[#f1ecdc] p-4 text-xs leading-6 text-[#847044]"
        >
          Bản trình diễn chưa kết nối hệ thống lưu lời nhắn. Chức năng gửi sẽ
          hoạt động sau khi cấu hình Supabase.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-xs leading-6 text-red-700">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || !configured}
        className="mt-6 h-12 px-7"
      >
        {busy ? "Đang gửi..." : "Gửi lời nhắn"} <Send size={15} />
      </Button>
      <p className="mt-4 text-[10px] leading-6 text-[#8b947d]">
        Thông tin của bạn chỉ dùng để phản hồi và hỗ trợ yêu cầu này.
      </p>
    </form>
  );
}
