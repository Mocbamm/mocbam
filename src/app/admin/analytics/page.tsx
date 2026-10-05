import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import { AnalyticsManager } from "@/components/admin/analytics-manager";
import { getAdminReportOrders } from "@/lib/admin-insights";
import { reportDateRange } from "@/lib/store-reports";

export default async function AdminAnalyticsPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Báo cáo cửa hàng"
        description="Theo dõi đơn hàng, dòng tiền đã ghi nhận và sản phẩm được đặt trực tiếp trong trang quản trị."
      />
      <AnalyticsManager
        orders={await getAdminReportOrders()}
        initialRange={reportDateRange(new Date(), 30)}
      />
    </>
  );
}
