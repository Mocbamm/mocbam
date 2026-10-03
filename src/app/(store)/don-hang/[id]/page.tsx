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
    <main className="mx-auto max-w-5xl px-5 pt-12 sm:px-8">
      <ReceiptScreen id={path.id} token={query.token || ""} />
    </main>
  );
}
