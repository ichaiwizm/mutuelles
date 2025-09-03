import { oauth2Client } from '../config/oauth.js';
import { TokensService } from '../services/tokens.js';
import logger from '../logger.js';

let cachedTokens = null;

// Charger les tokens au démarrage
export const initAuth = () => {
  cachedTokens = TokensService.load();
  logger.info(`[AUTH INIT] cachedTokens: ${cachedTokens ? 'EXISTS' : 'NULL'}`);
  if (cachedTokens) {
    oauth2Client.setCredentials(cachedTokens);
    logger.info('Authentication initialized with cached tokens');
  } else {
    logger.info('[AUTH INIT] No tokens found, clearing oauth2Client credentials');
    oauth2Client.setCredentials({});
  }
};

// Middleware de vérification d'authentification
export const checkAuth = (req, res, next) => {
  logger.info(`[CHECK AUTH] cachedTokens: ${cachedTokens ? 'EXISTS' : 'NULL'}, path: ${req.path}`);
  
  if (!cachedTokens) {
    // IMPORTANT: Vider complètement les credentials pour éviter d'utiliser des tokens expirés en cache
    oauth2Client.setCredentials({});
    logger.warn('[CHECK AUTH] Authentication required - no tokens, clearing credentials');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  logger.info('[CHECK AUTH] Setting credentials and proceeding');
  oauth2Client.setCredentials(cachedTokens);
  next();
};

// Sauvegarder de nouveaux tokens
export const saveTokens = (tokens) => {
  cachedTokens = tokens;
  if (tokens === null) {
    // Effacer les credentials OAuth2 lors de la déconnexion
    oauth2Client.setCredentials({});
    logger.info('Tokens cleared and OAuth2 credentials reset');
  } else {
    oauth2Client.setCredentials(tokens);
    logger.info('New tokens saved and cached');
  }
  TokensService.save(tokens);
};

// Vérifier le statut d'authentification
export const getAuthStatus = () => {
  const status = {
    authenticated: !!cachedTokens,
    hasTokens: TokensService.exists()
  };
  logger.info(`[GET AUTH STATUS] authenticated: ${status.authenticated}, hasTokens: ${status.hasTokens}`);
  return status;
};