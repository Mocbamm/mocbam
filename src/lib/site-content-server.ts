import { isConfigured } from "./catalog";
import { databaseError } from "./http";
import { createServerSupabase } from "./supabase/server";
import {
  contentEntry,
  contentSections,
  type ContentGroup,
} from "./site-content";
import { demoContent } from "./demo-data";
import type { SiteContent } from "./types";

export async function getPageContent(group: ContentGroup) {
  const sections = contentSections.filter((section) => section.group === group);
  let entries = demoContent;
  if (isConfigured()) {
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("site_content")
      .select("key,title,content")
      .in(
        "key",
        sections.map((section) => section.key),
      );
    if (error) throw databaseError(error);
    entries = data as SiteContent[];
  }
  return Object.fromEntries(
    sections.map((section) => [
      section.key,
      contentEntry(entries, section.key),
    ]),
  );
}
