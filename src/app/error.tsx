"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container-page py-24 text-center">
      <h1 className="section-title">Chưa thể tải nội dung</h1>
      <p className="my-5 text-muted-foreground">
        Vui lòng thử lại sau một chút.
      </p>
      <button
        onClick={reset}
        className="bg-primary px-6 py-3 text-primary-foreground"
      >
        Thử lại
      </button>
    </section>
  );
}
