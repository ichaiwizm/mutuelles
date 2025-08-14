import { BaseParser } from './BaseParser.js';

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
  'regime social conjoint': 'regime_social_conjoint',
  'profession conjoint': 'profession_conjoint',
  'assureur actuel': 'assureur_actuel',
  'formule choisie': 'formule',
  'user_id': 'user_id',
  'v4': 'adresse',
  'adresse': 'adresse',
  'v2': null,
};

function splitKV(line) {
  const mColon = line.match(/^(.+?)\s*:\s*(.+)$/);
  if (mColon) return [mColon[1], mColon[2]];

  const words = line.split(/\s+/);
  
  for (let keyLength = Math.min(4, words.length - 1); keyLength >= 1; keyLength--) {
    const potentialKey = words.slice(0, keyLength).join(' ');
    const normalizedKey = strip(potentialKey).replace(/\s+/g,' ').trim();
    
    if (RAW_KEYS.hasOwnProperty(normalizedKey)) {
      const value = words.slice(keyLength).join(' ');
      if (value) {
        return [potentialKey, value];
      }
    }
  }

  return [null, null];
}

export class AssurleadParser extends BaseParser {
  static canParse(content) {
    const c = content.toLowerCase();
    if (c.includes('assurlead') || c.includes('assurland') || c.includes('assurland.com') || c.includes('service assurland')) {
      return true;
    }
    const hasMarkers =
      c.includes('civilite') &&
      (c.includes('telephone portable') || c.includes('code postal')) &&
      c.includes('profession');
    return hasMarkers;
  }

  static parse(content) {
    const text = this.normalizeContent(content);
    
    let dataSection = text;
    const serviceMarker = /Service\s+Assurland\s+DataPro/i;
    const serviceIndex = text.search(serviceMarker);
    if (serviceIndex !== -1) {
      dataSection = text.substring(serviceIndex + text.match(serviceMarker)[0].length).trim();
    }

    let lines = dataSection.split('\n').map(l => l.trim()).filter(Boolean);
    
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

    const result = {};
    for (const raw of lines) {
      let [k, v] = splitKV(raw);
      if (!k || !v) continue;

      const nk = strip(k).replace(/\s+/g,' ').trim();
      const mapped = RAW_KEYS[nk] ?? RAW_KEYS[nk.replace(/\./g,'')] ?? null;

      if (mapped === undefined || mapped === null) continue;

      const val = v.trim();
      if (!val || val === 'NON RENSEIGNE') continue;

      result[mapped] = val;
    }

    const phone = (result.telephone || '').replace(/[^\d+]/g,'');
    const cp = (result.codePostal || '').replace(/\D/g,'');
    const dob = result.dob ? this.normalizeDate(result.dob) : '';
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
      enfants: [],
      besoins: {
        dateEffet: '',
        assureActuellement: result.assureur_actuel ? true : undefined,
        niveaux: {}
      }
    };

    return data;
  }
}