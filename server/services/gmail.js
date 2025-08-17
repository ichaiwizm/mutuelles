import { google } from 'googleapis';
import { oauth2Client } from '../config/oauth.js';
import { MessageExtractor } from '../utils/message-extractor.js';
import { ParsingService } from './parsing.js';
import logger from '../logger.js';
import { DeduplicationService } from './deduplication.js';

export class GmailService {
  constructor() {
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async getMessages(days = 30) {
    try {
      const query = `newer_than:${days}d`;
      
      logger.info(`Fetching Gmail messages for ${days} days`);
      
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100
      });
      
      const messages = messagesResponse.data.messages || [];
      logger.info(`Found ${messages.length} Gmail messages`);
      
      return messages;
    } catch (error) {
      logger.error('Error fetching Gmail messages list:', error);
      throw error;
    }
  }

  async processMessage(messageId) {
    try {
      const fullMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });
      
      const messageData = MessageExtractor.extractGmailContent(fullMessage.data);
      
      const extractedLeads = ParsingService.parseContent(
        messageData.content,
        'gmail',
        messageData.subject,
        messageData.content,
        messageData.date,
        fullMessage.data  // Passer le message original complet
      );
      
      return extractedLeads;
    } catch (error) {
      logger.error(`Error processing Gmail message ${messageId}:`, error);
      return [];
    }
  }

  async extractLeads(days = 30) {
    const messages = await this.getMessages(days);
    const leads = [];
    
    for (const message of messages) {
      const messageLeads = await this.processMessage(message.id);
      leads.push(...messageLeads);
    }
    
    logger.info(`Extracted ${leads.length} leads from Gmail (before deduplication)`);
    
    // Déduplication côté serveur
    const deduplicatedLeads = DeduplicationService.deduplicateLeads(leads);
    
    logger.info(`Gmail extraction completed: ${deduplicatedLeads.length} leads (after deduplication, removed ${leads.length - deduplicatedLeads.length} duplicates)`);
    return deduplicatedLeads;
  }

  async streamExtraction(days, sendEvent) {
    try {
      sendEvent({ phase: 'fetching', message: 'Récupération de la liste des messages...' });
      
      const messages = await this.getMessages(days);
      const total = messages.length;
      const leads = [];
      
      sendEvent({ 
        phase: 'processing', 
        total, 
        current: 0,
        message: `${total} messages à traiter`
      });
      
      for (let i = 0; i < messages.length; i++) {
        sendEvent({ 
          phase: 'processing', 
          total, 
          current: i + 1,
          message: `Traitement message ${i + 1}/${total}`
        });
        
        const messageLeads = await this.processMessage(messages[i].id);
        leads.push(...messageLeads);
      }
      
      // Déduplication côté serveur
      sendEvent({ 
        phase: 'deduplicating', 
        total,
        leads: leads.length,
        message: `Déduplication de ${leads.length} leads...`
      });
      
      const deduplicatedLeads = DeduplicationService.deduplicateLeads(leads);
      
      sendEvent({ 
        phase: 'completed', 
        total,
        leads: deduplicatedLeads.length,
        duplicatesRemoved: leads.length - deduplicatedLeads.length,
        message: 'Extraction terminée'
      });
      
      return deduplicatedLeads;
    } catch (error) {
      logger.error('Error in Gmail stream extraction:', error);
      throw error;
    }
  }
}