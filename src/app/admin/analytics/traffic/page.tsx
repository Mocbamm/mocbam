import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ReportModules } from "@/components/admin/analytics-manager";
import { TrafficManager } from "@/components/admin/traffic-manager";
import { reportPeriodRange } from "@/lib/store-reports";

export default async function AdminTrafficPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Lưu lượng website"
        description="Đọc người dùng, nguồn truy cập, trang đích và phễu mua hàng thực tế từ Google Analytics 4."
      />
      <ReportModules traffic />
      <TrafficManager initialRange={reportPeriodRange(new Date(), "month")} />
    </>
  );
}
