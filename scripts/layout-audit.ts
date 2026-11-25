/**
 * Layout and No-Scroll Audit Script
 * Viewports: 1366x650, 1440x800, 1920x900, 1024x700, 768x1024, 390x844, 360x640
 */

export const VIEWPORTS = [
  { name: "1366x650", width: 1366, height: 650 },
  { name: "1440x800", width: 1440, height: 800 },
  { name: "1920x900", width: 1920, height: 900 },
  { name: "1024x700", width: 1024, height: 700 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x640", width: 360, height: 640 },
] as const;

export const ROUTES = [
  "/",
  "/notes",
  "/timer",
  "/dsa",
  "/ml",
  "/notebook",
  "/code",
  "/ide",
  "/whiteboard",
  "/tasks",
  "/habits",
  "/tracker",
  "/reader",
  "/chat",
  "/exams",
  "/pets",
  "/shop",
  "/alchemy",
  "/skills",
  "/arcade",
  "/timetable",
  "/resources",
  "/snippets",
  "/analytics",
  "/groups",
  "/settings",
  "/admin",
  "/login",
] as const;

export interface CardViolation {
  cardSelector: string;
  childTag: string;
  childClass: string;
  cardRect: { top: number; bottom: number; left: number; right: number };
  childRect: { top: number; bottom: number; left: number; right: number };
  overflowSides: string[];
}

export interface TextEdgeViolation {
  cardSelector: string;
  text: string;
  gapLeft: number;
}

export interface AuditResult {
  route: string;
  viewport: string;
  scrollHeight: number;
  innerHeight: number;
  scrollWidth: number;
  innerWidth: number;
  pageOverflowV: boolean;
  pageOverflowH: boolean;
  cardViolations: CardViolation[];
  textEdgeViolations: TextEdgeViolation[];
}

/** In-browser evaluation function to check page and card bounds */
export function checkLayout(): {
  scrollHeight: number;
  innerHeight: number;
  scrollWidth: number;
  innerWidth: number;
  pageOverflowV: boolean;
  pageOverflowH: boolean;
  cardViolations: CardViolation[];
  textEdgeViolations: TextEdgeViolation[];
} {
  const doc = document.documentElement;
  const scrollHeight = doc.scrollHeight;
  const innerHeight = window.innerHeight;
  const scrollWidth = doc.scrollWidth;
  const innerWidth = window.innerWidth;
  const pageOverflowV = scrollHeight > innerHeight + 1;
  const pageOverflowH = scrollWidth > innerWidth + 1;

  const cardViolations: CardViolation[] = [];
  const textEdgeViolations: TextEdgeViolation[] = [];
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".bento-card, .card, [data-bento-card]"));

  for (const card of cards) {
    const cardRect = card.getBoundingClientRect();
    if (cardRect.width === 0 || cardRect.height === 0) continue;

    // Check text nodes within 12px of card left edge
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const txt = node.textContent?.trim();
      if (!txt) continue;
      const parent = node.parentElement;
      if (!parent) continue;
      if (parent.closest('[role="tooltip"], [role="dialog"], [role="menu"], svg, .sr-only')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const tRect = range.getBoundingClientRect();
      if (tRect.width === 0 || tRect.height === 0) continue;
      const gapLeft = tRect.left - cardRect.left;
      if (gapLeft < 12) {
        textEdgeViolations.push({
          cardSelector: String(card.className).slice(0, 40),
          text: txt.slice(0, 30),
          gapLeft: Math.round(gapLeft),
        });
      }
    }

    // Direct and deep children that should not spill out unless inside intentional scroll container
    const children = Array.from(card.querySelectorAll<HTMLElement>("*"));
    for (const child of children) {
      // Ignore hidden or zero-size elements
      if (child.offsetParent === null && child.style.display === "none") continue;
      // Ignore elements inside an intentional scroll container
      if (child.closest(".scroll-thin, .overflow-y-auto, .overflow-auto, [data-scrollable]")) continue;
      // Ignore tooltips, modals, popovers, portals
      if (child.closest('[role="tooltip"], [role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], .pop-in')) continue;

      const rect = child.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const buffer = 2; // subpixel tolerance
      const overflowSides: string[] = [];
      if (rect.bottom > cardRect.bottom + buffer) overflowSides.push("bottom");
      if (rect.top < cardRect.top - buffer) overflowSides.push("top");
      if (rect.right > cardRect.right + buffer) overflowSides.push("right");
      if (rect.left < cardRect.left - buffer) overflowSides.push("left");

      if (overflowSides.length > 0) {
        cardViolations.push({
          cardSelector: String(card.className).slice(0, 40),
          childTag: child.tagName.toLowerCase(),
          childClass: String(child.className).slice(0, 40),
          cardRect: { top: Math.round(cardRect.top), bottom: Math.round(cardRect.bottom), left: Math.round(cardRect.left), right: Math.round(cardRect.right) },
          childRect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) },
          overflowSides,
        });
      }
    }
  }

  return {
    scrollHeight,
    innerHeight,
    scrollWidth,
    innerWidth,
    pageOverflowV,
    pageOverflowH,
    cardViolations,
    textEdgeViolations,
  };
}
