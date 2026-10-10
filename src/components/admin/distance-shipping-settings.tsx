"use client";
import type { SiteSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckField } from "./admin-common";

const numberFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});

export function DistanceShippingSettings({
  draft,
  available,
  update,
}: {
  draft: SiteSettings;
  available: boolean;
  update: <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => void;
}) {
  const bands = draft.shipping_distance_bands || [];
  const lastBand = bands.at(-1);
  const validBands =
    bands.length > 0 &&
    bands.every(
      (band, index) =>
        band.up_to_km > (bands[index - 1]?.up_to_km || 0) &&
        band.up_to_km <= 3000 &&
        Number.isInteger(band.fee) &&
        band.fee >= 0 &&
        band.fee <= 100000000,
    );
  return (
    <div className="my-6 space-y-6 rounded-xl border border-[#dfe5d8] p-4 sm:p-5">
      <div className="space-y-2">
        <h3 className="font-semibold">Phí giao hàng theo khoảng cách (km)</h3>
        <p className="text-sm leading-6 text-[#6b7867]">
          Khách nhập đủ địa chỉ, website tính quãng đường ô tô từ nơi gửi hàng
          và chọn phí trong bảng của bạn. Đây là khoảng cách đường bộ, không
          phải đường thẳng trên bản đồ.
        </p>
      </div>

      <div className="space-y-2 rounded-lg bg-[#f5f7f2] p-3 text-sm leading-6">
        <p className="font-medium">
          {available
            ? "Dịch vụ tính khoảng cách: đã có cấu hình trên máy chủ"
            : "Dịch vụ tính khoảng cách: chưa kết nối"}
        </p>
        <p className="text-[#6b7867]">
          {available
            ? "Sau khi lưu, hãy thử nhập một địa chỉ giao hàng ở trang thanh toán để kiểm tra khoảng cách và phí."
            : "Bạn có thể nhập và lưu địa chỉ gửi hàng, bảng phí trước. Nhờ người phụ trách kỹ thuật kết nối Google Routes để bật tính phí theo km."}
        </p>
        {!available && (
          <details>
            <summary className="cursor-pointer text-[#37533c] underline underline-offset-4">
              Thông tin gửi người phụ trách kỹ thuật
            </summary>
            <p className="mt-2 text-[#6b7867]">
              Cần bật Google Routes API trong tài khoản Google Cloud của cửa
              hàng, cấu hình khóa máy chủ GOOGLE_MAPS_API_KEY trong Vercel
              Production và triển khai lại website. Không nhập khóa bí mật vào
              cài đặt cửa hàng.
            </p>
          </details>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">1. Chọn nơi bắt đầu giao hàng</h4>
        <Label htmlFor="shipping-origin">Địa chỉ gửi hàng đầy đủ</Label>
        <Input
          id="shipping-origin"
          aria-describedby="shipping-origin-help"
          maxLength={500}
          required={!!draft.shipping_distance_enabled}
          placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
          value={draft.shipping_origin_address || ""}
          onChange={(event) =>
            update("shipping_origin_address", event.target.value)
          }
        />
        <p
          id="shipping-origin-help"
          className="text-xs leading-5 text-[#6b7867]"
        >
          Nhập nơi đơn hàng thực sự được lấy đi: số nhà, đường, phường/xã và
          tỉnh/thành. Mọi quãng đường đều tính từ địa chỉ này.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">2. Nhập bảng phí của cửa hàng</h4>
          <p className="text-sm leading-6 text-[#6b7867]">
            Thêm mốc từ gần đến xa. Mỗi mốc là khoảng cách tối đa được hưởng mức
            phí đó. Ví dụ về cách chia khoảng: đến hết 5 km, trên 5 đến hết 10
            km. Bạn tự nhập số km và phí thực tế; nhập phí 0 nếu muốn miễn phí
            khoảng đó.
          </p>
        </div>
        {bands.length === 0 && (
          <p className="rounded-lg border border-dashed border-[#d4dcce] p-4 text-sm text-[#6b7867]">
            Chưa có mốc phí. Chọn “Thêm mốc km” để bắt đầu.
          </p>
        )}
        {bands.map((band, index) => {
          const previousKm = bands[index - 1]?.up_to_km || 0;
          const invalidOrder = band.up_to_km > 0 && band.up_to_km <= previousKm;
          return (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-[#dfe5d8] p-3"
            >
              <p className="text-sm font-medium" aria-live="polite">
                Mốc {index + 1}
                {band.up_to_km > previousKm
                  ? ` · ${index === 0 ? "Từ 0" : `Trên ${numberFormat.format(previousKm)}`} đến hết ${numberFormat.format(band.up_to_km)} km`
                  : " · Nhập khoảng cách tối đa"}
                {band.fee >= 0 && band.up_to_km > previousKm
                  ? `: ${band.fee === 0 ? "miễn phí" : `${numberFormat.format(band.fee)} ₫`}`
                  : ""}
              </p>
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`shipping-km-${index}`}>Đến hết (km)</Label>
                  <Input
                    id={`shipping-km-${index}`}
                    type="number"
                    required
                    min={Number((previousKm + 0.001).toFixed(3))}
                    max={3000}
                    step={0.001}
                    placeholder="Nhập mốc km"
                    aria-invalid={invalidOrder || undefined}
                    aria-describedby={`shipping-km-help-${index}`}
                    value={band.up_to_km > 0 ? band.up_to_km : ""}
                    onChange={(event) =>
                      update(
                        "shipping_distance_bands",
                        bands.map((item, i) =>
                          i === index
                            ? { ...item, up_to_km: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`shipping-km-fee-${index}`}>
                    Phí giao hàng (₫)
                  </Label>
                  <Input
                    id={`shipping-km-fee-${index}`}
                    type="number"
                    required
                    min={0}
                    max={100000000}
                    step={1}
                    placeholder="Nhập phí của cửa hàng"
                    value={band.fee >= 0 ? band.fee : ""}
                    onChange={(event) =>
                      update(
                        "shipping_distance_bands",
                        bands.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                fee:
                                  event.target.value === ""
                                    ? -1
                                    : Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Xóa mốc ${index + 1}`}
                  onClick={() =>
                    update(
                      "shipping_distance_bands",
                      bands.filter((_, i) => i !== index),
                    )
                  }
                >
                  Xóa mốc
                </Button>
              </div>
              <p
                id={`shipping-km-help-${index}`}
                className={`text-xs leading-5 ${invalidOrder ? "text-red-700" : "text-[#6b7867]"}`}
              >
                {index === 0
                  ? "Mốc đầu tiên bắt đầu từ 0 km. Khoảng cách tối đa phải lớn hơn 0."
                  : `Mốc này phải lớn hơn ${numberFormat.format(previousKm)} km. Khoảng cách đúng bằng mốc trước vẫn dùng phí của mốc trước.`}
              </p>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={bands.length >= 50 || (lastBand?.up_to_km || 0) >= 3000}
          onClick={() =>
            // Invalid draft values keep both new fields blank and required.
            // No delivery price is proposed or saved on the owner's behalf.
            update("shipping_distance_bands", [
              ...bands,
              { up_to_km: 0, fee: -1 },
            ])
          }
        >
          Thêm mốc km
        </Button>
        <p className="text-xs leading-5 text-[#6b7867]">
          Tối đa 50 mốc; khoảng cách tối đa 3.000 km. Điền đủ hai ô của mỗi mốc
          trước khi lưu, hoặc xóa mốc chưa dùng.
        </p>
        <div className="rounded-lg bg-[#f5f7f2] p-3 text-sm leading-6">
          <p className="font-medium">
            {validBands && lastBand
              ? `Trên ${numberFormat.format(lastBand.up_to_km)} km thì tính phí thế nào?`
              : "Ngoài mốc km cuối cùng thì tính phí thế nào?"}
          </p>
          <p className="text-[#6b7867]">
            Website dùng phí khu vực bên dưới: ưu tiên phường/xã cụ thể, rồi đến
            tỉnh/thành. Nếu không khớp khu vực nào, dùng phí mặc định hiện tại
            là {numberFormat.format(draft.shipping_fee)} ₫.
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-[#dfe5d8] pt-4">
        <h4 className="font-medium">3. Bật và lưu khi đã kiểm tra bảng phí</h4>
        <CheckField
          label="Tự tính phí theo km từ địa chỉ gửi hàng"
          checked={!!draft.shipping_distance_enabled}
          disabled={!available && !draft.shipping_distance_enabled}
          onChange={(checked) => update("shipping_distance_enabled", checked)}
        />
        <p className="text-sm leading-6 text-[#6b7867]">
          {draft.shipping_distance_enabled
            ? "Bạn đang chọn tính phí theo km. Cần có địa chỉ gửi hàng và ít nhất một mốc phí hợp lệ."
            : "Bạn đang chọn tính phí theo khu vực và phí mặc định. Có thể lưu bảng km để dùng sau."}{" "}
          Chọn “Lưu cài đặt” ở cuối trang để áp dụng thay đổi cho đơn mới. Đơn
          đã đặt giữ nguyên phí giao hàng.
        </p>
      </div>
    </div>
  );
}
