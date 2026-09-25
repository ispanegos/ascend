import { expect, type Page } from "@playwright/test";

export const AUTH_DIR = "tests/e2e/.auth";
export const STORAGE_STATE = `${AUTH_DIR}/user.json`;
export const CREDENTIALS = `${AUTH_DIR}/credentials.json`;

/** Primary navigation, in order (Design System V2 §4). */
export const DESTINATIONS = [
  { label: "Today", path: "/today" },
  { label: "Quests", path: "/quests" },
  { label: "Ascend", path: "/ascend" },
  { label: "Stats", path: "/stats" },
  { label: "You", path: "/profile" },
] as const;

/**
 * No horizontal overflow (spec §0.7, §71). `body { overflow-x: clip }` would
 * hide overflow from scrollWidth, so every visible element's box is checked
 * against the viewport instead.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const offenders = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
      if (el.closest(".visually-hidden, .skip-link, dialog:not([open])")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.left < -0.5 || rect.right > width + 0.5) {
        const cls = typeof el.className === "string" ? el.className : "";
        found.push(`${el.tagName.toLowerCase()}.${cls} [${Math.round(rect.left)}, ${Math.round(rect.right)}] > ${width}`);
      }
    }
    return found;
  });
  expect(offenders, "elements overflowing the viewport horizontally").toEqual([]);
}

/** Interactive targets are at least 44×44 CSS px (spec §26, §40). */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const selector = "a[href], button, input:not([type=hidden]), select, textarea, [role=button]";
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (el.closest(".skip-link, dialog:not([open])")) continue;
      // Chip inputs are covered by their 44px label.
      const target = el.matches("input[type=radio], input[type=checkbox]")
        ? (el.closest("label") ?? el)
        : el;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // Inline text links inside prose are exempt per WCAG 2.5.8.
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
      if (rect.width < 43.5 || rect.height < 43.5) {
        found.push(`${el.tagName.toLowerCase()} "${el.textContent?.trim() ?? ""}" ${Math.round(rect.width)}×${Math.round(rect.height)}`);
      }
    }
    return found;
  });
  expect(small, "touch targets smaller than 44×44").toEqual([]);
}
