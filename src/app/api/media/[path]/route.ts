import { getCurrentUser, isAdmin } from "@/lib/auth";
import { apiError, databaseError, HttpError } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string }> },
) {
  try {
    const { path } = await params;
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm)$/.test(path))
      throw new HttpError(404, "Không tìm thấy tệp.");
    const db = createServiceSupabase();
    const url = `/api/media/${path}`;
    const [products, posts] = await Promise.all([
      db
        .from("products")
        .select("id")
        .or(`image_url.eq.${url},video_url.eq.${url},image_urls.cs.{${url}}`)
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
    const headers = new Headers({
      "Content-Type": data.type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    });
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        headers.set("Content-Range", `bytes */${data.size}`);
        return new Response(null, { status: 416, headers });
      }
      const start = match[1]
        ? Number(match[1])
        : Math.max(0, data.size - Number(match[2]));
      const end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), data.size - 1)
          : data.size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start > end ||
        start >= data.size
      ) {
        headers.set("Content-Range", `bytes */${data.size}`);
        return new Response(null, { status: 416, headers });
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${data.size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(data.slice(start, end + 1), { status: 206, headers });
    }
    headers.set("Content-Length", String(data.size));
    return new Response(data, { headers });
  } catch (error) {
    return apiError(error);
  }
}
