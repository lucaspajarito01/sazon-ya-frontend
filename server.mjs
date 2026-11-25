import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.FRONTEND_PORT || 5173);

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
});

export function createStaticServer() {
  return http.createServer((req, res) => {
    const cleanUrl = (req.url || '/').split('?')[0];
    let relativePath = cleanUrl === '/' ? '/index.html' : cleanUrl;

    // Prevenir directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    let fullPath = path.join(__dirname, safePath);

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain; charset=utf-8';

    fs.readFile(fullPath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error interno al servir archivo estático.');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const server = createStaticServer();
  server.listen(PORT, () => {
    console.log(`[SazónYA Frontend Vanilla] Servidor estático activo en http://localhost:${PORT}`);
  });
}
