import { truncateMetaDescription } from "./siteSeo";

export type SeoLandingPage = {
  slug: string;
  title: string;
  description: string;
  heading: string;
  punchline: string;
  intro: string;
  steps: string[];
  context: string;
  bestFor: string[];
  outcomes: string[];
  faqs: { q: string; a: string }[];
  ctaLabel: string;
};

const pages: SeoLandingPage[] = [
  {
    slug: "digital-menu-for-restaurants",
    title: "Digital Menu for Restaurants | ePatri",
    description:
      "Build a digital menu for restaurants with QR access, instant updates, and guest-friendly browsing on any phone.",
    heading: "Digital Menu for Restaurants",
    punchline: "Stop printing. Start serving faster.",
    intro:
      "Use one digital menu link and keep service fast without reprint delays.",
    steps: [
      "Step 1: Upload your latest menu (PDF or interactive).",
      "Step 2: Generate your QR and place it on tables.",
      "Step 3: Update items anytime without reprinting.",
    ],
    context:
      "Restaurants with frequent edits need speed and consistency. A digital menu removes the reprint cycle and keeps pricing, availability, and dish details aligned across all tables.",
    bestFor: [
      "Dine-in restaurants with frequent menu updates",
      "Teams that want one menu link for every channel",
      "Owners reducing print and redesign overhead",
    ],
    outcomes: [
      "Faster menu edits during operations",
      "Consistent guest experience across tables",
      "Lower recurring print and replacement cost",
    ],
    faqs: [
      {
        q: "Can I use both PDF and interactive menu modes?",
        a: "Yes. You can publish in PDF mode, interactive mode, or switch as your workflow evolves.",
      },
      {
        q: "Will guests need an app?",
        a: "No. Guests open the menu in a normal browser after scanning the QR code.",
      },
    ],
    ctaLabel: "Launch your restaurant menu",
  },
  {
    slug: "qr-menu-for-cafes",
    title: "QR Menu for Cafes | ePatri",
    description:
      "Launch a QR menu for cafes that loads fast, works on all phones, and helps teams update seasonal items quickly.",
    heading: "QR Menu for Cafes",
    punchline: "Scan. Sip. Serve. Done.",
    intro:
      "Perfect for daily specials and seasonal drinks that change often.",
    steps: [
      "Step 1: Add your coffee and food categories.",
      "Step 2: Print one QR card for every table.",
      "Step 3: Push daily updates in minutes.",
    ],
    context:
      "Cafe menus shift quickly with seasonal drinks and limited batches. QR delivery helps staff keep the menu fresh without replacing table cards every week.",
    bestFor: [
      "Cafes with rotating seasonal items",
      "Baristas updating specials during service",
      "Small teams needing simple menu operations",
    ],
    outcomes: [
      "Quicker special-of-the-day updates",
      "Less table-card maintenance",
      "Smoother rush-hour guest ordering flow",
    ],
    faqs: [
      {
        q: "How fast can we update specials?",
        a: "Updates are immediate once saved, so teams can reflect stock and seasonal availability quickly.",
      },
      {
        q: "Does it work on older phones?",
        a: "Yes, the menu opens through a browser link, which supports a wide range of devices.",
      },
    ],
    ctaLabel: "Start cafe QR menu",
  },
  {
    slug: "paperless-menu-system",
    title: "Paperless Menu System for Food Businesses | ePatri",
    description:
      "Adopt a paperless menu system for restaurants and cafes with QR access, easier updates, and lower print waste.",
    heading: "Paperless Menu System",
    punchline: "Less paper. More control.",
    intro:
      "Move away from constant reprints and keep one always-current menu.",
    steps: [
      "Step 1: Move your current menu into ePatri.",
      "Step 2: Share one QR and one menu link everywhere.",
      "Step 3: Edit once and keep all tables updated.",
    ],
    context:
      "Paperless systems reduce recurring print waste while improving version control. Teams spend less time replacing old menus and more time serving guests.",
    bestFor: [
      "Businesses targeting sustainability goals",
      "Multi-location teams needing consistent menus",
      "Operators reducing recurring print costs",
    ],
    outcomes: [
      "Reduced paper waste and reprint cycles",
      "Single source of truth for live menus",
      "Cleaner brand positioning around sustainability",
    ],
    faqs: [
      {
        q: "Does paperless mean losing menu design quality?",
        a: "No. You can keep your visual style with PDF or move to interactive sections for easier browsing.",
      },
      {
        q: "Can this support multiple outlets?",
        a: "Yes. Each location can have its own live menu while staying under one brand workflow.",
      },
    ],
    ctaLabel: "Go paperless now",
  },
  {
    slug: "interactive-menu-for-restaurants",
    title: "Interactive Menu for Restaurants | ePatri",
    description:
      "Create an interactive menu for restaurants with categories, item descriptions, and clean mobile-first layout.",
    heading: "Interactive Menu for Restaurants",
    punchline: "Turn menus into better decisions.",
    intro:
      "Help guests browse faster with clear sections, prices, and item details.",
    steps: [
      "Step 1: Create categories and add item details.",
      "Step 2: Publish your interactive menu page.",
      "Step 3: Share and update instantly when items change.",
    ],
    context:
      "Interactive menus help guests compare items faster and reduce confusion around ingredients, portions, and pricing. This supports quicker ordering decisions.",
    bestFor: [
      "Restaurants with large category-based menus",
      "Teams highlighting item descriptions clearly",
      "Brands prioritizing mobile readability",
    ],
    outcomes: [
      "Better menu readability on mobile devices",
      "Clearer item understanding before ordering",
      "Lower friction for guests exploring options",
    ],
    faqs: [
      {
        q: "Is interactive mode better for SEO than image-only menus?",
        a: "Usually yes, because text-based sections are easier for search engines to interpret.",
      },
      {
        q: "Can we still keep a PDF fallback?",
        a: "Yes. You can keep a PDF option while using interactive content as primary.",
      },
    ],
    ctaLabel: "Build interactive menu",
  },
  {
    slug: "pdf-menu-hosting",
    title: "PDF Menu Hosting with QR Access | ePatri",
    description:
      "Host your PDF menu with a stable share link and QR code so guests can open it instantly on mobile and desktop.",
    heading: "PDF Menu Hosting",
    punchline: "Keep your design. Fix the delivery.",
    intro:
      "Already design in PDF? Keep that workflow and make access frictionless.",
    steps: [
      "Step 1: Upload the latest approved PDF.",
      "Step 2: Publish and share the QR instantly.",
      "Step 3: Replace old PDF anytime without changing the link.",
    ],
    context:
      "PDF hosting is ideal when design teams already use print-style layouts. Keep the creative process intact while improving menu delivery and access reliability.",
    bestFor: [
      "Teams with established PDF design workflows",
      "Outlets needing quick publish-and-replace cycles",
      "Owners who want one stable share URL",
    ],
    outcomes: [
      "Keep design process unchanged",
      "Publish updates without replacing QR cards",
      "Reliable menu delivery from one stable link",
    ],
    faqs: [
      {
        q: "Can I replace the PDF without changing QR cards?",
        a: "Yes. The link stays stable while the underlying PDF can be updated anytime.",
      },
      {
        q: "Does PDF mode still support mobile viewing?",
        a: "Yes. Guests can open and zoom menu pages directly on mobile browsers.",
      },
    ],
    ctaLabel: "Host your PDF menu",
  },
  {
    slug: "restaurant-menu-link",
    title: "Restaurant Menu Link for Social, Maps and QR | ePatri",
    description:
      "Use one restaurant menu link for Instagram bio, Google profile, QR cards, and table sharing with always-current content.",
    heading: "One Menu Link for Every Channel",
    punchline: "One link. Every channel. Always current.",
    intro:
      "Stop managing many links. Use one menu URL across maps, bio, and tables.",
    steps: [
      "Step 1: Create your permanent menu link.",
      "Step 2: Add it to socials, maps, and QR prints.",
      "Step 3: Update menu content without changing the URL.",
    ],
    context:
      "A single menu link removes channel fragmentation. Guests coming from bio, maps, QR tables, or messages always land on current menu content.",
    bestFor: [
      "Restaurants managing many social and map profiles",
      "Teams wanting one permanent URL strategy",
      "Brands reducing broken or outdated links",
    ],
    outcomes: [
      "One canonical menu link across channels",
      "Fewer broken-link incidents in campaigns",
      "Stronger trust through consistent availability",
    ],
    faqs: [
      {
        q: "Where should we place this link first?",
        a: "Start with Google profile, Instagram bio, WhatsApp share, and table QR cards for maximum discovery.",
      },
      {
        q: "Can we reuse the same link in ads and campaigns?",
        a: "Yes. Keeping one canonical menu URL strengthens consistency across campaigns.",
      },
    ],
    ctaLabel: "Create your menu link",
  },
];

export function allSeoLandingPages(): SeoLandingPage[] {
  return pages;
}

export function findSeoLandingPageBySlug(slug: string): SeoLandingPage | undefined {
  return pages.find((page) => page.slug === slug);
}

export function landingPageDescription(text: string): string {
  return truncateMetaDescription(text);
}
