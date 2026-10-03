import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container-page py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="my-5 font-serif text-4xl">
        Lối nhỏ này chưa có ở Mộc Bàm.
      </h1>
      <Link
        href="/"
        className="inline-block bg-primary px-6 py-3 text-primary-foreground"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
