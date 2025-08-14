// server/services/parsers/assurlead.js
/* eslint-disable no-useless-escape */

const KV_SPLIT = /^(.+?)(?:\t| {2,}|:)\s*(.+)$/u;

const stripDiacritics = (s = '') =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const normalizeKey = (s = '') =>
  stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

const KEY_MAP = {
  civilite: 'civilite',
  nom: 'nom',
  prenom: 'prenom',
  telephoneportable: 'telephone',
  telephone: 'telephone',
  telephonedomicile: 'telephone_domicile',
  email: 'email',
  codepostal: 'codePostal',
  ville: 'ville',
  datedenaissance: 'dob',
  age: 'age',
  sexe: 'sexe',
  besoinassurancesante: 'besoin',
  moisdecheance: 'mois_echeance',
  regimesocial: 'regime_social',
  situationfamiliale: 'situation_familiale',
  profession: 'profession',
  nombredenfants: 'nb_enfants',
  datedenaissanceconjoint: 'dob_conjoint',
  regimesocialconjoint: 'regime_social_conjoint',
  professionconjoint: 'profession_conjoint',
  assureuractuel: 'assureur_actuel',
  formulechoisie: 'formule',
  userid: 'user_id',
  v4: 'adresse',
  adresse: 'adresse',
  v2: null,
};

function cleanPhone(s) {
  return s ? s.replace(/[^\d+]/g, '') : s;
}
function cleanCp(s) {
  return s ? s.replace(/\D/g, '') : s;
}

export function detectAssurlead({ content, subject, from }) {
  const c = (content || '').toLowerCase();
  const s = (subject || '').toLowerCase();
  const f = (from || '').toLowerCase();
  
  const hasAssurlandMarkers = (
    c.includes('assurland.com') ||
    c.includes('assurlead')     ||
    s.includes('assurlead')     ||
    f.includes('opdata@assurland.com') ||
    f.includes('assurland.com')
  );
  
  const hasTabularFormat = content.includes('\t') && (
    c.includes('civilite') ||
    c.includes('nom') ||
    c.includes('prenom') ||
    c.includes('telephone portable')
  );
  
  return hasAssurlandMarkers || hasTabularFormat;
}

export function parseAssurlead({ content, subject, date }) {
  console.log('Parsing Assurlead email');
  
  // Isoler le bloc utile: de "Civilite" jusqu'à "Assurland.com" / "Le Pôle Commercial"
  const start = content.search(/^\s*civilit[eé]\b/mi);
  const endA  = content.search(/^\s*assurland\.com/mi);
  const endB  = content.search(/^\s*le p[oô]le commercial/mi);
  const end   = [endA, endB].filter(i => i > -1).sort((a,b)=>a-b)[0];
  const block = start >= 0 ? content.slice(start, end > -1 ? end : content.length) : content;

  const result = {};
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  console.log(`Processing ${lines.length} lines from Assurlead email`);

  for (const line of lines) {
    const m = line.match(KV_SPLIT);
    if (!m) continue;
    const key = normalizeKey(m[1]);
    const val = (m[2] || '').trim();
    const mapped = KEY_MAP[key];
    if (mapped && val && val !== 'NON RENSEIGNE') {
      result[mapped] = val;
    }
  }

  console.log('Assurlead extracted fields:', Object.keys(result));

  // Normalisations
  if (result.telephone) result.telephone = cleanPhone(result.telephone);
  if (result.codePostal) result.codePostal = cleanCp(result.codePostal);
  if (result.nb_enfants) result.nb_enfants = parseInt(result.nb_enfants, 10);

  // Construire l'objet lead attendu par le reste du pipeline
  const lead = {
    source: 'Assurlead',
    extractedAt: date || new Date().toISOString(),
    contact: {
      civilite: result.civilite || '',
      nom: result.nom || '',
      prenom: result.prenom || '',
      telephone: result.telephone || '',
      email: result.email || '',
      adresse: result.adresse || '',
      codePostal: result.codePostal || '',
      ville: result.ville || '',
    },
    souscripteur: {
      dateNaissance: result.dob || '',
      profession: result.profession || '',
      regimeSocial: result.regime_social || '',
      nombreEnfants: Number.isFinite(result.nb_enfants) ? result.nb_enfants : undefined,
    },
    conjoint: (result.dob_conjoint || result.profession_conjoint || result.regime_social_conjoint) ? {
      dateNaissance: result.dob_conjoint || '',
      profession: result.profession_conjoint || '',
      regimeSocial: result.regime_social_conjoint || '',
    } : null,
    enfants: [], // Assurland fournit aussi "Date de naissance enfants ..." si besoin
    besoins: {
      dateEffet: result.mois_echeance || '',
      assureActuellement: !!result.assureur_actuel,
      niveaux: {
        soinsMedicaux: '',
        hospitalisation: '',
        optique: '',
        dentaire: ''
      },
    },
    emailSubject: subject || '',
    fullContent: content,
    rawSnippet: content.substring(0, 300),
    notes: {
      parserUsed: 'AssurleadParser',
      raw: {
        besoin: result.besoin || '',
        moisEcheance: result.mois_echeance || '',
        formuleChoisie: result.formule || '',
        assureurActuel: result.assureur_actuel || '',
        situationFamiliale: result.situation_familiale || '',
        age: result.age || '',
        sexe: result.sexe || ''
      }
    },
  };

  console.log('Assurlead parsing result:', {
    nom: lead.contact.nom,
    email: lead.contact.email,
    telephone: lead.contact.telephone,
    adresse: lead.contact.adresse,
    score: 'calculating...'
  });

  // Score robuste (0-5)
  const hasContact   = !!(lead.contact.telephone || lead.contact.email);
  const hasIdentity  = !!(lead.contact.nom || lead.contact.prenom);
  const hasLocation  = !!(lead.contact.codePostal || lead.contact.ville);
  const hasNeed      = !!(result.besoin || result.formule || result.regime_social);

  let score = 0;
  if (hasContact)  score++;
  if (hasIdentity) score++;
  if (hasLocation) score++;
  if (hasNeed)     score++;
  if (lead.contact.telephone && lead.contact.email) score++; // bonus

  lead.score = Math.max(1, Math.min(5, score));

  console.log('Assurlead final score:', score, {
    hasContact,
    hasIdentity,
    hasLocation,
    hasNeed,
    bonus: !!(lead.contact.telephone && lead.contact.email)
  });

  return { parsingDetails: lead };
}