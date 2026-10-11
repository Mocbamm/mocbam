import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import { TrafficManager } from "@/components/admin/traffic-manager";
import { parseReportRange } from "@/lib/report-periods";
import { reportDateRange } from "@/lib/store-reports";

export default async function AdminTrafficPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Lưu lượng website"
        description="Bao nhiêu người ghé website, họ đến từ đâu, xem trang nào và bao nhiêu người đi đến bước đặt hàng. Số liệu lấy từ Google Analytics."
      />
      <TrafficManager
        initialRange={
          parseReportRange(await searchParams) ??
          reportDateRange(new Date(), 30)
        }
      />
    </>
  );
}
