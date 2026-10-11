"use client";
import Link from "next/link";
import "./(store)/storefront.css";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="storefront flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <Link href="/" className="store-brand mb-12">
        <span>MỘC BÀM</span>
        <small>Gom nét mộc, tạo góc xinh</small>
      </Link>
      <h1 className="section-title">Chưa thể tải nội dung</h1>
      <p className="my-5 text-muted-foreground">
        Vui lòng thử lại sau một chút.
      </p>
      <button onClick={retry} className="store-button store-button-primary">
        Thử lại
      </button>
    </section>
  );
}
