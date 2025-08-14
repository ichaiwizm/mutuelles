// server/services/parsers/assurlead.js
// Emails type Assurland/Assurlead : lignes "Champ<TAB>Valeur"

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
    c.includes('civilite\t') ||
    c.includes('nom\t') ||
    c.includes('prenom\t') ||
    c.includes('telephone portable\t')
  );
  
  return hasAssurlandMarkers || hasTabularFormat;
}

function readTableToMap(content) {
  const o = {};
  content.split('\n').forEach(line => {
    const clean = line.replace(/\r/g,'').trim();
    if (!clean) return;
    const parts = clean.split('\t'); // TAB
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase();
      const value = parts.slice(1).join('\t').trim();
      if (key && value) o[key] = value;
    }
  });
  return o;
}

function normalizeDateFR(v) {
  if (!v) return '';
  const m = v.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return v.trim();
  const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${dd}/${mm}/${yyyy}`;
}

function normalizePhone(v) {
  if (!v) return '';
  const digits = v.replace(/[^\d]/g, '');
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function yesNoToBool(v) {
  const s = (v || '').toString().toLowerCase();
  if (['oui','yes','o','y'].includes(s)) return true;
  if (['non','no','n'].includes(s)) return false;
  return undefined;
}

export function parseAssurlead({ content, subject, date }) {
  console.log('Parsing Assurlead email');
  
  const map = readTableToMap(content);
  
  console.log('Assurlead parsed fields:', Object.keys(map));

  const lead = {
    source: 'Assurlead',
    extractedAt: date || new Date().toISOString(),
    contact: {
      civilite: map['civilite'] || '',
      nom: map['nom'] || '',
      prenom: map['prenom'] || '',
      telephone: normalizePhone(map['telephone portable'] || map['telephone'] || ''),
      email: map['email'] || '',
      adresse: `${map['v2'] || ''} ${map['v4'] || ''}`.trim(),
      codePostal: map['code postal'] || '',
      ville: map['ville'] || '',
    },
    souscripteur: {
      dateNaissance: normalizeDateFR(map['date de naissance']),
      profession: map['profession'] || '',
      regimeSocial: map['regime social'] || '',
      nombreEnfants: map['nombre d\'enfants'] ? Number((map['nombre d\'enfants'] || '').replace(/[^\d]/g,'')) : undefined,
    },
    conjoint: null, // Assurland ne l'envoie pas en tableau simple
    enfants: [],    // idem
    besoins: {
      dateEffet: '', // non fourni directement ; on déduit le "besoin" via champ texte
      assureActuellement: yesNoToBool(map['assureur actuel']),
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
        besoin: map['besoin assurance sante'] || '',
        moisEcheance: map['mois d\'echeance'] || map['mois d\'échéance'] || '',
        formuleChoisie: map['formule choisie'] || '',
        assureurActuel: map['assureur actuel'] || '',
        situationFamiliale: map['situation familiale'] || '',
        age: map['age'] || '',
        sexe: map['sexe'] || ''
      }
    },
  };

  console.log('Assurlead parsing result:', {
    nom: lead.contact.nom,
    email: lead.contact.email,
    telephone: lead.contact.telephone,
    score: 'calculating...'
  });

  // Score avec les mêmes règles qu'AssurProspect
  return addScore(lead);
}

function addScore(lead) {
  let score = 0;
  
  // Contact fort : nom + (email || téléphone) = +2
  if (lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)) score += 2;
  
  // Prénom ou civilité = +1
  if (lead.contact?.prenom || lead.contact?.civilite) score += 1;
  
  // Besoin explicite : "besoin assurance sante" rempli = +1
  if (lead.notes?.raw?.besoin) score += 1;
  
  // Contexte géographique : code postal/ville = +1
  if (lead.contact?.codePostal || lead.contact?.ville) score += 1;

  lead.score = Math.max(1, Math.min(5, score));
  
  console.log('Assurlead final score:', score, {
    hasContact: !!(lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)),
    hasIdentity: !!(lead.contact?.prenom || lead.contact?.civilite),
    hasNeed: !!lead.notes?.raw?.besoin,
    hasLocation: !!(lead.contact?.codePostal || lead.contact?.ville)
  });
  
  return { parsingDetails: lead };
}