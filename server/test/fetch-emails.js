import { google } from 'googleapis';
import { oauth2Client } from '../config/oauth.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import logger from '../logger.js';
import { requireAuth } from './auth-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailFetcher {
  constructor() {
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async ensureDirectories() {
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(config.parsedDir, { recursive: true });
  }

  async fetchEmails() {
    try {
      await this.ensureDirectories();
      
      // Construire la query
      let query = `newer_than:${config.days}d`;
      if (config.query) {
        query += ` ${config.query}`;
      }
      
      logger.info(`Fetching emails with query: ${query}`);
      console.log(`🔍 Récupération des emails des ${config.days} derniers jours...`);
      
      // Récupérer la liste des messages
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: config.maxResults,
        ...(config.labels.length > 0 && { labelIds: config.labels })
      });
      
      const messages = response.data.messages || [];
      console.log(`📧 ${messages.length} emails trouvés`);
      
      if (messages.length === 0) {
        console.log('Aucun email trouvé pour cette période');
        return [];
      }
      
      // Récupérer le détail de chaque message
      const savedFiles = [];
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        console.log(`⏳ Traitement ${i + 1}/${messages.length} - ID: ${message.id}`);
        
        try {
          const savedFile = await this.fetchAndSaveMessage(message.id);
          savedFiles.push(savedFile);
          console.log(`   ✅ Sauvegardé: ${savedFile.jsonFile}`);
        } catch (error) {
          console.error(`   ❌ Erreur pour le message ${message.id}:`, error.message);
          logger.error(`Failed to fetch message ${message.id}:`, error);
        }
      }
      
      console.log(`\n✨ Terminé! ${savedFiles.length} emails sauvegardés dans ${config.outputDir}`);
      return savedFiles;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des emails:', error);
      logger.error('Email fetch error:', error);
      throw error;
    }
  }

  async fetchAndSaveMessage(messageId) {
    // Récupérer le message complet
    const fullMessage = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    const messageData = fullMessage.data;
    const timestamp = Date.now();
    
    // Générer les noms de fichiers
    const baseFileName = config.fileFormat
      .replace('{timestamp}', timestamp)
      .replace('{id}', messageId);
    
    const jsonFileName = `${baseFileName}.json`;
    const htmlFileName = `${baseFileName}.html`;
    
    const jsonFilePath = path.join(config.outputDir, jsonFileName);
    const htmlFilePath = path.join(config.outputDir, htmlFileName);
    
    // Extraire les métadonnées importantes
    const headers = messageData.payload?.headers || [];
    const metadata = {
      id: messageId,
      threadId: messageData.threadId,
      timestamp,
      fetchedAt: new Date().toISOString(),
      subject: headers.find(h => h.name === 'Subject')?.value || '',
      from: headers.find(h => h.name === 'From')?.value || '',
      to: headers.find(h => h.name === 'To')?.value || '',
      date: headers.find(h => h.name === 'Date')?.value || '',
      labels: messageData.labelIds || []
    };
    
    // Sauvegarder le payload complet en JSON
    const fullData = {
      metadata,
      payload: messageData.payload,
      snippet: messageData.snippet,
      sizeEstimate: messageData.sizeEstimate,
      historyId: messageData.historyId,
      internalDate: messageData.internalDate
    };
    
    await fs.writeFile(jsonFilePath, JSON.stringify(fullData, null, 2), 'utf-8');
    
    // Extraire et sauvegarder le HTML brut si demandé
    if (config.saveHtmlSeparately) {
      const htmlContent = this.extractHtmlContent(messageData.payload);
      if (htmlContent) {
        await fs.writeFile(htmlFilePath, htmlContent, 'utf-8');
      }
    }
    
    return {
      messageId,
      jsonFile: jsonFileName,
      htmlFile: config.saveHtmlSeparately && this.extractHtmlContent(messageData.payload) ? htmlFileName : null,
      metadata
    };
  }

  extractHtmlContent(payload) {
    if (!payload) return null;
    
    // Vérifier le corps direct
    if (payload.body?.data && payload.mimeType === 'text/html') {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    // Parcourir les parts pour trouver le HTML
    if (payload.parts) {
      return this.extractHtmlFromParts(payload.parts);
    }
    
    return null;
  }

  extractHtmlFromParts(parts) {
    for (const part of parts) {
      // Priorité au HTML
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      
      // Récursion si multipart
      if (part.parts) {
        const html = this.extractHtmlFromParts(part.parts);
        if (html) return html;
      }
    }
    
    // Si pas de HTML, chercher text/plain
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Convertir le texte en HTML basique
        return `<pre>${text}</pre>`;
      }
    }
    
    return null;
  }

  async createSummary(savedFiles) {
    const summary = {
      fetchDate: new Date().toISOString(),
      config: {
        days: config.days,
        maxResults: config.maxResults,
        query: config.query
      },
      totalEmails: savedFiles.length,
      emails: savedFiles.map(f => ({
        id: f.messageId,
        subject: f.metadata.subject,
        from: f.metadata.from,
        date: f.metadata.date,
        files: {
          json: f.jsonFile,
          html: f.htmlFile
        }
      }))
    };
    
    const summaryPath = path.join(config.outputDir, 'fetch-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    
    console.log(`\n📊 Résumé sauvegardé dans: fetch-summary.json`);
    return summary;
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage de la récupération des emails...\n');
  
  // Vérifier l'authentification
  await requireAuth();
  
  const fetcher = new EmailFetcher();
  
  try {
    const savedFiles = await fetcher.fetchEmails();
    
    if (savedFiles.length > 0) {
      await fetcher.createSummary(savedFiles);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Gérer l'import direct
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { EmailFetcher };