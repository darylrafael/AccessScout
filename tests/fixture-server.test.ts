import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startFixtureServer, MIME_TYPES, type FixtureServer } from './helpers/fixture-server.js';

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

  it('properly handles HEAD requests with identical headers and empty body', async () => {
    const res = await fetch(server.url, { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.text();
    expect(body).toBe('');
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

  it('defines correct Content-Type for all required MIME types', () => {
    expect(MIME_TYPES['.html']).toBe('text/html; charset=utf-8');
    expect(MIME_TYPES['.css']).toBe('text/css; charset=utf-8');
    expect(MIME_TYPES['.svg']).toBe('image/svg+xml');
    expect(MIME_TYPES['.js']).toBe('text/javascript; charset=utf-8');
    expect(MIME_TYPES['.json']).toBe('application/json; charset=utf-8');
    expect(MIME_TYPES['.png']).toBe('image/png');
  });

  it('returns 404 for non-existent resources', async () => {
    const res = await fetch(new URL('does-not-exist', server.url));
    expect(res.status).toBe(404);
  });

  it('prevents path traversal attempts (plain, encoded %2e%2e, and backslashes)', async () => {
    // Plain traversal via relative path
    const resPlain = await fetch(new URL('../package.json', server.url));
    expect([403, 404]).toContain(resPlain.status);

    // Encoded dot-dot traversal (%2e%2e) reaching server
    const resEncodedDot = await fetch(`${server.url}%2e%2e/package.json`);
    expect([403, 404]).toContain(resEncodedDot.status);

    // Encoded forward slash traversal reaching server
    const resEncodedSlash = await fetch(`${server.url}..%2fpackage.json`);
    expect([403, 404]).toContain(resEncodedSlash.status);

    // Deep subpath traversal attempting to escape fixtureRoot
    const resSubpath = await fetch(`${server.url}images/%2e%2e%2f%2e%2e%2fpackage.json`);
    expect([403, 404]).toContain(resSubpath.status);

    // Windows backslash traversal (%5c)
    const resBackslash = await fetch(`${server.url}images/%2e%2e%5c%2e%2e%5cpackage.json`);
    expect([403, 404]).toContain(resBackslash.status);

    // Traversal with null byte
    const resNull = await fetch(`${server.url}%2e%2e%00/package.json`);
    expect([400, 403, 404]).toContain(resNull.status);
  });

  it('rejects malformed URI encodings with 400 Bad Request', async () => {
    const port = Number(new URL(server.url).port);
    const res = await new Promise<{ statusCode: number | undefined }>((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: '/%invalid-encoding', method: 'GET' },
        (r) => {
          r.resume();
          r.on('end', () => resolve({ statusCode: r.statusCode }));
        },
      );
      req.on('error', reject);
      req.end();
    });
    expect(res.statusCode).toBe(400);
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
