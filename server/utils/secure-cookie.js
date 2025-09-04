import crypto from 'crypto';

function getKey() {
  const secret = process.env.SESSION_SECRET || 'development-insecure-secret-change-me';
  // Dériver une clé 32 octets (AES-256) via SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('='));
  });
  return out;
}

export function serializeCookie(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAgeSeconds) str += `; Max-Age=${opts.maxAgeSeconds}`;
  if (opts.domain) str += `; Domain=${opts.domain}`;
  str += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly) str += '; HttpOnly';
  if (opts.secure) str += '; Secure';
  str += `; SameSite=${opts.sameSite || 'Lax'}`;
  return str;
}

export function setEncryptedCookie(res, name, data, opts = {}) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM 96-bit IV
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  const cookie = serializeCookie(name, payload, opts);
  res.setHeader('Set-Cookie', cookie);
}

export function getEncryptedCookie(req, name) {
  const cookies = parseCookies(req);
  const b64 = cookies[name];
  if (!b64) return null;
  const raw = Buffer.from(b64, 'base64');
  if (raw.length < 12 + 16 + 1) return null;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  const json = decrypted.toString('utf8');
  return JSON.parse(json);
}

export function clearCookie(res, name, opts = {}) {
  const cookie = serializeCookie(name, '', { ...opts, maxAgeSeconds: 0 });
  res.setHeader('Set-Cookie', cookie);
}

