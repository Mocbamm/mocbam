import { parseInline, type RichInline } from "./rich-text";
import type { BlogPost, Product } from "./types";

// The shop's own pages a piece of content links to, e.g. "/san-pham/meo-moc".
export function internalLinks(content: string) {
  const paths: string[] = [];
  const walk = (nodes: RichInline[]) => {
    for (const node of nodes) {
      if (typeof node === "string") continue;
      if (node.type === "link" && !node.external)
        paths.push(node.href.split(/[?#]/)[0]);
      walk(node.children);
    }
  };
  walk(parseInline(content));
  return [...new Set(paths)];
}

export function linkedProducts(content: string, products: Product[]) {
  const slugs = internalLinks(content)
    .map((path) => /^\/san-pham\/([a-z0-9-]+)\/?$/.exec(path)?.[1])
    .filter(Boolean);
  return slugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));
}

// Products a post links to, topped up with featured then newest products so
// every post leads readers (and search engines) to the shop.
export function postProducts(post: BlogPost, products: Product[], count = 4) {
  const linked = linkedProducts(post.content, products);
  const rest = [...products]
    .filter((product) => !linked.includes(product))
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        b.created_at.localeCompare(a.created_at),
    );
  return {
    linked: linked.length > 0,
    products: [...linked, ...rest].slice(0, count),
  };
}

// Posts that link to a product, newest first.
export function postsAboutProduct(product: Product, posts: BlogPost[]) {
  return posts
    .filter((post) =>
      linkedProducts(post.content, [product]).some(
        (linked) => linked.id === product.id,
      ),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Other posts to read next: ones sharing a linked product first, then newest.
export function otherPosts(post: BlogPost, posts: BlogPost[], count = 2) {
  const mine = new Set(internalLinks(post.content));
  const shared = (other: BlogPost) =>
    internalLinks(other.content).filter((path) => mine.has(path)).length;
  return posts
    .filter((other) => other.id !== post.id)
    .sort(
      (a, b) =>
        shared(b) - shared(a) || b.created_at.localeCompare(a.created_at),
    )
    .slice(0, count);
}
