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
    <main className="mx-auto max-w-3xl px-5 pt-14 sm:px-8">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Để chúng mình hiểu nhau hơn
      </p>
      <h1 className="font-serif text-4xl leading-tight tracking-tight text-[#29412d] sm:text-5xl">
        {entry?.title || "Chính sách & hướng dẫn."}
      </h1>
      {entry ? (
        <div className="mt-10">
          <Prose content={entry.content} />
        </div>
      ) : (
        <>
          <p className="mt-5 text-sm leading-7 text-[#7c866b]">
            Chọn mục bạn cần để xem thông tin mua hàng và hỗ trợ.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {policyLinks.map((policy) => (
              <Link
                key={policy.id}
                href={policyHref(policy.id)}
                className="flex items-center justify-between gap-4 border border-[#dde1d0] px-5 py-6 font-serif text-xl text-[#29412d] hover:bg-[#eef0e6]"
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
    </main>
  );
}
