import { oauth2Client } from '../config/oauth.js';
import logger from '../logger.js';
import { getEncryptedCookie, setEncryptedCookie, clearCookie } from '../utils/secure-cookie.js';

const COOKIE_NAME = process.env.COOKIE_NAME || 'auth';
const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE || '2592000', 10); // 30 jours en secondes
const IS_PROD = process.env.NODE_ENV === 'production';

// Initialisation (stateless)
export const initAuth = () => {
  logger.info('[AUTH INIT] Stateless cookie-based sessions enabled');
  oauth2Client.setCredentials({});
};

// Middleware de vérification d'authentification
export const checkAuth = async (req, res, next) => {
  try {
    const session = getEncryptedCookie(req, COOKIE_NAME);
    if (!session || !session.tokens) {
      oauth2Client.setCredentials({});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    oauth2Client.setCredentials(session.tokens);

    // Tenter un refresh si nécessaire (getAccessToken rafraîchit si besoin)
    try {
      await oauth2Client.getAccessToken();
      const credentials = oauth2Client.credentials;
      if (credentials && credentials.access_token) {
        const newSession = {
          email: session.email,
          tokens: {
            access_token: credentials.access_token,
            refresh_token: session.tokens.refresh_token,
            expiry_date: credentials.expiry_date
          }
        };
        setEncryptedCookie(res, COOKIE_NAME, newSession, {
          httpOnly: true,
          secure: IS_PROD,
          sameSite: IS_PROD ? 'None' : 'Lax',
          maxAgeSeconds: COOKIE_MAX_AGE,
          path: '/'
        });
      }
    } catch (err) {
      logger.warn('[AUTH] Token refresh attempt failed:', err?.message || err);
    }

    next();
  } catch (error) {
    logger.error('[AUTH] checkAuth error:', error);
    return res.status(401).json({ error: 'Not authenticated' });
  }
};

// Définir le cookie d'auth après OAuth
export const setAuthCookie = (res, payload) => {
  setEncryptedCookie(res, COOKIE_NAME, payload, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'None' : 'Lax',
    maxAgeSeconds: COOKIE_MAX_AGE,
    path: '/'
  });
};

export const clearAuth = (res) => {
  clearCookie(res, COOKIE_NAME, { path: '/' });
};

export const getAuthStatusFromRequest = (req) => {
  try {
    const session = getEncryptedCookie(req, COOKIE_NAME);
    if (session && session.email) {
      return { authenticated: true, email: session.email };
    }
    return { authenticated: false };
  } catch (_) {
    return { authenticated: false };
  }
};
