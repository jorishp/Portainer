import { createHash, timingSafeEqual } from 'crypto';
import type { RequestHandler } from 'express';

export type AccessConfig = { username: string; password: string; origin?: string };

export function validateLiveConfiguration(provider: string, username: string | undefined,
  password: string | undefined, access: AccessConfig): void {
  if (!['mock', 'honeywell', 'mqtt'].includes(provider)) {
    throw new Error('HEATING_PROVIDER must be mock, honeywell or mqtt');
  }
  if (provider === 'honeywell' && (!username || !password)) {
    throw new Error('Honeywell mode requires HONEYWELL_USERNAME and HONEYWELL_PASSWORD');
  }
  if ((username || password || provider !== 'mock') && !access.password) {
    throw new Error('Configure EVOWEB_WEB_PASSWORD before enabling a live provider or adding cloud credentials');
  }
  if (access.password && (access.password.length < 16 || !access.username || access.username.includes(':'))) {
    throw new Error('Use a web username without a colon and a web password of at least 16 characters');
  }
  if (access.password && access.password === password) {
    throw new Error('Use a separate web password, different from the Honeywell password');
  }
  if (access.origin) {
    const origin = new URL(access.origin);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== access.origin) {
      throw new Error('EVOWEB_PUBLIC_ORIGIN must be an HTTP(S) origin without a path');
    }
  }
}

const same = (a: string, b: string) => timingSafeEqual(
  createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export function webAccess(access: AccessConfig): RequestHandler {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.path.startsWith('/rest/')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      let sameOrigin = !origin;
      if (origin) {
        try {
          const parsed = new URL(origin);
          sameOrigin = parsed.origin === (access.origin || `${req.protocol}://${req.get('host')}`);
        } catch { sameOrigin = false; }
      }
      if (!sameOrigin || req.get('sec-fetch-site') === 'cross-site') {
        res.status(403).json({ error: 'Cross-site writes are not allowed' });
        return;
      }
    }
    if (!access.password) { next(); return; }
    const header = req.get('authorization') || '';
    let valid = false;
    if (header.length < 4096 && /^Basic [A-Za-z0-9+/]+={0,2}$/i.test(header)) {
      const decoded = Buffer.from(header.substring(6), 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      if (colon > 0) {
        const userOk = same(decoded.substring(0, colon), access.username);
        const passwordOk = same(decoded.substring(colon + 1), access.password);
        valid = userOk && passwordOk;
      }
    }
    if (!valid) {
      res.setHeader('WWW-Authenticate', 'Basic realm="evoWeb", charset="UTF-8"');
      res.setHeader('Cache-Control', 'no-store');
      res.status(401).send('Meld je aan met de aparte evoWeb-gebruikersnaam en het webwachtwoord.');
      return;
    }
    next();
  };
}
