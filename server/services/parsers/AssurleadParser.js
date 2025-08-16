import { BaseParser } from './BaseParser.js';
import logger from '../../logger.js';
import { RAW_KEYS } from './constants/AssurleadConstants.js';
import { splitKV } from './utils/AssurleadLineParser.js';
import { extractDataSection, processSingleLineContent } from './utils/AssurleadContentProcessor.js';
import { extractEnfants } from './utils/AssurleadEnfantsExtractor.js';
import { buildLeadData } from './utils/AssurleadDataBuilder.js';
import { canParseAssurlead } from './utils/AssurleadDetection.js';

const strip = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export class AssurleadParser extends BaseParser {
  static canParse(content) {
    return canParseAssurlead(content);
  }

  static parse(content) {
    logger.info('AssurleadParser started parsing', { content_length: content.length });
    const text = this.normalizeContent(content);
    
    const dataSection = extractDataSection(text);
    let lines = dataSection.split('\n').map(l => l.trim()).filter(Boolean);
    
    logger.debug('AssurleadParser lines to parse', { 
      lines_count: lines.length,
      first_10_lines: lines.slice(0, 10)
    });
    
    // Si tout est sur une seule ligne (ancien format), diviser par pattern
    if (lines.length === 1) {
      lines = processSingleLineContent(lines[0]);
    }

    const result = this.parseLines(lines);
    const data = buildLeadData(result);
    data.enfants = extractEnfants(result);
    
    logger.info('AssurleadParser final result', { 
      contact: data.contact,
      souscripteur: data.souscripteur,
      conjoint: data.conjoint,
      enfants_count: data.enfants.length
    });
    
    return data;
  }

  static parseLines(lines) {
    const result = {};
    
    for (const raw of lines) {
      logger.debug('AssurleadParser processing line', { raw_line: raw });
      
      let [k, v] = splitKV(raw);
      logger.debug('AssurleadParser splitKV result', { key: k, value: v, line: raw });
      
      if (!k || !v) {
        logger.debug('AssurleadParser skipping line (no key/value)', { key: k, value: v, line: raw });
        continue;
      }

      const nk = strip(k).replace(/\s+/g,' ').trim();
      const mapped = RAW_KEYS[nk] ?? RAW_KEYS[nk.replace(/\./g,'')] ?? null;

      if (mapped === undefined || mapped === null) {
        logger.debug('AssurleadParser skipping line (no mapping)', { normalized_key: nk, mapped: mapped, line: raw });
        continue;
      }

      const val = v.trim();
      if (!val || val === 'NON RENSEIGNE') {
        logger.debug('AssurleadParser skipping line (empty value)', { normalized_key: nk, value: val, line: raw });
        continue;
      }

      logger.debug('AssurleadParser adding to result', { mapped_key: mapped, value: val, line: raw });
      result[mapped] = val;
    }
    
    logger.debug('AssurleadParser raw results', { 
      parsed_fields: Object.keys(result),
      total_fields: Object.keys(result).length
    });
    
    return result;
  }
}