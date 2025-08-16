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
    console.log('🚀 ==================== DÉBUT PARSING ====================');
    console.log('🚀 Source:', source);
    console.log('🚀 Sujet:', subject);
    console.log('🚀 Date email:', emailDate);
    console.log('🚀 Contenu (premiers 300 chars):', content.substring(0, 300) + '...');
    console.log('🚀 ========================================================');
    
    const leads = [];
    
    // Normaliser le contenu
    const normalizedContent = BaseParser.normalizeContent(content);
    console.log('🔧 Contenu normalisé (premiers 300 chars):', normalizedContent.substring(0, 300) + '...');
    
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
    console.log('⚙️ === EXTRACTION DES DONNÉES ===');
    const extractedData = selectedParser.parse(normalizedContent);
    console.log('⚙️ Données extraites (résumé):', {
      contact: Object.keys(extractedData.contact).length + ' champs',
      souscripteur: Object.keys(extractedData.souscripteur).length + ' champs',
      conjoint: extractedData.conjoint ? 'présent' : 'absent',
      enfants: extractedData.enfants.length + ' enfant(s)',
      besoins: Object.keys(extractedData.besoins).length + ' champs'
    });
    
    // Calculer le score
    console.log('🎯 === CALCUL DU SCORE ===');
    const score = selectedParser.calculateScore(extractedData);
    console.log(`🎯 Score final: ${score}/5`);
    
    // Si le score est suffisant, créer un lead
    console.log('💾 === CRÉATION DU LEAD ===');
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
      
      console.log('✅ Lead créé avec succès!');
      console.log('💾 ID:', lead.id);
      console.log('💾 Score:', lead.score + '/5');
      console.log('💾 Parser utilisé:', selectedParser.name);
      console.log('💾 Contact:', Object.keys(lead.contact));
      console.log('💾 Souscripteur:', Object.keys(lead.souscripteur));
      console.log('💾 Conjoint:', lead.conjoint ? 'oui' : 'non');
      console.log('💾 Enfants:', lead.enfants.length);
      console.log('💾 Besoins:', Object.keys(lead.besoins));
      
      leads.push(lead);
    } else {
      console.log(`❌ Score insuffisant (${score}/5), lead non créé`);
    }
    
    console.log('🚀 ==================== FIN PARSING ====================');
    console.log('🚀 Nombre de leads créés:', leads.length);
    console.log('🚀 ======================================================');
    
    return leads;
  }

  static getAvailableParsers() {
    return this.parsers.map(parser => ({
      name: parser.name,
      description: parser.description || 'Aucune description'
    }));
  }
}