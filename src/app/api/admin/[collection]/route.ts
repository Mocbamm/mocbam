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
  postSchema,
  productSchema,
  discountSchema,
} from "@/lib/validation";
import { getAdminDiscounts } from "@/lib/promotions";
import {
  getAdminContent,
  getAdminInquiries,
  getAdminOrders,
  getAdminPosts,
  getAdminProducts,
} from "@/lib/catalog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const { collection } = await params;
    const schemas = {
      products: productSchema,
      posts: postSchema,
      content: contentSchema,
      categories: categorySchema,
      discounts: discountSchema,
    };
    if (!(collection in schemas))
      throw new HttpError(404, "Không tìm thấy chức năng.");
    const input: Record<string, unknown> = schemas[
      collection as keyof typeof schemas
    ].parse(await readJson(request, 120_000));
    const { data, error } = await supabase
      .from(collection === "content" ? "site_content" : collection)
      .insert(input)
      .select()
      .single();
    if (error) throw databaseError(error);
    return json({ data }, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection } = await params;
    const getters = {
      products: getAdminProducts,
      orders: getAdminOrders,
      posts: getAdminPosts,
      content: getAdminContent,
      inquiries: getAdminInquiries,
      discounts: getAdminDiscounts,
    };
    if (!(collection in getters))
      throw new HttpError(404, "Không tìm thấy chức năng.");
    return json({ data: await getters[collection as keyof typeof getters]() });
  } catch (error) {
    return apiError(error);
  }
}
