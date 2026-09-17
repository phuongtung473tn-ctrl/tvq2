import type { SiteConfig } from "@/config/site-config";
import { ScarcityBar } from "@/components/ScarcityBar";

type ContentSectionData = SiteConfig["landing"]["sectionsArray"][number];

export function ContentSection({ section }: { section: ContentSectionData }) {
  const variant = section.content?.variant || section.type;
  const videoUrl = section.content?.buttonHref || "";
  const youtubeId = videoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/,
  )?.[1];
  const bodyLines =
    section.content?.body
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean) || [];

  return (
    <section
      style={{
        backgroundColor: section.content?.backgroundColor || undefined,
        color: section.content?.textColor || undefined,
      }}
      className={`mx-auto w-full max-w-6xl px-4 py-16 sm:py-20 ${
        variant === "testimonials" ? "border-l-4 border-gold bg-card" : ""
      } ${variant === "guarantee" ? "ring-1 ring-primary/20" : ""}`}
    >
      {variant === "video" && youtubeId ? (
        <div className="mb-6 aspect-video overflow-hidden rounded-2xl bg-neutral-900">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={section.content?.heading || section.label}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        section.content?.imageUrl && (
          <img
            src={section.content.imageUrl}
            alt=""
            className="mb-6 max-h-[28rem] w-full rounded-2xl object-cover"
            loading="lazy"
          />
        )
      )}
      <h2
        style={{ color: section.content?.accentColor || undefined }}
        className="text-2xl font-extrabold sm:text-3xl"
      >
        {section.content?.heading || section.label}
      </h2>
      {variant === "faq" && section.content?.body ? (
        <details className="mt-4 rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-bold">
            {section.content.heading || section.label}
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {section.content.body}
          </p>
        </details>
      ) : variant === "pricing" || variant === "grid" ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(bodyLines.length ? bodyLines : [section.content?.body || ""]).map(
            (line) => (
              <li
                key={line}
                className="rounded-xl border border-border bg-card p-3 text-sm leading-relaxed"
              >
                ✓ {line}
              </li>
            ),
          )}
        </ul>
      ) : (
        section.content?.body && (
          <p className="mt-3 max-w-3xl whitespace-pre-line text-muted-foreground">
            {section.content.body}
          </p>
        )
      )}
      {variant === "countdown" && (
        <div className="mt-6 max-w-xl">
          <ScarcityBar />
        </div>
      )}
      {section.content?.buttonLabel && (
        <a
          href={section.content.buttonHref || "#dang-ky"}
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          {section.content.buttonLabel}
        </a>
      )}
    </section>
  );
}
