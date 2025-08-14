import express from 'express';
import { checkAuth } from '../middleware/auth.js';
import { GmailService } from '../services/gmail.js';
import logger from '../logger.js';

const router = express.Router();

// Helper pour setup SSE
const setupSSE = (res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  return (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
};

// SSE Gmail
router.get('/gmail/stream', checkAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const sendEvent = setupSSE(res);
  
  logger.info(`Starting Gmail SSE extraction for ${days} days`);
  
  try {
    const gmailService = new GmailService();
    const leads = await gmailService.streamExtraction(days, sendEvent);
    
    // Envoyer les données finales
    res.write(`data: ${JSON.stringify({ type: 'final', leads })}\n\n`);
    res.end();
    
    logger.info(`Gmail SSE extraction completed: ${leads.length} leads`);
  } catch (error) {
    logger.error('Error in Gmail SSE:', error);
    sendEvent({ phase: 'error', message: 'Erreur lors de l\'extraction Gmail' });
    res.end();
  }
});


export default router;