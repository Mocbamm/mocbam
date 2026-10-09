import { requireAdmin } from "./auth";
import { databaseError } from "./http";
import type { SupportMessage, SupportThread } from "./support";

type SupportDatabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];
type ThreadRow = Pick<SupportThread, "user_id" | "resolved" | "updated_at">;
type ProfileRow = SupportThread["profile"] & { id: string };

async function allSupportRows<T>(
  db: SupportDatabase,
  table: string,
  columns: string,
  key: string,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | number | undefined;
  for (;;) {
    let query = db.from(table).select(columns).order(key).limit(500);
    if (cursor !== undefined) query = query.gt(key, cursor);
    const { data, error } = await query;
    if (error) throw databaseError(error);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < 500) return rows;
    cursor = (page.at(-1) as Record<string, string | number>)[key];
  }
}

export async function getAdminSupportThreads(): Promise<SupportThread[]> {
  const { supabase } = await requireAdmin();
  const [threads, messages, profiles] = await Promise.all([
    allSupportRows<ThreadRow>(
      supabase,
      "support_threads",
      "user_id,resolved,updated_at",
      "user_id",
    ),
    allSupportRows<SupportMessage>(
      supabase,
      "support_messages",
      "id,user_id,sender,body,created_at",
      "id",
    ),
    allSupportRows<ProfileRow>(
      supabase,
      "profiles",
      "id,full_name,email,phone",
      "id",
    ),
  ]);
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  const messagesByUser = new Map<string, SupportMessage[]>();
  for (const message of messages) {
    const history = messagesByUser.get(message.user_id) || [];
    history.push(message);
    messagesByUser.set(message.user_id, history);
  }
  return threads
    .sort(
      (a, b) =>
        b.updated_at.localeCompare(a.updated_at) ||
        a.user_id.localeCompare(b.user_id),
    )
    .map((thread) => ({
      ...thread,
      profile: profilesById.get(thread.user_id) || {
        full_name: "Khách hàng",
        email: "",
        phone: "",
      },
      messages: messagesByUser.get(thread.user_id) || [],
    }));
}
