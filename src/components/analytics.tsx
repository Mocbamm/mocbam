"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  mocbamAnalyticsConsent?: boolean;
};
type Consent = "pending" | "granted" | "denied";
let memoryConsent: Consent = "pending";
const consentListeners = new Set<() => void>();
function consentSnapshot(): Consent {
  try {
    const value = localStorage.getItem("mocbam.analytics-consent");
    return value === "granted" || value === "denied" ? value : memoryConsent;
  } catch {
    return memoryConsent;
  }
}
function consentSubscribe(listener: () => void) {
  consentListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    consentListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function saveConsent(value: Consent) {
  memoryConsent = value;
  try {
    localStorage.setItem("mocbam.analytics-consent", value);
  } catch {
    /* Consent still applies for this session. */
  }
  consentListeners.forEach((listener) => listener());
}
export function Analytics({
  production = false,
  preview = false,
}: {
  production?: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    consentSubscribe,
    consentSnapshot,
    () => "pending" as Consent,
  );
  const [loaded, setLoaded] = useState(false);
  const lastPage = useRef("");
  const gaId = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || "")
    ? process.env.NEXT_PUBLIC_GA_ID
    : "";
  const metaId = /^\d+$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID || "")
    ? process.env.NEXT_PUBLIC_META_PIXEL_ID
    : "";
  const enabled =
    !preview &&
    (production || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true") &&
    Boolean(gaId || metaId);
  const eligible = !/^\/(admin|auth|don-hang)(\/|$)/.test(pathname);
  useEffect(() => {
    const target = window as AnalyticsWindow;
    target.mocbamAnalyticsConsent =
      enabled && consent === "granted" && eligible && loaded;
    if (gaId)
      (target as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] =
        consent !== "granted";
    if (consent === "denied") {
      target.fbq?.("consent", "revoke");
      lastPage.current = "";
    }
    if (
      !enabled ||
      consent !== "granted" ||
      !eligible ||
      !loaded ||
      lastPage.current === pathname
    )
      return;
    lastPage.current = pathname;
    target.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_referrer: window.location.origin,
    });
    target.fbq?.("consent", "grant");
    target.fbq?.("track", "PageView");
    window.dispatchEvent(new Event("mocbam:analytics-ready"));
  }, [consent, enabled, eligible, gaId, loaded, pathname]);
  function choose(value: "granted" | "denied") {
    saveConsent(value);
  }
  const bootstrap = `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};${gaId ? `gtag('js',new Date());gtag('config',${JSON.stringify(gaId)},{send_page_view:false,allow_google_signals:false});` : ""}${metaId ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,${JSON.stringify(metaId)});fbq('init',${JSON.stringify(metaId)});` : ""}`;
  if (!enabled || !eligible) return null;
  return (
    <>
      {consent === "granted" ? (
        <>
          {gaId ? (
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
          ) : null}
          <Script
            id="mocbam-analytics-bootstrap"
            strategy="afterInteractive"
            onReady={() => setLoaded(true)}
          >
            {bootstrap}
          </Script>
        </>
      ) : null}
      {consent === "pending" ? (
        <aside
          aria-label="Lựa chọn cookie"
          className="fixed bottom-5 left-5 right-5 z-50 mx-auto max-w-2xl border border-[#d9ddce] bg-[#fffdf7] p-5 shadow-xl sm:flex sm:items-center sm:gap-5"
        >
          <div className="flex-1">
            <p className="font-semibold text-[#253d2c]">
              Một chút hiểu nhau hơn
            </p>
            <p className="mt-1 text-sm leading-6 text-[#65705e]">
              Cho phép Google Analytics và Meta Pixel để Mộc Bàm hiểu trải
              nghiệm mua sắm của bạn. Bạn có thể từ chối.
            </p>
          </div>
          <div className="mt-4 flex gap-2 sm:mt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => choose("denied")}
            >
              Từ chối
            </Button>
            <Button size="sm" onClick={() => choose("granted")}>
              Đồng ý
            </Button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => saveConsent("pending")}
          className="fixed bottom-2 left-3 z-30 text-xs text-[#73796e] underline underline-offset-4"
        >
          Tùy chọn cookie
        </button>
      )}
    </>
  );
}
