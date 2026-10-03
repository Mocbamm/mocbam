import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requestOrigin, safeNext } from "@/lib/http";
import { isConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const store = await cookies();
  const next = safeNext(store.get("mocbam-auth-next")?.value || null);
  store.delete({ name: "mocbam-auth-next", path: "/auth" });
  const code = url.searchParams.get("code");
  if (code && isConfigured()) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin), 303);
  }
  return NextResponse.redirect(new URL("/tai-khoan?error=oauth", origin), 303);
}
