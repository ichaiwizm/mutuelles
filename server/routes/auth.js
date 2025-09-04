import express from 'express';
import { oauth2Client, SCOPES } from '../config/oauth.js';
import { setAuthCookie, getAuthStatusFromRequest, clearAuth } from '../middleware/auth.js';
import logger from '../logger.js';
import { google } from 'googleapis';

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
    oauth2Client.setCredentials(tokens);

    // Récupérer l'email utilisateur
    let email = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const me = await oauth2.userinfo.get();
      email = me.data.email || null;
    } catch (e) {
      logger.warn('Failed to fetch user email:', e?.message || e);
    }

    // Placer tokens + email dans un cookie chiffré (stateless)
    setAuthCookie(res, {
      email,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });

    logger.info('OAuth flow completed successfully for', email || 'unknown');
    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    logger.error('Error in OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// Statut d'authentification
router.get('/status', (req, res) => {
  const status = getAuthStatusFromRequest(req);
  logger.info('Auth status requested:', status);
  res.json(status);
});

// Déconnexion
router.post('/logout', (req, res) => {
  try {
    clearAuth(res);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// Déconnexion
router.post('/logout', (req, res) => {
  try {
    logger.info('User logout requested');
    
    // Effacer les tokens stockés
    saveTokens(null);
    
    logger.info('User logged out successfully');
    res.json({ 
      success: true, 
      message: 'Déconnexion réussie',
      authenticated: false,
      hasTokens: false
    });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la déconnexion' 
    });
  }
});

export default router;
