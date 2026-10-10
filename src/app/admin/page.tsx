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
import { paymentStatusLabels } from "@/lib/payments";
import { AdminHeading } from "@/components/admin/admin-shell";
import { EmptyState, StatusBadge } from "@/components/admin/admin-common";
import { canRenderAdmin } from "@/components/admin/admin-access";
import { filterOverviewOrders } from "@/lib/admin-search";
import type { OrderStatus } from "@/lib/types";

const panelClass =
  "rounded-2xl border border-[#dfe5d8] bg-white p-5 shadow-sm sm:p-6";

const overviewStatuses: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang chuẩn bị" },
  { value: "shipped", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "returned", label: "Đã nhận hoàn hàng" },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  if (!(await canRenderAdmin())) return null;
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").slice(0, 200);
  const status = overviewStatuses.some(
    (option) => option.value === params.status,
  )
    ? (params.status as OrderStatus)
    : "all";
  const [stats, orders] = await Promise.all([
    getAdminDashboard(),
    getAdminOrders(),
  ]);
  const filteredOrders = filterOverviewOrders(orders, query, status);
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
      title: "Doanh thu thuần",
      value: formatPrice(
        orders
          .filter(
            (order) =>
              !["cancelled", "returned"].includes(order.status) &&
              order.payment_status !== "refunded",
          )
          .reduce(
            (sum, order) =>
              sum + Number(order.subtotal) - Number(order.discount_amount || 0),
            0,
          ),
      ),
      note: "Sau ưu đãi, loại đơn hủy/hoàn; gồm đơn chưa thanh toán, chưa gồm phí giao hàng",
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
        <form
          action="/admin"
          method="get"
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-48 flex-1 text-xs text-[#6b7867]">
            Tìm đơn hàng
            <input
              className="mt-1 w-full rounded-lg border border-[#d4dcce] px-3 py-2.5 text-sm text-[#294836]"
              type="search"
              name="q"
              defaultValue={query}
              maxLength={200}
              placeholder="Mã đơn, khách hàng, email, điện thoại"
            />
          </label>
          <label className="text-xs text-[#6b7867]">
            Trạng thái
            <select
              className="mt-1 block rounded-lg border border-[#d4dcce] bg-white px-3 py-2.5 text-sm text-[#294836]"
              name="status"
              defaultValue={status}
            >
              <option value="all">Tất cả trạng thái</option>
              {overviewStatuses.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-lg bg-[#294836] px-4 py-2.5 text-sm font-medium text-white"
            type="submit"
          >
            Lọc đơn
          </button>
          {(query || status !== "all") && (
            <Link className="px-2 py-2.5 text-sm underline" href="/admin">
              Xóa bộ lọc
            </Link>
          )}
        </form>
        <p className="mb-4 text-xs leading-5 text-[#6b7867]">
          Hiển thị {Math.min(6, filteredOrders.length)}/{filteredOrders.length}{" "}
          đơn phù hợp, mới nhất trước. Bộ lọc chỉ áp dụng cho danh sách đơn; các
          thẻ tổng quan tính toàn cửa hàng.
        </p>
        {filteredOrders.length === 0 ? (
          <EmptyState>
            {orders.length === 0
              ? "Chưa có đơn hàng. Đơn đặt mới sẽ xuất hiện tại đây."
              : "Không có đơn hàng phù hợp với tìm kiếm và trạng thái đã chọn."}
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
                  <th className="font-medium">Xử lý đơn / Thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 6).map((order) => (
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
                      <p className="mt-2 text-xs text-[#6b7867]">
                        {paymentStatusLabels[order.payment_status]}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-6 rounded-2xl bg-[#eaf0e2] p-5 text-sm leading-6 text-[#53664a]">
        <strong>Đối soát thanh toán:</strong> Khách có thể chọn COD hoặc chuyển
        khoản khi cửa hàng đã bật và lưu thông tin ngân hàng. Trong mục Đơn
        hàng, chỉ xác nhận đã nhận tiền sau khi kiểm tra tiền thực tế. Xử lý đơn
        và thanh toán có trạng thái riêng; hủy đơn đã nhận tiền cần hoàn trả bên
        ngoài website, rồi ghi nhận hoàn tiền.
      </div>
    </>
  );
}
