import Link from "next/link";
import { getSiteContent } from "@/lib/catalog";
import { Prose } from "@/components/store/content";
import { policyHref, policyLinks } from "@/components/store/policies";
export const metadata = { title: "Chính sách & hướng dẫn" };
const sections = [
  { key: "shipping", id: "van-chuyen", title: "Giao hàng" },
  { key: "returns", id: "doi-tra", title: "Đổi trả & chăm sóc" },
  { key: "privacy", id: "bao-mat", title: "Quyền riêng tư" },
  { key: "terms", id: "dieu-khoan", title: "Điều khoản sử dụng" },
];
export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ muc?: string }>;
}) {
  const { muc } = await searchParams;
  const selected = policyLinks.find((policy) => policy.id === muc);
  const content = await Promise.all(sections.map((s) => getSiteContent(s.key)));
  return (
    <main className="mx-auto max-w-5xl px-5 pt-14 sm:px-8">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Để chúng mình hiểu nhau hơn
      </p>
      <h1 className="font-serif text-5xl tracking-tight text-[#29412d]">
        Chính sách & hướng dẫn.
      </h1>
      <p className="mt-5 text-sm leading-7 text-[#7c866b]">
        Chọn mục bạn cần để xem thông tin mua hàng và hỗ trợ.
      </p>
      <div className="mt-10 grid gap-10 md:grid-cols-[200px_1fr]">
        <nav
          aria-label="Mục lục chính sách"
          className="flex flex-wrap gap-4 text-xs text-[#697b58] md:flex-col"
        >
          {policyLinks.map((policy) => (
            <Link
              key={policy.id}
              href={policyHref(policy.id)}
              aria-current={selected?.id === policy.id ? "page" : undefined}
              className={
                selected?.id === policy.id
                  ? "font-semibold underline underline-offset-4"
                  : "hover:underline"
              }
            >
              {policy.title}
            </Link>
          ))}
          <Link
            href="/chinh-sach"
            className="pt-2 underline underline-offset-4"
          >
            Xem tất cả chính sách
          </Link>
        </nav>
        <div>
          {!selected || selected.id === "huong-dan" ? (
            <section
              id="huong-dan"
              className="scroll-mt-32 border-b border-[#dde1d0] pb-8"
            >
              <h2 className="mb-5 font-serif text-3xl text-[#29412d]">
                Hướng dẫn mua hàng
              </h2>
              <ol className="space-y-4 text-sm leading-7 text-[#737e65]">
                <li>1. Chọn sản phẩm, điều chỉnh số lượng và bỏ vào giỏ.</li>
                <li>
                  2. Kiểm tra giỏ hàng, điền thông tin liên hệ và địa chỉ nhận
                  hàng.
                </li>
                <li>
                  3. Chọn phương thức thanh toán và gửi đơn. Giá và tồn kho được
                  kiểm tra lại trên hệ thống.
                </li>
                <li>
                  4. Lưu liên kết đơn để theo dõi. Với COD, thanh toán khi nhận
                  hàng. Nếu chọn chuyển khoản, dùng đúng tài khoản, số tiền và
                  nội dung trên đơn; Mộc xác nhận thanh toán sau khi kiểm tra
                  giao dịch.
                </li>
              </ol>
            </section>
          ) : null}
          {sections.map((s, index) =>
            !selected || selected.id === s.id ? (
              <section
                key={s.key}
                id={s.id}
                className="scroll-mt-32 border-b border-[#dde1d0] py-8"
              >
                <h2 className="mb-5 font-serif text-3xl text-[#29412d]">
                  {content[index]?.title || s.title}
                </h2>
                <Prose
                  content={
                    content[index]?.content ||
                    "Mộc đang cập nhật nội dung này. Vui lòng liên hệ cửa hàng để trao đổi trước khi đặt hàng."
                  }
                />
              </section>
            ) : null,
          )}
          <p className="mt-8 text-sm text-[#7c866b]">
            Bạn cần trao đổi thêm?{" "}
            <Link href="/lien-he" className="underline underline-offset-4">
              Gửi lời nhắn cho Mộc.
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
