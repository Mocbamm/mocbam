"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CustomerSummary } from "@/lib/customer-insights";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  EmptyState,
  fieldClass,
  panelClass,
  StatusBadge,
} from "./admin-common";

export function CustomerManager({
  customers,
}: {
  customers: CustomerSummary[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "account" | "buyers" | "contacts"
  >("all");
  const visible = customers.filter((customer) => {
    const matches =
      `${customer.name} ${customer.email} ${customer.phone} ${customer.orders.map((order) => order.reference).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi"));
    return (
      matches &&
      (filter === "all" ||
        (filter === "account" && customer.user_id) ||
        (filter === "buyers" && customer.order_count > 0) ||
        (filter === "contacts" && customer.order_count === 0))
    );
  });
  const metrics = [
    ["Khách hàng & liên hệ", customers.length],
    ["Có tài khoản", customers.filter((customer) => customer.user_id).length],
    [
      "Đã đặt hàng",
      customers.filter((customer) => customer.order_count > 0).length,
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className={panelClass}>
            <p className="text-xs text-[#6b7867]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-[#7c8774]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên, email, điện thoại hoặc mã đơn..."
            aria-label="Tìm khách hàng"
            className="bg-white pl-10"
          />
        </div>
        <select
          aria-label="Nhóm khách hàng"
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          className={`${fieldClass} sm:w-56`}
        >
          <option value="all">Tất cả khách hàng</option>
          <option value="account">Có tài khoản</option>
          <option value="buyers">Đã đặt hàng</option>
          <option value="contacts">Chưa đặt hàng</option>
        </select>
      </div>
      <p className="text-xs leading-6 text-[#6b7867]">
        Hồ sơ được tổng hợp từ tài khoản, đơn hàng và lời nhắn liên hệ. Khách
        mua không đăng nhập được nhóm theo email; các tài khoản riêng biệt giữ
        hồ sơ riêng. Giá trị đơn gồm phí giao hàng và chỉ tính đơn chưa hủy.
      </p>
      <p className="text-sm text-[#6b7867]" aria-live="polite">
        {visible.length} hồ sơ
      </p>
      {visible.length === 0 ? (
        <EmptyState>
          <Users className="mx-auto mb-3 size-7" />
          {customers.length
            ? "Không tìm thấy khách hàng phù hợp."
            : "Chưa có hồ sơ khách hàng. Tài khoản mới, đơn hàng và liên hệ sẽ xuất hiện tại đây."}
        </EmptyState>
      ) : (
        visible.map((customer) => (
          <details key={customer.id} className={`${panelClass} group`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">
                    {customer.name || "Khách hàng"}
                  </h2>
                  <span className="rounded-full bg-[#edf3e7] px-2 py-1 text-[10px]">
                    {customer.user_id ? "Có tài khoản" : "Khách / liên hệ"}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs text-[#6b7867]">
                  {customer.email || "Chưa có email"}
                  {customer.phone && ` · ${customer.phone}`}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>
                  {customer.order_count} đơn ·{" "}
                  <span className="font-medium">
                    {formatPrice(customer.order_value)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#6b7867]">
                  {customer.last_order_at
                    ? `Đơn gần nhất: ${formatDate(customer.last_order_at)}`
                    : "Chưa đặt hàng"}
                </p>
              </div>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-5 border-t border-[#edf0e7] pt-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-[#6b7867]">Có trong hồ sơ từ</dt>
                  <dd className="mt-1">{formatDate(customer.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6b7867]">Đơn chưa hủy</dt>
                  <dd className="mt-1">
                    {customer.active_order_count} / {customer.order_count} đơn
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6b7867]">Lời nhắn liên hệ</dt>
                  <dd className="mt-1">{customer.inquiry_count}</dd>
                </div>
              </dl>
              {customer.orders.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Đơn hàng của {customer.name || customer.email}
                    </caption>
                    <thead className="border-b border-[#edf0e7] text-xs text-[#6b7867]">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Mã đơn</th>
                        <th className="py-2 pr-4 font-medium">Ngày đặt</th>
                        <th className="py-2 pr-4 font-medium">Trạng thái</th>
                        <th className="py-2 text-right font-medium">Giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[#edf0e7] last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {order.reference}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="whitespace-nowrap py-3 text-right">
                            {formatPrice(order.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
                <Link
                  href="/admin/orders"
                  className="underline underline-offset-4"
                >
                  Quản lý đơn hàng
                </Link>
                {customer.inquiry_count > 0 && (
                  <Link
                    href="/admin/inquiries"
                    className="underline underline-offset-4"
                  >
                    Xem lời nhắn liên hệ
                  </Link>
                )}
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
