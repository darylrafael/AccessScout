import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { startFixtureServer, type FixtureServer } from './helpers/fixture-server.js';

describe('Baseline Article - Axe Core Accessibility Benchmark', () => {
  let server: FixtureServer;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await startFixtureServer('baseline-article');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await server.close();
    }
  });

  it('evaluates baseline-article with zero axe violations across WCAG 2.0/2.1/2.2 AA', async () => {
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    if (results.incomplete.length > 0) {
      console.info(
        `Axe incomplete checks count: ${results.incomplete.length}`,
        results.incomplete.map(
          (item: { id: string; impact?: string | null; description: string }) => ({
            id: item.id,
            impact: item.impact,
            description: item.description,
          }),
        ),
      );
    }

    expect(results.violations).toEqual([]);
  });
});
