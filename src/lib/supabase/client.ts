"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "./config";

export function createBrowserSupabase() {
  const config = publicConfig();
  if (!config) throw new Error("Cửa hàng chưa kết nối Supabase.");
  return createBrowserClient(config.url, config.key);
}

export const createClient = createBrowserSupabase;
