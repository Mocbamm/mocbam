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
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Leaf,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatPrice, useCart } from "@/lib/cart";
import type { SiteSettings } from "@/lib/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StoreSearch } from "./search-dialog";
import StoreImage from "./image";
import { policyHref, policyLinks } from "./policies";

const navigation = [
  { href: "/", text: "Trang chủ" },
  { href: "/san-pham", text: "Sản phẩm" },
  { href: "/chung-toi", text: "Chúng tôi" },
  { href: "/blog", text: "Nhật ký Mộc Bàm" },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={footer ? "Mộc Bàm" : "Mộc Bàm - Trang chủ"}
      className={`store-brand${footer ? " store-brand-footer" : ""}`}
    >
      <span>MỘC BÀM</span>
      <small>Gom nét mộc, tạo góc xinh.</small>
    </Link>
  );
}

function CartDrawer() {
  const { items, count, subtotal, ready, update, remove } = useCart();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Giỏ hàng, ${count} sản phẩm`}
          className="store-icon-button store-cart-trigger"
          disabled={!ready}
        >
          <ShoppingBag size={22} strokeWidth={1.5} />
          {count > 0 ? <span className="store-cart-count">{count}</span> : null}
        </button>
      </SheetTrigger>
      <SheetContent
        className="storefront-overlay store-cart-drawer"
        showCloseButton={false}
      >
        <div className="store-drawer-heading">
          <SheetTitle>
            Giỏ hàng <span>({count})</span>
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              className="store-icon-button"
              aria-label="Đóng giỏ hàng"
            >
              <X size={22} />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">
          Kiểm tra sản phẩm và số lượng trước khi thanh toán.
        </SheetDescription>
        {items.length ? (
          <>
            <div className="store-drawer-items">
              {items.map(({ product, quantity, key }) => (
                <article key={key} className="store-drawer-item">
                  <SheetClose asChild>
                    <Link
                      href={`/san-pham/${product.slug}`}
                      className="store-drawer-image"
                      aria-label={`Xem ${product.name}`}
                    >
                      <StoreImage
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="90px"
                        className="object-cover"
                      />
                    </Link>
                  </SheetClose>
                  <div className="store-drawer-item-info">
                    <SheetClose asChild>
                      <Link
                        href={`/san-pham/${product.slug}`}
                        className="store-drawer-product-name"
                      >
                        {product.name}
                      </Link>
                    </SheetClose>
                    <p>{formatPrice(product.price)}</p>
                    <div className="store-drawer-item-controls">
                      <div className="store-quantity-control">
                        <button
                          type="button"
                          aria-label={`Giảm số lượng ${product.name}`}
                          onClick={() => update(key, quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span aria-label={`Số lượng ${product.name}`}>
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tăng số lượng ${product.name}`}
                          disabled={quantity >= Math.min(10, product.stock)}
                          onClick={() => update(key, quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="store-icon-button"
                        aria-label={`Xóa ${product.name}`}
                        onClick={() => remove(key)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="store-drawer-summary">
              <div>
                <span>Tạm tính</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p>Phí giao hàng và ưu đãi được tính ở bước thanh toán.</p>
              <SheetClose asChild>
                <Link
                  href="/thanh-toan"
                  className="store-button store-button-primary"
                >
                  Thanh toán <ArrowRight size={17} />
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/gio-hang"
                  className="store-button store-button-outline"
                >
                  Xem giỏ hàng
                </Link>
              </SheetClose>
            </div>
          </>
        ) : (
          <div className="store-drawer-empty">
            <ShoppingBag size={42} strokeWidth={1} />
            <h3>Giỏ hàng đang chờ bạn.</h3>
            <p>Ghé một vòng, tìm món nhỏ mình thương.</p>
            <SheetClose asChild>
              <Link
                href="/san-pham"
                className="store-button store-button-primary"
              >
                Khám phá sản phẩm <ArrowRight size={16} />
              </Link>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function StoreHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyTrigger = useRef<HTMLButtonElement>(null);
  return (
    <header className="store-header">
      <div className="store-header-inner">
        <div className="store-mobile-menu-trigger">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="store-icon-button"
                aria-label={open ? "Đóng menu" : "Mở menu"}
              >
                <Menu size={22} strokeWidth={1.5} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="storefront-overlay store-mobile-menu"
              showCloseButton={false}
            >
              <div className="store-drawer-heading">
                <SheetTitle>MỘC BÀM</SheetTitle>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="store-icon-button"
                    aria-label="Đóng menu"
                  >
                    <X size={22} />
                  </button>
                </SheetClose>
              </div>
              <SheetDescription>Gom nét mộc, tạo góc xinh.</SheetDescription>
              <nav aria-label="Menu di động">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={
                      (
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                      )
                        ? "page"
                        : undefined
                    }
                  >
                    {item.text}
                    <ArrowUpRight size={17} strokeWidth={1.3} />
                  </Link>
                ))}
                <details>
                  <summary>
                    Chính sách <ChevronDown size={18} />
                  </summary>
                  <div>
                    {policyLinks.map((policy) => (
                      <Link
                        key={policy.id}
                        href={policyHref(policy.id)}
                        onClick={() => setOpen(false)}
                      >
                        {policy.title}
                      </Link>
                    ))}
                  </div>
                </details>
              </nav>
              <div className="store-mobile-collections">
                <p className="store-eyebrow">Một chút mộc mỗi ngày</p>
                <Link
                  href="/san-pham?danh-muc=nhan-vat"
                  onClick={() => setOpen(false)}
                >
                  <StoreImage
                    src="/images/verdant/characters.webp"
                    alt=""
                    width={96}
                    height={96}
                  />
                  <span>
                    Nhân vật gỗ <ArrowRight size={16} />
                  </span>
                </Link>
                <Link
                  href="/san-pham?danh-muc=chuoi"
                  onClick={() => setOpen(false)}
                >
                  <StoreImage
                    src="/images/verdant/accessories.webp"
                    alt=""
                    width={96}
                    height={96}
                  />
                  <span>
                    Chuỗi & phụ kiện <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
              <Link
                href="/lien-he"
                onClick={() => setOpen(false)}
                className="store-menu-contact"
              >
                Mộc luôn sẵn lòng nghe bạn <ArrowUpRight size={16} />
              </Link>
            </SheetContent>
          </Sheet>
        </div>
        <nav className="store-desktop-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                (
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                )
                  ? "page"
                  : undefined
              }
            >
              {item.text}
            </Link>
          ))}
          <div
            className="store-policy-menu"
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
              aria-expanded={policyOpen}
              aria-controls="desktop-policy-links"
              onClick={(event) =>
                setPolicyOpen((previous) =>
                  event.detail === 0 ? !previous : true,
                )
              }
            >
              Chính sách <ChevronDown size={12} />
            </button>
            {policyOpen ? (
              <div id="desktop-policy-links" className="store-policy-dropdown">
                <div>
                  <p className="store-eyebrow">Cùng Mộc an tâm mua sắm</p>
                  {policyLinks.map((policy) => (
                    <Link
                      key={policy.id}
                      href={policyHref(policy.id)}
                      onClick={() => setPolicyOpen(false)}
                    >
                      {policy.title}
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
                <Link
                  href="/lien-he"
                  onClick={() => setPolicyOpen(false)}
                  className="store-policy-help"
                >
                  <Leaf size={28} strokeWidth={1.2} />
                  <strong>Cần Mộc giúp một chút?</strong>
                  <span>Chúng mình luôn ở đây, cùng bạn.</span>
                  <span>
                    Gửi lời nhắn <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
        <Brand />
        <div className="store-header-actions">
          <StoreSearch />
          <Link
            href="/tai-khoan"
            aria-label="Tài khoản"
            className="store-icon-button"
          >
            <UserRound size={22} strokeWidth={1.5} />
          </Link>
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}

export function StoreFooter({ settings }: { settings?: SiteSettings }) {
  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        <div className="store-footer-brand">
          <Brand footer />
          <p>
            Những món đồ nhỏ từ gỗ.
            <br />
            Một chút mộc mạc, một chút thương yêu.
          </p>
          <div className="store-social-links">
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
                >
                  {s.text}
                  <ArrowUpRight size={13} />
                </a>
              ) : null,
            )}
          </div>
        </div>
        <div className="store-footer-column">
          <h2>Khám phá</h2>
          <Link href="/san-pham">Tất cả sản phẩm</Link>
          <Link href="/san-pham?danh-muc=nhan-vat">Nhân vật gỗ</Link>
          <Link href="/san-pham?danh-muc=chuoi">Chuỗi & phụ kiện</Link>
          <Link href="/chung-toi">Câu chuyện Mộc Bàm</Link>
          <Link href="/blog">Nhật ký Mộc Bàm</Link>
        </div>
        <div className="store-footer-column">
          <h2>Đồng hành</h2>
          <details>
            <summary>
              Chính sách & hướng dẫn <ChevronDown size={14} />
            </summary>
            <div>
              {policyLinks.map((policy) => (
                <Link key={policy.id} href={policyHref(policy.id)}>
                  {policy.title}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/lien-he">Liên hệ với chúng tôi</Link>
          <Link href="/tai-khoan">Tài khoản & đơn hàng</Link>
        </div>
        <div className="store-footer-column store-footer-contact">
          <h2>Ghé Mộc một chút</h2>
          <p>{settings?.shop_address || "Mộc Bàm · Việt Nam"}</p>
          {settings?.shop_hours ? <p>{settings.shop_hours}</p> : null}
          {settings?.shop_email ? (
            <a href={`mailto:${settings.shop_email}`}>{settings.shop_email}</a>
          ) : null}
          <Link href="/lien-he" className="store-footer-message">
            Gửi Mộc lời nhắn <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="store-footer-bottom">
        <span>
          © {new Date().getFullYear()} Mộc Bàm. Từ gỗ, với thương yêu.
        </span>
        <Link href={policyHref("bao-mat")}>Quyền riêng tư</Link>
      </div>
    </footer>
  );
}
