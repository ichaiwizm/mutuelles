// Traitement simple des templates
export function processTemplate(template, data) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Templates simples supportés
      const replacements = {
        'lead.nom': data.lead?.nom,
        'lead.prenom': data.lead?.prenom,
        'lead.projectName': data.lead?.projectName,
        'lead.conjoint ? \'couple\' : \'individuel\'': data.lead?.conjoint ? 'couple' : 'individuel',
        'lead.conjoint.dateNaissance': data.lead?.conjoint?.dateNaissance,
        // Conditions
        'lead.conjoint': !!data.lead?.conjoint,
        'lead.souscripteur.nombreEnfants > 0': (data.lead?.souscripteur?.nombreEnfants || 0) > 0,
        // Données enfants
        'lead.souscripteur.nombreEnfants': data.lead?.souscripteur?.nombreEnfants || 0,
        'lead.enfants.0.dateNaissance': data.lead?.enfants?.[0]?.dateNaissance,
        'lead.enfants.1.dateNaissance': data.lead?.enfants?.[1]?.dateNaissance,
        'lead.enfants.2.dateNaissance': data.lead?.enfants?.[2]?.dateNaissance,
        // Expressions resolver (souscripteur)
        'resolver.regime': data.resolver?.regime,
        'resolver.statut': data.resolver?.statut,
        'resolver.profession': data.resolver?.profession,
        'resolver.dateNaissance': data.resolver?.dateNaissance,
        'resolver.departement': data.resolver?.departement,
        // Expressions spouseResolver (conjoint)
        'spouseResolver.regime': data.spouseResolver?.regime,
        'spouseResolver.statut': data.spouseResolver?.statut,
        'spouseResolver.profession': data.spouseResolver?.profession,
        'spouseResolver.dateNaissance': data.spouseResolver?.dateNaissance,
        'spouseResolver.departement': data.spouseResolver?.departement
      };
      
      const result = replacements[expression];
      if (result !== undefined) {
        return result;
      }
      
      console.warn('Template expression non trouvée:', expression);
      return match;
    } catch (e) {
      console.warn('Template expression error:', expression, e);
      return match;
    }
  });
}
