import Link from "next/link";
import { getPageContent } from "@/lib/site-content-server";
import { Prose } from "@/components/store/content";
import {
  findPolicy,
  policyHref,
  policyLinks,
} from "@/components/store/policies";
import { metaDescription, pageMetadata } from "@/lib/seo";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ muc?: string }>;
}) {
  const { muc } = await searchParams;
  const selected = findPolicy(muc);
  const entry = selected
    ? (await getPageContent("policies"))[selected.key]
    : null;
  if (!selected || !entry)
    return pageMetadata({
      title: "Chính sách & hướng dẫn",
      description:
        "Hướng dẫn mua hàng, giao hàng, thanh toán, đổi trả, quyền riêng tư và cách liên hệ khi mua đồ decor handmade tại Mộc Bàm.",
      path: "/chinh-sach",
    });
  return pageMetadata({
    title: entry.title || selected.title,
    description: metaDescription(entry.content),
    path: policyHref(selected.id),
  });
}
export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ muc?: string }>;
}) {
  const { muc } = await searchParams;
  const selected = findPolicy(muc);
  const content = await getPageContent("policies");
  const entry = selected ? content[selected.key] : null;
  return (
    <div className="store-page store-policy-page">
      <h1 className="store-page-title">
        {entry?.title || "Chính sách & hướng dẫn"}
      </h1>
      {entry ? (
        // Owner feedback: show only the policy the customer opened, without a
        // side list of every policy taking up space.
        <div className="store-policy-layout">
          <section className="store-policy-content" aria-label={entry.title}>
            <Prose content={entry.content} />
          </section>
        </div>
      ) : (
        <>
          <p className="store-page-description">
            Chọn mục bạn cần để xem thông tin mua hàng và hỗ trợ.
          </p>
          <div className="store-policy-grid">
            {policyLinks.map((policy) => (
              <Link
                key={policy.id}
                href={policyHref(policy.id)}
                className="store-policy-card"
              >
                {policy.title}
              </Link>
            ))}
          </div>
        </>
      )}
      <p className="mt-10 border-t border-[#dde1d0] pt-7 text-sm leading-7 text-[#7c866b]">
        Bạn cần trao đổi thêm?{" "}
        <Link href="/lien-he" className="underline underline-offset-4">
          Gửi lời nhắn cho Mộc Bàm.
        </Link>
      </p>
    </div>
  );
}
