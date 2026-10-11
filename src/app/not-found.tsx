import Link from "next/link";
import "./(store)/storefront.css";
export default function NotFound() {
  return (
    <main className="storefront flex min-h-[65vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="my-5 max-w-xl text-3xl sm:text-4xl">
        Lối nhỏ này chưa có ở Mộc Bàm.
      </h1>
      <Link href="/" className="store-button store-button-primary mt-4">
        Về trang chủ
      </Link>
    </main>
  );
}
