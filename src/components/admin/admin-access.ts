import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, requireAdmin } from "@/lib/auth";
import { isConfigured } from "@/lib/catalog";

// Server pages may render in parallel with their layout. Gate their data reads too.
export async function canRenderAdmin() {
  if (!isConfigured()) return false;
  const user = await getCurrentUser();
  if (!user) redirect("/tai-khoan?next=/admin");
  if (!(await isAdmin(user))) return false;
  await requireAdmin();
  return true;
}
