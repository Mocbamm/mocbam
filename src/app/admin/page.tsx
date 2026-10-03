import Link from "next/link";
import {
  ArrowUpRight,
  MessageSquare,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { getAdminDashboard, getAdminOrders } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/utils";
import { AdminHeading } from "@/components/admin/admin-shell";
import { EmptyState, StatusBadge } from "@/components/admin/admin-common";
import { canRenderAdmin } from "@/components/admin/admin-access";

const panelClass =
  "rounded-2xl border border-[#dfe5d8] bg-white p-5 shadow-sm sm:p-6";

export default async function AdminDashboard() {
  if (!(await canRenderAdmin())) return null;
  const [stats, orders] = await Promise.all([
    getAdminDashboard(),
    getAdminOrders(),
  ]);
  const cards = [
    {
      title: "Sản phẩm",
      value: String(stats.product_count),
      note: "Trong danh mục cửa hàng",
      icon: Package,
    },
    {
      title: "Đơn hàng",
      value: String(stats.order_count),
      note: `${stats.pending_orders} đơn chờ xác nhận`,
      icon: ShoppingBag,
    },
    {
      title: "Giá trị đơn hàng",
      value: formatPrice(stats.total_order_value),
      note: "Giá trị đơn không bị hủy",
      icon: Wallet,
    },
    {
      title: "Liên hệ",
      value: String(stats.inquiry_count),
      note: "Cần kiểm tra và phản hồi",
      icon: MessageSquare,
    },
  ];
  return (
    <>
      <AdminHeading
        title="Chào ngày mới, Mộc Bàm."
        description="Một góc nhỏ để theo dõi đơn hàng, chăm chút sản phẩm và cập nhật câu chuyện của cửa hàng."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, note, icon: Icon }) => (
          <div key={title} className={panelClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#6b7867]">{title}</p>
              <Icon className="size-5 text-[#718664]" />
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight">
              {value}
            </p>
            <p className="mt-2 text-xs text-[#7c8774]">{note}</p>
          </div>
        ))}
      </div>
      <div className={panelClass}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Đơn hàng gần đây</h2>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-sm hover:underline"
          >
            Xem tất cả <ArrowUpRight className="size-4" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <EmptyState>
            Chưa có đơn hàng. Đơn đặt mới sẽ xuất hiện tại đây.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e8ecdf] text-xs uppercase tracking-wide text-[#77836e]">
                <tr>
                  <th className="py-3 pr-4 font-medium">Mã đơn</th>
                  <th className="pr-4 font-medium">Khách hàng</th>
                  <th className="pr-4 font-medium">Ngày đặt</th>
                  <th className="pr-4 font-medium">Tổng tiền</th>
                  <th className="font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#edf0e7] last:border-0"
                  >
                    <td className="py-4 pr-4 font-medium">{order.reference}</td>
                    <td className="pr-4">{order.customer_name}</td>
                    <td className="whitespace-nowrap pr-4 text-[#6b7867]">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="whitespace-nowrap pr-4">
                      {formatPrice(order.total)}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-6 rounded-2xl bg-[#eaf0e2] p-5 text-sm leading-6 text-[#53664a]">
        <strong>Nhắc nhỏ:</strong> Cửa hàng hiện dùng phương thức thanh toán
        chuyển khoản. Đơn đặt hàng luôn hiển thị “Chờ thanh toán”; trạng thái xử
        lý đơn được cập nhật riêng trong mục Đơn hàng.
      </div>
    </>
  );
}
