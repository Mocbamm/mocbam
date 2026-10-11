import "./(store)/storefront.css";

export default function Loading() {
  return (
    <div className="storefront min-h-80 px-6 py-20 sm:px-12" role="status">
      <p className="store-eyebrow">Đang mở một góc nhỏ của Mộc Bàm…</p>
      <div className="mt-6 h-36 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
