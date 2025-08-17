import express from 'express';
import { checkAuth } from '../middleware/auth.js';
import { GmailService } from '../services/gmail.js';
import { ParsingService } from '../services/parsing.js';
import logger from '../logger.js';

const router = express.Router();

// Route Gmail classique
router.post('/gmail', checkAuth, async (req, res) => {
  const { days = 30 } = req.body;
  
  logger.info(`Starting Gmail extraction for ${days} days`);
  
  try {
    const gmailService = new GmailService();
    const leads = await gmailService.extractLeads(days);
    
    logger.info(`Gmail extraction completed: ${leads.length} leads`);
    res.json(leads);
  } catch (error) {
    logger.error('Error in Gmail extraction:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
});

// Route de parsing individuel avec routeur intelligent
router.post('/parse', checkAuth, async (req, res) => {
  const { content, subject, date, from, sourceHint, originalMessage } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  logger.info('Individual parsing request received', {
    contentLength: content.length,
    subject: subject?.substring(0, 50),
    from: from?.substring(0, 50),
    sourceHint,
    hasOriginalMessage: !!originalMessage
  });
  
  try {
    // Import du routeur de parsing
    const { routeAndParseEmail } = await import('../services/parsers/router.js');
    
    // Utiliser le routeur intelligent
    const result = routeAndParseEmail({
      content,
      subject: subject || '',
      date: date || new Date().toISOString(),
      from: from || '',
      sourceHint: sourceHint || '',
      originalMessage: originalMessage || null
    });
    
    logger.info('Individual parsing completed successfully', {
      parser: result.parsingDetails?.notes?.parserUsed,
      score: result.parsingDetails?.score
    });
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in individual parsing:', error);
    res.status(500).json({ error: 'Failed to parse content', details: error.message });
  }
});

export default router;