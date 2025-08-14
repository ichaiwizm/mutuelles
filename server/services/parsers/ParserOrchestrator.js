import { AssurProspectParser } from './AssurProspectParser.js';
import { GenericParser } from './GenericParser.js';
import { BaseParser } from './BaseParser.js';
import { v4 as uuidv4 } from 'uuid';

export class ParserOrchestrator {
  static parsers = [
    AssurProspectParser,
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
    console.log('🔍 === SÉLECTION DU PARSER ===');
    for (const parser of this.parsers) {
      console.log(`🔍 Test du parser: ${parser.name}`);
      const canParse = parser.canParse(normalizedContent);
      console.log(`🔍 ${parser.name} peut parser: ${canParse}`);
      
      if (canParse) {
        selectedParser = parser;
        console.log(`✅ Parser sélectionné: ${parser.name}`);
        break;
      }
    }

    if (!selectedParser) {
      console.log('❌ Aucun parser trouvé');
      console.log('🚀 ==================== FIN PARSING (ÉCHEC) ====================');
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