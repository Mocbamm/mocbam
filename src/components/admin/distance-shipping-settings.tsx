"use client";
import type { SiteSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckField } from "./admin-common";
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
  return (
    <div className="my-6 space-y-4 rounded-xl border border-[#dfe5d8] p-4">
      <h3 className="font-semibold">Phí theo khoảng cách đường bộ (km)</h3>
      <CheckField
        label="Tự tính phí theo km từ địa chỉ gửi hàng"
        checked={!!draft.shipping_distance_enabled}
        disabled={!available && !draft.shipping_distance_enabled}
        onChange={(checked) => update("shipping_distance_enabled", checked)}
      />
      <p className="text-sm leading-6 text-[#6b7867]">
        {available
          ? "Google Routes đã được cấu hình."
          : "Chưa có cấu hình Google Routes trên máy chủ. Có thể chuẩn bị bảng phí; cần cấu hình GOOGLE_MAPS_API_KEY trong Vercel trước khi bật."}{" "}
        Khi bật, khách nhập đủ địa chỉ sẽ nhận phí tự động. Ngoài mốc km cuối
        cùng áp dụng phí khu vực hoặc phí mặc định bên dưới.
      </p>
      <div className="space-y-2">
        <Label htmlFor="shipping-origin">Địa chỉ gửi hàng đầy đủ</Label>
        <Input
          id="shipping-origin"
          maxLength={500}
          required={!!draft.shipping_distance_enabled}
          placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
          value={draft.shipping_origin_address || ""}
          onChange={(event) =>
            update("shipping_origin_address", event.target.value)
          }
        />
      </div>
      {bands.map((band, index) => (
        <div
          key={index}
          className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor={`shipping-km-${index}`}>
              {index === 0
                ? "Từ 0 đến (km)"
                : `Trên ${bands[index - 1].up_to_km} đến (km)`}
            </Label>
            <Input
              id={`shipping-km-${index}`}
              type="number"
              required
              min={0.001}
              max={3000}
              step={0.001}
              value={band.up_to_km}
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
            <Label htmlFor={`shipping-km-fee-${index}`}>Phí (₫)</Label>
            <Input
              id={`shipping-km-fee-${index}`}
              type="number"
              required
              min={0}
              max={100000000}
              step={1}
              value={band.fee}
              onChange={(event) =>
                update(
                  "shipping_distance_bands",
                  bands.map((item, i) =>
                    i === index
                      ? { ...item, fee: Number(event.target.value) }
                      : item,
                  ),
                )
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
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
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={bands.length >= 50}
        onClick={() =>
          update("shipping_distance_bands", [
            ...bands,
            {
              up_to_km: Math.min(3000, (bands.at(-1)?.up_to_km || 0) + 5),
              fee: draft.shipping_fee,
            },
          ])
        }
      >
        Thêm mốc km
      </Button>
      <p className="text-xs leading-5 text-[#788273]">
        Các mốc tăng dần; khoảng cách đúng mốc nhận phí của mốc đó. Phí đã xác
        nhận trên đơn cũ được giữ nguyên.
      </p>
    </div>
  );
}
