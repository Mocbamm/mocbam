import { Mail } from "lucide-react";
import type { SiteSettings } from "@/lib/types";

// The shop's official accounts (owner brief, 06/11). Settings override them
// when filled in; Threads has no setting yet.
const officialLinks = {
  facebook: "https://www.facebook.com/mocbamm",
  instagram: "https://www.instagram.com/mocbamm",
  tiktok: "https://www.tiktok.com/@mocbamm",
  threads: "https://www.threads.com/@mocbamm",
  email: "mocbamm@gmail.com",
};

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8V10c-1.5 0-2.9-.5-4-1.3v6.2c0 3.3-2.6 5.8-5.7 5.8-3.1 0-5.6-2.5-5.6-5.6 0-3.4 3-6 6.5-5.4v3.2c-1.6-.5-3.3.6-3.3 2.2 0 1.3 1.1 2.4 2.4 2.4 1.5 0 2.5-1.1 2.5-2.6V3z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M16.8 8.6C15.9 6.3 14.1 5 11.9 5 8.4 5 6 7.8 6 12s2.4 7 5.9 7c2.9 0 5.1-1.8 5.1-4.4 0-2.3-1.7-3.6-4.3-3.6-2 0-3.3 1-3.3 2.4 0 1.3 1.1 2.2 2.6 2.2 2.4 0 3.6-2 3.2-5.4" />
    </svg>
  );
}

export function socialLinks(settings?: SiteSettings) {
  const email = settings?.shop_email || officialLinks.email;
  return [
    {
      label: "Facebook",
      href: settings?.facebook_url || officialLinks.facebook,
      icon: <FacebookIcon />,
    },
    {
      label: "Instagram",
      href: settings?.instagram_url || officialLinks.instagram,
      icon: <InstagramIcon />,
    },
    {
      label: "TikTok",
      href: settings?.tiktok_url || officialLinks.tiktok,
      icon: <TikTokIcon />,
    },
    { label: "Threads", href: officialLinks.threads, icon: <ThreadsIcon /> },
    {
      label: `Gmail: ${email}`,
      href: `mailto:${email}`,
      icon: <Mail strokeWidth={1.8} />,
    },
  ];
}

export function SocialIcons({
  settings,
  className = "",
}: {
  settings?: SiteSettings;
  className?: string;
}) {
  return (
    <ul
      className={`store-social-icons ${className}`}
      aria-label="Kết nối với Mộc Bàm"
    >
      {socialLinks(settings).map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            aria-label={link.label}
            title={link.label}
            {...(link.href.startsWith("mailto:")
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })}
          >
            {link.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}
