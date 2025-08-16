import { AssurProspectParser } from './AssurProspectParser.js';
import { AssurleadParser } from './AssurleadParser.js';
import { GenericParser } from './GenericParser.js';
import { BaseParser } from './BaseParser.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../logger.js';

export class ParserOrchestrator {
  static parsers = [
    AssurProspectParser,
    AssurleadParser,  // Parser spécifique pour Assurlead
    GenericParser  // Toujours en dernier (fallback)
  ];

  static parseContent(content, source, subject = '', fullContent = null, emailDate = null) {
    
    const leads = [];
    
    // Normaliser le contenu
    const normalizedContent = BaseParser.normalizeContent(content);
    
    // Trouver le parser approprié
    let selectedParser = null;
    logger.info('Starting parser selection', { available_parsers: this.parsers.map(p => p.name) });
    
    for (const parser of this.parsers) {
      logger.info('Testing parser', { parser_name: parser.name });
      const canParse = parser.canParse(normalizedContent);
      logger.info('Parser test result', { parser_name: parser.name, can_parse: canParse });
      
      if (canParse) {
        selectedParser = parser;
        logger.info('Parser selected', { parser_name: parser.name });
        break;
      }
    }

    if (!selectedParser) {
      logger.warn('No parser found for content', { 
        content_length: content.length,
        content_preview: content.substring(0, 200)
      });
      return [];
    }

    // Extraire les données
    const extractedData = selectedParser.parse(normalizedContent);
    
    // Calculer le score
    const score = selectedParser.calculateScore(extractedData);
    
    // Si le score est suffisant, créer un lead
    if (score >= 1) {
      const lead = {
        id: uuidv4(),
        contact: extractedData.contact || {},
        souscripteur: extractedData.souscripteur || {},
        conjoint: extractedData.conjoint,
        enfants: extractedData.enfants || [],
        besoins: extractedData.besoins || {},
        source,
        extractedAt: new Date().toISOString(),
        rawSnippet: selectedParser.createSnippet(normalizedContent, extractedData),
        fullContent: fullContent || content,
        emailSubject: subject,
        emailDate: emailDate,
        score,
        isDuplicate: false,
        notes: {
          parserUsed: selectedParser.name,
          extractionDetails: {
            hasContact: Object.keys(extractedData.contact).length > 0,
            hasSouscripteur: Object.keys(extractedData.souscripteur).length > 0,
            hasConjoint: !!extractedData.conjoint,
            enfantsCount: extractedData.enfants.length,
            hasBesoins: Object.keys(extractedData.besoins).length > 0
          }
        }
      };
      
      logger.info('Lead created successfully', { id: lead.id, score: lead.score, parser: selectedParser.name });
      
      leads.push(lead);
    } else {
      logger.info('Lead not created - insufficient score', { score, minimum: 1 });
    }
    
    logger.info('Parsing completed', { leads_created: leads.length });
    
    return leads;
  }

  static getAvailableParsers() {
    return this.parsers.map(parser => ({
      name: parser.name,
      description: parser.description || 'Aucune description'
    }));
  }
}