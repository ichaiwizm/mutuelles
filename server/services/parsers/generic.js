// server/services/parsers/generic.js
// Fallback robuste basé sur dictionnaire de libellés + regex

const LABELS = {
  civilite: [/civilit[eé]/i],
  nom: [/^nom\b/i],
  prenom: [/^pr[eé]nom\b/i],
  email: [/^mail\b|^e-?mail\b|courriel/i],
  telephone: [/t[ée]l[ée]phone|portable/i],
  adresse: [/adresse/i],
  codePostal: [/code\s*postal|cp\b/i],
  ville: [/ville/i],

  // souscripteur
  dateNaissance: [/date\s*de\s*naissance/i],
  profession: [/profession/i],
  regimeSocial: [/r[ée]gime\s*social/i],
  nbEnfants: [/nombre\s*d['']enfants/i],

  // besoins
  dateEffet: [/date\s*d['']?effet/i],
  assureActuellement: [/actuellement\s*assur[ée]?\s*:\s*(oui|non)/i],
  soins: [/soins\s*m[eé]dicaux/i],
  hosp: [/hospitalisation/i],
  optique: [/optique/i],
  dentaire: [/dentaire/i],
};

const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const RE_PHONE = /(\+33|0)\s*\d([ .-]?\d){8,}/i;

function normalizePhone(v) {
  if (!v) return '';
  const digits = v.replace(/[^\d]/g, '');
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
function normalizeDateFR(v) {
  if (!v) return '';
  const m = v.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return v.trim();
  const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${dd}/${mm}/${yyyy}`;
}
function yesNoToBool(v) {
  const s = (v || '').toString().toLowerCase();
  if (['oui','yes','o','y'].includes(s)) return true;
  if (['non','no','n'].includes(s)) return false;
  return undefined;
}

export function parseGeneric({ content, subject, date }) {
  console.log('Parsing with GenericParser');
  
  const lines = (content || '').split('\n').map(l => l.trim()).filter(Boolean);

  const out = {
    source: 'Generic',
    extractedAt: date || new Date().toISOString(),
    contact: { civilite:'', nom:'', prenom:'', telephone:'', email:'', adresse:'', codePostal:'', ville:'' },
    souscripteur: { dateNaissance:'', profession:'', regimeSocial:'', nombreEnfants: undefined },
    conjoint: null,
    enfants: [],
    besoins: { dateEffet:'', assureActuellement: undefined, niveaux: {} },
    emailSubject: subject || '',
    fullContent: content,
    rawSnippet: content.substring(0, 300),
    notes: { parserUsed: 'GenericParser' }
  };

  // 1) label: valeur
  for (const raw of lines) {
    const [k,v] = raw.includes(':') ? [raw.split(':')[0], raw.split(':').slice(1).join(':')] : [null,null];
    const key = (k || '').toLowerCase().trim();
    const val = (v || '').trim();

    const setIf = (regexList, pathSetter) => {
      if (!key) return false;
      for (const re of regexList) {
        if (re.test(key)) { pathSetter(val); return true; }
      }
      return false;
    };

    if (setIf(LABELS.civilite,  v => out.contact.civilite = v)) continue;
    if (setIf(LABELS.nom,       v => out.contact.nom = v)) continue;
    if (setIf(LABELS.prenom,    v => out.contact.prenom = v)) continue;
    if (setIf(LABELS.email,     v => out.contact.email = v)) continue;
    if (setIf(LABELS.telephone, v => out.contact.telephone = normalizePhone(v))) continue;
    if (setIf(LABELS.adresse,   v => out.contact.adresse = v)) continue;
    if (setIf(LABELS.codePostal,v => out.contact.codePostal = v.replace(/[^\d]/g,''))) continue;
    if (setIf(LABELS.ville,     v => out.contact.ville = v)) continue;

    if (setIf(LABELS.dateNaissance, v => out.souscripteur.dateNaissance = normalizeDateFR(v))) continue;
    if (setIf(LABELS.profession,    v => out.souscripteur.profession = v)) continue;
    if (setIf(LABELS.regimeSocial,  v => out.souscripteur.regimeSocial = v)) continue;
    if (setIf(LABELS.nbEnfants,     v => out.souscripteur.nombreEnfants = Number(v.replace(/[^\d]/g,'')))) continue;

    if (setIf(LABELS.dateEffet,     v => out.besoins.dateEffet = normalizeDateFR(v))) continue;
    if (setIf(LABELS.assureActuellement, v => out.besoins.assureActuellement = yesNoToBool(v))) continue;
    if (setIf(LABELS.soins,         v => out.besoins.niveaux.soinsMedicaux = v)) continue;
    if (setIf(LABELS.hosp,          v => out.besoins.niveaux.hospitalisation = v)) continue;
    if (setIf(LABELS.optique,       v => out.besoins.niveaux.optique = v)) continue;
    if (setIf(LABELS.dentaire,      v => out.besoins.niveaux.dentaire = v)) continue;
  }

  // 2) heuristiques sans libellé
  if (!out.contact.email) {
    const m = content.match(RE_EMAIL);
    if (m) out.contact.email = m[0];
  }
  if (!out.contact.telephone) {
    const m = content.match(RE_PHONE);
    if (m) out.contact.telephone = normalizePhone(m[0]);
  }

  // 3) Essayer d'extraire nom/prénom depuis le subject si pas trouvé
  if (!out.contact.nom && subject) {
    const nameMatches = subject.match(/(?:M\.|Mme|Monsieur|Madame)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
    if (nameMatches) {
      out.contact.prenom = nameMatches[1];
      out.contact.nom = nameMatches[2];
    }
  }

  console.log('Generic parsing result:', {
    nom: out.contact.nom,
    email: out.contact.email,
    telephone: out.contact.telephone,
    score: 'calculating...'
  });

  // Score commun
  return addScore(out);
}

function addScore(lead) {
  let score = 0;
  
  // Contact fort : nom + (email || téléphone) = +2
  if (lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)) score += 2;
  
  // Prénom ou civilité = +1
  if (lead.contact?.prenom || lead.contact?.civilite) score += 1;
  
  // Besoin : date d'effet OU niveau de garantie = +1
  const hasNeed = lead.besoins?.dateEffet ||
    (lead.besoins?.niveaux && Object.values(lead.besoins.niveaux).some(Boolean));
  if (hasNeed) score += 1;
  
  // Ville/CP = petit contexte = +1
  if (lead.contact?.codePostal || lead.contact?.ville) score += 1;
  
  lead.score = Math.max(1, Math.min(5, score));
  
  console.log('Generic final score:', score, {
    hasContact: !!(lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)),
    hasIdentity: !!(lead.contact?.prenom || lead.contact?.civilite),
    hasNeed: hasNeed,
    hasLocation: !!(lead.contact?.codePostal || lead.contact?.ville)
  });
  
  return { parsingDetails: lead };
}