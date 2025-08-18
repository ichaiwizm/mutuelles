// Transformations spécifiques à SwissLife One
window.SwissLifeTransformer = {

  // Transformer les données du lead pour SwissLife
  transformLeadData: (leadData) => {
    // Aucune transformation nécessaire pour SwissLife pour l'instant
    // Les données sont déjà au bon format
    return leadData;
  },

  // Générer la date d'effet (1er du mois suivant)
  generateEffectDate: () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(nextMonth.getDate())}/${pad(nextMonth.getMonth() + 1)}/${nextMonth.getFullYear()}`;
  },

  // Extraire le département du code postal
  extractDepartment: (codePostal) => {
    return (codePostal || '').slice(0, 2);
  },

  // Valeurs par défaut pour SwissLife
  getDefaults: () => {
    return {
      regimeSocial: 'Régime Général pour TNS (CPAM)',
      resiliation: 'non',
      loiMadelin: true
    };
  }
};