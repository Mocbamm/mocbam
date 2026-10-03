import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Sprout } from "lucide-react";
import { getCurrentUser, isAdmin, requireAdmin } from "@/lib/auth";
import { isConfigured } from "@/lib/catalog";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Quản trị | Mộc Bàm",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isConfigured())
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <Sprout className="mb-5 size-12 text-[#37533c]" />
        <h1 className="text-3xl font-semibold">Kết nối cửa hàng của bạn</h1>
        <p className="mt-4 text-sm leading-7 text-[#697465]">
          Trang quản trị sẽ sẵn sàng sau khi cấu hình Supabase, chạy migration
          và cấp quyền cho tài khoản quản trị. Xem hướng dẫn thiết lập trong
          README và docs/ADMIN.md.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-[#294836] px-6 py-3 text-sm text-white"
        >
          Về cửa hàng
        </Link>
      </div>
    );
  const user = await getCurrentUser();
  if (!user) redirect("/tai-khoan?next=/admin");
  if (!(await isAdmin(user)))
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <ShieldCheck className="mb-5 size-12 text-[#37533c]" />
        <h1 className="text-3xl font-semibold">
          Tài khoản chưa có quyền quản trị
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#697465]">
          Bạn đã đăng nhập bằng {user.email}. Chủ cửa hàng cần thêm tài khoản
          này vào danh sách quản trị trước khi bạn có thể quản lý cửa hàng.
        </p>
        <Link
          href="/tai-khoan"
          className="mt-6 rounded-full bg-[#294836] px-6 py-3 text-sm text-white"
        >
          Về tài khoản
        </Link>
      </div>
    );
  await requireAdmin();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
