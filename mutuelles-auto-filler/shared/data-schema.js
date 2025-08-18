// Schéma de données unifié pour tous les services
window.DataSchema = {

  // Schéma standard d'un lead
  leadSchema: {
    // Informations générales
    projetNom: 'string',        // Nom du projet
    cp: 'string',               // Code postal
    simulationType: 'string',   // 'individuelle' ou 'couple'
    
    // Assuré principal
    principalDOB: 'string',     // Date de naissance DD/MM/YYYY
    
    // Conjoint (optionnel)
    conjointDOB: 'string|null', // Date de naissance conjoint ou null
    
    // Enfants (optionnel)
    enfantsDOB: 'array',        // Tableau des dates de naissance
    
    // Professionnel
    statutTexte: 'string',      // Statut professionnel
    profTexte: 'string',        // Profession
    
    // Produit
    gammeTexte: 'string'        // Gamme de produit
  },

  // Valider un lead selon le schéma
  validateLead: (leadData) => {
    const errors = [];
    
    // Vérifications obligatoires
    if (!leadData.projetNom) errors.push('projetNom manquant');
    if (!leadData.principalDOB) errors.push('principalDOB manquant');
    if (!leadData.simulationType) errors.push('simulationType manquant');
    if (!['individuelle', 'couple'].includes(leadData.simulationType)) {
      errors.push('simulationType invalide (doit être "individuelle" ou "couple")');
    }
    
    // Vérifications conditionnelles
    if (leadData.simulationType === 'couple' && !leadData.conjointDOB) {
      errors.push('conjointDOB requis pour simulationType "couple"');
    }
    
    if (leadData.simulationType === 'individuelle' && leadData.conjointDOB) {
      errors.push('conjointDOB interdit pour simulationType "individuelle"');
    }
    
    // Vérifications de format
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (leadData.principalDOB && !dateRegex.test(leadData.principalDOB)) {
      errors.push('principalDOB format invalide (attendu: DD/MM/YYYY)');
    }
    
    if (leadData.conjointDOB && !dateRegex.test(leadData.conjointDOB)) {
      errors.push('conjointDOB format invalide (attendu: DD/MM/YYYY)');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Normaliser les données d'un lead
  normalizeLead: (leadData) => {
    return {
      projetNom: leadData.projetNom || '',
      cp: leadData.cp || '',
      simulationType: leadData.simulationType || 'individuelle',
      principalDOB: leadData.principalDOB || '',
      conjointDOB: leadData.simulationType === 'couple' ? leadData.conjointDOB : null,
      enfantsDOB: Array.isArray(leadData.enfantsDOB) ? leadData.enfantsDOB : [],
      statutTexte: leadData.statutTexte || '',
      profTexte: leadData.profTexte || '',
      gammeTexte: leadData.gammeTexte || ''
    };
  }
};