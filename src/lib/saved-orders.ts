const key = "mocbam.receipts.v1";
export type SavedOrder = { id: string; token: string; reference: string };
export function readSavedOrders(): SavedOrder[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (v): v is SavedOrder =>
          !!v &&
          typeof v === "object" &&
          typeof v.id === "string" &&
          /^[a-f0-9-]{36}$/i.test(v.id) &&
          typeof v.token === "string" &&
          /^[A-Za-z0-9_-]{43}$/.test(v.token) &&
          typeof v.reference === "string" &&
          /^MB-\d+$/.test(v.reference),
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}
export function saveOrderReceipt(receipt: SavedOrder) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          receipt,
          ...readSavedOrders().filter((v) => v.id !== receipt.id),
        ].slice(0, 20),
      ),
    );
  } catch {
    /* Receipt link remains usable when storage is disabled. */
  }
}
