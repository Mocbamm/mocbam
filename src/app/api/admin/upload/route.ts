import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readBody,
} from "@/lib/http";
import { imageExtension, videoExtension } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new HttpError(415, "Vui lòng gửi tệp hình ảnh hoặc video.");
    if (Number(request.headers.get("content-length") || 0) > 20_300_000)
      throw new HttpError(413, "Video tối đa 20 MB, ảnh tối đa 4 MB.");
    const bytesOfRequest = await readBody(request, 20_300_000);
    const form = await new Response(bytesOfRequest, {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
    if (
      form.getAll("file").length !== 1 ||
      [...form.keys()].some((key) => key !== "file")
    )
      throw new HttpError(400, "Chỉ gửi một tệp mỗi lần.");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 20_000_000)
      throw new HttpError(
        400,
        "Chọn ảnh JPEG, PNG, WebP hoặc video MP4, WebM hợp lệ.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageFormat = imageExtension(bytes, file.type);
    if (imageFormat && file.size > 4_000_000)
      throw new HttpError(413, "Ảnh phải nhỏ hơn 4 MB.");
    const extension = imageFormat || videoExtension(bytes, file.type);
    if (!extension)
      throw new HttpError(
        400,
        "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc video MP4, WebM hợp lệ.",
      );
    const path = `${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("products")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw databaseError(error);
    return json({ url: `/api/media/${path}` }, 201);
  } catch (error) {
    return apiError(error);
  }
}
