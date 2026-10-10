"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteSettings } from "@/lib/types";
import { BANKS } from "@/lib/banks";
import { DistanceShippingSettings } from "./distance-shipping-settings";
import { AdminSettingsSearch } from "./admin-settings-search";
import provinces from "@/lib/data/vietnam-addresses.json";
import {
  adminRequest,
  CheckField,
  fieldClass,
  panelClass,
  reportError,
} from "./admin-common";

export function SettingsManager({
  settings,
  distanceAvailable = false,
}: {
  settings: SiteSettings;
  distanceAvailable?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  function update<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await adminRequest("/api/admin/settings", "PATCH", draft);
      setDraft(result.data);
      toast.success("Đã lưu cài đặt cửa hàng.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  const contactFields = [
    { key: "shop_email", label: "Email cửa hàng", type: "email" },
    { key: "shop_phone", label: "Số điện thoại", type: "tel" },
    { key: "shop_address", label: "Địa chỉ", type: "text" },
    { key: "shop_hours", label: "Giờ mở cửa", type: "text" },
  ] as const;
  const socialFields = [
    { key: "facebook_url", label: "Facebook" },
    { key: "instagram_url", label: "Instagram" },
    { key: "tiktok_url", label: "TikTok" },
    { key: "zalo_url", label: "Zalo" },
    { key: "shopee_url", label: "Shopee" },
  ] as const;
  return (
    <form onSubmit={save} className="max-w-4xl space-y-6">
      <AdminSettingsSearch />
      <fieldset disabled={saving} className="space-y-6">
        <section id="settings-shipping" className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Giao hàng</h2>
          <DistanceShippingSettings
            draft={draft}
            available={distanceAvailable}
            update={update}
          />
          <div className="max-w-sm space-y-2">
            <Label htmlFor="shipping-fee">
              Phí mặc định ngoài khu vực đã cài đặt (₫)
            </Label>
            <Input
              id="shipping-fee"
              type="number"
              min={0}
              step={1}
              required
              value={draft.shipping_fee}
              onChange={(event) =>
                update("shipping_fee", Number(event.target.value))
              }
            />
            <p className="text-xs leading-5 text-[#788273]">
              Áp dụng cho đơn đặt mới; đơn đã đặt giữ nguyên phí giao hàng.
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-[#6b7867]">
            Tự đặt phí theo tỉnh/thành và phường/xã. Khách chọn địa chỉ, phí
            được tính tự động trước khi đặt đơn. Phường/xã cụ thể được ưu tiên
            trước mức phí toàn tỉnh/thành.
          </p>
          <div className="mt-4 space-y-4">
            {(draft.shipping_zones || []).map((zone, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
              >
                <div>
                  <Label htmlFor={`zone-name-${index}`}>Tên khu vực</Label>
                  <Input
                    id={`zone-name-${index}`}
                    required
                    maxLength={100}
                    value={zone.name}
                    onChange={(event) =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`zone-province-${index}`}>
                    Tỉnh / thành phố
                  </Label>
                  <select
                    id={`zone-province-${index}`}
                    className={fieldClass}
                    required
                    value={zone.province}
                    onChange={(event) =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                province: event.target.value,
                                wards: [],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">Chọn tỉnh / thành phố</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.name}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`zone-wards-${index}`}>
                    Phường / xã (để trống áp dụng toàn tỉnh/thành)
                  </Label>
                  <select
                    id={`zone-wards-${index}`}
                    multiple
                    className={`${fieldClass} h-28`}
                    value={zone.wards}
                    onChange={(event) =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                wards: [...event.target.selectedOptions].map(
                                  (option) => option.value,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {provinces
                      .find((province) => province.name === zone.province)
                      ?.wards.map((ward) => (
                        <option key={ward.code} value={ward.name}>
                          {ward.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="mt-1 text-xs underline"
                    onClick={() =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).map((item, i) =>
                          i === index ? { ...item, wards: [] } : item,
                        ),
                      )
                    }
                  >
                    Áp dụng toàn tỉnh/thành
                  </button>
                </div>
                <div>
                  <Label htmlFor={`zone-fee-${index}`}>Phí giao hàng (₫)</Label>
                  <Input
                    id={`zone-fee-${index}`}
                    type="number"
                    min={0}
                    max={100000000}
                    step={1}
                    required
                    value={zone.fee}
                    onChange={(event) =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).map((item, i) =>
                          i === index
                            ? { ...item, fee: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      update(
                        "shipping_zones",
                        (draft.shipping_zones || []).filter(
                          (_, i) => i !== index,
                        ),
                      )
                    }
                  >
                    Xóa khu vực
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={(draft.shipping_zones?.length || 0) >= 50}
            onClick={() =>
              update("shipping_zones", [
                ...(draft.shipping_zones || []),
                { name: "", province: "", wards: [], fee: 0 },
              ])
            }
          >
            Thêm khu vực giao hàng
          </Button>
        </section>
        <section id="settings-payments" className={panelClass}>
          <h2 className="mb-4 text-xl font-semibold">Chuyển khoản ngân hàng</h2>
          <CheckField
            label="Cho phép khách hàng chọn chuyển khoản"
            checked={draft.bank_transfer_enabled}
            onChange={(checked) => update("bank_transfer_enabled", checked)}
          />
          <p className="mt-3 text-sm leading-6 text-[#6b7867]">
            COD luôn có sẵn. Khi bật chuyển khoản, thông tin tài khoản bên dưới
            sẽ hiển thị cho khách hàng. Kiểm tra đúng tài khoản nhận tiền trước
            khi lưu; việc xác nhận tiền nhận được do quản trị viên thực hiện.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank-select">Ngân hàng nhận tiền</Label>
              <select
                id="bank-select"
                className={fieldClass}
                required={draft.bank_transfer_enabled}
                value={draft.bank_bin}
                onChange={(event) => {
                  const bank = BANKS.find(
                    (entry) => entry.bin === event.target.value,
                  );
                  setDraft((previous) => ({
                    ...previous,
                    bank_bin: bank?.bin || "",
                    bank_name: bank?.name || "",
                  }));
                }}
              >
                <option value="">Chọn ngân hàng</option>
                {!!draft.bank_bin &&
                  !BANKS.some((bank) => bank.bin === draft.bank_bin) && (
                    <option value={draft.bank_bin}>
                      {draft.bank_name} · {draft.bank_bin} (đã lưu)
                    </option>
                  )}
                {BANKS.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name} · {bank.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-bin">Mã BIN ngân hàng (6 chữ số)</Label>
              <Input id="bank-bin" value={draft.bank_bin} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-account-number">
                Số tài khoản nhận tiền
              </Label>
              <Input
                id="bank-account-number"
                autoComplete="off"
                pattern="[A-Za-z0-9]{5,19}"
                minLength={5}
                maxLength={19}
                required={draft.bank_transfer_enabled}
                value={draft.bank_account_number}
                onChange={(event) =>
                  update("bank_account_number", event.target.value)
                }
              />
              <p className="text-xs leading-5 text-[#788273]">
                Từ 5 đến 19 chữ cái hoặc chữ số, giữ nguyên số 0 ở đầu.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-account-name">Tên chủ tài khoản</Label>
              <Input
                id="bank-account-name"
                autoComplete="off"
                required={draft.bank_transfer_enabled}
                maxLength={100}
                value={draft.bank_account_name}
                onChange={(event) =>
                  update("bank_account_name", event.target.value)
                }
              />
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#788273]">
            Chỉ nhập thông tin nhận chuyển khoản, không cần PIN, mật khẩu ngân
            hàng hay OTP. Thay đổi áp dụng cho đơn mới; đơn cũ giữ thông tin
            ngân hàng tại thời điểm đặt.
          </p>
          <div className="mt-4 rounded-xl bg-[#f2f5eb] p-4 text-sm leading-6">
            <strong>
              {draft.bank_transfer_enabled
                ? "Chuyển khoản đang được bật"
                : "Chuyển khoản đang tắt"}
            </strong>
            <p>
              {draft.bank_transfer_enabled
                ? `Đơn mới sẽ hiển thị ${draft.bank_name} · ${draft.bank_account_number} · ${draft.bank_account_name}.`
                : "Khách vẫn có thể chọn COD. Lưu đủ thông tin nhận tiền rồi bật chuyển khoản khi cửa hàng sẵn sàng."}
            </p>
            <p>
              Mỗi đơn chuyển khoản có mã QR, số tiền và mã đơn riêng. Chỉ đánh
              dấu đã thanh toán sau khi kiểm tra giao dịch trong tài khoản nhận
              tiền.
            </p>
          </div>
        </section>
        <section id="settings-contact" className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Thông tin liên hệ</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {contactFields.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  required
                  value={draft[field.key] || ""}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
        <section id="settings-social" className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Mạng xã hội</h2>
          <div className="space-y-5">
            {socialFields.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="url"
                  placeholder="https://..."
                  value={draft[field.key] || ""}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#788273]">
            Để trống nếu cửa hàng chưa có tài khoản trên nền tảng này.
          </p>
        </section>
      </fieldset>
      <Button disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu cài đặt"}
      </Button>
      <p className="text-xs leading-6 text-[#788273]">
        Mã Google Analytics và Meta Pixel được cấu hình bằng biến môi trường khi
        triển khai. Xem hướng dẫn trong README.
      </p>
    </form>
  );
}
