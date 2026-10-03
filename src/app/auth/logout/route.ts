import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, requestOrigin } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.redirect(
      new URL("/tai-khoan", requestOrigin(request)),
      303,
    );
  } catch (error) {
    return apiError(error);
  }
}
