const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const PORT = Number(process.env.PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
const sessions = new Map();
const loginAttempts = new Map();
const MAX_BODY = 12 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]\n', 'utf8');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

function readProducts() {
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    return Array.isArray(products) ? products : [];
  } catch {
    return [];
  }
}

function saveProducts(products) {
  const temp = `${PRODUCTS_FILE}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, PRODUCTS_FILE);
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((pair) => pair.length === 2));
}

function authorized(req) {
  const token = parseCookies(req.headers.cookie).taf_admin;
  const session = token && sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.created > 8 * 60 * 60 * 1000) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request is too large. Product images must be under 8 MB.'));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('Invalid JSON request.')); }
    });
    req.on('error', reject);
  });
}

function slug(text) {
  return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54) || 'portrait';
}

function storeImage(dataUrl) {
  if (!dataUrl) return '';
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Upload a JPG, PNG or WebP image.');
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 8 * 1024 * 1024) throw new Error('Product images must be under 8 MB.');
  const signatures = {
    jpeg: image[0] === 0xff && image[1] === 0xd8,
    png: image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    webp: image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP'
  };
  if (!signatures[match[1]]) throw new Error('The uploaded file does not match its image type.');
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const filename = `${crypto.randomBytes(12).toString('hex')}.${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), image, { flag: 'wx' });
  return `/uploads/${filename}`;
}

function serveFile(res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { res.writeHead(400); res.end('Bad path'); return; }
  let relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  if (relative === 'admin') relative = 'admin.html';
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return;
  }
  const type = mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;
  try {
    if (req.method === 'GET' && route === '/api/products') {
      return json(res, 200, readProducts().filter((product) => product.active !== false));
    }
    if (req.method === 'POST' && route === '/api/admin/login') {
      const ip = req.socket.remoteAddress || 'local';
      const attempt = loginAttempts.get(ip) || { count: 0, until: 0 };
      if (attempt.until > Date.now()) return json(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
      const body = await readBody(req);
      const expected = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
      const actual = crypto.createHash('sha256').update(String(body.password || '')).digest();
      if (!crypto.timingSafeEqual(expected, actual)) {
        attempt.count += 1;
        if (attempt.count >= 5) { attempt.count = 0; attempt.until = Date.now() + 60_000; }
        loginAttempts.set(ip, attempt);
        return json(res, 401, { error: 'That password does not match.' });
      }
      loginAttempts.delete(ip);
      const token = crypto.randomBytes(32).toString('base64url');
      sessions.set(token, { created: Date.now() });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': `taf_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.method === 'POST' && route === '/api/admin/logout') {
      const token = parseCookies(req.headers.cookie).taf_admin;
      if (token) sessions.delete(token);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'taf_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      return res.end('{"ok":true}');
    }
    if (route.startsWith('/api/admin/')) {
      if (!authorized(req)) return json(res, 401, { error: 'Please sign in to manage products.' });
      if (req.method === 'GET' && route === '/api/admin/products') return json(res, 200, readProducts());
      if (req.method === 'POST' && route === '/api/admin/products') {
        const body = await readBody(req);
        const name = String(body.name || '').trim().slice(0, 100);
        if (!name) return json(res, 400, { error: 'Product name is required.' });
        const price = body.price === '' || body.price == null ? null : Number(body.price);
        const stock = body.stock === '' || body.stock == null ? null : Number(body.stock);
        if (price !== null && (!Number.isFinite(price) || price < 0)) return json(res, 400, { error: 'Price must be a valid non-negative amount.' });
        if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return json(res, 400, { error: 'Stock must be a whole number, or leave it blank for made to order.' });
        const products = readProducts();
        const existing = body.id ? products.find((p) => p.id === body.id) : null;
        let image = String(body.image || '').trim().slice(0, 500);
        if (body.imageData) image = storeImage(body.imageData);
        if (!image && existing) image = existing.image || '';
        if (!image && !existing) return json(res, 400, { error: 'Add a product image or image URL.' });
        const product = {
          id: existing ? existing.id : `${slug(name)}-${crypto.randomBytes(3).toString('hex')}`,
          name, category: String(body.category || 'CUSTOM PORTRAIT').trim().slice(0, 60),
          description: String(body.description || '').trim().slice(0, 500), image,
          price, stock, active: body.active !== false
        };
        if (existing) products[products.indexOf(existing)] = product;
        else products.unshift(product);
        saveProducts(products);
        return json(res, 200, product);
      }
      const deleteMatch = route.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/i);
      if (req.method === 'DELETE' && deleteMatch) {
        const products = readProducts();
        const remaining = products.filter((product) => product.id !== deleteMatch[1]);
        if (remaining.length === products.length) return json(res, 404, { error: 'Product not found.' });
        saveProducts(remaining);
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'Admin endpoint not found.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    return serveFile(res, route);
  } catch (error) {
    if (!res.headersSent) json(res, 400, { error: error.message || 'Request could not be completed.' });
    else res.destroy();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`The Art Factory is running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Temporary admin password: ${ADMIN_PASSWORD}`);
  else console.log('Admin password loaded from ADMIN_PASSWORD environment variable.');
});

