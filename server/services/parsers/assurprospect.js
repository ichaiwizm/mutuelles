// server/services/parsers/assurprospect.js

const RE_HARD_SECTIONS = [
  'Contact',
  'Souscripteur',
  'Conjoint',
  'Enfants',
  'Besoin'
];

export function detectAssurProspect({ content, subject, from }) {
  const c = (content || '').toLowerCase();
  const s = (subject || '').toLowerCase();
  return (
    c.includes('assurprospect.fr') ||
    c.includes('transmission d\'une fiche') ||
    c.includes('éléments de la fiche trio') ||
    s.includes('assurprospect') ||
    (from || '').toLowerCase().includes('assurprospect')
  );
}

function readSectionBlock(content, sectionName) {
  // Ex: "Contact\n\nCivilité : M.\nNom : Dupont\n..."
  const esc = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionsPattern = RE_HARD_SECTIONS.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`${esc}[\\s\\S]*?(?=(?:${sectionsPattern})|$)`, 'i');
  const m = content.match(re);
  return m ? m[0] : '';
}

function kv(line) {
  // "Civilité : M." -> {key:"civilité", value:"M."}
  const m = line.split(':');
  if (m.length < 2) return null;
  const key = m[0].trim().toLowerCase();
  const value = m.slice(1).join(':').trim();
  return { key, value };
}

function parseKVBlock(block) {
  const out = {};
  block.split('\n').forEach((raw) => {
    const line = raw.replace(/\t/g, ' ').trim();
    if (!line || !line.includes(':')) return;
    const pair = kv(line);
    if (!pair) return;
    out[pair.key] = pair.value;
  });
  return out;
}

function yesNoToBool(v) {
  const s = (v || '').toString().toLowerCase();
  if (!s) return undefined;
  if (['oui','yes','o','y'].includes(s)) return true;
  if (['non','no','n'].includes(s)) return false;
  return undefined;
}

function normalizePhone(v) {
  if (!v) return '';
  const digits = v.replace(/[^\d]/g, '');
  // Optionnel : ajout d'un 0 si 9 chiffres, etc.
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function normalizeDateFR(v) {
  // garde jj/mm/aaaa tel quel si cohérent
  if (!v) return '';
  const m = v.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return v.trim();
  const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${dd}/${mm}/${yyyy}`;
}

export function parseAssurProspect({ content, subject, date }) {
  console.log('Parsing AssurProspect email');
  
  const contact = parseKVBlock(readSectionBlock(content, 'Contact'));
  const sousc   = parseKVBlock(readSectionBlock(content, 'Souscripteur'));
  const conj    = parseKVBlock(readSectionBlock(content, 'Conjoint'));
  const enfants = readSectionBlock(content, 'Enfants');
  const besoin  = parseKVBlock(readSectionBlock(content, 'Besoin'));

  const enfantsDates = [];
  (enfants || '').split('\n').forEach(l => {
    const m = l.match(/Date de naissance du \d+(?:er|ème) enfant\s*:\s*(.+)$/i);
    if (m) enfantsDates.push({ dateNaissance: normalizeDateFR(m[1]) });
  });

  const lead = {
    source: 'AssurProspect',
    extractedAt: date || new Date().toISOString(),
    contact: {
      civilite: contact['civilité'] || contact['civilite'] || '',
      nom: contact['nom'] || '',
      prenom: contact['prénom'] || contact['prenom'] || '',
      telephone: normalizePhone(contact['téléphone'] || contact['telephone']),
      email: contact['email'] || '',
      adresse: contact['adresse'] || '',
      codePostal: contact['code postal'] || contact['codepostal'] || '',
      ville: contact['ville'] || '',
    },
    souscripteur: {
      dateNaissance: normalizeDateFR(sousc['date de naissance']),
      profession: sousc['profession'] || '',
      regimeSocial: sousc['régime social'] || sousc['regime social'] || '',
      nombreEnfants: sousc['nombre d\'enfants'] ? Number((sousc['nombre d\'enfants'] || '').replace(/[^\d]/g,'')) : undefined,
    },
    conjoint: (conj && Object.keys(conj).length > 0) ? {
      dateNaissance: normalizeDateFR(conj['date de naissance']),
      profession: conj['profession'] || '',
      regimeSocial: conj['régime social'] || conj['regime social'] || '',
    } : null,
    enfants: enfantsDates,
    besoins: {
      dateEffet: normalizeDateFR(besoin['date d\'effet']),
      assureActuellement: yesNoToBool(besoin['souscripteur actuellement assuré']),
      niveaux: {
        soinsMedicaux: besoin['soins médicaux'] || besoin['soins medicaux'] || '',
        hospitalisation: besoin['hospitalisation'] || '',
        optique: besoin['optique'] || '',
        dentaire: besoin['dentaire'] || '',
      },
    },
    emailSubject: subject || '',
    fullContent: content,
    rawSnippet: content.substring(0, 300),
    notes: { parserUsed: 'AssurProspectParser' },
  };

  console.log('AssurProspect parsing result:', {
    nom: lead.contact.nom,
    email: lead.contact.email,
    score: 'calculating...'
  });

  return addScore(lead);
}

function addScore(lead) {
  // Score unifié, pas de malus "parser générique"
  let score = 0;
  // Contact fort : nom + (email || téléphone)
  if (lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)) score += 2;
  // Prénom ou civilité
  if (lead.contact?.prenom || lead.contact?.civilite) score += 1;
  // Besoin minimum : une date d'effet OU un niveau de garantie
  const hasAnyNeed = lead.besoins?.dateEffet ||
    (lead.besoins?.niveaux && Object.values(lead.besoins.niveaux).some(Boolean));
  if (hasAnyNeed) score += 1;
  // Contexte : conjoint ou enfants
  if (lead.conjoint || (lead.enfants && lead.enfants.length > 0)) score += 1;

  lead.score = Math.max(1, Math.min(5, score)); // au moins 1
  
  console.log('AssurProspect final score:', score, {
    hasContact: !!(lead.contact?.nom && (lead.contact?.email || lead.contact?.telephone)),
    hasIdentity: !!(lead.contact?.prenom || lead.contact?.civilite),
    hasNeeds: hasAnyNeed,
    hasContext: !!(lead.conjoint || (lead.enfants && lead.enfants.length > 0))
  });
  
  return { parsingDetails: lead };
}