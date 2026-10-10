"use client";
import { useState } from "react";
import provinces from "@/lib/data/vietnam-addresses.json";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export function AddressFields({
  onChange,
}: {
  onChange?: (destination: {
    province: string;
    ward: string;
    address: string;
  }) => void;
}) {
  const [province, setProvince] = useState(""),
    [manual, setManual] = useState(false);
  const selected = provinces.find((p) => p.name === province);
  const [ward, setWard] = useState("");
  const [address, setAddress] = useState("");
  const style =
    "store-address-select mt-2 h-10 w-full border border-[#d7ddcd] bg-transparent px-3 text-sm";
  return (
    <>
      <div className="sm:col-span-2">
        <Label htmlFor="checkout-address">Số nhà, tên đường *</Label>
        <Input
          id="checkout-address"
          name="address"
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            onChange?.({ province, ward, address: event.target.value });
          }}
          autoComplete="street-address"
          required
          maxLength={398}
          placeholder="Số nhà, tên đường"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="checkout-city">Tỉnh / thành phố *</Label>
        {manual ? (
          <Input
            id="checkout-city"
            name="city"
            autoComplete="address-level1"
            required
            maxLength={100}
            onChange={(event) => {
              setProvince(event.target.value);
              onChange?.({ province: event.target.value, ward, address });
            }}
            className="mt-2"
          />
        ) : (
          <select
            id="checkout-city"
            name="city"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setWard("");
              onChange?.({ province: e.target.value, ward: "", address });
            }}
            autoComplete="address-level1"
            required
            className={style}
          >
            <option value="">Chọn tỉnh / thành phố</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <Label htmlFor="checkout-ward">Phường / xã *</Label>
        {manual ? (
          <Input
            id="checkout-ward"
            name="ward"
            autoComplete="address-level2"
            required
            maxLength={100}
            onChange={(event) => {
              setWard(event.target.value);
              onChange?.({ province, ward: event.target.value, address });
            }}
            className="mt-2"
          />
        ) : (
          <select
            key={province}
            id="checkout-ward"
            name="ward"
            value={ward}
            onChange={(event) => {
              setWard(event.target.value);
              onChange?.({ province, ward: event.target.value, address });
            }}
            autoComplete="address-level2"
            required
            disabled={!selected}
            className={style}
          >
            <option value="">Chọn phường / xã</option>
            {selected?.wards.map((w) => (
              <option key={w.code} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => {
            setManual((v) => !v);
            setProvince("");
            setWard("");
            onChange?.({ province: "", ward: "", address });
          }}
          className="text-xs underline underline-offset-4"
        >
          {manual ? "Chọn từ danh sách địa chỉ" : "Nhập địa chỉ thủ công"}
        </button>
      </div>
    </>
  );
}
