import { ReceiptScreen } from "@/components/store/orders";
export const metadata = {
  title: "Đơn hàng của bạn",
  robots: { index: false, follow: false },
};
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [path, query] = await Promise.all([params, searchParams]);
  return (
    <div className="store-page store-receipt-page">
      <ReceiptScreen
        key={`${path.id}:${query.token || ""}`}
        id={path.id}
        token={query.token || ""}
      />
    </div>
  );
}
