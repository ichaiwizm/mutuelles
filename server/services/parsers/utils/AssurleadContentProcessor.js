import { RAW_KEYS } from '../constants/AssurleadConstants.js';

export function processSingleLineContent(singleLine) {
  const keyPattern = new RegExp(
    '(' + Object.keys(RAW_KEYS).filter(k => k && k !== 'v2').map(k => 
      k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    ).join('|') + ')\\s+',
    'gi'
  );
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = keyPattern.exec(singleLine)) !== null) {
    if (lastIndex < match.index) {
      const prevPart = singleLine.substring(lastIndex, match.index).trim();
      if (prevPart) parts.push(prevPart);
    }
    lastIndex = match.index;
  }
  if (lastIndex < singleLine.length) {
    const lastPart = singleLine.substring(lastIndex).trim();
    if (lastPart) parts.push(lastPart);
  }
  
  return parts;
}

export function extractDataSection(text) {
  const serviceMarker = /Service\s+Assurland\s+DataPro/i;
  const serviceIndex = text.search(serviceMarker);
  
  if (serviceIndex !== -1) {
    return text.substring(serviceIndex + text.match(serviceMarker)[0].length).trim();
  }
  
  return text;
}