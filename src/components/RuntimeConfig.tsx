import { useEffect } from "react";

import { useSiteConfig } from "@/lib/use-site-config";
import { getVariant, utmSource } from "@/lib/ab";
import { captureUtm } from "@/lib/utm-hub";
import { trackVisit } from "@/services/dataAdapter";
import { trackInteraction } from "@/lib/tracking";

const visitCounted = new Set<string>();

/** Chèn một thẻ <script> nội tuyến một lần duy nhất. */
function injectInline(
  id: string,
  code: string,
  target: "head" | "body" = "head",
) {
  if (!code.trim() || document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.type = "text/javascript";
  s.text = code;
  (target === "head" ? document.head : document.body).appendChild(s);
}

function injectSrc(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function injectRaw(id: string, html: string, target: "head" | "body") {
  if (!html.trim() || document.getElementById(id)) return;
  const holder = document.createElement("div");
  holder.id = id;
  holder.style.display = "none";
  holder.innerHTML = html;
  // Script trong innerHTML không tự chạy — tạo lại để thực thi.
  holder.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    if (old.src) s.src = old.src;
    else s.text = old.textContent || "";
    document.head.appendChild(s);
    old.remove();
  });
  (target === "head" ? document.head : document.body).appendChild(holder);
}

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string, type?: string) {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>(`link[rel~="${rel}"]`),
  );
  if (!href) {
    links.forEach((link) => link.remove());
    return;
  }
  const el = links[0] || document.createElement("link");
  if (!links[0]) {
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (type) el.type = type;
  else el.removeAttribute("type");
  links.slice(1).forEach((link) => link.remove());
}

/**
 * Áp dụng cấu hình động lên trang thật: Pixel/GA4/GTM, mã xác thực
 * webmaster, custom scripts, màu & font theme, chia biến thể A/B và
 * ghi nhận lượt truy cập cho Analytics.
 */
export function RuntimeConfig() {
  const { config } = useSiteConfig();
  const t = config.tracking;
  const clickTracking = t.events.click;
  const scrollTracking = t.events.scroll;
  const seoTitle = config.seo.title;
  const seoDescription = config.seo.description;
  const seoKeywords = config.seo.keywords;
  const seoOgImage = config.seo.ogImage;
  const seoFaviconUrl = config.seo.faviconUrl;
  const seoSchemaType = config.seo.schemaType;

  // Pixel & tracking
  useEffect(() => {
    const existingFbq = typeof window.fbq === "function";
    if (t.facebookPixelId) {
      if (existingFbq) {
        window.fbq?.("init", t.facebookPixelId);
        if (t.events.pageView) window.fbq?.("track", "PageView");
      } else {
        injectInline(
          "fb-pixel",
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.facebookPixelId}');${t.events.pageView ? "fbq('track','PageView');" : ""}`,
        );
      }
    }
    if (t.tiktokPixelId) {
      injectInline(
        "tiktok-pixel",
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${t.tiktokPixelId}');${t.events.pageView ? "ttq.page();" : ""}}(window,document,'ttq');`,
      );
    }
    if (t.ga4Id) {
      injectSrc(
        "ga4-src",
        `https://www.googletagmanager.com/gtag/js?id=${t.ga4Id}`,
      );
      injectInline(
        "ga4-init",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${t.ga4Id}');`,
      );
    }
    if (t.gtmId) {
      injectInline(
        "gtm-init",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtmId}');`,
      );
    }
    setMeta("google-site-verification", t.googleVerification);
    injectRaw("custom-head", t.customHead, "head");
    injectRaw("custom-body", t.customBody, "body");
    injectRaw("custom-footer", t.customFooter, "body");
  }, [
    t.facebookPixelId,
    t.tiktokPixelId,
    t.ga4Id,
    t.gtmId,
    t.googleVerification,
    t.customHead,
    t.customBody,
    t.customFooter,
    t.events.pageView,
  ]);

  useEffect(() => {
    const canTrack = (key: "click" | "scroll") =>
      (key === "click" ? clickTracking : scrollTracking) !== false;
    const onClick = (event: MouseEvent) => {
      if (!canTrack("click")) return;
      const target = event.target as Element | null;
      const action = target?.closest("a, button") as HTMLElement | null;
      if (!action) return;
      const href = action.getAttribute("href") || "";
      const label = (
        action.textContent ||
        action.getAttribute("aria-label") ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 100);
      const isContact =
        href.startsWith("tel:") ||
        /zalo|messenger/i.test(href) ||
        /zalo|messenger|hotline|gọi/i.test(label);
      const isFormCta =
        href.startsWith("#dang-ky") || /đăng ký|tư vấn/i.test(label);
      if (!isContact && !isFormCta) return;
      trackInteraction(isContact ? "contact_click" : "cta_click", {
        action_label: label || "unlabeled",
        destination: href || "button",
        contact_type: isContact
          ? href.startsWith("tel:")
            ? "hotline"
            : /messenger/i.test(href) || /messenger/i.test(label)
              ? "messenger"
              : "zalo"
          : undefined,
      });
    };
    const milestones = new Set<number>();
    const onScroll = () => {
      if (!canTrack("scroll")) return;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const percent = Math.min(100, Math.round((window.scrollY / total) * 100));
      for (const milestone of [25, 50, 75, 90]) {
        if (percent >= milestone && !milestones.has(milestone)) {
          milestones.add(milestone);
          trackInteraction("scroll_depth", { percent });
        }
      }
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, [clickTracking, scrollTracking]);

  // Theme động (màu & font)
  useEffect(() => {
    const root = document.documentElement;
    if (config.theme.primary)
      root.style.setProperty("--primary", config.theme.primary);
    if (config.theme.gold) root.style.setProperty("--gold", config.theme.gold);
    if (config.theme.fontBody)
      root.style.setProperty(
        "--font-sans",
        `"${config.theme.fontBody}", system-ui, sans-serif`,
      );
    if (config.theme.fontHeading)
      root.style.setProperty(
        "--font-display",
        `"${config.theme.fontHeading}", system-ui, sans-serif`,
      );
  }, [
    config.theme.primary,
    config.theme.gold,
    config.theme.fontBody,
    config.theme.fontHeading,
  ]);

  useEffect(() => {
    if (seoTitle) document.title = seoTitle;
    setMeta("description", seoDescription);
    setMeta("keywords", seoKeywords);
    setProperty("og:title", seoTitle);
    setProperty("og:description", seoDescription);
    setProperty("og:type", "website");
    setProperty(
      "og:image",
      seoOgImage
        ? /^https?:\/\//i.test(seoOgImage)
          ? seoOgImage
          : `${window.location.origin}${seoOgImage.startsWith("/") ? seoOgImage : `/${seoOgImage}`}`
        : "",
    );
    setMeta("twitter:title", seoTitle);
    setMeta("twitter:description", seoDescription);
    setLink("canonical", window.location.href.split("#")[0] || "/");
    setLink(
      "icon",
      seoFaviconUrl,
      seoFaviconUrl.endsWith(".ico") ? "image/x-icon" : undefined,
    );
    let schema = document.getElementById(
      "runtime-seo-schema",
    ) as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "runtime-seo-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": seoSchemaType || "WebPage",
      name: seoTitle,
      description: seoDescription,
      url: window.location.href.split("#")[0],
    });
  }, [
    seoTitle,
    seoDescription,
    seoKeywords,
    seoOgImage,
    seoFaviconUrl,
    seoSchemaType,
  ]);

  // Hub UTM: chốt nguồn traffic ngay khi trang vừa mở, trước mọi điều hướng
  useEffect(() => {
    try {
      captureUtm(true);
    } catch {
      /* Hub UTM không bao giờ được làm hỏng trang */
    }
  }, []);

  // Analytics: ghi nhận 1 lượt truy cập/phiên + gán biến thể A/B
  useEffect(() => {
    const experimentKey = `funnel_visit_counted_v2_${config.abTest.enabled ? "ab" : "plain"}_${config.abTest.split}`;
    if (visitCounted.has(experimentKey)) return;
    const variant = getVariant(config.abTest.enabled, config.abTest.split);
    trackVisit(utmSource(), config.abTest.enabled ? variant : undefined);
    visitCounted.add(experimentKey);
  }, [config.abTest.enabled, config.abTest.split]);

  return null;
}
