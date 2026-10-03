import { getAdminSettings } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { SettingsManager } from "@/components/admin/settings-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminSettingsPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Cài đặt cửa hàng"
        description="Quản lý phí giao hàng, thông tin liên hệ và các trang mạng xã hội của Mộc Bàm."
      />
      <SettingsManager settings={await getAdminSettings()} />
    </>
  );
}
