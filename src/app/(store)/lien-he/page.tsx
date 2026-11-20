import { MapPin, Mail } from "lucide-react";
import { getSettings, isConfigured } from "@/lib/catalog";
import { ContactForm } from "@/components/store/contact";
import { pageMetadata } from "@/lib/seo";
import { socialLinks } from "@/components/store/social";
export const metadata = pageMetadata({
  title: "Liên hệ với Mộc Bàm",
  description:
    "Liên hệ Mộc Bàm để hỏi về sản phẩm handmade, đặt quà hoặc hỗ trợ đơn hàng. Chúng mình trả lời qua email và mạng xã hội.",
  path: "/lien-he",
});
export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="store-page store-contact-page">
      <p className="store-eyebrow">Chúng mình luôn sẵn lòng nghe</p>
      <h1 className="store-page-title">Gửi Mộc Bàm một lời nhắn</h1>
      <p className="store-page-description">
        Có một câu hỏi, một ý tưởng, hay chỉ muốn chào nhau? Để lại lời nhắn,
        Mộc Bàm sẽ trao đổi cùng bạn.
      </p>
      <div className="store-contact-layout">
        <div className="store-form-panel">
          <ContactForm configured={isConfigured()} />
        </div>
        <aside className="store-contact-details">
          <div className="space-y-7">
            <div>
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#839275]">
                <Mail size={13} /> Trò chuyện cùng Mộc Bàm
              </p>
              <a
                href={`mailto:${settings.shop_email}`}
                className="text-sm text-[#29412d]"
              >
                {settings.shop_email}
              </a>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#839275]">
                <MapPin size={13} /> Góc nhỏ của chúng mình
              </p>
              <p className="text-sm leading-7 text-[#7c866b]">
                {settings.shop_address}
              </p>
            </div>
            <div className="flex flex-wrap gap-5 border-t border-[#d4dcc7] pt-6 text-xs">
              {/* Owner brief 19/11: Facebook, Instagram and TikTok stay and
                  Threads joins them; each falls back to the shop's official
                  account when its setting is empty. */}
              {[
                ...socialLinks(settings)
                  .filter((link) => !link.href.startsWith("mailto:"))
                  .map((link) => ({ name: link.label, url: link.href })),
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
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
