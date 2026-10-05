import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requestOrigin, safeNext } from "@/lib/http";
export async function GET(request: Request) {
  const url = new URL(request.url),
    origin = requestOrigin(request);
  const token = url.searchParams.get("token_hash");
  if (token && url.searchParams.get("type") === "email") {
    const db = await createServerSupabase();
    const { error } = await db.auth.verifyOtp({
      token_hash: token,
      type: "email",
    });
    if (!error) {
      const destination = new URL(
        safeNext(url.searchParams.get("next")),
        origin,
      );
      if (destination.pathname === "/tai-khoan")
        destination.searchParams.set("confirmed", "1");
      return NextResponse.redirect(destination, 303);
    }
  }
  return NextResponse.redirect(
    new URL("/tai-khoan?error=confirmation", origin),
    303,
  );
}
