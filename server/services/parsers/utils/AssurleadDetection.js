import logger from '../../../logger.js';

export function canParseAssurlead(content) {
  const c = content.toLowerCase();
  
  logger.debug('AssurleadParser canParse test', { 
    content_length: content.length,
    content_preview: content.substring(0, 300),
    has_assurlead: c.includes('assurlead'),
    has_assurland: c.includes('assurland'),
    has_assurland_com: c.includes('assurland.com'),
    has_service_assurland: c.includes('service assurland')
  });
  
  // Détection explicite par domaine/source
  if (c.includes('assurlead') || c.includes('assurland') || c.includes('assurland.com') || 
      c.includes('service assurland') || c.includes('opdata@assurland.com')) {
    logger.debug('AssurleadParser canParse: TRUE (domain match)');
    return true;
  }
  
  // Détection par structure tabulaire spécifique
  const hasTabularStructure = (
    c.includes('civilite\t') && 
    c.includes('nom\t') && 
    c.includes('telephone portable\t')
  );
  
  if (hasTabularStructure) {
    logger.debug('AssurleadParser canParse: TRUE (tabular structure)');
    return true;
  }
  
  // Détection par marqueurs spécifiques Assurlead
  const hasAssurleadMarkers = (
    c.includes('user_id') ||
    c.includes('besoin assurance sante') ||
    c.includes('formule choisie') ||
    c.includes('regime social conjoint')
  );
  
  if (hasAssurleadMarkers) {
    logger.debug('AssurleadParser canParse: TRUE (assurlead markers)');
    return true;
  }
  
  // Ancien système de détection (fallback)
  const hasBasicMarkers =
    c.includes('civilite') &&
    (c.includes('telephone portable') || c.includes('code postal')) &&
    c.includes('profession');
    
  logger.debug('AssurleadParser canParse final test', {
    has_tabular: hasTabularStructure,
    has_assurlead_markers: hasAssurleadMarkers,
    has_basic_markers: hasBasicMarkers,
    final_result: hasBasicMarkers
  });
  
  return hasBasicMarkers;
}