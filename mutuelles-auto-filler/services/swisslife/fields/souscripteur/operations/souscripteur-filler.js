/**
 * Remplisseur de souscripteur - Opérations de remplissage des données souscripteur
 * Responsable du remplissage des formulaires souscripteur/assuré principal
 */

import { isVisible, bringIntoView, fireMultiple } from '../../../utils/dom-utils.js';
import { setSelectByValueOrText, aliasResolve } from '../../../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../../../utils/async-utils.js';
import { 
  findDateElement,
  findRegimeSelect,
  findStatutSelect,
  findProfessionSelect,
  findDepartementSelect
} from '../core/souscripteur-detector.js';
import { normalizeSouscripteurConfig, DEFAULT_CONFIG } from '../core/souscripteur-mapper.js';

/**
 * Définit une valeur de select avec résolution d'alias
 */
function pickSelectValue(sel, wantedRaw) {
  if (!sel || !wantedRaw) return false;
  
  const domain = sel.name?.includes('regime') ? 'regimeSocial' :
                 sel.name?.includes('statut') ? 'statut' :
                 sel.name?.includes('profession') ? 'profession' : null;
  
  console.log('🔍 pickSelect - element:', sel.name, 'domain:', domain, 'wantedRaw:', wantedRaw);
  
  const wanted = domain ? aliasResolve(domain, wantedRaw) : wantedRaw;
  console.log('🔍 pickSelect - après aliasResolve:', wanted);
  
  const result = setSelectByValueOrText(sel, wanted);
  console.log('🔍 pickSelect - résultat:', result, 'selectedIndex:', sel.selectedIndex);
  
  return result;
}

/**
 * Remplit tous les champs souscripteur
 */
export async function fillAllSouscripteurFields(cfg = DEFAULT_CONFIG) {
  const config = normalizeSouscripteurConfig(cfg);
  
  console.log('🔍 souscripteur-filler.fillAll - config reçu:', cfg);
  console.log('🔍 souscripteur-filler.fillAll - config mappé:', config);
  
  await waitOverlayGone();
  
  const actions = [];
  
  // Date de naissance
  const elDate = findDateElement();
  if (elDate && config.dateNaissance) {
    if (!isVisible(elDate)) {
      bringIntoView(elDate);
      await wait(200);
    }
    
    elDate.focus();
    elDate.value = config.dateNaissance;
    fireMultiple(elDate);
    actions.push({ field: 'dateNaissance', value: config.dateNaissance });
  }
  
  // Régime social
  const selRegime = findRegimeSelect();
  console.log('🔍 Régime social - element trouvé:', selRegime, 'config:', config.regimeSocial);
  if (selRegime && config.regimeSocial) {
    const ok = pickSelectValue(selRegime, config.regimeSocial);
    if (ok) actions.push({ field: 'regimeSocial', value: config.regimeSocial });
  }
  
  // Statut
  const selStatut = findStatutSelect();
  console.log('🔍 Statut - element trouvé:', selStatut, 'config:', config.statut);
  if (selStatut && config.statut) {
    const ok = pickSelectValue(selStatut, config.statut);
    if (ok) actions.push({ field: 'statut', value: config.statut });
  }
  
  // Profession (optionnel)
  const selProfession = findProfessionSelect();
  console.log('🔍 Profession - element trouvé:', selProfession, 'config:', config.profession);
  if (selProfession && config.profession) {
    const ok = pickSelectValue(selProfession, config.profession);
    if (ok) actions.push({ field: 'profession', value: config.profession });
  }
  
  // Département
  const selDept = findDepartementSelect();
  if (selDept && config.departement) {
    const ok = pickSelectValue(selDept, config.departement);
    if (ok) actions.push({ field: 'departement', value: config.departement });
  }
  
  await waitStable();
  
  return { ok: true, actions };
}