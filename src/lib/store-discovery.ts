import type { BlogPost } from "./types";

export function searchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .trim();
}

export function matchesSearch(content: string, query: string) {
  const tokens = searchText(query).split(/\s+/).filter(Boolean);
  const normalized = searchText(content);
  return (
    tokens.length > 0 && tokens.every((token) => normalized.includes(token))
  );
}

export function storeDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function filterPostsByDate(posts: BlogPost[], from: string, to: string) {
  return posts.filter((post) => {
    const date = storeDate(post.created_at);
    return (!from || date >= from) && (!to || date <= to);
  });
}
