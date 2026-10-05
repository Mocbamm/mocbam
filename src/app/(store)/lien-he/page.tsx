import { ArrowUpRight, MapPin, Clock, Mail } from "lucide-react";
import { getSettings, isConfigured } from "@/lib/catalog";
import { ContactForm } from "@/components/store/contact";
export const metadata = { title: "Liên hệ với Mộc" };
export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <main className="mx-auto max-w-6xl px-5 pt-14 sm:px-8">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Chúng mình luôn sẵn lòng nghe
      </p>
      <h1 className="font-serif text-5xl tracking-tight text-[#29412d] sm:text-6xl">
        Gửi Mộc một lời nhắn.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#7c866b]">
        Có một câu hỏi, một ý tưởng, hay chỉ muốn chào nhau? Để lại lời nhắn,
        Mộc sẽ trao đổi cùng bạn.
      </p>
      <div className="mt-10 grid gap-12 md:grid-cols-[1.5fr_1fr]">
        <ContactForm configured={isConfigured()} />
        <aside className="self-start bg-[#edf0e5] p-8">
          <div className="space-y-7">
            <div>
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#839275]">
                <Mail size={13} /> Trò chuyện cùng Mộc
              </p>
              <a
                href={`mailto:${settings.shop_email}`}
                className="text-sm text-[#29412d]"
              >
                {settings.shop_email}
              </a>
              <p className="mt-2 text-sm text-[#7c866b]">
                {settings.shop_phone}
              </p>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#839275]">
                <MapPin size={13} /> Góc nhỏ của chúng mình
              </p>
              <p className="text-sm leading-7 text-[#7c866b]">
                {settings.shop_address}
              </p>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#839275]">
                <Clock size={13} /> Thời gian đồng hành
              </p>
              <p className="text-sm leading-7 text-[#7c866b]">
                {settings.shop_hours}
              </p>
            </div>
            <div className="flex flex-wrap gap-5 border-t border-[#d4dcc7] pt-6 text-xs">
              {[
                { name: "Facebook", url: settings.facebook_url },
                { name: "Instagram", url: settings.instagram_url },
                { name: "TikTok", url: settings.tiktok_url },
                { name: "Zalo", url: settings.zalo_url },
                { name: "Shopee", url: settings.shopee_url },
              ].map((s) =>
                s.url ? (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    {s.name}
                    <ArrowUpRight size={12} />
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
