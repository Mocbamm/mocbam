"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import { searchSettingsSections } from "@/lib/admin-search";
import { Button } from "@/components/ui/button";
import { fieldClass } from "./admin-common";

export function AdminSettingsSearch() {
  const id = useId();
  const [query, setQuery] = useState("");
  const sections = searchSettingsSections(query);
  return (
    <nav
      aria-label="Tìm mục cài đặt"
      className="rounded-2xl border border-[#dfe5d8] bg-white p-5"
    >
      <label htmlFor={id} className="text-sm font-medium">
        Tìm trong cài đặt
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Search className="size-4 shrink-0 text-[#6b7867]" aria-hidden="true" />
        <input
          id={id}
          type="search"
          maxLength={200}
          placeholder="Phí giao hàng, ngân hàng, email, Zalo…"
          className={fieldClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing)
              event.preventDefault();
          }}
        />
        {query && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setQuery("")}
          >
            Xóa tìm
          </Button>
        )}
      </div>
      <div aria-live="polite" className="mt-3">
        {sections.length ? (
          <ul className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  className="inline-flex rounded-lg bg-[#f1f5eb] px-3 py-2 text-sm text-[#37533c] hover:underline"
                  href={`#${section.id}`}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6b7867]">
            Không có mục phù hợp. Thử “giao hàng”, “ngân hàng” hoặc “liên hệ”.
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#788273]">
        Chọn kết quả để chuyển đến mục cần sửa. Các thay đổi vẫn được giữ trong
        biểu mẫu.
      </p>
    </nav>
  );
}
