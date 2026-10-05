"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StoreSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        aria-label="Tìm kiếm sản phẩm và bài viết"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="p-1"
      >
        <Search size={20} strokeWidth={1.5} />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="store-search-title"
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-xl border border-[#d9ddce] bg-[#faf9f3] p-6 text-[#29412d] shadow-xl backdrop:bg-black/35 sm:p-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="store-search-title" className="font-serif text-3xl">
            Tìm một điều nhỏ xinh
          </h2>
          <button
            type="button"
            aria-label="Đóng tìm kiếm"
            onClick={() => dialog.current?.close()}
            className="p-2"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#737e65]">
          Tìm sản phẩm và những câu chuyện trong Nhật ký Mộc Bàm.
        </p>
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const value = query.trim();
            if (!value) return;
            dialog.current?.close();
            router.push(`/tim-kiem?q=${encodeURIComponent(value)}`);
          }}
        >
          <label htmlFor="store-search-query" className="sr-only">
            Từ khóa tìm kiếm
          </label>
          <Input
            id="store-search-query"
            name="q"
            type="search"
            required
            maxLength={200}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên sản phẩm, câu chuyện..."
            className="flex-1"
          />
          <Button type="submit">
            <Search size={16} /> Tìm kiếm
          </Button>
        </form>
      </dialog>
    </>
  );
}
