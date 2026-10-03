"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteContent } from "@/lib/types";
import {
  adminRequest,
  fieldClass,
  panelClass,
  reportError,
} from "./admin-common";

const sections = [
  { key: "home-intro", title: "Lời giới thiệu trang chủ" },
  { key: "about", title: "Về Mộc Bàm" },
  { key: "shipping", title: "Chính sách giao hàng" },
  { key: "returns", title: "Chính sách đổi trả" },
  { key: "privacy", title: "Chính sách bảo mật" },
  { key: "terms", title: "Điều khoản sử dụng" },
];
export function ContentManager({ entries }: { entries: SiteContent[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState("home-intro");
  const [drafts, setDrafts] = useState<Record<string, SiteContent>>(() =>
    Object.fromEntries(
      sections.map((section) => [
        section.key,
        entries.find((entry) => entry.key === section.key) || {
          ...section,
          content: "",
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const draft = drafts[selected];
  function update(key: "title" | "content", value: string) {
    setDrafts((previous) => ({
      ...previous,
      [selected]: { ...previous[selected], [key]: value },
    }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const exists = entries.some((entry) => entry.key === selected);
      await adminRequest(
        exists ? `/api/admin/content/${selected}` : "/api/admin/content",
        exists ? "PATCH" : "POST",
        draft,
      );
      toast.success("Đã cập nhật nội dung.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[230px_1fr]">
      <div className="lg:hidden">
        <select
          className={fieldClass}
          aria-label="Chọn nội dung"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={saving}
        >
          {sections.map((section) => (
            <option value={section.key} key={section.key}>
              {section.title}
            </option>
          ))}
        </select>
      </div>
      <nav
        aria-label="Các mục nội dung"
        className="hidden rounded-2xl border border-[#dfe5d8] bg-white p-2 lg:block"
      >
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            disabled={saving}
            onClick={() => setSelected(section.key)}
            className={`block w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${selected === section.key ? "bg-[#edf3e7] font-medium text-[#426533]" : "text-[#6b7867] hover:bg-[#f6f8f2]"}`}
          >
            {section.title}
          </button>
        ))}
      </nav>
      <form onSubmit={save} className={panelClass}>
        <h2 className="mb-5 text-xl font-semibold">
          {sections.find((section) => section.key === selected)?.title}
        </h2>
        <fieldset disabled={saving} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="content-title">Tiêu đề hiển thị</Label>
            <Input
              id="content-title"
              required
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-body">Nội dung</Label>
            <Textarea
              id="content-body"
              rows={16}
              required
              value={draft.content}
              onChange={(event) => update("content", event.target.value)}
            />
            <p className="text-xs leading-5 text-[#788273]">
              Nhập văn bản thuần và cách các đoạn bằng một dòng trống.
            </p>
          </div>
        </fieldset>
        <Button className="mt-6" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu nội dung"}
        </Button>
      </form>
    </div>
  );
}
