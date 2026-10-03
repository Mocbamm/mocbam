import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requestOrigin, safeNext } from "@/lib/http";
import { isConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  if (!isConfigured())
    return NextResponse.redirect(
      new URL("/tai-khoan?error=not_configured", origin),
    );
  const next = safeNext(url.searchParams.get("next"));
  const store = await cookies();
  store.set("mocbam-auth-next", next, {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    maxAge: 600,
    path: "/auth",
  });
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url)
    return NextResponse.redirect(new URL("/tai-khoan?error=oauth", origin));
  return NextResponse.redirect(data.url);
}
