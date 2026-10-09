"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Inquiry, Order } from "@/lib/types";
import type { SupportThread } from "@/lib/support";
import { formatDate } from "@/lib/utils";
import {
  adminRequest,
  EmptyState,
  panelClass,
  reportError,
} from "./admin-common";

export function InquiryManager({
  inquiries,
  threads = [],
  orders = [],
}: {
  inquiries: Inquiry[];
  threads?: SupportThread[];
  orders?: Order[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"open" | "all" | "resolved">("open");
  const [channel, setChannel] = useState<"all" | "chat" | "form">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);
  const q = query.trim().toLocaleLowerCase("vi");
  function matchesStatus(resolved: boolean) {
    return filter === "all" || (filter === "resolved" ? resolved : !resolved);
  }
  function relatedOrders(email: string, userId?: string) {
    return orders.filter((order) =>
      userId
        ? order.user_id === userId
        : order.email.toLowerCase() === email.toLowerCase(),
    );
  }
  const visibleThreads =
    channel === "form"
      ? []
      : threads.filter(
          (thread) =>
            matchesStatus(thread.resolved) &&
            [
              thread.profile.full_name,
              thread.profile.email,
              thread.profile.phone,
              ...thread.messages.map((message) => message.body),
              ...relatedOrders(thread.profile.email, thread.user_id).map(
                (order) => order.reference,
              ),
            ]
              .join(" ")
              .toLocaleLowerCase("vi")
              .includes(q),
        );
  const visibleInquiries =
    channel === "chat"
      ? []
      : inquiries.filter(
          (inquiry) =>
            matchesStatus(inquiry.resolved) &&
            [
              inquiry.name,
              inquiry.email,
              inquiry.phone,
              inquiry.message,
              ...relatedOrders(inquiry.email).map((order) => order.reference),
            ]
              .join(" ")
              .toLocaleLowerCase("vi")
              .includes(q),
        );
  async function resolve(id: string, resolved: boolean, chat = false) {
    setSaving(id);
    try {
      await adminRequest(
        chat ? `/api/admin/support/${id}` : `/api/admin/inquiries/${id}`,
        "PATCH",
        { resolved },
      );
      toast.success(resolved ? "Đã đánh dấu xử lý." : "Đã mở lại yêu cầu.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(null);
    }
  }
  async function reply(thread: SupportThread) {
    const body = replies[thread.user_id]?.trim();
    if (!body) return;
    setSaving(thread.user_id);
    try {
      await adminRequest(`/api/admin/support/${thread.user_id}`, "POST", {
        body,
      });
      setReplies((previous) => ({ ...previous, [thread.user_id]: "" }));
      toast.success("Đã gửi phản hồi vào tài khoản khách hàng.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Tìm khách hàng hoặc mã đơn hàng"
          placeholder="Tên, email, điện thoại, mã đơn hoặc nội dung..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-lg"
        />
        <select
          aria-label="Loại liên hệ"
          value={channel}
          onChange={(event) => setChannel(event.target.value as typeof channel)}
          className="rounded-md border px-3 text-sm"
        >
          <option value="all">Mọi kênh</option>
          <option value="chat">Trò chuyện tài khoản</option>
          <option value="form">Biểu mẫu liên hệ</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["open", "Chưa xử lý"],
            ["resolved", "Đã xử lý"],
            ["all", "Tất cả"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
            {value === "open"
              ? ` (${inquiries.filter((inquiry) => !inquiry.resolved).length + threads.filter((thread) => !thread.resolved).length})`
              : ""}
          </Button>
        ))}
      </div>
      {!visibleThreads.length && !visibleInquiries.length ? (
        <EmptyState>Chưa có lời nhắn phù hợp với bộ lọc.</EmptyState>
      ) : null}
      {visibleThreads.map((thread) => (
        <article key={thread.user_id} className={panelClass}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                {thread.profile.full_name ||
                  thread.profile.email ||
                  "Khách hàng"}
              </h2>
              <p className="mt-1 text-xs text-[#788273]">
                Trò chuyện tài khoản · {formatDate(thread.updated_at)}
              </p>
              <p className="mt-2 text-sm">
                {thread.profile.email} {thread.profile.phone}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={saving === thread.user_id}
              onClick={() =>
                void resolve(thread.user_id, !thread.resolved, true)
              }
            >
              {thread.resolved ? "Mở lại" : "Đánh dấu đã xử lý"}
            </Button>
          </div>
          <div className="my-5 max-h-80 space-y-3 overflow-auto rounded-xl bg-[#f7f8f3] p-4">
            {thread.messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${message.sender === "staff" ? "ml-auto bg-[#e5eddb]" : "bg-white"}`}
              >
                <p className="mb-1 text-xs text-[#788273]">
                  {message.sender === "staff"
                    ? "Nhân viên Mộc Bàm"
                    : "Khách hàng"}{" "}
                  · {formatDate(message.created_at)}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {message.body}
                </p>
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void reply(thread);
            }}
            className="space-y-3"
          >
            <label className="text-sm" htmlFor={`reply-${thread.user_id}`}>
              Phản hồi cho khách hàng
            </label>
            <Textarea
              id={`reply-${thread.user_id}`}
              maxLength={4000}
              required
              value={replies[thread.user_id] || ""}
              onChange={(event) =>
                setReplies((previous) => ({
                  ...previous,
                  [thread.user_id]: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap justify-between gap-3">
              <Link
                className="text-sm underline"
                href={`/admin/orders?customer=${encodeURIComponent(thread.user_id)}`}
              >
                Tra cứu đơn của khách
              </Link>
              <Button
                disabled={
                  saving === thread.user_id || !replies[thread.user_id]?.trim()
                }
              >
                Gửi phản hồi
              </Button>
            </div>
          </form>
        </article>
      ))}
      {visibleInquiries.map((inquiry) => (
        <article key={inquiry.id} className={panelClass}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-semibold">{inquiry.name}</h2>
              <p className="mt-1 text-xs text-[#788273]">
                Biểu mẫu · {formatDate(inquiry.created_at)}
              </p>
            </div>
            <span className="text-xs">
              {inquiry.resolved ? "Đã xử lý" : "Chưa xử lý"}
            </span>
          </div>
          <p className="my-5 whitespace-pre-wrap text-sm leading-7">
            {inquiry.message}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-2 text-sm">
              <a
                className="block underline"
                href={`mailto:${inquiry.email}?subject=${encodeURIComponent("Mộc Bàm phản hồi lời nhắn của bạn")}&body=${encodeURIComponent("Chào " + inquiry.name + ",\n\nMộc đã nhận được lời nhắn:\n" + inquiry.message + "\n\nPhản hồi của Mộc:\n")}`}
              >
                Soạn email phản hồi · {inquiry.email}
              </a>
              {inquiry.phone ? (
                <a className="block underline" href={`tel:${inquiry.phone}`}>
                  Gọi {inquiry.phone}
                </a>
              ) : null}
              <Link
                className="block underline"
                href={`/admin/orders?email=${encodeURIComponent(inquiry.email)}`}
              >
                Tra cứu đơn hàng
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={saving === inquiry.id}
              onClick={() => void resolve(inquiry.id, !inquiry.resolved)}
            >
              {inquiry.resolved ? "Mở lại" : "Đã phản hồi / xử lý"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
