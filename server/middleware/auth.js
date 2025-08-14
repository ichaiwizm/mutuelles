import { oauth2Client } from '../config/oauth.js';
import { TokensService } from '../services/tokens.js';
import logger from '../logger.js';

let cachedTokens = null;

// Charger les tokens au démarrage
export const initAuth = () => {
  cachedTokens = TokensService.load();
  if (cachedTokens) {
    oauth2Client.setCredentials(cachedTokens);
    logger.info('Authentication initialized with cached tokens');
  }
};

// Middleware de vérification d'authentification
export const checkAuth = (req, res, next) => {
  if (!cachedTokens) {
    logger.warn('Authentication required - no tokens');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  oauth2Client.setCredentials(cachedTokens);
  next();
};

// Sauvegarder de nouveaux tokens
export const saveTokens = (tokens) => {
  cachedTokens = tokens;
  oauth2Client.setCredentials(tokens);
  TokensService.save(tokens);
  logger.info('New tokens saved and cached');
};

// Vérifier le statut d'authentification
export const getAuthStatus = () => {
  return {
    authenticated: !!cachedTokens,
    hasTokens: TokensService.exists()
  };
};