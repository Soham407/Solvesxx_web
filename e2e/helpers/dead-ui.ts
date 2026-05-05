import type { Locator, Page } from "@playwright/test";

export interface ButtonOutcome {
  label: string;
  outcome: "navigated" | "dialog_opened" | "toast_appeared" | "api_called" | "dom_changed" | "dead";
  detail?: string;
}

// Always skip: cancel/close/dismiss, single chars (avatar initials), pure numbers (pagination)
const SKIP_LABELS = /^(cancel|close|dismiss|back|×|✕|▸|‹|›|\.\.\.|\s*|[A-Z]|[0-9]{1,2})$/i;

// Skip buttons inside header/nav (TopNav, Sidebar) — these are global chrome, not page content
const NAV_ANCESTORS = "header, nav, aside, [data-sidebar], [role='navigation'], [data-testid='topnav']";

/**
 * Clicks every visible, enabled page-content button and records what happened.
 * Skips TopNav/Sidebar chrome. Restores page state after each click.
 * Returns ButtonOutcome[] — filter for outcome === "dead" to find broken buttons.
 */
export async function auditPageButtons(
  page: Page,
  options: { extraSkip?: RegExp; returnToUrl?: string } = {}
): Promise<ButtonOutcome[]> {
  const originUrl = options.returnToUrl ?? page.url();
  const results: ButtonOutcome[] = [];

  // Only buttons inside <main> to exclude TopNav / Sidebar chrome
  const getButtons = () =>
    page.locator('main button:visible:not([disabled]):not([aria-disabled="true"])');

  const count = await getButtons().count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    // Re-query each iteration because the DOM may have changed after a previous click
    const btn = getButtons().nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;

    const text = ((await btn.textContent()) ?? "").trim().replace(/\s+/g, " ");
    const ariaLabel = (await btn.getAttribute("aria-label")) ?? "";
    const label = text || ariaLabel || `btn[${i}]`;

    if (SKIP_LABELS.test(label)) continue;
    if (options.extraSkip?.test(label)) continue;

    // Skip if button is inside a nav ancestor even within main (e.g. breadcrumbs)
    const insideNav = await btn.evaluate(
      (el, selector) => !!el.closest(selector),
      NAV_ANCESTORS
    ).catch(() => false);
    if (insideNav) continue;

    let urlBefore = "";
    let dialogsBefore = 0;
    let apiCalled = false;

    try {
      urlBefore = page.url();
      dialogsBefore = await page.locator('[role="dialog"][data-state="open"], [role="menu"]').count();
    } catch {
      continue; // page already closed, stop
    }

    const onReq = () => { apiCalled = true; };
    page.on("request", onReq);

    let outcome: ButtonOutcome["outcome"] = "dead";
    let detail: string | undefined;

    try {
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 4_000 });

      // Wait up to 3s for any observable reaction
      await Promise.race([
        page.waitForURL((u) => u.toString() !== urlBefore, { timeout: 3_000 }).catch(() => null),
        page.locator('[role="dialog"][data-state="open"], [role="menu"]')
          .waitFor({ state: "visible", timeout: 3_000 }).catch(() => null),
        page.locator('[data-sonner-toast], li[role="status"], [data-type="success"], [data-type="error"]')
          .first().waitFor({ state: "visible", timeout: 3_000 }).catch(() => null),
        new Promise((r) => setTimeout(r, 3_000)),
      ]);

      const urlAfter = page.url();
      const dialogsAfter = await page.locator('[role="dialog"][data-state="open"], [role="menu"]').count().catch(() => dialogsBefore);
      const toastVisible = await page
        .locator('[data-sonner-toast], li[role="status"], [data-type="success"], [data-type="error"]')
        .first().isVisible().catch(() => false);

      if (urlAfter !== urlBefore) {
        outcome = "navigated";
        detail = `→ ${new URL(urlAfter).pathname}`;
      } else if (dialogsAfter > dialogsBefore) {
        outcome = "dialog_opened";
      } else if (toastVisible) {
        outcome = "toast_appeared";
      } else if (apiCalled) {
        outcome = "api_called";
      }
    } catch {
      outcome = "dead";
      detail = "click timed out";
    } finally {
      page.off("request", onReq);
    }

    results.push({ label, outcome, detail });

    // Restore: close any open dialog (guard against closed page)
    try {
      if (await page.locator('[role="dialog"][data-state="open"], [role="menu"]').count()) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
      // Restore: navigate back if we left the page
      if (page.url() !== urlBefore) {
        await page.goto(originUrl, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);
      }
    } catch {
      // Page context closed mid-cleanup — stop processing this page
      break;
    }
  }

  return results;
}

/**
 * Fills every visible text/email/number/textarea input inside <main> with a test value.
 */
export async function fillVisibleInputs(page: Page, value = "Test Input E2E"): Promise<boolean> {
  const inputs = page.locator(
    'main input[type="text"]:visible, main input[type="email"]:visible, main input[type="number"]:visible, main textarea:visible'
  );
  const count = await inputs.count();
  if (count === 0) return false;

  for (let i = 0; i < count; i++) {
    const inp = inputs.nth(i);
    const type = (await inp.getAttribute("type")) ?? "text";
    const fill = type === "number" ? "1" : value;
    await inp.fill(fill).catch(() => null);
  }
  return true;
}

/** Returns all button outcomes where nothing happened. */
export function findDeadButtons(results: ButtonOutcome[]): ButtonOutcome[] {
  return results.filter((r) => r.outcome === "dead");
}

/**
 * Click a specific locator and assert one of the expected outcomes fires within timeoutMs.
 * Throws (fails the test) if none of the expected outcomes occurs.
 */
export async function clickAndExpect(
  page: Page,
  buttonLocator: Locator,
  expected: Array<ButtonOutcome["outcome"]>,
  timeoutMs = 3_000
): Promise<ButtonOutcome["outcome"]> {
  const urlBefore = page.url();
  const dialogsBefore = await page.locator('[role="dialog"][data-state="open"], [role="menu"]').count();
  let apiCalled = false;
  const onReq = () => { apiCalled = true; };
  page.on("request", onReq);

  await buttonLocator.scrollIntoViewIfNeeded();
  await buttonLocator.click({ timeout: 4_000 });

  await Promise.race([
    page.waitForURL((u) => u.toString() !== urlBefore, { timeout: timeoutMs }).catch(() => null),
    page.locator('[role="dialog"][data-state="open"], [role="menu"]')
      .waitFor({ state: "visible", timeout: timeoutMs }).catch(() => null),
    page.locator('[data-sonner-toast], li[role="status"], [data-type="success"], [data-type="error"]')
      .first().waitFor({ state: "visible", timeout: timeoutMs }).catch(() => null),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);

  page.off("request", onReq);

  const urlAfter = page.url();
  const dialogsAfter = await page.locator('[role="dialog"][data-state="open"], [role="menu"]').count();
  const toastVisible = await page
    .locator('[data-sonner-toast], li[role="status"], [data-type="success"], [data-type="error"]')
    .first().isVisible().catch(() => false);

  let actual: ButtonOutcome["outcome"] = "dead";
  if (urlAfter !== urlBefore) actual = "navigated";
  else if (dialogsAfter > dialogsBefore) actual = "dialog_opened";
  else if (toastVisible) actual = "toast_appeared";
  else if (apiCalled) actual = "api_called";

  if (!expected.includes(actual)) {
    throw new Error(
      `Button click outcome was "${actual}" but expected one of: ${expected.join(", ")}. URL: ${page.url()}`
    );
  }
  return actual;
}
