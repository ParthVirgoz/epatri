/** Central marketing copy + structured data helpers — tune here instead of scattered pages. */

export const SITE_BRAND = "ePatri";

export const DEFAULT_HOME_TITLE = `${SITE_BRAND} — Digital menus, lighter footprint`;

export const DEFAULT_HOME_DESCRIPTION =
  "ePatri helps restaurants publish QR-ready digital menus and PDF menus from one link — fewer printed menus, clearer choices for guests, and a lighter footprint.";

/** Broad, stable phrases for discovery; search engines weight content and links far more than this tag. */
export const HOME_META_KEYWORDS = [
  "digital menu",
  "QR code menu",
  "restaurant menu online",
  "paperless menu",
  "PDF menu for restaurants",
  "interactive menu",
  "guest menu",
  "sustainable hospitality",
].join(", ");

export function siteOrigin(astroUrl: URL, publicSiteUrl?: string): string {
  const raw = (publicSiteUrl?.trim() || `${astroUrl.protocol}//${astroUrl.host}`).trim();
  return raw.replace(/\/$/, "");
}

export function canonicalHref(astroUrl: URL, publicSiteUrl?: string): string {
  const o = siteOrigin(astroUrl, publicSiteUrl);
  const path = astroUrl.pathname || "/";
  const search = astroUrl.search || "";
  return `${o}${path === "" ? "/" : path}${search}`;
}

export function truncateMetaDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export function guestMenuMetaDescription(shopDisplayName: string): string {
  const name = shopDisplayName.trim() || "This venue";
  return truncateMetaDescription(
    `${name} — browse the guest menu on ${SITE_BRAND}: PDF or interactive list. Open on any phone from the same link or QR.`,
  );
}

export function collectSameAsFromEnv(env: Record<string, string | undefined>): string[] {
  const candidates = [
    env.PUBLIC_SOCIAL_LINKEDIN,
    env.PUBLIC_SOCIAL_INSTAGRAM,
    env.PUBLIC_SOCIAL_X,
    env.PUBLIC_SOCIAL_GITHUB,
  ];
  const out: string[] = [];
  for (const c of candidates) {
    const u = String(c || "").trim();
    if (u.startsWith("http://") || u.startsWith("https://")) out.push(u);
  }
  return out;
}

export function homeJsonLdGraph(origin: string, sameAs: string[]) {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  const org: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_BRAND,
    url: `${base}/`,
    logo: `${base}/favicon.svg`,
    description: DEFAULT_HOME_DESCRIPTION,
  };
  if (sameAs.length) org.sameAs = sameAs;

  return {
    "@context": "https://schema.org",
    "@graph": [
      org,
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: SITE_BRAND,
        url: `${base}/`,
        description: DEFAULT_HOME_DESCRIPTION,
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${base}/#webapp`,
        name: SITE_BRAND,
        url: `${base}/`,
        browserRequirements: "Requires JavaScript. Modern evergreen browser recommended.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/OnlineOnly",
          url: `${base}/`,
        },
        publisher: { "@id": `${base}/#organization` },
      },
    ],
  };
}

export function menuWebPageJsonLd(opts: {
  origin: string;
  canonical: string;
  pageName: string;
  description: string;
}) {
  const base = opts.origin.endsWith("/") ? opts.origin.slice(0, -1) : opts.origin;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${opts.canonical}#webpage`,
        name: opts.pageName,
        description: opts.description,
        url: opts.canonical,
        isPartOf: { "@id": `${base}/#website` },
      },
    ],
  };
}
