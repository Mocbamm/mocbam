import { getCurrentUser, isAdmin } from "@/lib/auth";
import { apiError, databaseError, HttpError } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string }> },
) {
  try {
    const { path } = await params;
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))
      throw new HttpError(404, "Không tìm thấy ảnh.");
    const db = createServiceSupabase();
    const url = `/api/media/${path}`;
    const [products, posts] = await Promise.all([
      db
        .from("products")
        .select("id")
        .eq("image_url", url)
        .eq("active", true)
        .limit(1),
      db
        .from("posts")
        .select("id")
        .eq("image_url", url)
        .eq("published", true)
        .limit(1),
    ]);
    if (products.error) throw databaseError(products.error);
    if (posts.error) throw databaseError(posts.error);
    const published = Boolean(products.data?.length || posts.data?.length);
    if (!published && !(await isAdmin(await getCurrentUser())))
      throw new HttpError(404, "Không tìm thấy ảnh.");
    const { data, error } = await db.storage.from("products").download(path);
    if (error || !data) throw new HttpError(404, "Không tìm thấy ảnh.");
    return new Response(data, {
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
