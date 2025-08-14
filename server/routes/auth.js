import express from 'express';
import { oauth2Client, SCOPES } from '../config/oauth.js';
import { saveTokens, getAuthStatus } from '../middleware/auth.js';
import logger from '../logger.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

// Démarrage OAuth Google
router.get('/google/start', (req, res) => {
  logger.info('Starting Google OAuth flow');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  res.redirect(authUrl);
});

// Callback OAuth Google
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    logger.error('No authorization code received');
    return res.status(400).send('Authorization code missing');
  }

  try {
    logger.info('Processing OAuth callback');
    
    const { tokens } = await oauth2Client.getToken(code);
    saveTokens(tokens);
    
    logger.info('OAuth flow completed successfully');
    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    logger.error('Error in OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// Statut d'authentification
router.get('/status', (req, res) => {
  const status = getAuthStatus();
  logger.info('Auth status requested:', status);
  res.json(status);
});

export default router;