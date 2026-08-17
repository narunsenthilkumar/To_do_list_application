const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5174;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const normalizedPath = decodeURIComponent(urlPath);

  // 1. Direct file check
  const directPath = path.join(DIST_DIR, normalizedPath);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return serveFile(res, directPath);
  }

  // 2. Clean URL html check (e.g. /settings -> /settings.html)
  const htmlPath = path.join(DIST_DIR, normalizedPath + '.html');
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return serveFile(res, htmlPath);
  }

  // 3. Directory index check (e.g. /sync -> /sync/index.html)
  const indexPath = path.join(DIST_DIR, normalizedPath, 'index.html');
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return serveFile(res, indexPath);
  }

  // 4. Dynamic Taskora route rewrites
  if (normalizedPath.startsWith('/task/')) {
    const taskPath = path.join(DIST_DIR, 'task', '[id].html');
    if (fs.existsSync(taskPath)) return serveFile(res, taskPath);
  }

  if (normalizedPath.startsWith('/project/')) {
    const projectPath = path.join(DIST_DIR, 'project', '[id].html');
    if (fs.existsSync(projectPath)) return serveFile(res, projectPath);
  }

  if (normalizedPath === '/today') {
    const todayPath = path.join(DIST_DIR, 'today.html');
    if (fs.existsSync(todayPath)) return serveFile(res, todayPath);
  }

  // 5. SPA Fallback
  const fallbackIndex = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(fallbackIndex)) {
    return serveFile(res, fallbackIndex);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`[Taskora Local Production Server] Running on http://localhost:${PORT}`);
});
