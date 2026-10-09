import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import {
  AnalyticsManager,
  ReportModules,
} from "@/components/admin/analytics-manager";
import { getAdminReportOrders } from "@/lib/admin-insights";
import { reportDateRange } from "@/lib/store-reports";

export default async function AdminAnalyticsPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Báo cáo tài chính"
        description="Theo dõi doanh thu, đơn hàng, giảm giá và dòng tiền thực tế của cửa hàng."
      />
      <ReportModules />
      <AnalyticsManager
        orders={await getAdminReportOrders()}
        initialRange={reportDateRange(new Date(), 30)}
      />
    </>
  );
}
