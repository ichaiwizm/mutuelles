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
      
      logger.info(`[GMAIL] Fetching Gmail messages for ${days} days`);
      logger.info(`[GMAIL] About to call Gmail API...`);
      
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500
      });
      
      const messages = messagesResponse.data.messages || [];
      logger.info(`Found ${messages.length} Gmail messages`);
      
      return messages;
    } catch (error) {
      logger.error(`[GMAIL ERROR] Error fetching Gmail messages list: ${error.message}`);
      logger.error(`[GMAIL ERROR] Full error:`, error);
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
    
    const BATCH_SIZE = 10;
    logger.info(`Processing ${messages.length} messages in batches of ${BATCH_SIZE}`);
    
    // Traitement par batch parallèle
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      
      try {
        const batchPromises = batch.map(message => 
          this.processMessage(message.id).catch(error => {
            logger.error(`Error processing message ${message.id}:`, error);
            return [];
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        leads.push(...batchResults.flat());
        
        logger.info(`Processed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(messages.length/BATCH_SIZE)} (${i + batch.length}/${messages.length} messages)`);
        
      } catch (error) {
        logger.error(`Error processing batch starting at ${i}:`, error);
      }
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
      
      const BATCH_SIZE = 10; // Traiter 10 messages en parallèle
      let processedCount = 0;

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        const batchEnd = Math.min(processedCount + batch.length, total);
        
        sendEvent({ 
          phase: 'processing', 
          total, 
          current: processedCount,
          message: `Traitement messages ${processedCount + 1}-${batchEnd}/${total} (batch parallèle)`
        });
        
        try {
          // Traiter tous les messages du batch en parallèle
          const batchPromises = batch.map(message => 
            this.processMessage(message.id).catch(error => {
              logger.error(`Error processing message ${message.id}:`, error);
              return []; // Retourner un tableau vide en cas d'erreur sur un message
            })
          );
          
          const batchResults = await Promise.all(batchPromises);
          leads.push(...batchResults.flat());
          
          processedCount += batch.length;
          
          // Envoyer une mise à jour après chaque batch
          sendEvent({ 
            phase: 'processing', 
            total, 
            current: processedCount,
            message: `${processedCount}/${total} messages traités`
          });
          
        } catch (error) {
          logger.error(`Error processing batch starting at ${i}:`, error);
          processedCount += batch.length; // Continue même en cas d'erreur du batch
        }
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