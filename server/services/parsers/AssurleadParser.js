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

  static parse(content, originalMessage = null) {
    logger.info('AssurleadParser started parsing', { content_length: content.length });
    
    // Essayer d'extraire le HTML brut depuis le message original
    const htmlContent = this.extractHtmlFromMessage(originalMessage);
    
    if (htmlContent && htmlContent.includes('<table') && htmlContent.toLowerCase().includes('assurland')) {
      logger.info('AssurleadParser: Format HTML détecté depuis message original');
      return this.parseHtmlTable(htmlContent);
    }
    
    // Détecter si c'est du contenu structuré (fallback)
    if (content.includes('Civilite') && content.includes('Date de naissance Conjoint')) {
      logger.info('AssurleadParser: Format structuré détecté');
      return this.parseNormalizedContent(content);
    }
    
    // Fallback vers l'ancien parser texte
    logger.info('AssurleadParser: Format texte détecté');
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

  static extractHtmlFromMessage(message) {
    if (!message?.payload?.parts) {
      logger.debug('AssurleadParser: Pas de payload.parts dans le message');
      return null;
    }
    
    logger.debug('AssurleadParser: Analyse des parts du message', { 
      parts_count: message.payload.parts.length,
      parts_types: message.payload.parts.map(p => p.mimeType)
    });
    
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          logger.info('AssurleadParser: HTML extrait du message original', { 
            html_length: html.length,
            html_preview: html.substring(0, 200),
            contains_table: html.includes('<table'),
            contains_assurland: html.toLowerCase().includes('assurland')
          });
          return html;
        } catch (error) {
          logger.warn('AssurleadParser: Erreur décodage base64', { error: error.message });
          return null;
        }
      }
    }
    
    logger.debug('AssurleadParser: Aucune part HTML trouvée');
    return null;
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
      if (!val) {
        logger.debug('AssurleadParser skipping line (empty value)', { normalized_key: nk, value: val, line: raw });
        continue;
      }
      
      // Normaliser les valeurs vides/non renseignées
      if (val === 'NON RENSEIGNE' || val === 'NON RENSEIGNÉ' || val === '') {
        logger.debug('AssurleadParser setting null for empty field', { mapped_key: mapped, value: val, line: raw });
        result[mapped] = null;
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

  static parseStructuredContent(content) {
    // Si c'est du HTML, utiliser le parser HTML
    if (content.includes('<table') && content.toLowerCase().includes('assurland')) {
      return this.parseHtmlTable(content);
    }
    
    // Sinon, parser le contenu normalisé ligne par ligne
    return this.parseNormalizedContent(content);
  }

  static parseNormalizedContent(content) {
    logger.info('AssurleadParser: Parsing normalized structured content');
    
    const tableData = {};
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Parser le format "Clé Valeur" ligne par ligne
    for (let i = 0; i < lines.length - 1; i++) {
      const key = lines[i];
      const value = lines[i + 1];
      
      // Ignorer les lignes qui ne sont pas des clés connues
      if (this.isAssurleadKey(key)) {
        tableData[key] = value && value !== 'NON RENSEIGNE' ? value : '';
        i++; // Skip next line car on a traité key+value
      }
    }
    
    logger.debug('AssurleadParser: Extracted normalized data', { 
      fields_count: Object.keys(tableData).length,
      fields: Object.keys(tableData)
    });
    
    // Construire les données structurées
    const data = {
      contact: this.extractContactFromTable(tableData),
      souscripteur: this.extractSouscripteurFromTable(tableData),
      conjoint: this.extractConjointFromTable(tableData),
      enfants: this.extractEnfantsFromTable(tableData),
      besoins: this.extractBesoinsFromTable(tableData)
    };
    
    logger.info('AssurleadParser normalized final result', {
      contact: data.contact,
      souscripteur: data.souscripteur,
      conjoint: data.conjoint,
      enfants_count: data.enfants.length,
      besoins: data.besoins
    });
    
    return data;
  }

  static isAssurleadKey(key) {
    const knownKeys = [
      'Civilite', 'Nom', 'Prenom', 'v2', 'v4', 'Code postal', 'Ville',
      'Telephone portable', 'Telephone domicile', 'Email', 'Date de naissance',
      'Age', 'Sexe', 'besoin assurance sante', 'mois d\'echeance', 'regime social',
      'Situation familiale', 'Profession', 'Nombre d\'enfants',
      'Date de naissance enfants min', 'Date de naissance enfants max',
      'Date de naissance Conjoint', 'Regime Social Conjoint', 'Profession Conjoint',
      'Assureur actuel', 'Formule choisie', 'user_id'
    ];
    return knownKeys.includes(key);
  }

  static parseHtmlTable(content) {
    logger.info('AssurleadParser: Parsing HTML table format', { content_length: content.length });
    
    const tableData = {};
    
    // Méthode plus robuste : extraire d'abord toutes les lignes tr, puis parser chaque cellule
    const rows = content.match(/<tr[^>]*>.*?<\/tr>/gi) || [];
    
    logger.info('AssurleadParser: Found table rows', { rows_count: rows.length });
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Extraire les cellules td de cette ligne
      const cells = row.match(/<td[^>]*>.*?<\/td>/gi) || [];
      
      logger.debug('AssurleadParser: Processing row', { 
        row_index: i, 
        cells_count: cells.length,
        row_content: row.substring(0, 200)
      });
      
      if (cells.length >= 2) {
        const keyCell = cells[0];
        const valueCell = cells[1];
        
        // Extraire la clé depuis <b>clé</b>
        const keyMatch = keyCell.match(/<b[^>]*>([^<]+)<\/b>/i);
        
        if (keyMatch) {
          const key = keyMatch[1].trim();
          
          // Extraire la valeur en supprimant toutes les balises HTML
          let value = valueCell
            .replace(/<[^>]*>/g, '') // Supprimer toutes les balises HTML
            .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par espace
            .replace(/&amp;/g, '&')  // Décoder &amp;
            .replace(/&lt;/g, '<')   // Décoder &lt;
            .replace(/&gt;/g, '>')   // Décoder &gt;
            .trim();
          
          logger.debug('AssurleadParser: Extracted field details', { 
            key, 
            value, 
            value_cell_raw: valueCell,
            is_empty: !value || value === 'NON RENSEIGNE' || value === ''
          });
          
          // Ignorer les valeurs vides ou "NON RENSEIGNE"
          if (value && value !== 'NON RENSEIGNE' && value !== '') {
            tableData[key] = value;
            logger.info('AssurleadParser: Field added to tableData', { key, value });
          } else {
            logger.debug('AssurleadParser: Skipped empty field', { key, value });
          }
        } else {
          logger.debug('AssurleadParser: No key found in keyCell', { keyCell });
        }
      } else {
        logger.debug('AssurleadParser: Row has insufficient cells', { cells_count: cells.length });
      }
    }
    
    logger.debug('AssurleadParser: Extracted table data', { 
      fields_count: Object.keys(tableData).length,
      fields: Object.keys(tableData),
      data: tableData
    });
    
    // Construire les données structurées
    const data = {
      contact: this.extractContactFromTable(tableData),
      souscripteur: this.extractSouscripteurFromTable(tableData),
      conjoint: this.extractConjointFromTable(tableData),
      enfants: this.extractEnfantsFromTable(tableData),
      besoins: this.extractBesoinsFromTable(tableData)
    };
    
    logger.info('AssurleadParser HTML final result', {
      contact: data.contact,
      souscripteur: data.souscripteur,
      conjoint: data.conjoint,
      enfants_count: data.enfants.length,
      besoins: data.besoins
    });
    
    return data;
  }

  static extractContactFromTable(tableData) {
    return {
      civilite: tableData['Civilite'] || null,
      nom: tableData['Nom'] || null,
      prenom: tableData['Prenom'] || null,
      telephone: tableData['Telephone portable'] || tableData['Telephone domicile'] || null,
      email: tableData['Email'] || null,
      adresse: tableData['v4'] || null, // v4 contient l'adresse
      codePostal: tableData['Code postal'] || null,
      ville: tableData['Ville'] || null
    };
  }

  static extractSouscripteurFromTable(tableData) {
    return {
      dateNaissance: tableData['Date de naissance'] || null,
      profession: tableData['Profession'] || null,
      regimeSocial: tableData['regime social'] || null,
      situationFamiliale: tableData['Situation familiale'] || null,
      sexe: tableData['Sexe'] || null,
      age: tableData['Age'] ? parseInt(tableData['Age']) : null,
      nombreEnfants: tableData['Nombre d\'enfants'] ? parseInt(tableData['Nombre d\'enfants']) : 0
    };
  }

  static extractConjointFromTable(tableData) {
    const conjointFields = [
      'Date de naissance Conjoint',
      'Regime Social Conjoint', 
      'Profession Conjoint'
    ];
    
    // Vérifier si au moins UN champ a une vraie valeur
    const hasRealConjointData = conjointFields.some(field => {
      const value = tableData[field];
      return value && 
             value !== 'NON RENSEIGNE' && 
             value.trim() !== '' && 
             value !== '&nbsp;';
    });
    
    if (!hasRealConjointData) {
      logger.debug('AssurleadParser: Aucune donnée conjoint trouvée');
      return null; // Pas de conjoint
    }
    
    // Construire l'objet conjoint avec les données disponibles
    const conjoint = {
      dateNaissance: tableData['Date de naissance Conjoint'] || null,
      profession: tableData['Profession Conjoint'] || null,
      regimeSocial: tableData['Regime Social Conjoint'] || null
    };
    
    logger.debug('AssurleadParser: Conjoint trouvé', conjoint);
    return conjoint;
  }

  static extractEnfantsFromTable(tableData) {
    const nombreEnfants = parseInt(tableData['Nombre d\'enfants'] || '0');
    
    if (nombreEnfants === 0) {
      logger.debug('AssurleadParser: Aucun enfant');
      return []; // Pas d'enfants
    }
    
    const enfants = [];
    const dateMin = tableData['Date de naissance enfants min'];
    const dateMax = tableData['Date de naissance enfants max'];
    
    // Si on a des dates, créer des objets enfants
    if (dateMin || dateMax) {
      for (let i = 0; i < nombreEnfants; i++) {
        enfants.push({
          dateNaissance: i === 0 ? dateMin : dateMax,
          ordre: i + 1
        });
      }
    } else {
      // Créer des enfants sans date
      for (let i = 0; i < nombreEnfants; i++) {
        enfants.push({
          ordre: i + 1
        });
      }
    }
    
    logger.debug('AssurleadParser: Enfants extraits', { count: enfants.length });
    return enfants;
  }

  static extractBesoinsFromTable(tableData) {
    // Fonction helper pour vérifier si une valeur est vide/NON RENSEIGNE
    const isEmpty = (value) => !value || value === 'NON RENSEIGNE' || value.trim() === '';
    
    const besoins = {
      besoinAssurance: tableData['besoin assurance sante'] || null,
      dateEffet: isEmpty(tableData['mois d\'echeance']) ? null : tableData['mois d\'echeance'],
      assureActuellement: !isEmpty(tableData['Assureur actuel']),
      assureurActuel: isEmpty(tableData['Assureur actuel']) ? null : tableData['Assureur actuel'],
      formuleChoisie: tableData['Formule choisie'] || null,
      niveaux: {}
    };
    
    // Ajouter la formule dans niveaux si disponible
    if (besoins.formuleChoisie) {
      besoins.niveaux.formule = besoins.formuleChoisie;
    }
    
    logger.debug('AssurleadParser: Besoins extraits', besoins);
    return besoins;
  }
}