import { BaseParser } from './BaseParser.js';
import logger from '../../logger.js';

const strip = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

const RAW_KEYS = {
  'civilite': 'civilite',
  'nom': 'nom',
  'prenom': 'prenom',
  'telephone portable': 'telephone',
  'telephone': 'telephone',
  'telephone domicile': 'telephone_domicile',
  'email': 'email',
  'code postal': 'codePostal',
  'codepostal': 'codePostal',
  'ville': 'ville',
  'date de naissance': 'dob',
  'age': 'age',
  'sexe': 'sexe',
  'besoin assurance sante': 'besoin',
  'mois d\'echeance': 'mois_echeance',
  'regime social': 'regime_social',
  'situation familiale': 'situation_familiale',
  'profession': 'profession',
  'nombre d\'enfants': 'nb_enfants',
  'date de naissance enfants min': 'dob_enfant_min',
  'date de naissance enfants max': 'dob_enfant_max',
  'date de naissance conjoint': 'dob_conjoint',
  'date de naissance du 1er enfant': 'dob_enfant_1',
  'date de naissance du 2eme enfant': 'dob_enfant_2',
  'date de naissance du 3eme enfant': 'dob_enfant_3',
  'regime social conjoint': 'regime_social_conjoint',
  'profession conjoint': 'profession_conjoint',
  'assureur actuel': 'assureur_actuel',
  'formule choisie': 'formule',
  'user_id': 'user_id',
  'v4': 'adresse',
  'adresse': 'adresse'
};

function splitKV(line) {
  // Gestion des deux points (format AssurProspect)
  const mColon = line.match(/^(.+?)\s*:\s*(.+)$/);
  if (mColon) return [mColon[1], mColon[2]];

  // Gestion du format Assurlead avec espaces/tabs multiples
  const mSpaces = line.match(/^(.+?)\s{2,}(.+)$/);
  if (mSpaces) {
    const key = mSpaces[1].trim();
    const value = mSpaces[2].trim();
    const normalizedKey = strip(key).replace(/\s+/g,' ').trim();
    
    logger.info('AssurleadParser parsing attempt', { 
      original_key: key, 
      normalized_key: normalizedKey, 
      value: value,
      key_exists: RAW_KEYS.hasOwnProperty(normalizedKey)
    });
    
    if (RAW_KEYS.hasOwnProperty(normalizedKey) && value && value !== 'NON RENSEIGNE') {
      logger.info('AssurleadParser key matched', { 
        key: normalizedKey, 
        value: value 
      });
      return [key, value];
    } else {
      logger.warn('AssurleadParser key not matched', { 
        key: normalizedKey, 
        key_exists: RAW_KEYS.hasOwnProperty(normalizedKey),
        value: value
      });
    }
  }

  // Méthode de fallback avec analyse par mots - PRIORITÉ AUX CLÉS SPÉCIFIQUES
  const words = line.split(/\s+/);
  
  // D'abord chercher les clés spécifiques les plus longues (enfants, conjoint)
  // Aller de la plus longue à la plus courte pour éviter les conflits
  for (let keyLength = Math.min(words.length - 1, 6); keyLength >= 1; keyLength--) {
    const potentialKey = words.slice(0, keyLength).join(' ');
    const normalizedKey = strip(potentialKey).replace(/\s+/g,' ').trim();
    
    logger.info('AssurleadParser testing fallback key', {
      potential_key: potentialKey,
      normalized_key: normalizedKey,
      key_length: keyLength,
      exists: RAW_KEYS.hasOwnProperty(normalizedKey)
    });
    
    if (RAW_KEYS.hasOwnProperty(normalizedKey)) {
      const value = words.slice(keyLength).join(' ');
      if (value && value !== 'NON RENSEIGNE') {
        logger.info('AssurleadParser fallback key matched', {
          original_key: potentialKey,
          normalized_key: normalizedKey,
          value: value,
          key_length: keyLength
        });
        return [potentialKey, value];
      }
    }
  }

  return [null, null];
}

export class AssurleadParser extends BaseParser {
  static canParse(content) {
    const c = content.toLowerCase();
    
    logger.info('AssurleadParser canParse test', { 
      content_length: content.length,
      content_preview: content.substring(0, 300),
      has_assurlead: c.includes('assurlead'),
      has_assurland: c.includes('assurland'),
      has_assurland_com: c.includes('assurland.com'),
      has_service_assurland: c.includes('service assurland')
    });
    
    if (c.includes('assurlead') || c.includes('assurland') || c.includes('assurland.com') || c.includes('service assurland')) {
      logger.info('AssurleadParser canParse: TRUE (domain match)');
      return true;
    }
    
    const hasMarkers =
      c.includes('civilite') &&
      (c.includes('telephone portable') || c.includes('code postal')) &&
      c.includes('profession');
      
    logger.info('AssurleadParser canParse markers test', {
      has_civilite: c.includes('civilite'),
      has_telephone_portable: c.includes('telephone portable'),
      has_code_postal: c.includes('code postal'),
      has_profession: c.includes('profession'),
      final_result: hasMarkers
    });
    
    return hasMarkers;
  }

  static parse(content) {
    logger.info('AssurleadParser started parsing', { content_length: content.length });
    const text = this.normalizeContent(content);
    
    let dataSection = text;
    const serviceMarker = /Service\s+Assurland\s+DataPro/i;
    const serviceIndex = text.search(serviceMarker);
    if (serviceIndex !== -1) {
      dataSection = text.substring(serviceIndex + text.match(serviceMarker)[0].length).trim();
    }

    let lines = dataSection.split('\n').map(l => l.trim()).filter(Boolean);
    logger.info('AssurleadParser lines to parse', { 
      lines_count: lines.length,
      first_10_lines: lines.slice(0, 10)
    });
    
    // Si tout est sur une seule ligne (ancien format), diviser par pattern
    if (lines.length === 1) {
      const keyPattern = new RegExp(
        '(' + Object.keys(RAW_KEYS).filter(k => k && k !== 'v2').map(k => 
          k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
        ).join('|') + ')\\s+',
        'gi'
      );
      
      const singleLine = lines[0];
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = keyPattern.exec(singleLine)) !== null) {
        if (lastIndex < match.index) {
          const prevPart = singleLine.substring(lastIndex, match.index).trim();
          if (prevPart) parts.push(prevPart);
        }
        lastIndex = match.index;
      }
      if (lastIndex < singleLine.length) {
        const lastPart = singleLine.substring(lastIndex).trim();
        if (lastPart) parts.push(lastPart);
      }
      
      lines = parts;
    }
    
    // Nouveau format : chaque ligne est déjà un champ séparé
    // On garde les lignes telles quelles pour le parsing ligne par ligne

    const result = {};
    for (const raw of lines) {
      logger.info('AssurleadParser processing line', { raw_line: raw });
      
      let [k, v] = splitKV(raw);
      logger.info('AssurleadParser splitKV result', { key: k, value: v, line: raw });
      
      if (!k || !v) {
        logger.info('AssurleadParser skipping line (no key/value)', { key: k, value: v, line: raw });
        continue;
      }

      const nk = strip(k).replace(/\s+/g,' ').trim();
      const mapped = RAW_KEYS[nk] ?? RAW_KEYS[nk.replace(/\./g,'')] ?? null;

      if (mapped === undefined || mapped === null) {
        logger.info('AssurleadParser skipping line (no mapping)', { normalized_key: nk, mapped: mapped, line: raw });
        continue;
      }

      const val = v.trim();
      if (!val || val === 'NON RENSEIGNE') {
        logger.info('AssurleadParser skipping line (empty value)', { normalized_key: nk, value: val, line: raw });
        continue;
      }

      logger.info('AssurleadParser adding to result', { mapped_key: mapped, value: val, line: raw });
      result[mapped] = val;
    }

    const phone = (result.telephone || '').replace(/[^\d+]/g,'');
    const cp = (result.codePostal || '').replace(/\D/g,'');
    const dob = result.dob ? this.normalizeDate(result.dob) : '';
    
    logger.info('AssurleadParser raw results', { 
      parsed_fields: Object.keys(result),
      dob_raw: result.dob,
      dob_normalized: dob,
      total_fields: Object.keys(result).length
    });
    
    const data = {
      contact: {
        civilite: result.civilite || '',
        nom: result.nom || '',
        prenom: result.prenom || '',
        telephone: phone || '',
        email: (result.email || '').toLowerCase(),
        adresse: result.adresse || '',
        codePostal: cp || '',
        ville: result.ville || '',
      },
      souscripteur: {
        dateNaissance: dob,
        profession: result.profession || '',
        regimeSocial: result.regime_social || '',
        nombreEnfants: result.nb_enfants ? parseInt(String(result.nb_enfants).replace(/\D/g,''),10) : undefined,
      },
      conjoint: (result.dob_conjoint || result.profession_conjoint || result.regime_social_conjoint) ? {
        dateNaissance: result.dob_conjoint ? this.normalizeDate(result.dob_conjoint) : '',
        profession: result.profession_conjoint || '',
        regimeSocial: result.regime_social_conjoint || '',
      } : null,
      enfants: this.extractEnfants(result),
      besoins: {
        dateEffet: '',
        assureActuellement: result.assureur_actuel ? true : undefined,
        niveaux: {}
      }
    };

    logger.info('AssurleadParser final result', { 
      contact: data.contact,
      souscripteur: data.souscripteur,
      conjoint: data.conjoint,
      enfants_count: data.enfants.length
    });
    
    return data;
  }

  static extractEnfants(result) {
    const enfants = [];
    
    // Extraire les enfants avec les clés spécifiques
    for (let i = 1; i <= 3; i++) {
      const dateKey = `dob_enfant_${i}`;
      if (result[dateKey]) {
        enfants.push({
          dateNaissance: this.normalizeDate(result[dateKey])
        });
      }
    }
    
    // Si pas d'enfants trouvés avec les clés spécifiques, essayer les anciennes méthodes
    if (enfants.length === 0) {
      if (result.dob_enfant_min && result.dob_enfant_max) {
        // Si on a des dates min/max, créer des enfants factices
        const minDate = this.normalizeDate(result.dob_enfant_min);
        const maxDate = this.normalizeDate(result.dob_enfant_max);
        
        if (minDate) enfants.push({ dateNaissance: minDate });
        if (maxDate && maxDate !== minDate) enfants.push({ dateNaissance: maxDate });
      }
    }
    
    return enfants;
  }
}