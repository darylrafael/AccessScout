import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startFixtureServer, type FixtureServer } from './helpers/fixture-server.js';

describe('Fixture HTTP Server (baseline-article)', () => {
  let server: FixtureServer;

  beforeAll(async () => {
    server = await startFixtureServer('baseline-article');
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('serves root / as index.html with 200 and text/html', async () => {
    const res = await fetch(server.url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    expect(text).toContain('Accessible Web Architecture');
  });

  it('serves /style.css with 200 and text/css', async () => {
    const res = await fetch(new URL('style.css', server.url));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/css');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    expect(text).toContain('.skip-link');
  });

  it('serves /images/figure.svg with 200 and image/svg+xml', async () => {
    const res = await fetch(new URL('images/figure.svg', server.url));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 404 for non-existent resources', async () => {
    const res = await fetch(new URL('does-not-exist', server.url));
    expect(res.status).toBe(404);
  });

  it('prevents path traversal attempts (plain and encoded %2e%2e)', async () => {
    // Plain traversal
    const resPlain = await fetch(new URL('../package.json', server.url));
    expect([403, 404]).toContain(resPlain.status);

    // Encoded dot-dot traversal (%2e%2e)
    const resEncoded = await fetch(new URL('%2e%2e/package.json', server.url));
    expect([403, 404]).toContain(resEncoded.status);

    // Deep traversal
    const resDeep = await fetch(new URL('%2e%2e/%2e%2e/%2e%2e/package.json', server.url));
    expect([403, 404]).toContain(resDeep.status);

    // Traversal with null byte
    const resNull = await fetch(`${server.url}%2e%2e%00/package.json`);
    expect([400, 403, 404]).toContain(resNull.status);
  });

  it('rejects POST and other non-GET/HEAD methods with 405 Method Not Allowed', async () => {
    const resPost = await fetch(server.url, { method: 'POST' });
    expect(resPost.status).toBe(405);
    expect(resPost.headers.get('allow')).toBe('GET, HEAD');

    const resPut = await fetch(server.url, { method: 'PUT' });
    expect(resPut.status).toBe(405);
  });

  it('assigns different ports when multiple servers are started concurrently', async () => {
    const s1 = await startFixtureServer('baseline-article');
    const s2 = await startFixtureServer('baseline-article');

    try {
      const port1 = new URL(s1.url).port;
      const port2 = new URL(s2.url).port;
      expect(port1).not.toBe(port2);
      expect(port1).toBeTruthy();
      expect(port2).toBeTruthy();
    } finally {
      await s1.close();
      await s2.close();
    }
  });

  it('refuses new connections after close()', async () => {
    const tempServer = await startFixtureServer('baseline-article');
    const targetUrl = tempServer.url;

    // Verify it is responding while alive
    const aliveRes = await fetch(targetUrl);
    expect(aliveRes.status).toBe(200);

    // Close the server
    await tempServer.close();

    // Subsequent requests must fail (connection refused)
    await expect(fetch(targetUrl)).rejects.toThrow();
  });
});
