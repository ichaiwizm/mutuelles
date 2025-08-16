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
    return this.parseContentWithDetails(content, source, subject, fullContent, emailDate).leads;
  }

  static parseContentWithDetails(content, source, subject = '', fullContent = null, emailDate = null) {
    const startTime = Date.now();
    const result = {
      success: false,
      leads: [],
      errors: [],
      warnings: [],
      stats: {
        contentLength: content.length,
        processingTime: 0,
        parserUsed: null,
        parserSelectionTime: 0,
        extractionTime: 0,
        scoringTime: 0
      }
    };
    
    try {
      // Normaliser le contenu
      const normalizedContent = BaseParser.normalizeContent(content);
      
      // Trouver le parser approprié
      let selectedParser = null;
      const parserSelectionStart = Date.now();
      
      logger.info('Starting parser selection', { 
        available_parsers: this.parsers.map(p => p.name),
        content_length: content.length,
        content_preview: content.substring(0, 200)
      });
      
      for (const parser of this.parsers) {
        logger.debug('Testing parser', { parser_name: parser.name });
        const canParse = parser.canParse(normalizedContent);
        logger.debug('Parser test result', { parser_name: parser.name, can_parse: canParse });
        
        if (canParse) {
          selectedParser = parser;
          logger.info('Parser selected', { parser_name: parser.name });
          break;
        }
      }
      
      result.stats.parserSelectionTime = Date.now() - parserSelectionStart;
      result.stats.parserUsed = selectedParser?.name || null;

      if (!selectedParser) {
        logger.warn('No parser found for content', { 
          content_length: content.length,
          content_preview: content.substring(0, 200)
        });
        result.warnings.push({
          type: 'NO_PARSER_FOUND',
          message: 'No suitable parser found for this content',
          contentPreview: content.substring(0, 200)
        });
        result.success = true; // Pas une erreur, juste aucun parser
        return result;
      }

      // Extraire les données
      const extractionStart = Date.now();
      const extractedData = selectedParser.parse(normalizedContent);
      result.stats.extractionTime = Date.now() - extractionStart;
      
      // Calculer le score
      const scoringStart = Date.now();
      const score = selectedParser.calculateScore(extractedData);
      result.stats.scoringTime = Date.now() - scoringStart;
      
      logger.info('Parsing metrics', {
        parser: selectedParser.name,
        content_length: result.stats.contentLength,
        parser_selection_ms: result.stats.parserSelectionTime,
        extraction_ms: result.stats.extractionTime,
        scoring_ms: result.stats.scoringTime,
        total_ms: Date.now() - startTime
      });
      
      // Si le score est suffisant, créer un lead
      if (score >= 1) {
        const lead = {
          id: uuidv4(),
          contact: extractedData.contact || {},
          souscripteur: extractedData.souscripteur || {},
          conjoint: extractedData.conjoint,
          enfants: extractedData.enfants || [],
          besoins: extractedData.besoins || {},
          signature: extractedData.signature || null,
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
              hasContact: Object.keys(extractedData.contact || {}).length > 0,
              hasSouscripteur: Object.keys(extractedData.souscripteur || {}).length > 0,
              hasConjoint: !!extractedData.conjoint,
              enfantsCount: (extractedData.enfants || []).length,
              hasBesoins: Object.keys(extractedData.besoins || {}).length > 0,
              hasSignature: !!extractedData.signature
            },
            performance: {
              processingTime: Date.now() - startTime,
              parserSelectionTime: result.stats.parserSelectionTime,
              extractionTime: result.stats.extractionTime,
              scoringTime: result.stats.scoringTime
            }
          }
        };
        
        logger.info('Lead created successfully', { 
          id: lead.id, 
          score: lead.score, 
          parser: selectedParser.name,
          has_signature: !!extractedData.signature
        });
        
        result.leads.push(lead);
      } else {
        logger.info('Lead not created - insufficient score', { score, minimum: 1 });
        result.warnings.push({
          type: 'INSUFFICIENT_SCORE',
          message: `Lead score ${score} below minimum threshold of 1`,
          score,
          threshold: 1
        });
      }
      
      result.success = true;
      
    } catch (error) {
      logger.error('Parsing error occurred', { 
        error: error.message,
        stack: error.stack,
        content_length: content.length
      });
      
      result.errors.push({
        type: 'PARSING_ERROR',
        message: error.message,
        parser: result.stats.parserUsed
      });
    } finally {
      result.stats.processingTime = Date.now() - startTime;
      
      logger.info('Parsing completed', { 
        leads_created: result.leads.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
        total_time_ms: result.stats.processingTime
      });
    }
    
    return result;
  }

  static getAvailableParsers() {
    return this.parsers.map(parser => ({
      name: parser.name,
      description: parser.description || 'Aucune description'
    }));
  }

  // Métriques de performance
  static performanceMetrics = {
    totalOperations: 0,
    successfulParses: 0,
    failedParses: 0,
    totalProcessingTime: 0,
    parserUsage: {},
    averageContentLength: 0,
    lastReset: new Date().toISOString()
  };

  static updateMetrics(parseResult) {
    this.performanceMetrics.totalOperations++;
    this.performanceMetrics.totalProcessingTime += parseResult.stats.processingTime;
    
    if (parseResult.success && parseResult.leads.length > 0) {
      this.performanceMetrics.successfulParses++;
    } else {
      this.performanceMetrics.failedParses++;
    }
    
    // Tracker l'usage des parsers
    const parser = parseResult.stats.parserUsed;
    if (parser) {
      if (!this.performanceMetrics.parserUsage[parser]) {
        this.performanceMetrics.parserUsage[parser] = {
          count: 0,
          totalTime: 0,
          successRate: 0,
          avgContentLength: 0
        };
      }
      
      this.performanceMetrics.parserUsage[parser].count++;
      this.performanceMetrics.parserUsage[parser].totalTime += parseResult.stats.processingTime;
      this.performanceMetrics.parserUsage[parser].avgContentLength = 
        (this.performanceMetrics.parserUsage[parser].avgContentLength * 
         (this.performanceMetrics.parserUsage[parser].count - 1) + 
         parseResult.stats.contentLength) / this.performanceMetrics.parserUsage[parser].count;
      
      this.performanceMetrics.parserUsage[parser].successRate = 
        parseResult.success && parseResult.leads.length > 0 ? 
        (this.performanceMetrics.parserUsage[parser].successRate * 
         (this.performanceMetrics.parserUsage[parser].count - 1) + 1) / 
         this.performanceMetrics.parserUsage[parser].count :
        this.performanceMetrics.parserUsage[parser].successRate * 
         (this.performanceMetrics.parserUsage[parser].count - 1) / 
         this.performanceMetrics.parserUsage[parser].count;
    }
    
    // Moyenne de la longueur du contenu
    this.performanceMetrics.averageContentLength = 
      (this.performanceMetrics.averageContentLength * 
       (this.performanceMetrics.totalOperations - 1) + 
       parseResult.stats.contentLength) / this.performanceMetrics.totalOperations;
    
    // Logger les métriques périodiquement
    if (this.performanceMetrics.totalOperations % 10 === 0) {
      logger.info('Parser performance metrics (every 10 operations)', this.getMetricsSummary());
    }
  }

  static getMetricsSummary() {
    const totalOps = this.performanceMetrics.totalOperations;
    const avgProcessingTime = totalOps > 0 ? 
      this.performanceMetrics.totalProcessingTime / totalOps : 0;
    
    return {
      totalOperations: totalOps,
      successRate: totalOps > 0 ? 
        (this.performanceMetrics.successfulParses / totalOps * 100).toFixed(2) + '%' : '0%',
      avgProcessingTime: avgProcessingTime.toFixed(2) + 'ms',
      avgContentLength: Math.round(this.performanceMetrics.averageContentLength),
      parserUsage: Object.entries(this.performanceMetrics.parserUsage).map(([name, stats]) => ({
        parser: name,
        usage: stats.count,
        avgTime: (stats.totalTime / stats.count).toFixed(2) + 'ms',
        successRate: (stats.successRate * 100).toFixed(1) + '%',
        avgContentLength: Math.round(stats.avgContentLength)
      })),
      lastReset: this.performanceMetrics.lastReset
    };
  }

  static resetMetrics() {
    this.performanceMetrics = {
      totalOperations: 0,
      successfulParses: 0,
      failedParses: 0,
      totalProcessingTime: 0,
      parserUsage: {},
      averageContentLength: 0,
      lastReset: new Date().toISOString()
    };
    
    logger.info('Parser performance metrics reset');
  }

  // Version enhanced qui update automatiquement les métriques
  static parseContentWithMetrics(content, source, subject = '', fullContent = null, emailDate = null) {
    const result = this.parseContentWithDetails(content, source, subject, fullContent, emailDate);
    this.updateMetrics(result);
    return result;
  }
}