import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { MessageExtractor } from '../utils/message-extractor.js';
import { ParserOrchestrator } from '../services/parsers/ParserOrchestrator.js';
import config from './config.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailParser {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      successfullyParsed: 0,
      failedToParse: 0,
      totalLeadsExtracted: 0,
      parserUsage: {}
    };
  }

  async parseAllEmails() {
    try {
      console.log('🔍 Recherche des emails à parser...\n');
      
      // Lire tous les fichiers JSON dans le dossier mails
      const files = await fs.readdir(config.outputDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('summary'));
      
      if (jsonFiles.length === 0) {
        console.log('❌ Aucun fichier email trouvé. Lancez d\'abord fetch-emails.js');
        return;
      }
      
      console.log(`📧 ${jsonFiles.length} emails à parser\n`);
      
      const allResults = [];
      
      for (let i = 0; i < jsonFiles.length; i++) {
        const fileName = jsonFiles[i];
        console.log(`⏳ Parsing ${i + 1}/${jsonFiles.length}: ${fileName}`);
        
        try {
          const result = await this.parseEmailFile(fileName);
          allResults.push(result);
          
          if (result.success) {
            console.log(`   ✅ Parser: ${result.parserUsed} - ${result.leads.length} lead(s) extrait(s)`);
          } else {
            console.log(`   ⚠️  Aucun lead extrait`);
          }
        } catch (error) {
          console.error(`   ❌ Erreur:`, error.message);
          this.stats.failedToParse++;
        }
      }
      
      // Sauvegarder les résultats
      await this.saveResults(allResults);
      
      // Afficher les statistiques
      this.displayStats();
      
      return allResults;
      
    } catch (error) {
      console.error('❌ Erreur lors du parsing:', error);
      logger.error('Parse error:', error);
      throw error;
    }
  }

  async parseEmailFile(fileName) {
    const filePath = path.join(config.outputDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    const emailData = JSON.parse(content);
    
    this.stats.totalProcessed++;
    
    // Extraire le contenu avec MessageExtractor
    const extractedContent = MessageExtractor.extractGmailContent({
      payload: emailData.payload
    });
    
    // Parser le contenu avec ParserOrchestrator
    let parseResult;
    
    // Pour Assurlead, essayer le parsing direct avec le message original
    if (extractedContent.content.includes('assurland') || extractedContent.subject.includes('assurlead')) {
      const AssurleadParser = (await import('../services/parsers/AssurleadParser.js')).AssurleadParser;
      if (AssurleadParser.canParse(extractedContent.content)) {
        try {
          const leadData = AssurleadParser.parse(extractedContent.content, emailData);
          const score = AssurleadParser.calculateScore(leadData);
          
          parseResult = {
            success: true,
            leads: score >= 1 ? [{
              id: uuidv4(),
              data: leadData,
              parser: 'AssurleadParser',
              score: score,
              source: 'gmail',
              subject: extractedContent.subject,
              emailDate: extractedContent.date
            }] : [],
            stats: { parserUsed: 'AssurleadParser' }
          };
        } catch (error) {
          console.log('   🔄 Fallback to ParserOrchestrator');
          parseResult = ParserOrchestrator.parseContentWithDetails(
            extractedContent.content,
            'gmail',
            extractedContent.subject,
            extractedContent.content,
            extractedContent.date
          );
        }
      } else {
        parseResult = ParserOrchestrator.parseContentWithDetails(
          extractedContent.content,
          'gmail',
          extractedContent.subject,
          extractedContent.content,
          extractedContent.date
        );
      }
    } else {
      parseResult = ParserOrchestrator.parseContentWithDetails(
        extractedContent.content,
        'gmail',
        extractedContent.subject,
        extractedContent.content,
        extractedContent.date
      );
    }
    
    // Enrichir avec les métadonnées de l'email
    const enrichedResult = {
      ...parseResult,
      emailId: emailData.metadata.id,
      emailMetadata: emailData.metadata,
      fileName,
      extractedContent: {
        subject: extractedContent.subject,
        date: extractedContent.date,
        contentLength: extractedContent.content.length
      }
    };
    
    // Mettre à jour les statistiques
    if (parseResult.success && parseResult.leads.length > 0) {
      this.stats.successfullyParsed++;
      this.stats.totalLeadsExtracted += parseResult.leads.length;
      
      const parserName = parseResult.stats.parserUsed || 'unknown';
      this.stats.parserUsage[parserName] = (this.stats.parserUsage[parserName] || 0) + 1;
    }
    
    // Enrichir chaque lead avec les infos de l'email source
    enrichedResult.leads = parseResult.leads.map(lead => ({
      ...lead,
      source: {
        type: 'gmail',
        emailId: emailData.metadata.id,
        subject: extractedContent.subject,
        from: emailData.metadata.from,
        date: emailData.metadata.date,
        fileName
      }
    }));
    
    return enrichedResult;
  }

  async saveResults(results) {
    // Sauvegarder tous les résultats dans un fichier unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = `parsed_results_${timestamp}.json`;
    const outputPath = path.join(config.parsedDir, outputFileName);
    
    const output = {
      parseDate: new Date().toISOString(),
      stats: this.stats,
      results: results.map(r => ({
        emailId: r.emailId,
        fileName: r.fileName,
        subject: r.emailMetadata.subject,
        from: r.emailMetadata.from,
        date: r.emailMetadata.date,
        success: r.success,
        parserUsed: r.stats?.parserUsed,
        processingTime: r.stats?.processingTime,
        leadsCount: r.leads.length,
        leads: r.leads,
        errors: r.errors,
        warnings: r.warnings
      }))
    };
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n💾 Résultats sauvegardés dans: ${outputFileName}`);
    
    // Sauvegarder aussi les leads dans un fichier séparé pour faciliter l'import
    if (this.stats.totalLeadsExtracted > 0) {
      const leadsFileName = `leads_${timestamp}.json`;
      const leadsPath = path.join(config.parsedDir, leadsFileName);
      
      const allLeads = results.flatMap(r => r.leads);
      await fs.writeFile(leadsPath, JSON.stringify(allLeads, null, 2), 'utf-8');
      console.log(`💾 Leads extraits sauvegardés dans: ${leadsFileName}`);
    }
    
    return outputPath;
  }

  displayStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 STATISTIQUES DE PARSING');
    console.log('='.repeat(50));
    console.log(`Total d'emails traités: ${this.stats.totalProcessed}`);
    console.log(`Emails avec leads: ${this.stats.successfullyParsed}`);
    console.log(`Emails sans leads: ${this.stats.totalProcessed - this.stats.successfullyParsed}`);
    console.log(`Total de leads extraits: ${this.stats.totalLeadsExtracted}`);
    
    if (Object.keys(this.stats.parserUsage).length > 0) {
      console.log('\nUtilisation des parsers:');
      for (const [parser, count] of Object.entries(this.stats.parserUsage)) {
        console.log(`  - ${parser}: ${count} email(s)`);
      }
    }
    
    if (this.stats.successfullyParsed > 0) {
      const avgLeadsPerEmail = (this.stats.totalLeadsExtracted / this.stats.successfullyParsed).toFixed(2);
      console.log(`\nMoyenne de leads par email: ${avgLeadsPerEmail}`);
    }
    
    console.log('='.repeat(50));
  }

  async analyzeParsers() {
    console.log('\n🔬 Analyse des parsers disponibles...\n');
    
    const parsers = ParserOrchestrator.parsers;
    console.log(`Parsers disponibles: ${parsers.map(p => p.name).join(', ')}\n`);
    
    // Tester chaque parser sur un échantillon
    const files = await fs.readdir(config.outputDir);
    const sampleFile = files.find(f => f.endsWith('.json') && !f.includes('summary'));
    
    if (sampleFile) {
      const filePath = path.join(config.outputDir, sampleFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const emailData = JSON.parse(content);
      
      const extractedContent = MessageExtractor.extractGmailContent({
        payload: emailData.payload
      });
      
      console.log('Test sur l\'email:', emailData.metadata.subject);
      console.log('Contenu (100 premiers caractères):', extractedContent.content.substring(0, 100));
      console.log('\nRésultats par parser:');
      
      for (const Parser of parsers) {
        const canHandle = Parser.canParse ? Parser.canParse(extractedContent.content, extractedContent.subject) : false;
        console.log(`  - ${Parser.name}: ${canHandle ? '✅ Peut traiter' : '❌ Ne peut pas traiter'}`);
        
        if (canHandle && config.debug) {
          try {
            const result = Parser.parse(extractedContent.content, extractedContent.subject);
            const leadsCount = Array.isArray(result) ? result.length : (result ? 1 : 0);
            console.log(`    → ${leadsCount} lead(s) extrait(s)`);
          } catch (error) {
            console.log(`    → Erreur: ${error.message}`);
          }
        }
      }
    }
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage du parsing des emails...\n');
  
  const parser = new EmailParser();
  
  try {
    // Analyser les parsers si en mode debug
    if (config.debug) {
      await parser.analyzeParsers();
    }
    
    // Parser tous les emails
    await parser.parseAllEmails();
    
    console.log('\n✨ Parsing terminé!');
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

export { EmailParser };