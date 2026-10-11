import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPageContent } from "@/lib/site-content-server";
import { Prose } from "@/components/store/content";
import { policyHref, policyLinks } from "@/components/store/policies";
export const metadata = { title: "Chính sách & hướng dẫn" };
const keys: Record<string, string> = {
  "huong-dan": "shopping-guide",
  "van-chuyen": "shipping",
  "thanh-toan": "payment",
  "doi-tra": "returns",
  "bao-hanh": "warranty",
  "bao-mat": "privacy",
  "dieu-khoan": "terms",
};
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
        <div className="store-policy-layout">
          <nav className="store-policy-nav" aria-label="Chính sách & hướng dẫn">
            {policyLinks.map((policy) => (
              <Link
                key={policy.id}
                href={policyHref(policy.id)}
                aria-current={policy.id === selected?.id ? "page" : undefined}
              >
                {content[keys[policy.id]].title}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </nav>
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
                <ArrowUpRight size={17} />
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
