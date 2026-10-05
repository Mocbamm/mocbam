import { safeNext } from "@/lib/http";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { isConfigured } from "@/lib/catalog";
import { AccountOrders } from "@/components/store/orders";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";
import { AccountForm, ProfileForm } from "@/components/store/account-form";
import { getCustomerProfile } from "@/lib/customer-profile";
export const metadata = {
  title: "Tài khoản",
  robots: { index: false, follow: false },
};
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const admin = user ? await isAdmin(user) : false;
  const profile = user ? await getCustomerProfile() : null;
  const next = safeNext(typeof query.next === "string" ? query.next : null);
  return (
    <main className="mx-auto max-w-4xl px-5 pt-14 sm:px-8">
      {user ? (
        <>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#889777]">
                Rất vui gặp lại bạn
              </p>
              <h1 className="font-serif text-5xl tracking-tight text-[#29412d]">
                Góc nhỏ của bạn.
              </h1>
              <p className="mt-4 text-xs text-[#7c866b]">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {admin ? (
                <Button asChild size="sm">
                  <Link href="/admin">Quản trị cửa hàng</Link>
                </Button>
              ) : null}
              <form action="/auth/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Đăng xuất
                </Button>
              </form>
            </div>
          </div>
          {profile ? <ProfileForm profile={profile} /> : null}
          <h2 className="mb-5 font-serif text-2xl text-[#29412d]">
            Những đơn hàng đã gửi
          </h2>
          <AccountOrders />
        </>
      ) : (
        <section className="mx-auto max-w-lg border border-[#dde1d0] bg-[#edf0e5] px-8 py-12 text-center">
          {query.error ? (
            <p
              role="alert"
              className="mb-6 border border-[#d9ca9d] bg-[#f3eddb] p-4 text-xs leading-6 text-[#847044]"
            >
              Chưa thể xác nhận đăng nhập. Vui lòng thử lại hoặc mở lại liên kết
              xác nhận email.
            </p>
          ) : null}
          <Leaf
            size={30}
            strokeWidth={1.2}
            className="mx-auto text-[#8b9b79]"
          />
          <p className="mt-7 text-[10px] uppercase tracking-[0.2em] text-[#889777]">
            Chào bạn đến với Mộc
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-[#29412d]">
            Một góc nhỏ dành riêng.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#7c866b]">
            Đăng nhập bằng Google hoặc email để lưu đơn hàng và theo dõi hành
            trình những điều bạn chọn.
          </p>
          {isConfigured() ? (
            <Button asChild className="mt-7 h-12">
              <a href={`/auth/login?next=${encodeURIComponent(next)}`}>
                <span className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-white font-semibold text-[#29412d]">
                  G
                </span>
                Tiếp tục với Google
              </a>
            </Button>
          ) : (
            <p className="mt-7 border border-[#d7ddcd] p-4 text-xs leading-6 text-[#7c866b]">
              Đăng nhập Google sẽ hoạt động sau khi kết nối Supabase và cấu hình
              OAuth. Bạn đang xem bản trình diễn.
            </p>
          )}
          <AccountForm configured={isConfigured()} next={next} />
          <p className="mt-5 text-[10px] leading-6 text-[#8b947d]">
            Bạn vẫn có thể chọn sản phẩm và đặt hàng với tư cách khách khi cửa
            hàng đã được kết nối.
          </p>
        </section>
      )}
      {!user ? (
        <section className="mt-10">
          <h2 className="mb-5 font-serif text-2xl">
            Đơn hàng trên thiết bị này
          </h2>
          <AccountOrders signedIn={false} />
        </section>
      ) : null}
    </main>
  );
}
