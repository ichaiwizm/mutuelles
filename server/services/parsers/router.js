import { ParserOrchestrator } from './ParserOrchestrator.js';

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
  const subject = payload.subject || '';
  const content = payload.content || '';
  const from = (payload.from || '').toLowerCase();
  const hint = (payload.sourceHint || '').toLowerCase();


  // Utiliser l'orchestrateur avec ses parsers enregistrés
  const leads = ParserOrchestrator.parseContent(
    content,
    hint || from || 'email',
    subject,
    content,
    payload.date || new Date().toISOString()
  );

  // Retourner le premier lead ou un résultat vide formaté
  if (leads && leads.length > 0) {
    const lead = leads[0];
    return {
      parsingDetails: {
        source: lead.source || 'Unknown',
        extractedAt: lead.extractedAt,
        contact: lead.contact,
        souscripteur: lead.souscripteur,
        conjoint: lead.conjoint,
        enfants: lead.enfants,
        besoins: lead.besoins,
        emailSubject: lead.emailSubject,
        fullContent: lead.fullContent,
        rawSnippet: lead.rawSnippet,
        notes: lead.notes,
        score: lead.score
      }
    };
  }

  // Si aucun lead n'a été créé, retourner un résultat vide
  return {
    parsingDetails: {
      source: 'Unknown',
      extractedAt: new Date().toISOString(),
      contact: {},
      souscripteur: {},
      conjoint: null,
      enfants: [],
      besoins: {},
      emailSubject: subject,
      fullContent: content,
      rawSnippet: content.substring(0, 300),
      notes: { error: 'No parser could handle this content' },
      score: 0
    }
  };
}