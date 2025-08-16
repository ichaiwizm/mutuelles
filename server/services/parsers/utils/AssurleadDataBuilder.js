import { BaseParser } from '../BaseParser.js';

export function buildLeadData(result) {
  const phone = (result.telephone || '').replace(/[^\d+]/g,'');
  const cp = (result.codePostal || '').replace(/\D/g,'');
  const dob = result.dob ? BaseParser.normalizeDate(result.dob) : '';
  
  return {
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
      dateNaissance: result.dob_conjoint ? BaseParser.normalizeDate(result.dob_conjoint) : '',
      profession: result.profession_conjoint || '',
      regimeSocial: result.regime_social_conjoint || '',
    } : null,
    besoins: {
      dateEffet: '',
      assureActuellement: result.assureur_actuel ? true : undefined,
      niveaux: {}
    }
  };
}