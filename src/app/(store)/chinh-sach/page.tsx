import Link from "next/link";
import { getPageContent } from "@/lib/site-content-server";
import { Prose } from "@/components/store/content";
import { policyHref, policyLinks } from "@/components/store/policies";
import { metaDescription, pageMetadata } from "@/lib/seo";
const keys: Record<string, string> = {
  "huong-dan": "shopping-guide",
  "van-chuyen": "shipping",
  "thanh-toan": "payment",
  "doi-tra": "returns",
  "bao-hanh": "warranty",
  "bao-mat": "privacy",
  "dieu-khoan": "terms",
};
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ muc?: string }>;
}) {
  const { muc } = await searchParams;
  const selected = policyLinks.find((policy) => policy.id === muc);
  const entry = selected
    ? (await getPageContent("policies"))[keys[selected.id]]
    : null;
  if (!selected || !entry)
    return pageMetadata({
      title: "Chính sách & hướng dẫn",
      description:
        "Hướng dẫn mua hàng, giao hàng, thanh toán, đổi trả, bảo hành và quyền riêng tư khi mua phụ kiện handmade tại Mộc Bàm.",
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
  const selected = policyLinks.find((policy) => policy.id === muc);
  const content = await getPageContent("policies");
  const entry = selected ? content[keys[selected.id]] : null;
  return (
    <div className="store-page store-policy-page">
      <p className="store-eyebrow">Để chúng mình hiểu nhau hơn</p>
      <h1 className="store-page-title">
        {entry?.title || "Chính sách & hướng dẫn."}
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
                {content[keys[policy.id]].title}
              </Link>
            ))}
          </div>
        </>
      )}
      <p className="mt-10 border-t border-[#dde1d0] pt-7 text-sm leading-7 text-[#7c866b]">
        Bạn cần trao đổi thêm?{" "}
        <Link href="/lien-he" className="underline underline-offset-4">
          Gửi lời nhắn cho Mộc.
        </Link>
      </p>
    </div>
  );
}
