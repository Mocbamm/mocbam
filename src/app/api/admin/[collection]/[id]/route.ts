import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import {
  categorySchema,
  contentSchema,
  inquiryUpdateSchema,
  postSchema,
  productSchema,
  statusSchema,
} from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ collection: string; id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const { collection, id } = await params;
    const body = await readJson(request, 120_000);
    if (collection === "orders") {
      z.uuid().parse(id);
      const input = statusSchema.parse(body);
      const { data, error } = await supabase.rpc("set_order_status", {
        p_order_id: id,
        p_status: input.status,
      });
      if (error) throw databaseError(error);
      return json({ data });
    }
    const schemas = {
      products: productSchema.partial(),
      posts: postSchema.partial(),
      content: contentSchema.partial(),
      inquiries: inquiryUpdateSchema,
      categories: categorySchema.partial(),
    };
    if (!(collection in schemas))
      throw new HttpError(404, "Không tìm thấy chức năng.");
    const input = schemas[collection as keyof typeof schemas].parse(body);
    if (!Object.keys(input).length)
      throw new HttpError(400, "Không có thay đổi để lưu.");
    if (collection === "content") {
      if (!/^[a-z0-9_-]{1,80}$/.test(id))
        throw new HttpError(400, "Mã nội dung không hợp lệ.");
      if ("key" in input && input.key !== id)
        throw new HttpError(400, "Không thể đổi mã nội dung.");
    } else z.uuid().parse(id);
    const { data, error } = await supabase
      .from(collection === "content" ? "site_content" : collection)
      .update(input)
      .eq(collection === "content" ? "key" : "id", id)
      .select()
      .maybeSingle();
    if (error) throw databaseError(error);
    if (!data) throw new HttpError(404, "Không tìm thấy bản ghi.");
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}
