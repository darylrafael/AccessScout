import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { Socket } from 'node:net';

export interface FixtureServer {
  url: string;
  close: () => Promise<void>;
}

export const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

/**
 * Starts a minimal, secure local HTTP server serving a fixture site directory.
 * Bound to 127.0.0.1 on port 0 (OS assigned ephemeral port).
 */
export async function startFixtureServer(siteName: string): Promise<FixtureServer> {
  const fixtureRoot = path.resolve(process.cwd(), 'fixtures', 'sites', siteName);

  if (!fs.existsSync(fixtureRoot)) {
    throw new Error(`Fixture site directory does not exist: ${fixtureRoot}`);
  }

  // Ensure root ends with separator for strict prefix boundary checking
  const normalizedRoot = fixtureRoot.endsWith(path.sep) ? fixtureRoot : fixtureRoot + path.sep;

  const sockets = new Set<Socket>();

  const server = http.createServer((req, res) => {
    // Only allow GET and HEAD methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        Allow: 'GET, HEAD',
      });
      res.end('Method Not Allowed');
      return;
    }

    const rawUrl = req.url ?? '/';

    // Immediate rejection for null bytes in raw URL
    if (rawUrl.includes('\0')) {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Bad Request: Null Byte Detected');
      return;
    }

    let decodedPathname: string;
    try {
      const parsedUrl = new URL(rawUrl, 'http://127.0.0.1');
      decodedPathname = decodeURIComponent(parsedUrl.pathname);
    } catch {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Bad Request: Malformed URI');
      return;
    }

    // Check again for null bytes post-decoding
    if (decodedPathname.includes('\0')) {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Bad Request: Null Byte Detected');
      return;
    }

    // Map '/' or empty path to 'index.html'
    const targetRelative =
      decodedPathname === '/' || decodedPathname === ''
        ? 'index.html'
        : decodedPathname.replace(/^\/+/, '');

    const resolvedFilePath = path.resolve(fixtureRoot, targetRelative);

    // Strict boundary defense: path must be inside fixtureRoot or equal to it
    const isWithinBoundary =
      resolvedFilePath === fixtureRoot || resolvedFilePath.startsWith(normalizedRoot);

    if (!isWithinBoundary) {
      res.writeHead(403, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Forbidden: Access Outside Fixture Root');
      return;
    }

    let filePathToServe = resolvedFilePath;
    try {
      const stats = fs.statSync(filePathToServe);
      if (stats.isDirectory()) {
        filePathToServe = path.join(filePathToServe, 'index.html');
        if (!fs.existsSync(filePathToServe)) {
          res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end('Not Found');
          return;
        }
      }
    } catch {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePathToServe).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePathToServe);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });

      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    } catch {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Internal Server Error');
    }
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return new Promise<FixtureServer>((resolve, reject) => {
    server.on('error', (err) => {
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to obtain server address'));
        return;
      }

      const port = address.port;
      const url = `http://127.0.0.1:${port}/`;

      const close = async (): Promise<void> => {
        return new Promise<void>((resClose, rejClose) => {
          // Close idle and all active connections if supported
          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }

          // Destroy any tracked lingering sockets
          for (const socket of sockets) {
            socket.destroy();
          }
          sockets.clear();

          server.close((err) => {
            if (err) {
              rejClose(err);
            } else {
              resClose();
            }
          });
        });
      };

      resolve({ url, close });
    });
  });
}
