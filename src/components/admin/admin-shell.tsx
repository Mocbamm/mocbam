"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Sprout,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", title: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", title: "Sản phẩm", icon: Package },
  { href: "/admin/orders", title: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/customers", title: "Khách hàng", icon: Users },
  { href: "/admin/discounts", title: "Giảm giá", icon: Tags },
  { href: "/admin/analytics", title: "Báo cáo", icon: BarChart3 },
  { href: "/admin/posts", title: "Bài viết", icon: BookOpen },
  { href: "/admin/content", title: "Nội dung", icon: FileText },
  { href: "/admin/inquiries", title: "Liên hệ", icon: MessageSquare },
  { href: "/admin/settings", title: "Cài đặt", icon: Settings },
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#f7f6f0] text-[#21372b] lg:flex">
      <aside className="border-b border-[#dce3d7] bg-[#ecf0e6] lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-b-0">
        <Link href="/admin" className="flex items-center gap-3 px-6 py-7">
          <Sprout className="size-9" />
          <span className="text-2xl font-semibold tracking-tight">
            Mộc Bàm
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.24em] text-[#6b7867]">
              Quản trị cửa hàng
            </span>
          </span>
        </Link>
        <nav
          aria-label="Quản trị"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:max-h-[calc(100dvh-230px)] lg:flex-col lg:overflow-y-auto"
        >
          {links.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/60",
                (href === "/admin"
                  ? pathname === href
                  : pathname.startsWith(href)) &&
                  "bg-[#294836] text-white hover:bg-[#294836]",
              )}
            >
              <Icon className="size-4" />
              {title}
            </Link>
          ))}
        </nav>
        <div className="hidden px-7 py-6 lg:absolute lg:bottom-0 lg:block lg:w-full">
          <p className="truncate text-xs text-[#687864]" title={email}>
            {email}
          </p>
          <Link
            href="/"
            className="mt-3 flex items-center gap-2 text-sm font-medium"
          >
            Về cửa hàng <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="flex items-center justify-between border-b border-[#e4e8de] bg-white/70 px-5 py-4 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b7867]">
            Góc chăm chút Mộc Bàm
          </p>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs hover:underline"
          >
            Xem cửa hàng <ArrowUpRight className="size-3.5" />
          </Link>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7867]">
        {description}
      </p>
    </div>
  );
}
