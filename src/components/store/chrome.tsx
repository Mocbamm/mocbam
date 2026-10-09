"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  UserRound,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { SiteSettings } from "@/lib/types";
import { StoreSearch } from "./search-dialog";
import { policyHref, policyLinks } from "./policies";
const navigation = [
  { href: "/", text: "Trang chủ" },
  { href: "/san-pham", text: "Sản phẩm" },
  { href: "/chung-toi", text: "Chúng tôi" },
  { href: "/blog", text: "Nhật ký Mộc Bàm" },
];
export function StoreHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyTrigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#dfe2d4] bg-[#faf9f3]/95 backdrop-blur-md">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 sm:px-8">
          <nav
            className="hidden items-center gap-4 lg:order-2 lg:flex"
            aria-label="Điều hướng chính"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[12px] transition-colors hover:text-[#406344] ${(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "text-[#29412d] underline underline-offset-8" : "text-[#62685d]"}`}
              >
                {item.text}
              </Link>
            ))}
            <div
              className="relative text-[12px] text-[#62685d]"
              onMouseEnter={() => setPolicyOpen(true)}
              onMouseLeave={() => setPolicyOpen(false)}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setPolicyOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setPolicyOpen(false);
                  policyTrigger.current?.focus();
                }
              }}
            >
              <button
                ref={policyTrigger}
                type="button"
                className="flex cursor-pointer items-center gap-1 py-3 hover:text-[#406344]"
                aria-expanded={policyOpen}
                aria-controls="desktop-policy-links"
                onClick={(event) =>
                  setPolicyOpen((previous) =>
                    event.detail === 0 ? !previous : true,
                  )
                }
              >
                Chính sách <ChevronDown size={13} />
              </button>
              {policyOpen ? (
                <div
                  id="desktop-policy-links"
                  className="absolute left-0 top-full w-56 pt-2"
                >
                  <div className="border border-[#dfe2d4] bg-[#faf9f3] p-2 shadow-lg">
                    {policyLinks.map((policy) => (
                      <Link
                        key={policy.id}
                        href={policyHref(policy.id)}
                        className="block px-3 py-2 text-xs hover:bg-[#edf0e5] focus-visible:bg-[#edf0e5]"
                        onClick={() => setPolicyOpen(false)}
                      >
                        {policy.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </nav>
          <button
            className="p-2 lg:hidden"
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            href="/"
            aria-label="Mộc Bàm - Trang chủ"
            className="min-w-0 flex-1 px-2 text-center lg:order-1 lg:flex-none lg:px-0 lg:text-left"
          >
            <span className="block whitespace-nowrap font-serif text-[22px] sm:text-[30px] leading-none tracking-[-0.04em] text-[#29412d]">
              MỘC BÀM
            </span>
            <span className="mt-2 block text-[7px] tracking-[0.03em] text-[#7b826e] sm:text-[9px] sm:tracking-[0.08em]">
              Gom nét mộc, tạo góc xinh.
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 lg:order-3">
            <StoreSearch />
            <Link href="/tai-khoan" aria-label="Tài khoản" className="p-1">
              <UserRound size={20} strokeWidth={1.5} />
            </Link>
            <Link
              href="/gio-hang"
              aria-label={`Giỏ hàng, ${count} sản phẩm`}
              className="relative p-1"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#29412d] px-1 text-[9px] text-white">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
        {open ? (
          <nav
            className="border-t border-[#dfe2d4] px-6 pb-5 pt-3 lg:hidden"
            aria-label="Menu di động"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block border-b border-[#e6e6dc] py-3 text-sm"
              >
                {item.text}
              </Link>
            ))}
            <details className="border-b border-[#e6e6dc] py-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                Chính sách <ChevronDown size={15} />
              </summary>
              <div className="space-y-1 pl-3 pt-3">
                {policyLinks.map((policy) => (
                  <Link
                    key={policy.id}
                    href={policyHref(policy.id)}
                    onClick={() => setOpen(false)}
                    className="block py-2 text-xs text-[#68775e]"
                  >
                    {policy.title}
                  </Link>
                ))}
              </div>
            </details>
            <div className="flex gap-5 pt-4 text-xs text-[#68775e]">
              <Link
                href="/san-pham?danh-muc=nhan-vat"
                onClick={() => setOpen(false)}
              >
                Dòng nhân vật
              </Link>
              <Link
                href="/san-pham?danh-muc=chuoi"
                onClick={() => setOpen(false)}
              >
                Dòng chuỗi
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
export function StoreFooter({ settings }: { settings?: SiteSettings }) {
  return (
    <footer className="mt-20 bg-[#243b29] text-[#e4e8d6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <Link
            href="/"
            className="font-serif text-4xl tracking-[-0.05em] text-[#f4f0dc]"
          >
            MỘC BÀM
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-7 text-[#acbaa2]">
            Gom nét mộc, tạo góc xinh.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-xs">
            {[
              { text: "Facebook", url: settings?.facebook_url },
              { text: "Instagram", url: settings?.instagram_url },
              { text: "TikTok", url: settings?.tiktok_url },
              { text: "Zalo", url: settings?.zalo_url },
              { text: "Shopee", url: settings?.shopee_url },
            ].map((s) =>
              s.url ? (
                <a
                  key={s.text}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-1"
                >
                  {s.text}
                  <ArrowUpRight size={12} />
                </a>
              ) : null,
            )}
          </div>
        </div>
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[#f4f0dc]">
            Khám phá
          </p>
          <div className="flex flex-col gap-3 text-sm text-[#acbaa2]">
            <Link href="/san-pham">Tất cả sản phẩm</Link>
            <Link href="/san-pham?danh-muc=nhan-vat">Dòng nhân vật</Link>
            <Link href="/san-pham?danh-muc=chuoi">Dòng chuỗi</Link>
            <Link href="/chung-toi">Câu chuyện Mộc Bàm</Link>
            <Link href="/blog">Nhật ký Mộc Bàm</Link>
          </div>
        </div>
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[#f4f0dc]">
            Đồng hành
          </p>
          <div className="flex flex-col gap-3 text-sm text-[#acbaa2]">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2">
                Chính sách & hướng dẫn <ChevronDown size={13} />
              </summary>
              <div className="mt-3 flex flex-col gap-3 border-l border-[#667a5e] pl-3 text-xs">
                {policyLinks.map((policy) => (
                  <Link key={policy.id} href={policyHref(policy.id)}>
                    {policy.title}
                  </Link>
                ))}
              </div>
            </details>
            <Link href="/lien-he">Liên hệ với chúng tôi</Link>
            <Link href="/tai-khoan">Đơn hàng của tôi</Link>
          </div>
        </div>
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[#f4f0dc]">
            Ghé Mộc một chút
          </p>
          <p className="text-sm leading-7 text-[#acbaa2]">
            {settings?.shop_address || "Mộc Bàm · Việt Nam"}
          </p>
          {settings?.shop_hours ? (
            <p className="mt-2 text-xs leading-6 text-[#acbaa2]">
              {settings.shop_hours}
            </p>
          ) : null}
          <Link
            href="/lien-he"
            className="mt-4 inline-flex items-center gap-3 border-b border-[#809174] pb-2 text-sm"
          >
            Gửi lời nhắn <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-[#4d6048] px-6 py-5 text-[10px] tracking-wider text-[#acbaa2]">
        <span>
          © {new Date().getFullYear()} Mộc Bàm. Từ gỗ, với thương yêu.
        </span>
      </div>
    </footer>
  );
}
