/**
 * Automated responsive regression check.
 *
 * Builds nothing and installs nothing: it drives the copy of Chrome already on
 * the machine through puppeteer-core (which, unlike `puppeteer`, ships no
 * bundled browser) against a local `vite preview` server.
 *
 * At every viewport in VIEWPORTS it asserts:
 *   1. the document does not scroll horizontally;
 *   2. no visible element's box extends past the viewport's left/right edge;
 *   3. every interactive control is at least MIN_TAP px in both dimensions;
 *   4. nothing is clipped by a fixed-height ancestor;
 *   5. an open mobile drawer fits entirely above the fold.
 *
 * It then runs axe-core at A11Y_VIEWPORTS for WCAG 2.1 A/AA.
 *
 * Run: npm run test:ui
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const MIN_TAP = 44;
const TOLERANCE = 1; // sub-pixel rounding
const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** Widths the axe pass runs at — one phone layout, one desktop layout. */
const A11Y_VIEWPORTS = [
  { label: '390 mobile', width: 390, height: 844, mobile: true },
  { label: '1440 desktop', width: 1440, height: 900, mobile: false },
];

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  process.env.CHROME_PATH,
].filter(Boolean);

/** The widths the brief calls out, plus the two landscape-phone cases. */
const VIEWPORTS = [
  { label: '320  small phone', width: 320, height: 568, mobile: true },
  { label: '375  iPhone SE/13 mini', width: 375, height: 667, mobile: true },
  { label: '414  large phone', width: 414, height: 896, mobile: true },
  { label: '390x844 iPhone 14', width: 390, height: 844, mobile: true },
  { label: '844x390 iPhone landscape', width: 844, height: 390, mobile: true },
  { label: '768  iPad Mini portrait', width: 768, height: 1024, mobile: true },
  { label: '820  iPad Air portrait', width: 820, height: 1180, mobile: true },
  { label: '1024 iPad landscape', width: 1024, height: 768, mobile: false },
  { label: '1280 desktop', width: 1280, height: 800, mobile: false },
  { label: '1440 desktop', width: 1440, height: 900, mobile: false },
  { label: '1920 large desktop', width: 1920, height: 1080, mobile: false },
  { label: '2560 ultrawide', width: 2560, height: 1440, mobile: false },
];

function findChrome() {
  const found = CHROME_PATHS.find((p) => existsSync(p));
  if (!found) {
    console.error('No Chrome/Chromium found. Set CHROME_PATH to your browser binary and re-run.');
    process.exit(1);
  }
  return found;
}

/** Starts `vite preview` and resolves with { url, stop }. */
function startPreview() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', '4317', '--strictPort'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('vite preview did not start within 30s'));
    }, 30_000);

    proc.stdout.on('data', (chunk) => {
      const match = String(chunk).match(/(http:\/\/localhost:\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ url: match[1] + '/', stop: () => proc.kill() });
    });

    proc.stderr.on('data', (chunk) => process.stderr.write(chunk));
    proc.on('error', reject);
  });
}

/** Runs inside the page. Returns every rule violation it can see. */
function auditPage(minTap, tolerance) {
  const problems = [];
  const doc = document.documentElement;
  const vw = doc.clientWidth;

  if (doc.scrollWidth > vw + tolerance) {
    problems.push({
      rule: 'h-scroll',
      detail: `document scrollWidth ${doc.scrollWidth} > viewport ${vw}`,
    });
  }

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls =
      typeof el.className === 'string' && el.className
        ? `.${el.className.trim().split(/\s+/).join('.')}`
        : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
  };

  const isVisible = (el, style) =>
    style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;

  // A card sitting off to the right inside a deliberate horizontal scroller
  // (the reviews carousel) is not page overflow — the page itself still fits.
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };

  for (const el of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (!isVisible(el, style)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    // A visually-hidden label is a clipped 1px box by design — rules 3 and 4
    // would otherwise report the accessibility pattern itself as the defect.
    if (el.classList.contains('visually-hidden')) continue;

    // 2. horizontal overflow past either viewport edge
    if ((rect.right > vw + tolerance || rect.left < -tolerance) && !inScroller(el)) {
      problems.push({
        rule: 'overflow-x',
        detail: `${describe(el)} spans ${Math.round(rect.left)}..${Math.round(rect.right)} (viewport 0..${vw})`,
      });
    }

    // 3. touch target size
    const interactive =
      el.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') &&
      !el.closest('[inert]');
    if (interactive && rect.width > 0) {
      // An inline link inside a paragraph is exempt (WCAG 2.5.8 inline exception).
      const inlineInProse = style.display === 'inline' && el.closest('p, li, blockquote');
      if (!inlineInProse && (rect.height < minTap - tolerance || rect.width < minTap - tolerance)) {
        problems.push({
          rule: 'tap-target',
          detail: `${describe(el)} is ${Math.round(rect.width)}x${Math.round(rect.height)} (min ${minTap})`,
        });
      }
    }

    // 4. content clipped by a fixed height
    if (
      style.overflowY === 'hidden' &&
      el.scrollHeight > el.clientHeight + 2 &&
      el.clientHeight > 0
    ) {
      problems.push({
        rule: 'clipped',
        detail: `${describe(el)} content ${el.scrollHeight}px in ${el.clientHeight}px box`,
      });
    }
  }

  // 5. An open full-screen drawer must fit. It is scrollable so nothing is
  //    technically lost, but a "Book a Session" button sitting below the fold
  //    of a menu the user just opened is a defect, and rules 1-4 cannot see it.
  const drawer = document.querySelector('.mobile-menu.is-open');
  if (drawer) {
    const vh = doc.clientHeight;
    for (const el of drawer.querySelectorAll('a, button')) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > vh + tolerance || rect.top < -tolerance) {
        problems.push({
          rule: 'drawer-fold',
          detail: `${describe(el)} at ${Math.round(rect.top)}..${Math.round(rect.bottom)} exceeds viewport height ${vh}`,
        });
      }
    }
  }

  return problems;
}

const chrome = findChrome();
console.log(`browser: ${chrome}`);

const preview = await startPreview();
console.log(`server:  ${preview.url}\n`);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars'],
});

let failures = 0;

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    await page.goto(preview.url, { waitUntil: 'networkidle2' });

    // Reveal animations start at opacity 0; make everything visible so the
    // audit measures the settled layout rather than the entry state.
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

    const closed = await page.evaluate(auditPage, MIN_TAP, TOLERANCE);

    // Re-audit with the mobile drawer open, where it is reachable.
    let open = [];
    const hasBurger = await page.evaluate(
      () => getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none'
    );
    if (hasBurger) {
      await page.click('.menu-toggle');
      await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
      open = (await page.evaluate(auditPage, MIN_TAP, TOLERANCE)).map((p) => ({
        ...p,
        detail: `[drawer open] ${p.detail}`,
      }));
    }

    const problems = [...closed, ...open];
    if (problems.length === 0) {
      console.log(`PASS  ${vp.label}`);
    } else {
      failures += problems.length;
      console.log(`FAIL  ${vp.label}`);
      for (const p of problems) console.log(`        ${p.rule}: ${p.detail}`);
    }

    await page.close();
  }

  // --------------------------------------------------------------------------
  // Accessibility pass (axe-core).
  // Run at one mobile and one desktop width because several rules — contrast in
  // particular — depend on which layout is active. axe is used rather than a
  // hand-rolled contrast walk because it correctly resolves stacking contexts,
  // fixed positioning and alpha compositing, which a naive parent-walk does not.
  // --------------------------------------------------------------------------
  for (const vp of A11Y_VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile });
    await page.goto(preview.url, { waitUntil: 'networkidle2' });

    // Kill transitions before revealing. axe measures the *computed* opacity,
    // so a .reveal caught mid-fade reads as low-contrast text and produces a
    // page full of false contrast violations.
    await page.addStyleTag({
      content: '*,*::before,*::after{transition:none!important;animation:none!important}',
    });
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    await page.addScriptTag({ path: AXE_PATH });

    const result = await page.evaluate(async () =>
      // eslint-disable-next-line no-undef
      axe.run(document, {
        resultTypes: ['violations'],
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        },
      })
    );

    if (result.violations.length === 0) {
      console.log(`PASS  a11y @ ${vp.label}`);
    } else {
      console.log(`FAIL  a11y @ ${vp.label}`);
      for (const v of result.violations) {
        failures += v.nodes.length;
        console.log(`        ${v.impact}: ${v.id} — ${v.help}`);
        for (const n of v.nodes.slice(0, 4)) {
          console.log(`          ${n.target.join(' ')}`);
        }
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
  preview.stop();
}

console.log(failures === 0 ? '\nAll checks clean.' : `\n${failures} problem(s) found.`);
process.exit(failures === 0 ? 0 : 1);
