import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import { AnalyticsManager } from "@/components/admin/analytics-manager";
import { getAdminReportOrders } from "@/lib/admin-insights";
import { parseReportRange } from "@/lib/report-periods";
import { reportDateRange } from "@/lib/store-reports";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await canRenderAdmin())) return null;
  const initialRange =
    parseReportRange(await searchParams, { allowAll: true }) ??
    reportDateRange(new Date(), 30);
  return (
    <>
      <AdminHeading
        title="Báo cáo tài chính"
        description="Cửa hàng bán được bao nhiêu, lãi bao nhiêu và đã thu về bao nhiêu tiền. Chọn khoảng thời gian bên dưới để xem."
      />
      <AnalyticsManager
        orders={await getAdminReportOrders()}
        initialRange={initialRange}
      />
    </>
  );
}
