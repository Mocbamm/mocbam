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
  discountSchema,
} from "@/lib/validation";
import { deliverOrderAnalytics } from "@/lib/order-analytics-server";

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
        p_restock:
          input.status === "returned" ? (input.restock ?? false) : false,
      });
      if (error) throw databaseError(error);
      await deliverOrderAnalytics();
      return json({ data });
    }
    if (collection === "products") {
      z.uuid().parse(id);
      const { expected_revision, ...input } = productSchema
        .partial()
        .extend({ expected_revision: z.number().int().min(0) })
        .parse(body);
      if (!Object.keys(input).length)
        throw new HttpError(400, "Không có thay đổi để lưu.");
      const { data, error } = await supabase
        .from("products")
        .update(input)
        .eq("id", id)
        .eq("revision", expected_revision)
        .select("id")
        .maybeSingle();
      if (error) throw databaseError(error);
      if (!data)
        throw new HttpError(
          409,
          "Sản phẩm hoặc tồn kho đã thay đổi. Tải lại trang, mở lại sản phẩm và nhập thay đổi để tránh ghi đè đơn hàng mới.",
        );
      return json({ data });
    }
    const schemas = {
      products: productSchema.partial(),
      posts: postSchema.partial(),
      content: contentSchema.partial(),
      inquiries: inquiryUpdateSchema,
      categories: categorySchema.partial(),
      discounts: discountSchema,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection: string; id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const { collection, id } = await params;
    if (collection !== "products")
      throw new HttpError(404, "Không tìm thấy chức năng.");
    z.uuid().parse(id);
    const { data: items, error: itemError } = await supabase
      .from("order_items")
      .select("id")
      .eq("product_id", id)
      .limit(1);
    if (itemError) throw databaseError(itemError);
    if (items?.length)
      throw new HttpError(
        409,
        "Sản phẩm đã có đơn hàng. Hãy ẩn sản phẩm để giữ lịch sử mua hàng và hoàn trả.",
      );
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) {
      if (error.code === "23503")
        throw new HttpError(
          409,
          "Sản phẩm đã có đơn hàng. Hãy ẩn sản phẩm để giữ lịch sử.",
        );
      throw databaseError(error);
    }
    if (!data) throw new HttpError(404, "Không tìm thấy sản phẩm.");
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}
