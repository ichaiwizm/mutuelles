// server/services/parsers/router.js
import { parseAssurProspect, detectAssurProspect } from './assurprospect.js';
import { parseAssurlead, detectAssurlead } from './assurlead.js';
import { parseGeneric } from './generic.js';

function normalize(str = '') {
  return (str || '').toString().replace(/\s+/g, ' ').trim();
}

/**
 * Route un contenu d'email vers le bon parser.
 * @param {Object} payload
 * @param {string} payload.content - Texte intégral (HTML -> texte si possible)
 * @param {string} payload.subject
 * @param {string} [payload.from] - expéditeur si dispo
 * @param {string} [payload.sourceHint] - hint facultatif (ex: 'assurprospect','assurlead')
 * @param {string|Date} [payload.date]
 */
export function routeAndParseEmail(payload) {
  const subject = normalize(payload.subject);
  const content = normalize(payload.content);
  const from = (payload.from || '').toLowerCase();
  const hint = (payload.sourceHint || '').toLowerCase();

  console.log('Routing email parsing:', {
    subjectLength: subject.length,
    contentLength: content.length,
    from: from.substring(0, 50),
    hint
  });

  // 1) Hints explicites
  if (hint.includes('assurprospect')) {
    console.log('Using AssurProspectParser via hint');
    const details = parseAssurProspect({ content, subject, date: payload.date });
    return { ...details, notes: { ...(details.notes || {}), router: 'hint:assurprospect' } };
  }
  if (hint.includes('assurlead') || hint.includes('assurland')) {
    console.log('Using AssurleadParser via hint');
    const details = parseAssurlead({ content, subject, date: payload.date });
    return { ...details, notes: { ...(details.notes || {}), router: 'hint:assurlead' } };
  }

  // 2) Détection par contenu/subject/from
  if (detectAssurProspect({ content, subject, from })) {
    console.log('Detected AssurProspect format');
    return parseAssurProspect({ content, subject, date: payload.date });
  }
  if (detectAssurlead({ content, subject, from })) {
    console.log('Detected Assurlead format');
    return parseAssurlead({ content, subject, date: payload.date });
  }

  // 3) Fallback générique (peut produire 5/5)
  console.log('Using GenericParser fallback');
  return parseGeneric({ content, subject, date: payload.date });
}