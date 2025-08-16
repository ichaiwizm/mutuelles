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
  
  if (c.includes('assurlead') || c.includes('assurland') || c.includes('assurland.com') || c.includes('service assurland')) {
    logger.debug('AssurleadParser canParse: TRUE (domain match)');
    return true;
  }
  
  const hasMarkers =
    c.includes('civilite') &&
    (c.includes('telephone portable') || c.includes('code postal')) &&
    c.includes('profession');
    
  logger.debug('AssurleadParser canParse markers test', {
    has_civilite: c.includes('civilite'),
    has_telephone_portable: c.includes('telephone portable'),
    has_code_postal: c.includes('code postal'),
    has_profession: c.includes('profession'),
    final_result: hasMarkers
  });
  
  return hasMarkers;
}