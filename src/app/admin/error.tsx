"use client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-lg rounded-2xl border border-[#dfe5d8] bg-white p-8 text-center"
    >
      <AlertCircle className="mx-auto mb-4 size-9 text-[#7c8a62]" />
      <h2 className="text-2xl font-semibold">Chưa thể tải dữ liệu cửa hàng</h2>
      <p className="mt-3 text-sm leading-7 text-[#6b7867]">
        Kết nối có thể đang gián đoạn. Thử tải lại; nếu lỗi tiếp diễn, kiểm tra
        cấu hình Supabase và quyền quản trị.
      </p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button onClick={reset}>Thử lại</Button>
        <Link
          href="/tai-khoan"
          className="text-sm underline underline-offset-4"
        >
          Về tài khoản
        </Link>
      </div>
    </div>
  );
}
