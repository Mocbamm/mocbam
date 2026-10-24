"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  Baseline,
  Bold,
  Eye,
  Heading2,
  Italic,
  Link,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  linkMarkdown,
  normalizeHref,
  richColors,
  safeHref,
} from "@/lib/rich-text";
import {
  editLines,
  indentLines,
  outdentLines,
  toggleWrap,
  togglePrefix,
  type TextEdit,
} from "@/lib/rich-text-edit";

export type LinkTarget = { label: string; href: string };

type Action =
  | "bold"
  | "italic"
  | "red"
  | "link"
  | "indent"
  | "outdent"
  | "heading"
  | "bullets"
  | "numbers";

// Writes through the browser's editing command so Cmd/Ctrl+Z still undoes it.
function applyEdit(
  textarea: HTMLTextAreaElement,
  edit: TextEdit,
  onChange: (value: string) => void,
) {
  textarea.focus();
  textarea.setSelectionRange(edit.from, edit.to);
  const native = edit.text
    ? document.execCommand("insertText", false, edit.text)
    : document.execCommand("delete");
  if (!native) {
    const value = textarea.value;
    onChange(value.slice(0, edit.from) + edit.text + value.slice(edit.to));
  }
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(edit.selectFrom, edit.selectTo);
  });
}

export function FormattingToolbar({
  textarea,
  onChange,
  disabled,
  preview,
  onPreviewChange,
  linkTargets = [],
}: {
  textarea: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  disabled?: boolean;
  preview: boolean;
  onPreviewChange: (preview: boolean) => void;
  linkTargets?: LinkTarget[];
}) {
  const id = useId();
  const [link, setLink] = useState<{
    from: number;
    to: number;
    text: string;
    href: string;
  } | null>(null);
  const latestRun = useRef<(action: Action) => void>(() => {});
  useEffect(() => {
    latestRun.current = run;
  });
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    const keys: Record<string, Action> = {
      b: "bold",
      i: "italic",
      k: "link",
      "]": "indent",
      "[": "outdent",
    };
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const action = keys[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      latestRun.current(action);
    }
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [textarea]);

  function run(action: Action) {
    const element = textarea.current;
    if (!element || disabled) return;
    const { value, selectionStart: start, selectionEnd: end } = element;
    const wrap = (before: string, after: string, placeholder: string) =>
      applyEdit(
        element,
        toggleWrap(value, start, end, before, after, placeholder),
        onChange,
      );
    const lines = (change: (lines: string[]) => string[], separate = false) =>
      applyEdit(
        element,
        editLines(value, start, end, change, separate),
        onChange,
      );
    switch (action) {
      case "bold":
        return wrap("**", "**", "chữ in đậm");
      case "italic":
        return wrap("*", "*", "chữ in nghiêng");
      case "red":
        return wrap("{đỏ}", "{/đỏ}", "chữ màu đỏ");
      case "indent":
        return lines(indentLines);
      case "outdent":
        return lines(outdentLines);
      case "heading":
        return lines(
          (rows) => togglePrefix(rows, /^#{1,3}\s+/, () => "## "),
          true,
        );
      case "bullets":
        return lines((rows) => togglePrefix(rows, /^-\s+/, () => "- "), true);
      case "numbers":
        return lines(
          (rows) =>
            togglePrefix(rows, /^\d+\.\s+/, (index) => `${index + 1}. `),
          true,
        );
      case "link": {
        const selected = value.slice(start, end);
        const existing = /^\[([^\]\n]+)\]\(([^\s)]+)\)$/.exec(selected);
        setLink({
          from: start,
          to: end,
          text: existing ? existing[1] : selected.trim(),
          href: existing ? existing[2] : "",
        });
      }
    }
  }

  function insertLink(event: { preventDefault(): void }) {
    event.preventDefault();
    const element = textarea.current;
    if (!link || !element) return;
    const href = normalizeHref(link.href);
    const target = safeHref(href);
    if (!target) {
      toast.error(
        "Đường dẫn chưa hợp lệ. Dùng địa chỉ bắt đầu bằng https:// hoặc trang trong cửa hàng như /san-pham/...",
      );
      return;
    }
    const text = link.text.trim() || href;
    const markdown = linkMarkdown(text, target.external ? href : target.href);
    applyEdit(
      element,
      {
        from: link.from,
        to: link.to,
        text: markdown,
        selectFrom: link.from + markdown.length,
        selectTo: link.from + markdown.length,
      },
      onChange,
    );
    setLink(null);
  }

  const tools: {
    action: Action;
    label: string;
    icon: React.ReactNode;
    keys?: string;
  }[] = [
    { action: "bold", label: "In đậm", icon: <Bold />, keys: "Ctrl/⌘ + B" },
    {
      action: "italic",
      label: "In nghiêng",
      icon: <Italic />,
      keys: "Ctrl/⌘ + I",
    },
    {
      action: "red",
      label: "Tô chữ đỏ",
      icon: <Baseline style={{ color: richColors["đỏ"] }} />,
    },
    {
      action: "link",
      label: "Gắn liên kết vào chữ",
      icon: <Link />,
      keys: "Ctrl/⌘ + K",
    },
    {
      action: "outdent",
      label: "Thụt ra",
      icon: <ListIndentDecrease />,
      keys: "Ctrl/⌘ + [",
    },
    {
      action: "indent",
      label: "Thụt vào",
      icon: <ListIndentIncrease />,
      keys: "Ctrl/⌘ + ]",
    },
    { action: "heading", label: "Tiêu đề mục", icon: <Heading2 /> },
    { action: "bullets", label: "Gạch đầu dòng", icon: <List /> },
    { action: "numbers", label: "Danh sách số", icon: <ListOrdered /> },
  ];

  return (
    <div className="space-y-2">
      <div
        role="toolbar"
        aria-label="Định dạng nội dung"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-[#dfe5d8] bg-[#f7f8f2] p-1"
      >
        {tools.map((tool) => (
          <Button
            key={tool.action}
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={tool.label}
            title={tool.keys ? `${tool.label} (${tool.keys})` : tool.label}
            // Keep the text selection while clicking the button.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(tool.action)}
          >
            {tool.icon}
          </Button>
        ))}
        <Button
          type="button"
          variant={preview ? "default" : "ghost"}
          size="sm"
          className="ml-auto"
          disabled={disabled}
          aria-pressed={preview}
          onClick={() => onPreviewChange(!preview)}
        >
          <Eye className="size-4" />
          Xem trước
        </Button>
      </div>
      {link ? (
        <div
          role="group"
          aria-label="Gắn liên kết"
          className="grid gap-3 rounded-lg border border-[#dfe5d8] bg-white p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setLink(null);
              textarea.current?.focus();
            }
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            )
              insertLink(event);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-link-text`}>Chữ hiển thị</Label>
            <Input
              id={`${id}-link-text`}
              value={link.text}
              onChange={(event) =>
                setLink({ ...link, text: event.target.value })
              }
              placeholder="Ví dụ: móc khóa gỗ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-link-href`}>Đường dẫn</Label>
            <Input
              id={`${id}-link-href`}
              autoFocus
              value={link.href}
              list={linkTargets.length ? `${id}-link-targets` : undefined}
              onChange={(event) =>
                setLink({ ...link, href: event.target.value })
              }
              placeholder="/san-pham/... hoặc https://..."
            />
            {linkTargets.length ? (
              <datalist id={`${id}-link-targets`}>
                {linkTargets.map((target) => (
                  <option key={target.href} value={target.href}>
                    {target.label}
                  </option>
                ))}
              </datalist>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={insertLink}>
              Gắn liên kết
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setLink(null);
                textarea.current?.focus();
              }}
            >
              Hủy
            </Button>
          </div>
          <p className="text-xs leading-5 text-[#6b7867] sm:col-span-3">
            Gõ tên sản phẩm hoặc bài viết để chọn trang trong cửa hàng (liên kết
            nội bộ giúp SEO tốt hơn), hoặc dán địa chỉ trang khác.
          </p>
        </div>
      ) : null}
    </div>
  );
}
