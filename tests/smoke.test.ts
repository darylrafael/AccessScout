import { describe, it, expect } from 'vitest';
import { chromium, type Browser } from 'playwright';

describe('Smoke test - Chromium headless browser automation', () => {
  it('launches Chromium, sets HTML content, and locates heading', async () => {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent('<!DOCTYPE html><html><body><h1>AccessScout Smoke</h1></body></html>');

      const heading = page.locator('h1');
      const text = await heading.textContent();

      expect(text).toBe('AccessScout Smoke');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });
});
